# Demo walkthrough

An end-to-end run of RaiseDAO on Arbitrum Sepolia: launch a campaign, fund it,
pass a milestone vote, release the tranche — and the fail/refund path. Every step
below maps to a real route and the on-chain call behind it. Where a step needs
configuration or a funded wallet, it says so plainly, and where the UI doesn't yet
cover a path, it says that too.

## Prerequisites

- A browser wallet (e.g. MetaMask) on **Arbitrum Sepolia** (chainId `421614`).
- Test **ETH** for gas and test **USDC** (`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`,
  6 decimals) in the wallet you'll fund from.
- The stack running: `pnpm -F @raisedao/api dev` and `pnpm -F @raisedao/web dev`,
  with each package's `.env` filled from its `.env.example`.
- **`NEXT_PUBLIC_FACTORY_ADDRESS`** set in `packages/web/.env.local`. Without it the
  create wizard's deploy step shows an honest "not configured" note instead of
  deploying. A factory is already deployed at
  `0xb88bb092A575d6CE82FbaDcC9a0216aE5BD1a765`; deploy your own with
  `pnpm -F @raisedao/contracts deploy:factory` (needs `DEPLOYER_PRIVATE_KEY`).
- For live tallies, run the API with `INDEXER_ENABLED=true` and the same
  `FACTORY_ADDRESS`. Without the indexer the campaign still works on-chain, but the
  off-chain read models (funding totals, vote tallies, campaign pages) won't update.

## Sign in (all write actions)

Connect the wallet (the **Connect** button in the header), then sign the **SIWE**
challenge — the API issues a JWT used for the few off-chain writes (saving a draft,
persisting campaign metadata, pinning evidence). Protected routes (`/create`,
`/account`) gate their body behind this session.

## 1. Launch a campaign — `/create`

The create wizard walks four steps — **Basics → Economics → Milestones → Review**
— and saves a draft through the API (`POST /drafts`, founder-owned). The milestone step
defines the release schedule as basis-point slices that must sum to 100%.

On the **Review** step the **Deploy on-chain** button (`DeployPanel`) calls
`RaiseFactory.deploy(...)`. In one transaction the factory clones a **GovToken** +
**RaiseVault** (EIP-1167 minimal proxies) and deploys a fresh **MilestoneGovernor**

- **TimelockController**, wiring the roles. It emits `CampaignDeployed(id, vault,
token, governor, founder)`. On confirmation the web persists the display metadata
  and redirects to `/campaigns/<vault>`.

* **Needs:** `NEXT_PUBLIC_FACTORY_ADDRESS` configured and a **funded wallet** (the
  deploy is a real on-chain tx and costs gas).
* The indexer sees `CampaignDeployed` and sets the campaign to **fundraising**.

## 2. Fund it — `/campaigns/<vault>`

The **Contribute** panel runs the standard two-step ERC-20 flow:

1. **Approve USDC** — `USDC.approve(vault, amount)`. The panel reads your live
   allowance and balance, so it shows "Approve" only when needed.
2. **Contribute** — `RaiseVault.contribute(amount)` pulls the USDC and mints
   soulbound **GovToken** to you (the panel reads the minted amount out of the
   `Contributed` event).

Each contribution updates the funding bar live over Socket.IO (when the indexer is
running). Demo/sample campaigns disable contributions on purpose.

> **Honest gap — activating voting power.** GovToken is `ERC20Votes`: holding it is
> not enough; an investor must `delegate(self)` for their balance to count at a
> proposal's snapshot, and the vault does **not** auto-delegate on mint. The web
> has **no delegate button yet**, so to vote in this demo you currently call
> `GovToken.delegate(yourAddress)` directly (e.g. via Arbiscan's "Write Contract"
> on the campaign's token address) **before** a proposal's snapshot block. Without
> delegating, the ballot correctly reports zero weight ("you held no governance
> tokens at the snapshot").

## 3. Pass a milestone vote — `/campaigns/<vault>`

Per milestone the page renders the governance panel (`MilestoneGovernance`):

1. **Founder uploads evidence** — the evidence section pins a file to IPFS via the
   API (`POST /evidence`, Pinata with a web3.storage fallback), returning a CID.
2. **Founder opens the vote** — the founder-only **Open release vote** button
   (`ProposeButton`) calls `MilestoneGovernor.propose(...)`, encoding
   `vault.releaseMilestone(id)` and binding the evidence CID into the proposal.
   The button is disabled until evidence is pinned.
3. **Investors vote** — the **ProposalBallot** shows live quorum and the voter's
   snapshot weight, and enables **Vote for / Vote against** only while the proposal
   is `Active`, the voter has weight, and hasn't voted (`castVote`). Tallies stream
   live over the socket.
4. **Queue + execute** — after the voting period, a passing proposal is queued and,
   once the **2-day timelock** elapses (the `TimelockRing` counts it down), executed.
   These calls are **permissionless** — anyone can trigger them — so the app shows
   the timelock state but does **not** ship a dedicated queue/execute button; in the
   demo you call `queue(...)` / `execute(...)` on the governor directly (Arbiscan or
   a script). Execution runs `vault.releaseMilestone(id)`, sending that slice
   (minus the protocol fee) to the founder.

Governor timing for context: **1-day** voting delay, **3-day** voting period,
**2-day** execution timelock.

## 4. Fail / refund path

Two ways funds become refundable:

- **Vote fails** — investors vote the milestone down (or quorum isn't met and it's
  defeated). The losing branch of governance executes `vault.markFailed(id)`, which
  opens pro-rata refunds for the remaining USDC.
- **Founder goes silent** — if a milestone's deadline passes with no release,
  `vault.forceFail()` is **permissionless**: anyone calls it to open refunds, so a
  passive founder can't freeze funds forever.

Either way, an investor reclaims their share with `vault.claimRefund()` — pro-rata
of the remaining USDC, burning the caller's GovToken shares.

> **Honest gap — refund-claim UI (issue #34).** The contract path
> (`markFailed`, `forceFail`, `claimRefund`) exists and is tested, but the
> **dedicated claim UI lands in issue #34**. Until then, exercise the refund path
> by calling `forceFail()` / `claimRefund()` on the vault directly (Arbiscan or a
> script). The `/account` page is where claimed/refundable positions will surface.

## What this demo proves vs. doesn't

It proves the load-bearing claims: custody no founder controls, milestone-gated
release through a timelock, soulbound token-weighted voting, permissionless escape
hatches, and a live indexed UI — all on free tiers. It does **not** enforce KYC,
geofencing, gasless UX, fiat on-ramp, or multisig admin (see the README's _Known
Scope Boundaries_), and two convenience UIs — delegate and refund-claim — are not
yet wired even though their on-chain paths are.
