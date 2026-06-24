# UI & design system

**Thesis: watch trust become visible.** Every animation must represent something
real about contract state — never decorative motion with no data behind it. The
product's credibility depends on visitors believing every number on screen is
live, not a mockup. When a value is mocked during development, it must look
visibly different from the real treatment (never a fake-but-plausible number).

## Design tokens

The token file is the single source for the palette; never hard-code these.

| Token         | Hex       | Role                                                  |
| ------------- | --------- | ----------------------------------------------------- |
| `void`        | `#0A0B0E` | base background                                       |
| `panel`       | `#13151A` | cards / surfaces                                      |
| `line`        | `#23262E` | hairlines, dividers                                   |
| `paper`       | `#EDEEF0` | primary text                                          |
| `mist`        | `#8A8F9C` | secondary text                                        |
| `signal`      | `#4F7CFF` | the one "live / actionable" accent                    |
| `gold-unlock` | `#E8B86D` | reserved **only** for fund-release / milestone-unlock |

**Type:** a monospace face for all numbers, addresses, timers, and vote counts; a
humanist sans for all reading copy. The split itself signals "this is data" vs
"this is for you" — never mix the roles.

## The signature object — "The Vault"

One 3D element, reused everywhere via a single shader file.

- A low-poly icosphere-derived mesh (abstract reads as "protocol"; a literal chest
  reads as a toy) with a custom **GLSL fragment shader**.
- Shader uniforms: `fillLevel` (driven by real `fundsRaised / fundsTarget`), a
  Fresnel rim glow (cheap, looks expensive), and a `seamPulse` that fires
  `gold-unlock` once per milestone release.
- **One shader, two LODs**: full detail on the hero and campaign-detail pages; a
  cheap variant elsewhere. Never two separate visual treatments.
- It is never decorative — it is a real-time readout of contract state wearing a
  shader.

## Motion principles

- Calm confirms change. High-stakes moments (a vote landing, quorum met) use quiet,
  confirmatory motion — never a celebratory burst.
- Color shift is the notification: the quorum bar shifts `signal -> gold-unlock` at
  the instant quorum is met. That shift replaces a toast.
- Scroll the user controls: the mechanism diagram is GSAP ScrollTrigger
  scrub-driven, so the user's scroll speed drives the animation — not autoplay.

## Reduced motion (required, not optional)

`prefers-reduced-motion` is honored everywhere: freeze the Vault rotation, replace
the scroll-pinned section with a simple fade sequence, and disable parallax. This
is an accessibility requirement.

## Build ambition — "cinematic-lite"

What ships:

- **Full** R3F + GLSL Vault on the hero and campaign-detail pages.
- **Full** scroll-pinned "how it works" mechanism diagram (Factory -> Vault ->
  Governor -> Indexer -> Database), one explanation visible at a time.
- Cards use a **cheap SVG fill indicator** (real `raised/target`) — **not** live 3D
  mini-vaults, to keep grids and mobile fast.

Stretch (only if a milestone finishes ahead): the facet-building wizard preview,
and the smaller cinematic moments.

## Component inventory (by milestone)

- **M4:** design tokens, Lenis smooth scroll, wallet connect + SIWE, the Vault
  (isolated `/lab` page), landing + hero with the live funds-locked ticker.
- **M5:** creation wizard (milestone-schedule editor), factory-deploy flow, browse
  grid (filters + SVG fill), campaign detail + contribute flow.
- **M6:** evidence upload + IPFS viewer, voting ballot, live tally + quorum bar +
  timelock ring, scroll-pinned mechanism diagram, execute/release UX.
- **M7:** founder + investor dashboards (Recharts), refund flow, admin flagging
  panel, trust/footer (deliberately zero animation), a11y + mobile-LOD pass.

## Accessibility

WCAG 2.2 AA on the key flows. Mobile caps the Vault to one LOD and lazy-loads 3D
after core content. The trust/footer section has no animation — stopping all
motion there signals "here are just the facts", the highest-trust move on a
financial product.
