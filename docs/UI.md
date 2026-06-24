# UI & design system

**Thesis: watch trust become visible.** Every animation must represent something
real about contract state — never decorative motion with no data behind it. The
product's credibility depends on visitors believing every number on screen is
live, not a mockup. When a value is mocked during development, it must look
visibly different from the real treatment (never a fake-but-plausible number).

This document is the source of truth for the frontend. Build against it; if a
choice isn't here, add it here first, then build — that is what keeps later UI
work fast, consistent, and low-iteration.

---

## 1. Non-negotiable principles

1. **Real or visibly fake.** No mocked value may resemble its real treatment.
2. **Calm confirms change.** High-stakes moments use quiet, confirmatory motion —
   never a celebratory burst.
3. **One signature object.** The Vault is the through-line; it appears via one
   shader file everywhere, never re-implemented.
4. **Tokens, never literals.** Colors, type, spacing, motion all come from tokens.
5. **Reduced motion is a requirement**, not a toggle we add later.
6. **Server-first.** Default to Server Components; reach for `'use client'` only
   where interactivity, wallet, 3D, or animation truly needs it.
7. **No layout shift, ever.** Reserve space; preload fonts; size media.

---

## 2. Design tokens

The token file (`src/styles/tokens.css` as CSS variables, mirrored into the
Tailwind theme) is the single source. Never hard-code these values in components.

### Color

| Token         | Hex       | Role                                                  |
| ------------- | --------- | ----------------------------------------------------- |
| `void`        | `#0A0B0E` | base background                                       |
| `panel`       | `#13151A` | cards / surfaces                                      |
| `line`        | `#23262E` | hairlines, dividers                                   |
| `paper`       | `#EDEEF0` | primary text                                          |
| `mist`        | `#8A8F9C` | secondary text                                        |
| `signal`      | `#4F7CFF` | the one "live / actionable" accent                    |
| `gold-unlock` | `#E8B86D` | reserved **only** for fund-release / milestone-unlock |

Usage rules: `signal` marks exactly one primary action or "live" element per view —
overuse kills its meaning. `gold-unlock` is forbidden anywhere except an actual
fund release / milestone unlock. Status colors derive from these (success = a
desaturated signal-green only if needed; error = a single restrained red token
added when first required, documented here).

### Typography

Two families, self-hosted via `next/font` (zero layout shift, no external request):

- **Reading (humanist sans):** IBM Plex Sans — all prose, labels, headings a person
  reads.
- **Data (monospace):** IBM Plex Mono — all numbers, addresses, timers, vote
  counts, tx hashes. The mono face _is_ the signal that "this is data".

Never mix the roles. A dollar amount is always mono; a sentence is always sans.

Type scale (rem, 16px base):

| Step      | Size / line-height | Use                    |
| --------- | ------------------ | ---------------------- |
| `display` | 3.5 / 1.05         | hero headline          |
| `h1`      | 2.25 / 1.1         | page titles            |
| `h2`      | 1.5 / 1.2          | section titles         |
| `body`    | 1.0 / 1.6          | prose                  |
| `small`   | 0.875 / 1.5        | secondary copy         |
| `data-lg` | 2.0 / 1.0 (mono)   | the big live numbers   |
| `data`    | 1.0 / 1.4 (mono)   | inline data, addresses |
| `caption` | 0.75 / 1.4         | captions, tx labels    |

Weights: sans 400/500/600; mono 400/500. No black weights.

### Spacing, radii, hairlines

- Spacing scale (px): 2, 4, 8, 12, 16, 24, 32, 48, 64, 96 — Tailwind defaults align.
- Radii: `sm 6`, `md 10`, `lg 16`. Cards use `md`; the canvas/hero is square-edged.
- Hairlines: 1px `line`; this is the primary structural device — prefer hairlines
  and generous space over heavy fills or shadows. Shadows are near-absent (this is
  a dark, flat, engineered look, not material elevation).

### Motion tokens

