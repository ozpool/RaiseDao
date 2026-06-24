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

## Known Scope Boundaries

RaiseDAO runs on free tiers and a testnet. The following are **demonstrated as
patterns, not production-enforced**: KYC/AML, geofencing, account-abstraction
gasless UX, fiat on-ramp, and a multisig requirement for milestone proposals.
Real legal review and a paid security audit would be required before handling
real money. This list is expanded in the deployment milestone.

## License

MIT
