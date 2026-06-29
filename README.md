# RaiseDAO

**Milestone-gated crowdfunding with on-chain investor governance.**

Founders raise USDC into a smart-contract vault. Funds unlock **one milestone at a
time, and only when investors vote to approve each delivered milestone.** A failed
or expired milestone makes the remaining funds claimable pro-rata. No platform,
admin, or founder can override the rules; they are enforced by code.

![Solidity](https://img.shields.io/badge/Solidity-0.8.30-363636)
![Network](https://img.shields.io/badge/network-Arbitrum%20Sepolia-1f7ae0)
![Frontend](https://img.shields.io/badge/Next.js-App%20Router-000000)
![License](https://img.shields.io/badge/license-MIT-3fb950)

> **Status:** active development, testnet only. This is a portfolio capstone, not a
> production financial product, and the contracts have not been independently
> audited. See [Security](#security) and [Scope boundaries](#scope-boundaries).

---

## Table of contents

- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Smart contracts](#smart-contracts)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Scope boundaries](#scope-boundaries)
- [Documentation](#documentation)
- [License](#license)

---

## Why this exists

Crowdfunding has one structural failure: backers pay before delivery and have no
leverage afterward. RaiseDAO replaces trust in a person with custody and voting
enforced on-chain.

- **Custody no founder controls.** Contributions sit in a per-campaign vault. Only
  a passing milestone vote can release them.
- **Programmable refund rights.** A failed or expired milestone opens pro-rata
  refunds, enforced by the same contract that handles releases.
- **Tamper-proof voting.** Every vote is an on-chain transaction. There is no admin
  override and no privileged withdrawal.

## How it works

A single raise moves through a fixed lifecycle:

1. **Launch.** The founder calls the factory, which deploys and wires a vault, a
   soulbound governance token, a governor, and a timelock for that campaign.
2. **Fund.** Backers contribute USDC into the vault and receive non-transferable
   voting power equal to their contribution.
3. **Propose.** When a milestone is ready, the founder opens an on-chain release
   vote.
4. **Vote.** Backers vote with their snapshot voting power. The vote must reach
   quorum to count.
5. **Release.** A passing vote is queued behind a timelock, then anyone may execute
   it. The vault sends that milestone's tranche to the founder, less the protocol
   fee.
6. **Repeat or refund.** The cycle continues for the next milestone. If a milestone
   is rejected, or its deadline passes without a release, refunds open and backers
   reclaim their share.

The full protocol design, economics, and known limitations are written up in the
[white paper](https://github.com/ozpool/RaiseDao) (also served in-app at `/docs`).

## Architecture

Money and rules live on-chain. Everything that does not need contract enforcement,
such as titles, summaries, and images, lives in MongoDB. An in-process indexer
reads chain events and keeps the off-chain read model in sync.

```
                    Founder / Backers (wallet)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                 ▼
        Next.js web      Express API       Smart contracts
        (wagmi/viem)   (auth, metadata)   (Arbitrum Sepolia)
                              │                 │
                         MongoDB          RaiseFactory
                              ▲          ┌──────┴───────┐
                              │          ▼              ▼
                       in-process     RaiseVault   Governor
                        indexer  ◄──  GovToken     Timelock
                     (reads events)
```

Per campaign, the factory deploys four contracts and wires their roles so that only
the timelock (acting on a passed vote) can move the vault's funds. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow and failure
modes.

## Smart contracts

Deployed on **Arbitrum Sepolia** (chain id 421614). The factory is deployed once;
each raise clones a vault and token and deploys its own governor and timelock.

| Contract          | Address                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| RaiseFactory      | [`0xb88bb092A575d6CE82FbaDcC9a0216aE5BD1a765`](https://sepolia.arbiscan.io/address/0xb88bb092A575d6CE82FbaDcC9a0216aE5BD1a765) |
| RaiseVault (impl) | [`0xE2d5c1084C2293486D2b8D82d7965916Aa036D0e`](https://sepolia.arbiscan.io/address/0xE2d5c1084C2293486D2b8D82d7965916Aa036D0e) |
| GovToken (impl)   | [`0x5B82ceDB05076B6aA947Ede31F0C4853898d0c37`](https://sepolia.arbiscan.io/address/0x5B82ceDB05076B6aA947Ede31F0C4853898d0c37) |
| TimelockDeployer  | [`0x703A065Ec94DDDe79F8477b5F036e068CBA78889`](https://sepolia.arbiscan.io/address/0x703A065Ec94DDDe79F8477b5F036e068CBA78889) |
| GovernorDeployer  | [`0xE640933cb94b1DCC967a3d188bc85AF5365d4bdF`](https://sepolia.arbiscan.io/address/0xE640933cb94b1DCC967a3d188bc85AF5365d4bdF) |
| USDC (settlement) | [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |

Contract source is verified on Arbiscan. The per-campaign vault and token are
ERC-1167 minimal-proxy clones of the implementations above, so Arbiscan resolves
them to the verified source automatically.

## Tech stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Contracts | Solidity 0.8.30, OpenZeppelin Governor, Hardhat (Foundry for fuzz)            |
| Chain     | Arbitrum Sepolia testnet, USDC                                                |
| Backend   | Express + TypeScript, MongoDB (Mongoose), in-process indexer (ethers)         |
| Realtime  | Socket.IO with an optional Upstash Redis adapter                              |
| Frontend  | Next.js (App Router), Tailwind, wagmi/viem, React Three Fiber, GSAP, Recharts |
| Evidence  | IPFS (Pinata with a web3.storage fallback)                                    |
| Auth      | Sign-In with Ethereum (SIWE), JWT sessions                                    |

## Repository layout

```
packages/
  contracts/   Solidity contracts, Hardhat config, deploy + verify scripts
  api/         Express API and the in-process chain indexer
  web/         Next.js frontend
  shared/      env schema, contract addresses, ABIs, shared constants
docs/          ARCHITECTURE.md, GIT.md, UI.md, DEMO.md
```

## Getting started

Requires Node 22+ and pnpm 9.

```bash
pnpm install          # install all workspaces
pnpm -r typecheck     # type-check every package
pnpm -r lint          # lint every package
pnpm -r test          # run every package's tests
pnpm -r build         # build every package
```

Run a single package with a filter, for example:

```bash
pnpm -F @raisedao/web dev          # frontend dev server
pnpm -F @raisedao/api dev          # API + in-process indexer
pnpm -F @raisedao/contracts test   # contract test suite
```

Each package ships an `.env.example` documenting every variable it reads. Copy it
to `.env` (or `.env.local` for the web app) and fill in the values.

## Testing

| Package   | Command                            | Covers                                             |
| --------- | ---------------------------------- | -------------------------------------------------- |
| contracts | `pnpm -F @raisedao/contracts test` | vault escrow, releases, refunds, governance wiring |
| api       | `pnpm -F @raisedao/api test`       | auth, indexer decoding, tally aggregation, scoring |
| web       | `pnpm -F @raisedao/web typecheck`  | types across the App Router and hooks              |

Continuous integration runs lint, type-check, the test suites, and Slither static
analysis on the contracts.

## Deployment

Everything runs on free tiers and one testnet, by design.

| Component      | Host               | Notes                                                              |
| -------------- | ------------------ | ------------------------------------------------------------------ |
| Web            | Vercel             | Next.js App Router. Root directory `packages/web`.                 |
| API + indexer  | Render web service | One service; the indexer runs in-process (`INDEXER_ENABLED=true`). |
| Database       | MongoDB Atlas      | Free M0 tier.                                                      |
| Realtime cache | Upstash Redis      | Optional; adds the cross-instance Socket.IO adapter.               |
| Contracts      | Arbitrum Sepolia   | RaiseFactory deployed once; a contract set per raise.              |
| Keep-warm      | UptimeRobot        | Pings `/health` so the free instance does not sleep.               |

The API ships a [`render.yaml`](render.yaml) blueprint. Vercel needs no config
file: import the repo, set the root directory to `packages/web`, and add the
`NEXT_PUBLIC_*` variables from [`packages/web/.env.example`](packages/web/.env.example).

To deploy the contracts and verify their source:

```bash
pnpm -F @raisedao/contracts deploy:factory   # deploys the factory + implementations
pnpm -F @raisedao/contracts verify:factory   # publishes source to Arbiscan
```

## Security

- **Isolated custody.** Each campaign has its own vault. Funds are never pooled
  across campaigns.
- **Single money path.** The only function that moves funds is callable solely by
  the timelock, and only as the result of a passing vote.
- **Guaranteed refunds.** The refund path uses the same contract as the release
  path, so it cannot be blocked or delayed by the platform.
- **Permissionless escape hatch.** If a founder goes inactive past a milestone
  deadline, anyone can fail that milestone and open refunds.
- **Audited foundations, unaudited protocol.** Governance, access control, and the
  token build on OpenZeppelin's audited libraries. The RaiseDAO contracts
  themselves have **not** been independently audited and should not hold funds of
  real value.

Known governance limitations, including self-funding and Sybil risk, are documented
honestly in the [white paper](https://github.com/ozpool/RaiseDao) under Risks.

## Scope boundaries

RaiseDAO is a portfolio capstone running on free tiers and a testnet.

**Built and wired up:** ERC-1167 clones per raise, a soulbound vote token, a
protocol fee, a reorg-safe in-process indexer, dual-pin IPFS, Slither in CI,
ERC20Votes delegate voting, milestone-gated USDC escrow, token-weighted governance
through a timelock, SIWE auth, and a live WebSocket vote tally.

**Demonstrated as a pattern, not production-hardened:** KYC and AML, geofencing,
account-abstraction gasless UX, fiat on-ramp, and a multisig admin or
multisig-to-propose requirement. Real legal review and a paid security audit would
be required before handling real money.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, contracts, data flow, failure modes
- [`docs/GIT.md`](docs/GIT.md) — branching, commits, PR and issue conventions, CI gates
- [`docs/UI.md`](docs/UI.md) — design system, the Vault, motion, and accessibility
- [`docs/DEMO.md`](docs/DEMO.md) — end-to-end walkthrough: launch, fund, vote, release, refund

## License

Released under the [MIT License](LICENSE).