Durations (ms): `instant 0`, `fast 120`, `base 200`, `slow 320`, `draw 600`.
Easings (CSS / Framer): `standard cubic-bezier(.4,0,.2,1)`, `decel
cubic-bezier(0,0,.2,1)`, `accel cubic-bezier(.4,0,1,1)`. GSAP equivalents:
`power2.out` (decel), `power2.inOut` (standard). Never exceed `draw` for a single
UI transition; longer = ambient only (Vault rotation, ticker idle).

---

## 3. Tech stack & rendering rules

- **Next.js App Router + TypeScript + Tailwind.** Routes are Server Components by
  default (fast, SEO, no JS cost).
- **Client-only (`'use client'` + dynamic import with `ssr:false`):** anything
  using React Three Fiber, GSAP, Lenis, wagmi hooks, or `window`. Wrap 3D in
  `next/dynamic` so it never runs during SSR (avoids hydration mismatch).
- **wagmi + viem** for wallet/chain. One config in `lib/wagmi.ts`. Reads via wagmi
  hooks against per-campaign addresses looked up from the API.
- **Lenis** for smooth scroll, mounted once at the root; GSAP ScrollTrigger is
  driven off Lenis's scroll (`lenis.on('scroll', ScrollTrigger.update)`).
- **Socket.IO client** in `lib/socket.ts`; one connection, joins/leaves campaign
  rooms; updates feed a store (Zustand or React state) — never poll.
- **Recharts** for dashboards only.

---

## 4. File & folder structure (`packages/web/src`)

```
app/                      # App Router routes (Server Components by default)
  layout.tsx              # fonts, Lenis provider, site chrome
  page.tsx                # landing
  campaigns/page.tsx      # browse grid
  c/[slug]/page.tsx       # campaign detail
  lab/page.tsx            # isolated component test bench (not linked in prod nav)
components/
  vault/                  # VaultCanvas, VaultMesh, vault.frag.glsl, useVaultUniforms
  chrome/                 # Header, Footer, Nav
  campaign/               # CampaignCard, QuorumBar, TimelockRing, VoteRail, SvgFill
  motion/                 # DrawLine, Ticker, Reveal, MechanismDiagram
  ui/                     # Button, Field, Badge, Skeleton (token-driven primitives)
lib/                      # api client, wagmi config, socket, format helpers
hooks/                    # useReducedMotion, useCampaign, useLiveTally
styles/                   # tokens.css, globals.css
```

Keep files small and single-purpose (~150 lines). One component per file. Shaders
live in `.glsl` files imported as strings, never inlined as template literals.

---

## 5. The signature object — "The Vault"

A low-poly icosphere-derived mesh (abstract reads as "protocol"; a literal chest
reads as a toy) rendered with one custom GLSL material, reused everywhere.

### Component API

```tsx
<Vault
  fillLevel={number}        // 0..1, real fundsRaised / fundsTarget
  lod="full" | "card"       // full: hero + detail; card: cheap grid variant
  state="loading" | "live" | "unlocking"
  seamPulse={number}        // 0..1, set to 1 on a milestone release, decays to 0
/>
```

`VaultCanvas` owns the R3F `<Canvas>` (dpr clamped `[1, 1.75]`, `frameloop`
`demand` when idle); `VaultMesh` owns geometry + material; `useVaultUniforms` maps
props → shader uniforms and animates `seamPulse` decay. Mocked `fillLevel` renders
the mesh in a desaturated "placeholder" state (see §9), never a plausible level.

### Shader uniforms

| Uniform       | Type  | Source / meaning                            |
| ------------- | ----- | ------------------------------------------- |
| `uFillLevel`  | float | 0..1 vertical fill mask (real data)         |
| `uTime`       | float | clock, for the rim shimmer + seam animation |
| `uSeamPulse`  | float | 0..1 gold pulse, fired once per release     |
| `uColorBase`  | vec3  | `panel`                                     |
| `uColorFill`  | vec3  | `signal`                                    |
| `uColorGold`  | vec3  | `gold-unlock`                               |
| `uFresnelPow` | float | rim falloff (~3.0)                          |

### Shader algorithm (fragment)

