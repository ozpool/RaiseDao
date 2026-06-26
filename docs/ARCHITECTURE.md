# Architecture

RaiseDAO is a milestone-gated crowdfunding platform. The chain is the source of
truth for **custody, voting, and timelocks**. Everything else — descriptions,
evidence files, tallies for display, notifications, scam heuristics — is
off-chain and treated as a fast, rebuildable mirror of chain state.

## 1. On-chain vs off-chain

| Concern                            | Where             | Why                                               |
| ---------------------------------- | ----------------- | ------------------------------------------------- |
| USDC custody                       | Vault contract    | Only a passing vote can move funds.               |
| Governance token supply/balances   | GovToken contract | Vote weight.                                      |
| Vote tallies (canonical)           | Governor contract | Chain is authoritative.                           |
| Milestone schedule + release logic | Vault contract    | Release must check it.                            |
| Campaign title/description/hero    | MongoDB           | Free-text, off-chain.                             |
| Evidence files (video/PDF/img)     | IPFS              | Large blobs; only the CID is referenced on-chain. |
| Vote tallies (display cache)       | MongoDB           | Fast reads; recomputable from chain.              |
| Scam-heuristic flags               | MongoDB           | Platform policy; never binds on-chain.            |

## 2. System diagram

```
  Browser (Next.js + wagmi + R3F + Socket.IO client)
     |  REST + WebSocket            ^ wallet tx (read/write direct to chain)
     v                              |
  Express API (TypeScript) ----------------------------+
   - routes: /campaigns /investments /votes /evidence  |
   - SIWE + JWT auth                                    |
   - Socket.IO rooms per campaign                       |
   - in-process indexer (ethers)  --- writes --> MongoDB
   - Redis pub/sub (Upstash) for cross-instance fan-out |
        |            |              |                    |
        v            v              v                    v
     MongoDB       IPFS          Resend            Arbitrum Sepolia
   (cache,       (evidence)    (emails)           RaiseFactory
    profiles,                                       -> Vault + GovToken + Governor
    analytics)                                         (one trio per campaign)
```

Three load-bearing decisions:

1. **Per-campaign factory deployment** — each campaign gets its own vault, token,
   and governor (deployed as EIP-1167 minimal-proxy clones for cheap gas). A
   compromise in one campaign cannot touch another.
2. **The indexer is the bridge to Mongo** — the API never polls the chain for
   state; it reads denormalized Mongo data the indexer maintains.
3. **WebSocket over an event-driven backend** — the indexer publishes to Redis
   pub/sub; the Socket.IO server broadcasts to the campaign's room, so votes feel
   live without polling.

## 3. Components

| Layer     | Owns                                                                  | Does NOT own                                    |
| --------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Frontend  | Browse, wizard, dashboards, voting UI, evidence viewer, live tallies  | Vote logic or fund release (both contract-side) |
| API       | Metadata CRUD, IPFS pinning, WS fan-out, scam flagging, notifications | Voting or moving funds                          |
| Indexer   | Subscribes to every campaign's events; writes Mongo; publishes Redis  | Originating chain writes                        |
| MongoDB   | Metadata, profiles, denormalized tallies, evidence CIDs, analytics    | Voting truth (chain is canonical)               |
| Contracts | Custody, token mint, vote logic, release authorization, refunds       | Descriptions, bios, demo content                |

## 4. Contract surface

**RaiseFactory** — `deploy(CampaignParams)` clones GovToken + RaiseVault via
EIP-1167 (both are initializer-based implementations) and deploys a fresh
MilestoneGovernor + TimelockController per campaign through small deployer
contracts (kept separate so the factory stays under the 24KB limit). It wires
roles (vault is token minter; the timelock is the vault's governor and the only
proposer/executor; the factory renounces timelock admin), rejects a nonzero
`proposalThreshold` (founders hold no votes, so it would brick proposing), and
emits `CampaignDeployed(id, vault, token, governor, founder)`. Clone + init +
wire happen in one transaction, so there is no init front-run window.

