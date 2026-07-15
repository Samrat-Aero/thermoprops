# DESIGN.md — thermoprops.com

## 1. Aesthetic direction
Clean, precise, "scientific instrument panel" feel — not a spreadsheet, 
not a marketing landing page. Polished and premium through precision and 
restraint, not through borrowing another brand's palette.

## 2. Color palette
- Primary: deep teal/blue (reads "thermal/technical")
- Accent: warm amber for calculated/interpolated values (visually 
  distinct from raw looked-up table data)
- Neutral: near-white background (light), slate-900 (dark)

## 2b. Dark mode
Build all color tokens as CSS variables from the start (not hardcoded 
hex values) so dark mode is a token swap, not a rewrite.
- Light mode: off-white background, deep teal primary, amber accent
- Dark mode: slate-900 background, lighter teal (for contrast), same 
  amber accent (works on both)
- **Switchable via a visible toggle in the header** (sun/moon icon), 
  defaulting to system preference (`prefers-color-scheme`) on first 
  visit, then persisted via `localStorage` so the user's explicit choice 
  survives page reloads and future visits
- Toggle must update instantly (no flash of wrong theme on load — 
  read the stored preference before first paint)
- Monospace data values: ensure sufficient contrast in both modes — 
  non-negotiable, since a misread digit on a low-contrast dark cell 
  could cause a wrong calculation

## 3. Typography
- Headings: Inter or Space Grotesk
- All numeric/data values: monospace (e.g. JetBrains Mono) — aligns 
  decimals visually, critical for engineering tables
- Type scale: use a consistent ratio (e.g. 1.25 major third) across 
  all heading levels — no arbitrary font sizes

## 4. Spacing & density
- All spacing (padding, margin, gaps) must snap to a 4px base grid 
  (4, 8, 12, 16, 24, 32, 48, 64px) — no arbitrary values
- Compact, scan-friendly — reference tool, not a story

## 5. Component conventions
- Interpolated values get a distinct badge/highlight vs. direct table values
- Every calculator shows its bracketing source rows inline, collapsible
- Unit toggle (SI default, allow display switch where relevant)
- Cards/panels use a subtle border + soft shadow for depth (avoid flat, 
  undifferentiated blocks of content)

## 6. Tone/copy
Technical, direct, no marketing language. Cite Cengel table numbers 
(A-11, A-12, A-13) for credibility and traceability.

## 7. Motion & micro-interactions
- Subtle transitions only (150–200ms ease): hover states on buttons/cards, 
  highlight fade-in on calculated values, smooth theme-toggle transition
- No decorative animation — every motion cue should communicate state 
  change (hover, focus, "value just calculated"), never purely ornamental

## 8. Responsive behavior
Mobile-first: tables must remain readable on small screens (horizontal 
scroll with sticky first column, not squeezed text).

## 9. Accessibility
WCAG AA contrast minimum in both light and dark modes. All calculator 
inputs properly labeled for screen readers. Visible focus rings on all 
interactive elements (never `outline: none` without a replacement).