```
// vertical fill: local Y in [-1,1] -> [0,1]
float h = (vLocalPos.y + 1.0) * 0.5;
float fill = smoothstep(uFillLevel - 0.02, uFillLevel + 0.02, h); // soft waterline
vec3 col = mix(uColorFill, uColorBase, fill);                     // filled below line

// fresnel rim glow (cheap "expensive" look)
float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPow);
col += uColorFill * fres * 0.6;

// seam pulse: edge-weighted gold flash, decays via uSeamPulse
float seam = edgeFactor(vBary);              // 1 at triangle edges
col = mix(col, uColorGold, seam * uSeamPulse);

gl_FragColor = vec4(col, 1.0);
```

### LOD & performance budget

- **full:** single mesh, icosphere detail ~2, target ≤ ~2k triangles, one material,
  **no per-frame allocations** (pre-build vectors; mutate uniforms in place).
- **card:** detail ~0–1, ≤ ~320 triangles; if many on screen, use a shared geometry
  - material. Prefer the **SVG fill** (§8) over live 3D in grids — cards default to
    SVG; 3D mini-vaults are out of scope for cinematic-lite.
- Targets: 60fps desktop, **30fps floor** on mid mobile. Cap dpr; pause the render
  loop when the canvas is offscreen (IntersectionObserver) or the tab is hidden.
- Lazy-load: `const VaultCanvas = dynamic(() => import('...'), { ssr:false })`,
  mounted only after core content paints.

### Reduced motion

`prefers-reduced-motion` → freeze rotation, hold `seamPulse` at 0, render a static
frame at the correct `fillLevel`. Never disable the data readout, only the motion.

### Lab-first rule

Build and tune the Vault (and every non-trivial visual) in isolation on
`/lab` first, at 4× CPU throttle and a mobile viewport, **before** wiring it into a
page. This is the single biggest credit-saver: isolate, get one screenshot
confirmation, then integrate.

---

## 6. Motion system

- Page/element entrances: `Reveal` primitive — fade + 8px rise, `base`/`decel`,
  staggered ≤ 60ms; honors reduced-motion (instant).
- The arrival "transaction" line: a 1px SVG path drawing left→right over `draw`,
  pulsing `gold-unlock` once at the end — this _is_ the loading state (pure
  SVG/CSS, no asset wait).
- Live number changes: digits flip individually (departure-board) only when the
  value actually changes; unchanged digits stay still.
- The notification is a color shift, not a toast: the quorum bar moves `signal →
gold-unlock` at the instant quorum is met.
- Scroll the user controls: the mechanism diagram is GSAP ScrollTrigger
  scrub-driven; the user's scroll speed drives assembly. Never autoplay.

---

## 7. Cinematic-lite moments (what ships)

| Moment         | Behavior                                                                                               | Reduced-motion fallback      |
| -------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Arrival        | hairline draws in, pulses gold, wordmark fades from the pulse                                          | static wordmark              |
| Hero / Vault   | full Vault, ~1 rev / 40s, cursor parallax ≤ 4°; live funds-locked ticker                               | static Vault, static ticker  |
| Mechanism      | scroll-pinned Factory→Vault→Governor→Indexer→Database, scrub-driven, one explanation visible at a time | plain fade sequence, no pin  |
| Live grid      | bento cards, each with a real SVG fill; hover: 1px gold border trace                                   | no hover motion              |
| Control room   | full Vault, quorum bar, timelock ring, vote rail                                                       | static states, values intact |
| Trust / footer | zero animation, mono facts, Etherscan links                                                            | identical                    |

Out of scope (stretch only): per-card live 3D, the facet-building wizard preview,
the smaller moments.

---

## 8. Key component contracts

Each component declares: props, the four states it must handle, its data source,
and a definition of done. Build every one on `/lab` first.

- **SvgFill** — `props { value: 0..1, mock?: boolean }`. A lightweight vertical/
  horizontal fill for cards. States: loading (skeleton), empty (0 + mist), live,
  mock (dashed outline). DoD: pixel-correct at the real ratio, no JS animation cost.
- **QuorumBar** — `props { votes, total, quorum }`. Horizontal bar with a threshold
  tick; color flips to `gold-unlock` exactly at quorum. States: pre-quorum,
  at-quorum, error, syncing. DoD: the flip is driven by real tally, aria-live polite.