**GovToken** — `ERC20Votes`, **soulbound** (transfers reverted; mint/burn only).
Minted by the vault on contribution. Delegation still works (delegation moves
voting power, not tokens), which kills the buy-then-vote and founder-buyback
attacks at the root. Investors must `delegate(self)` to activate voting power.

**RaiseVault** — holds USDC, milestone schedule, and per-investor share.
Reentrancy-guarded with transient storage (Cancun).

- `contribute(amount)` — pulls USDC, mints GovToken (CEI + guard).
- `releaseMilestone(id)` — `onlyGovernor`; transfers the slice (minus protocol
  fee) to founder. Blocked once the campaign has failed.
- `markFailed(id)` — `onlyGovernor`; opens pro-rata refunds.
- `forceFail()` — permissionless escape hatch once the current milestone's
  deadline has passed without a release, so a passive founder cannot lock funds.
- `claimRefund()` — pro-rata of remaining USDC, burns the caller's shares.
- Invariant: `totalReleased + remaining == totalRaised - refundsClaimed`
  (fuzzed + invariant-tested under Foundry).

**MilestoneGovernor** — extends OpenZeppelin Governor. Voting delay 1 day, period
3 days, configurable quorum, 2-day timelock on execution. `propose` is
founder-only and encodes `vault.releaseMilestone(id)` or `vault.markFailed(id)`;
the timelock executes it as the vault's governor. Snapshot-based weight prevents
buy-then-vote.

## 5. Data flow: launch -> fund -> vote -> resolve

```
LAUNCH   founder fills wizard -> API stores draft -> founder signs
         RaiseFactory.deploy -> trio deployed -> CampaignDeployed emitted
         -> indexer sets campaign.status = "fundraising"
FUND     investor: USDC.approve + Vault.contribute -> GovToken minted
         -> indexer updates totals -> Redis -> Socket.IO room updates UI live
EVIDENCE founder uploads file -> API pins to IPFS -> CID
         -> Governor.propose(milestoneId, descHash, cid) -> voting window opens
VOTE     investor: Governor.castVote(proposalId, support); weight = snapshot balance
         -> VoteCast emitted -> indexer updates tally -> Redis -> live bar moves
RESOLVE  after window: anyone calls execute()
         pass -> Vault.releaseMilestone (slice to founder, minus fee)
         fail -> Vault.markFailed (unlocks pro-rata refunds)
REFUND   after grace: investor calls Vault.claimRefund -> USDC out, shares burned
```

## 6. Indexer design

- **Discovery:** watches `RaiseFactory` for `CampaignDeployed`, auto-subscribes to
  each new trio.
- **Reorg safety:** waits a confirmation depth before treating an event as final.
- **Checkpoint:** stores `last_block` in Mongo; replays on restart.
- **Idempotency:** events keyed by `(txHash, logIndex)`; all writes are upserts.
- **In-process:** runs as an interval inside the API process, **not** a separate
  worker — the free hosting tier cannot reliably keep two services awake. Split it
  out later if/when hosting is paid.
- **Mongo discipline:** store denormalized state and a light activity feed, **not**
  raw event logs — the chain already is that ledger. This keeps us under the
  free-tier 512 MB cap indefinitely.

## 7. Realtime

Redis pub/sub topic per campaign; Socket.IO subscribes and broadcasts to room
`campaign:<id>`. If the indexer lags, the UI shows "syncing" when stale > 30s and
re-syncs from REST on focus. The critical `execute()` call needs no UI — anyone
can trigger it.

## 8. API surface

All responses are JSON. Protected routes require a `Bearer` JWT, obtained by
signing a SIWE challenge. The indexer keeps the read models these routes serve
up to date; writes that change on-chain state go through the contracts, not here.

### REST

| Method | Path           | Auth   | Request                                           | Response                                        |
| ------ | -------------- | ------ | ------------------------------------------------- | ----------------------------------------------- |
| GET    | `/health`      | none   | —                                                 | `{ status, uptime, db, timestamp }`             |
| POST   | `/auth/nonce`  | none   | `{ address }`                                     | `{ nonce }` to embed in the SIWE message        |
| POST   | `/auth/verify` | none   | `{ message, signature }`                          | `{ token, address, roles }`                     |
| GET    | `/auth/me`     | bearer | —                                                 | the session claims (`address`, `roles`)         |
| POST   | `/evidence`    | bearer | multipart: `file`, `campaignId`, `milestoneIndex` | `{ cid, provider, campaignId, milestoneIndex }` |

