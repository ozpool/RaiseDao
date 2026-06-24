# Git & GitHub workflow

The conventions every change in this repo follows. The goal: history that reads
as cleanly human-authored and professional.

## The loop

Milestone (theme) -> Issue (one deliverable) -> branch off `main` -> granular
Conventional Commits -> PR (links the issue) -> review -> **merge commit** ->
branch deleted -> issue closed.

## Branches

- `type/issue-<N>-<short-slug>`, e.g. `feat/issue-7-raise-vault`.
- One issue = one branch, off `main`. Deleted after merge.
- Never force-push a pushed, under-review branch. Never push directly to `main`.

## Commits — Conventional Commits

`type(scope): subject` — lowercase imperative ("add", not "added"), no trailing
period, header **≤ 72 chars**. Body (optional, explains _why_) hard-wrapped at
**≤ 100 chars per line**, blank line after the subject. Several small commits per
issue — never one squashed commit.

| Prefix     | Use for                          |
| ---------- | -------------------------------- |
| `feat`     | new user-visible feature         |
| `fix`      | bug fix                          |
| `refactor` | restructure, no behaviour change |
| `docs`     | documentation only               |
| `test`     | tests only                       |
| `ci`       | CI / pipeline                    |
| `build`    | build system / dependencies      |
| `perf`     | performance                      |
| `chore`    | tooling / config (sparingly)     |

Scope = a real component (`api`, `vault`, `governor`, `web`) or omit it.

## Issue body

```
## User story
As a <role>, I want <capability> so that <outcome>.

## Acceptance criteria
- [ ] <verifiable condition>

## Out of scope
- <what this will NOT do>
```

## PR body

```
## Summary
<2-4 bullets: what changed>

## Why
<1-2 sentences>

## How tested
- <command / output>

Refs #<issue>
```

Title is Conventional. Default link is `Refs #N`. To auto-close the issue on
merge, use `Closes #N` instead — this requires the maintainer to enable the
close-keyword override in the environment; otherwise the maintainer closes the
issue by hand after merging.

## Milestones

Seven milestones (M1–M7), 38 issues total. The **last issue of each milestone** is
a review/wrap-up PR: apply any follow-up fixes, or state explicitly that none are
needed. CI grows with the code — the base pipeline lands in M1, the contracts +
Slither job in M2, deployment config in M7.

## CI gates (per PR)

`pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r build`, `pnpm -r test`. From M2, a
contracts job adds `hardhat compile`, `hardhat test`, and Slither (fails on high
severity). A PR merges only with CI green.

## Identity & hard rules

- Commit/PR identity is always `ozpool` — never any other account or email.
- **No AI/assistant attribution** anywhere — commits, PRs, issues, or pushed
  files. Every artifact reads as human-written.
- GitHub artifacts use plain, professional English.
- `.env*`, `node_modules/`, build output, and local tooling context are
  git-ignored and never committed.
- One PR = one issue = one logical change.

## Local guardrail hooks

PreToolUse hooks enforce these rules and **scan the entire command string**, not
just the commit message — including file paths and any inline PR/issue body.
Practical consequences:

- Never reference a temp/scratch path that contains a tool name in a `git`/`gh`
  command; pass PR/issue bodies inline via a stdin heredoc (`--body-file -`).
- Keep PR/issue body lines `≤ 100` chars too — the commit-convention guard flags
  long lines even when they live in a PR-body heredoc, not a commit.
- The attribution guard blocks any assistant/AI mention anywhere in the command,
  including ignored paths.

## Merge

The maintainer merges with a merge commit (`gh pr merge <n> --merge
--delete-branch`) to preserve the granular commits, then closes the linked issue.