- **TimelockRing** — `props { unlockAt }`. Draining circular ring answering "can I
  act yet" with no text. States: locked (draining), unlocked, n/a. DoD: time math
  from chain timestamp; reduced-motion shows a static arc + label.
- **Ticker / TickerDigit** — `props { value }`. Departure-board flip on change only.
  DoD: only changed digits animate; mono; aria-live for the whole figure.
- **CampaignCard** — `props { campaign }`. Bento card with SvgFill, verified count,
  average. States: loading/empty/error/live; badges load in a second pass. DoD: no
  CLS when badges arrive.
- **MechanismDiagram** — scroll-pinned SVG nodes + animated dash-offset "current".
  DoD: scrub-bound to scroll; reduced-motion → fade list.
- **VoteRail** — voter address slides into a thin bottom rail on a confirmed vote,
  200ms fade. DoD: quiet, never celebratory; truncated mono address links to tx.

---

## 9. Data honesty (real vs mock)

While an indexer/endpoint is not yet wired, mocked values render in a distinct
**placeholder treatment**: `mist` color, dashed 1px outline, or a skeleton — plus a
small dev-only `MOCK` badge. A mocked number must never appear in the final mono
"live" style. A `mock` prop threads through components that can show placeholder
data. Removing mocks is a checklist item before any milestone closes.

---

## 10. Accessibility checklist (WCAG 2.2 AA)

- [ ] Visible focus ring (`signal`, 2px) on every interactive element.
- [ ] Contrast: `paper` on `void` ≥ 7:1; `mist` only for non-essential text;
      verify `signal`/`gold-unlock` text uses ≥ 4.5:1 or is paired with a label.
- [ ] Full keyboard path through connect → contribute → vote → claim.
- [ ] Live regions: tally, quorum, and ticker updates use `aria-live="polite"`.
- [ ] `prefers-reduced-motion` honored on Vault, scroll-pin, parallax, ticker.
- [ ] All canvas/icon-only controls have text alternatives.
- [ ] Hit targets ≥ 44px on touch.

---

## 11. Performance budgets & verification

- Lighthouse (mobile, throttled) ≥ **90** performance and **95** accessibility
  before a milestone closes.
- No CLS from fonts (self-hosted `next/font`) or late badges (reserve space).
- 3D lazy-loaded after first paint; canvas paused when offscreen/hidden.
- Initial route JS kept lean: 3D, GSAP, charts are dynamic-imported per route.
- Verify each visual at 4× CPU throttle + a 360px viewport before integration.

---

## 12. Anti-patterns (reject on sight)

- Generic AI/template look: centered gradient-blob hero, purple-on-dark, emoji
  bullets, glassmorphism for its own sake.
- Motion without data behind it; celebratory bursts on financial actions.
- Live 3D inside long lists/grids (use SvgFill).
- `'use client'` on a whole route when only a leaf needs it.
- Hard-coded colors / fonts / durations instead of tokens.
- Layout shift from late-loading media, badges, or fonts.
- Re-implementing the Vault shader instead of importing the one file.

---

## 13. The build & verify loop (credit-efficient)

For every UI task, in order: (1) confirm what data is real vs mocked; (2) build the
component in isolation on `/lab`; (3) test at 4× throttle + mobile viewport and
capture one screenshot for confirmation; (4) only then integrate into the page; (5)
run typecheck/lint/build; (6) reduced-motion + a11y pass. Isolating first and
confirming once — rather than tweaking live in a full page — is what keeps UI work
low-iteration and low-credit.

---

## 14. Definition of Done (every UI PR)

- [ ] Tokens only; no literals. Reading=sans, data=mono enforced.
- [ ] Loading / empty / error / live states all handled.
- [ ] Real data wired, or mocks visibly distinct + tracked for removal.
- [ ] `prefers-reduced-motion` path implemented.
- [ ] No CLS; 3D/heavy libs lazy-loaded; offscreen canvas paused.
- [ ] Keyboard + aria-live where relevant; focus rings present.
- [ ] `pnpm -F @raisedao/web typecheck && lint && build` green; Lighthouse checked
      for visual-heavy pages.
