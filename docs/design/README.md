# Design Reference — AI Engagement (Lightspeed Systems)

Design-stage prototypes and the visual/navigation spec for the app. These are **reference artifacts** (static HTML), not the live application source — they define the target the React/Tailwind UI is built toward. Latest canonical versions as of 2026-06-29.

| File | What it is |
|------|------------|
| `style-nav-guide.html` | Style & navigation guide — palette, type, components, nav rationale, sample screen. |
| `app-mockup-v1.html` | App mockup: left-sidebar nav + agreed IA, Lightspeed brand. |
| `exit-survey-v3.html` | Exit diagnostic (two-part, manager-signal) form, light Lightspeed theme. |

## Design Decisions implemented here
- **DD-001** — Primary navigation: left sidebar (top bar for global actions, in-page tabs for sub-views).
- **DD-002** — Nav IA: Home; Planning {Organization, OKRs, Weekly Plan}; Engagement {PIP, Exit Survey}; System {Admin}.
- **DD-003** — Visual language: Lightspeed Blue (#4FA9D6) + slate, Inter, muted "signal-not-alarm" semantics, shadcn/ui + Tailwind.

Source of record for these DDs: `4-Lightspeed/AI Engagement/2-Design/Design Decisions v1.md` in Dreadnought.
