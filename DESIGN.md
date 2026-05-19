---
theme: "dark-first with a high-quality light option"
grid: 8
radii: [12, 16, 20]
motion:
  duration_ms: { fast: 150, base: 200, slow: 260 }
  easing: "cubic-bezier(0.22, 1, 0.36, 1)"
type:
  fonts:
    sans: Inter
    serif: Playfair Display
    mono: JetBrains Mono
  scale_rem:
    xs: 0.75
    sm: 0.875
    base: 1
    lg: 1.125
    xl: 1.25
    "2xl": 1.5
    "3xl": 1.875
    "4xl": 2.25
    "5xl": 3
color_intent:
  neutrals: "deep graphite, tinted toward violet/blue; never pure black/white"
  accent: "violet-blue used for primary actions, selection, and emphasis"
  semantics: "error/warn/success/info with restrained chroma"
components:
  buttons: "solid/soft/ghost with consistent heights and focus rings"
  inputs: "clear labeling, helper/error text, robust disabled/read-only"
  cards: "surface layers with subtle elevation and borders"
  modals: "layered overlays, keyboard/escape handling, reduced-motion support"
  tabs: "underline/segmented variants with smooth active indicator"
notes:
  - "Keep Tailwind + CSS variables (RGB channels) as the source of truth."
  - "Avoid heavy UI libs; reuse existing patterns and lucide-react icons."
---

Design language: “quiet luxury” research workspace. Surfaces are layered (base → panel → elevated), borders are graphite, text is frost, and the accent is violet/blue. Hover and focus states are always visible; micro-interactions are subtle and fast.

