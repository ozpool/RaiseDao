# RaiseDAO

Milestone-gated crowdfunding with on-chain investor governance. Founders raise
USDC into a vault contract; funds unlock **only** when investors vote to approve
each delivered milestone. A failed milestone makes the remaining funds claimable
pro-rata. No platform, admin, or founder can override the rules — they are
enforced by code.

> **Status:** in active development (testnet only). This is a portfolio capstone,
> not a production financial product. See **Known Scope Boundaries** below.

## Why this exists

Crowdfunding has one structural failure: backers pay before delivery and have no
leverage afterward. RaiseDAO replaces trust-in-a-person with custody and voting
enforced on-chain:

- **Custody no founder controls** — USDC sits in a vault; only a passing vote releases it.
- **Programmable refund rights** — a failed milestone vote unlocks pro-rata refunds.
- **Tamper-proof voting** — every vote is an on-chain transaction; no admin override.

## Stack

| Layer     | Tech                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Contracts | Solidity 0.8.30, OpenZeppelin Governor, Hardhat (Foundry for fuzz)             |
| Chain     | Arbitrum Sepolia testnet, USDC                                                 |
| Backend   | Express + TypeScript, MongoDB (Mongoose), in-process indexer (ethers)          |
| Realtime  | Socket.IO + Upstash Redis                                                      |
| Frontend  | Next.js (App Router) + Tailwind, wagmi/viem, React Three Fiber, GSAP, Recharts |
| Evidence  | IPFS (Pinata + web3.storage)                                                   |

## Monorepo layout

```
packages/
  contracts/   Solidity contracts + Hardhat
  api/         Express API + the in-process chain indexer
  web/         Next.js frontend
  shared/      env schema, contract addresses, ABIs, constants
docs/          ARCHITECTURE.md, GIT.md, UI.md
```

## Quick start

```bash
pnpm install          # Node >= 22, pnpm 9
pnpm -r lint          # lint every package
pnpm -r typecheck     # type-check every package
pnpm -r build         # build every package
pnpm -r test          # run tests (passWithNoTests until tests exist)
```

Per-package work uses filters, e.g. `pnpm -F @raisedao/web dev`.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, contracts, data flow, failure modes
- [`docs/GIT.md`](docs/GIT.md) — branching, commits, PR/issue conventions, CI gates
- [`docs/UI.md`](docs/UI.md) — design system, the Vault, motion and accessibility
- [`docs/DEMO.md`](docs/DEMO.md) — end-to-end walkthrough: launch → fund → vote → release/refund

## Deployment

Everything runs on free tiers and one testnet, by design.

| Piece          | Host                    | Notes                                                                     |
| -------------- | ----------------------- | ------------------------------------------------------------------------- |
| Web            | Vercel Hobby            | Next.js App Router. Root directory `packages/web`; edge, no cold start.   |
| API + indexer  | Render free web service | One service — the indexer runs **in-process** (`INDEXER_ENABLED=true`).   |
| Database       | MongoDB Atlas M0        | 512 MB free.                                                              |
| Realtime cache | Upstash Redis           | OPTIONAL — only adds the cross-instance Socket.IO adapter.                |
| Contracts      | Arbitrum Sepolia        | RaiseFactory deployed once; a vault/token/governor trio per raise.        |
| Keep-warm      | UptimeRobot             | Pings Render's `/health` every ~10 min so the free instance never sleeps. |

The API ships a [`render.yaml`](render.yaml) Blueprint (build the `api` workspace,
start `node dist/server.js`, health check `/health`, env vars as dashboard
placeholders). **Vercel** needs no config file: import the repo, set the root
directory to `packages/web`, and add the `NEXT_PUBLIC_*` vars from
[`packages/web/.env.example`](packages/web/.env.example). Each package's
`.env.example` documents every variable it reads.

### Free-tier vs needs-budget

What the demo proves on $0, and what production money would buy:

| Capability       | Free-tier (today)                | Needs budget (later)                         |
| ---------------- | -------------------------------- | -------------------------------------------- |
| Indexer          | In-process inside the API        | A dedicated indexer worker process           |
| RPC              | Public Arbitrum Sepolia endpoint | A paid RPC with higher rate limits           |
| IPFS gateway     | Public gateway (ipfs.io)         | A dedicated/pinned gateway                   |
| Scale            | Single instance                  | Multi-instance via the Upstash Redis adapter |
| Database / cache | Atlas M0 + Upstash free          | Paid Atlas / Redis tiers                     |
| Ops              | UptimeRobot keep-warm            | Real monitoring + alerting                   |

## Known Scope Boundaries

RaiseDAO runs on free tiers and a testnet — it is a portfolio capstone, not a
production financial product. Being honest about the line:

**Built for real** (cheap, high-value upgrades, actually wired up): EIP-1167
minimal-proxy clones per raise, a soulbound-style investor/vote token, a protocol
fee, the reorg-safe in-process indexer, dual-pin IPFS (Pinata with a web3.storage
fallback), Slither in CI, delegate (ERC20Votes) voting, milestone-gated USDC
escrow, token-weighted governance through a timelock, SIWE auth, and the live
WebSocket tally.

**Pattern shown, not enforced** (demonstrated, not production-hardened): KYC/AML,
geofencing, account-abstraction gasless UX, fiat on-ramp, and a multisig admin /
multisig-to-propose requirement. Real legal review and a paid security audit would
be required before handling real money.

## License

MIT