`POST /evidence` returns `413` when the file exceeds `EVIDENCE_MAX_BYTES` and
`502` when every IPFS provider fails. Campaign/analytics read endpoints are M4+.

### WebSocket (Socket.IO)

A client emits `join` / `leave` with a `campaignId`. On join the server replies
with `campaign:sync` (a snapshot of the campaign's rollups so the client re-syncs
after a reconnect), then streams `campaign:event` for each new on-chain event.
The payload is `{ channel, type, campaignId, block, data }` where `channel` is
`fund | vote | state`, so a client subscribes by concern. Rooms are
`campaign:<id>`; the Upstash Redis adapter fans events across instances.

### Email

Transactional email goes out via Resend on vote-open (`ProposalCreated`) and
vote-close (`ProposalQueued`) to contributors who opted in with an email.
Recipients are bcc'd so no investor sees another's address.

## 9. Failure modes

| Mode                                   | Defense                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Founder ships milestone 1, ghosts on 2 | Investors fail milestone 2; pro-rata refund of the rest. Loss bounded to slice 1.          |
| Founder never proposes (funds frozen)  | `forceFail()` is permissionless once the milestone deadline passes — anyone opens refunds. |
| Whale dominance                        | Quorum + transparency; capital reflects skin-in-the-game. Quadratic voting is future work. |
| Founder buys tokens to self-approve    | GovToken is soulbound (mint/burn only) — cannot be acquired.                               |
| Indexer behind at vote close           | Tally is recomputable from chain; UI shows "syncing"; `execute()` is permissionless.       |
| IPFS evidence unpinned                 | Dual-pin (Pinata + web3.storage); alert if both fail.                                      |
| Funds frozen (no quorum ever)          | Campaign-expiry: after an inactivity window, anyone can trigger refund mode.               |

## 10. Deployment topology

| Piece         | Host                    | Notes                                                                       |
| ------------- | ----------------------- | --------------------------------------------------------------------------- |
| Frontend      | Vercel Hobby            | Edge, no cold start.                                                        |
| API + indexer | Render free web service | Sleeps after 15 min; UptimeRobot pings `/health` every 10 min to keep warm. |
| Database      | MongoDB Atlas M0        | 512 MB free.                                                                |
| Redis         | Upstash                 | 500K commands/month free.                                                   |
| Contracts     | Arbitrum Sepolia        | Factory deployed once; trios on demand.                                     |

## 11. Scope (Balanced)

**Built:** soulbound token, EIP-1167 clones, protocol fee, reorg-safe + idempotent
indexer, dual-pin IPFS, Slither in CI, delegate voting, campaign-expiry refund.

**Documented as pattern, not enforced:** KYC/AML, geofencing, account-abstraction
gasless UX, fiat on-ramp, multisig-to-propose. See README "Known Scope Boundaries".

## 12. Environment & secrets

Every package validates its env through `@raisedao/shared` (zod); a missing or
malformed variable fails fast at boot. Secrets live only in `.env` (git-ignored); a
committed `.env.example` documents each key. Never commit a deployer private key or
service token.

| Package     | Keys (representative)                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `contracts` | `RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ARBISCAN_API_KEY`                                                                        |
| `api`       | `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `RPC_URL`, `FACTORY_ADDRESS`, `PINATA_JWT`, `WEB3_STORAGE_TOKEN`, `RESEND_API_KEY` |
| `web`       | `NEXT_PUBLIC_API_URL` (also the Socket.IO origin), `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_IPFS_GATEWAY`                 |

## 13. Testing strategy

- Contracts: Hardhat unit tests for every path; Foundry fuzz + invariant for the
  release/refund accounting; Slither in CI (fails on high severity).
- API: integration tests for auth and endpoints; the indexer tested against a
  mocked/forked provider for reorg safety and idempotency.
- Web: typecheck + lint as the baseline gate; component checks on `/lab`; Lighthouse
  on visual-heavy routes before a milestone closes.
