# thermoprops.com — Phase 2 Handoff Document
**Prepared: July 18, 2026 · Owner: Samrat (GitHub: Samrat-Aero) · Status: Phase 1 complete & live**

This document is designed to be pasted into a new chat thread (with any Claude model, including smaller ones) to continue development with full context. Read it fully before making any changes.

---

## 1. WHAT EXISTS TODAY (Phase 1 — complete, live, verified)

**Live site:** https://thermoprops.com (Cloudflare Workers, auto-deploys from GitHub `Samrat-Aero/thermoprops`, branch `main`)

**What it is:** An interactive R-134a property reference and interpolation tool for RAC/thermodynamics students. It replaces flipping through textbook appendix tables — but it is deliberately NOT a homework solver.

**Tech stack (do not change without strong reason):**
- Astro 5 (islands architecture, static output — `output: "static"`)
- Tailwind CSS v4
- TypeScript (pure functions, no backend, no database — all data ships as static JSON)
- Vitest for unit tests
- Deployed via `wrangler.jsonc` at project root (assets directory `./dist`)
- Local dev: Windows, `C:\Projects\thermoprops`, VS Code + Claude Code

**Current structure:**
- `src/data/*.json` — R-134a tables: saturated-by-temperature, saturated-by-pressure, superheated vapor (extracted from a standard thermo textbook appendix, cross-verified against NIST WebBook)
- `src/lib/interpolation.ts` — `linearInterpolate`, `bilinearInterpolate`, `inverseInterpolateByProperty` — pure, unit-tested
- `src/pages/r134a/properties.astro` + `src/components/PropertiesCalculator.astro` — unified Property Finder with 4 tabs: Saturated (by T or P), Superheated, Two-Phase Mixture (quality x), Find State from Known Property (s/h/u/v)
- Old standalone pages 301-redirect to `/r134a/properties?tab=...`
- Supporting pages: Homepage, About, FAQ, Privacy, Contact (mailto: samratb.aero@gmail.com)
- PWA: `public/manifest.json`, `icon-192.png`, `icon-512.png`, theme-color `#0b1220`, installable, standalone display
- Mobile: responsive, verified on real device; bracketing table scrolls horizontally with a "← Swipe to see both bracketing columns →" hint (mobile-only, `sm:hidden`)

**Design system (in DESIGN.md at project root):** teal primary, amber accent for CALCULATED values, monospace for all numeric data, dark mode with system-preference default + manual toggle, 4px spacing grid, WCAG AA contrast.

---

## 2. NON-NEGOTIABLE PRODUCT PRINCIPLES (locked in CLAUDE.md — enforce these)

1. **Linear interpolation only, between table rows.** Matches hand-calculation pedagogy. NEVER swap in equation-of-state computation as a shortcut. The whole point is that results match what a student gets by hand from the same table.
2. **Every result shows its work:** DIRECT vs CALCULATED badges, plus the bracketing source rows and the interpolation fraction used.
3. **Lookup aid, not a homework solver.** No compressor efficiency corrections, no automatic COP/work/heat computations, no full-cycle solving. Those judgment steps belong to the student. (Samrat personally caught and reverted scope creep on this once — respect the boundary.)
4. **No textbook author names or table numbers on user-facing pages** (e.g., no "Cengel", no "Table A-11"). Internal code/docs/tests may reference them for provenance. Source PDFs live in `/reference` which is gitignored — never commit or push copyrighted source material; only extracted numeric values are public.
5. **Every data table added must be cross-verified** against an independent source (NIST WebBook is the gold standard) plus internal consistency checks (e.g., ug = uf + ufg, hg = hf + hfg, sg = sf + sfg) before shipping.
6. **Free-tier infrastructure only.** No paid services, no backend, no database.

---

## 3. PHASE 2 VISION

**Goal:** Expand thermoprops.com from "R-134a tool" into **the interactive property-table reference for thermodynamics students** — so complete that a student never needs to open printed steam tables or refrigerant appendices again. This builds topical authority for SEO and eventual AdSense revenue.

**Two expansion tracks, in priority order:**

### Track A — Steam / Water tables (HIGHEST PRIORITY)
Steam tables are the single most-searched property table in all of engineering education. Every thermo course uses them (Rankine cycles, boilers, turbines). Traffic potential dwarfs R-134a.

Tables to build (mirroring the standard textbook appendix structure):
1. **Saturated water by temperature** (typically 0.01°C to 373.95°C) — Psat, vf, vg, uf, ufg, ug, hf, hfg, hg, sf, sfg, sg
2. **Saturated water by pressure** (typically 0.6113 kPa to 22,064 kPa) — same properties, pressure-indexed
3. **Superheated steam** (P × T grid; typically 0.01 MPa to 60 MPa, up to ~1300°C in textbooks) — v, u, h, s
4. **Compressed (subcooled) liquid water** (typically 5–50 MPa grid) — v, u, h, s. NEW table type not present in the R-134a set; the UI needs a fifth data regime but can reuse the superheated-style P×T bilinear logic.

New capability implied: **two-phase mixture with quality x for steam** (same math as R-134a two-phase tab — reuse the existing component logic).

**Authoritative data sources for steam:**
- The international standard formulation for industrial steam properties is IAPWS-IF97 (adopted 1997, replacing IFC-67); NIST provides free online access to properties computed from it via the Thermophysical Properties of Fluid Systems section of the NIST Chemistry WebBook. Textbook steam tables (e.g., the appendix tables in standard thermo texts) are themselves generated from the IAPWS formulation, so NIST WebBook output will match textbook values to within rounding.
- Extraction workflow (same as Phase 1): extract the textbook appendix values → cross-verify a sample of rows against NIST WebBook → run internal consistency checks (u/h/s relations, hfg = hg − hf, etc.) → only then ship.
- Keep the textbook's row spacing (e.g., every 5°C in saturated tables), because the pedagogical value is matching what students interpolate by hand from the SAME rows.

### Track B — Additional refrigerants (SECOND PRIORITY)
Standard reference tables (ASHRAE Fundamentals chapter on refrigerant properties) cover R-12, R-22, R-32, R-125, R-134a, R-143a, R-152a, R-717 (ammonia), R-744 (CO2), and blends R-404A, R-407C, R-410A, R-507 — using the international reference-state convention of h = 200 kJ/kg and s = 1 kJ/(kg·K) for saturated liquid at 0°C.

Priority order for thermoprops (based on curriculum relevance + search volume + data availability):
1. **R-717 (Ammonia)** — the classic second refrigerant in every RAC course and Indian university syllabus; industrial refrigeration standard; excellent free data availability (NIST WebBook has it).
2. **R-744 (CO2)** — rapidly growing in curriculum importance (transcritical cycles, natural refrigerant trend).
3. **R-22** — legacy but still ubiquitous in older textbooks, service-tech education, and Indian curriculum; phased out in practice but heavily searched.
4. **R-410A** — dominant in residential AC service context; note it is a near-azeotropic *blend*, so tables use bubble/dew point convention — slight schema difference (temperature glide). Handle after pure fluids.
5. **R-1234yf / R-32** — modern low-GWP refrigerants, growing curriculum presence; good for freshness/SEO signals.

**IMPORTANT schema note:** different sources use different reference states (textbook R-134a tables vs ASHRAE convention may differ in absolute h and s values while Δh, Δs match). NEVER mix reference states within one fluid's dataset. Document the reference state per fluid in the JSON metadata.

---

## 4. COMPETITIVE LANDSCAPE (researched July 2026)

- **FrigProp (frigprop.com)** — a live competitor: refrigerant property calculator + cycle analysis covering 27 refrigerants including all our Track B targets, with COP computation, T-s/P-h diagrams, and side-by-side comparison. It computes from equations of state.
- **Why thermoprops still wins its niche:** FrigProp is an *engineering calculator* (EOS-based, cycle-solving). thermoprops is a *textbook-table companion* — linear interpolation between the same rows students see in their appendix, showing bracketing rows and fraction, refusing to solve the homework. No major player occupies the "matches your textbook, shows its work" pedagogy niche. This is the indie-winnable position (per our earlier framing: compete against indie builders, not institutions).
- Ohio University (Urieli) hosts free static steam table HTML pages; engineeringtoolbox.com has static ammonia tables; nuclear-power.com covers steam conceptually. All are static content — none offer interactive interpolation with shown work. That interactivity gap is the moat.
- **Positioning line for copy:** "The tables in your textbook, made interactive — every answer shows the rows and the interpolation, exactly as you'd compute it by hand."

---

## 5. ARCHITECTURE PLAN FOR MULTI-FLUID SUPPORT

Current code is R-134a-specific in places. Phase 2 requires generalizing:

1. **Data layer:** move to `src/data/<fluid>/` folders — e.g., `src/data/r134a/`, `src/data/water/`, `src/data/r717/`. Each fluid folder contains `saturated-temperature.json`, `saturated-pressure.json`, `superheated.json`, plus (water only) `compressed-liquid.json`, plus a `meta.json` (fluid display name, valid ranges, units, reference state, source provenance note, property list).
2. **Interpolation engine:** already pure and fluid-agnostic — should need zero changes. Do NOT modify tested functions; extend only.
3. **URL structure (SEO-critical):**
   - `/steam/properties` — steam property finder (steam gets the friendly name, not "water" or "r718", because "steam tables" is the search term)
   - `/r717/properties` or `/ammonia/properties` — pick ONE canonical, 301 the other. Recommend `/ammonia/properties` as canonical (human search term) with `/r717/` redirecting.
   - Keep `/r134a/properties` untouched (it's indexed).
   - Future: `/r744/`, `/r22/`, `/r410a/` etc.
4. **Component:** generalize `PropertiesCalculator.astro` to take a fluid config prop (which tables exist, which tabs to show, ranges, units) rather than duplicating the component per fluid. Compressed-liquid tab appears only for steam.
5. **Homepage evolves** into a fluid-picker hub: cards for Steam, R-134a, Ammonia, etc. This hub structure IS the topical-authority cluster.
6. **Internal linking:** every fluid page links to the hub and siblings; FAQ gains fluid-specific questions ("Why do my steam table values differ slightly from my textbook?" — answer: rounding/reference states).

---

## 6. VERIFICATION PROTOCOL (apply to EVERY new dataset — no exceptions)

1. Extract table → JSON (script or careful manual extraction; keep the extraction script in `/scripts`, it's re-runnable documentation).
2. Spot-verify ≥10 rows per table against NIST WebBook (independent source).
3. Internal consistency: check ug = uf + ufg, hg = hf + hfg, sg = sf + sfg on every saturated row programmatically (write it as a Vitest test that loads the JSON — permanent regression protection).
4. Hand-verify at least 2 real textbook problems end-to-end through the UI per fluid (e.g., a Rankine-cycle state lookup for steam; an ammonia vapor-compression state).
5. Two-phase math check: v = vf + x·vfg etc. at x = 0 and x = 1 must exactly reproduce the saturated columns.
6. Only after all five pass: commit, push (auto-deploys).

---

## 7. PHASE 2 TASK BREAKDOWN (ordered, sized for separate chat sessions)

Each task below is deliberately scoped small enough for one focused session with a smaller model. Complete them in order; each ends with tests passing + `npm run build` clean + push.

**Task 2.1 — Refactor to multi-fluid data architecture.** Move R-134a JSON into `src/data/r134a/`, add `meta.json`, update imports, generalize PropertiesCalculator to accept fluid config. NO new data yet. All existing tests must still pass; site behavior must be pixel-identical. (This is pure refactor — the riskiest task; do it first while the codebase is small.)

**Task 2.2 — Steam data: saturated tables.** Extract saturated-by-temperature and saturated-by-pressure water tables into `src/data/water/`. Run full verification protocol. Write the consistency Vitest.

**Task 2.3 — Steam data: superheated + compressed liquid.** Extract both grids. Compressed liquid is a new table type — add its JSON schema (P×T grid like superheated). Verify.

**Task 2.4 — Steam UI.** Create `/steam/properties` using the generalized component with 5 tabs (Saturated, Superheated, Compressed Liquid, Two-Phase, Find State). Homepage becomes fluid hub (Steam + R-134a cards). Update FAQ, About. Hand-verify 2 Rankine-cycle textbook problems through the UI.

**Task 2.5 — SEO groundwork.** Add sitemap.xml (Astro integration), per-page meta descriptions/titles targeting "steam tables interpolation calculator", "saturated steam table", "superheated steam properties" etc., structured data if simple. Submit to Google Search Console.

**Task 2.6 — Ammonia (R-717).** Full pipeline: data extraction + verification + `/ammonia/properties` page + hub card + 301 from `/r717/`. Note ammonia's reference state in meta.json.

**Task 2.7 — R-744 (CO2), then R-22, then others.** One fluid per session, same pipeline. R-410A LAST (blend/glide schema complexity).

**Task 2.8 (polish, anytime after 2.4) —** P-h diagram sketch per fluid (static SVG, educational, not interactive), print stylesheet, "copy result" button.

---

## 8. WORKING STYLE NOTES (for the assisting model)

- Address Samrat as "brother". Supportive, collaborative, structured, step-by-step.
- Samrat is a mechanical engineering PhD and thermodynamics instructor — full command of the physics; he is newer to web development and Claude Code, so give exact commands and clicks, never assume tooling familiarity.
- He verifies everything — provide hand-checkable numbers, encourage him to spot-check against his own textbook, and never claim a verification happened unless it actually did.
- Screenshots/terminal pastes sometimes arrive garbled — ask for the specific missing piece rather than assuming.
- Deployment is automatic: `git add` → `commit` → `push` to main auto-deploys via Cloudflare. No dashboard steps needed for updates.
- Use CLAUDE.md and DESIGN.md as living config docs — new locked decisions go there.
- One task per session; end every session with tests passing, build clean, pushed, and a short "state summary" for the next session.

## 9. FUTURE (Phase 3+, do not start yet — parked deliberately)
- AdSense application once steam pages are indexed and traffic is meaningful (update Privacy Policy at that time — placeholder language already exists).
- Psychrometric properties of moist air (huge RAC-curriculum relevance; different math — parked).
- The separate Inventory Planning Tools site remains the confirmed *next new site* after thermoprops Phase 2 stabilizes — do not interleave the two projects in one session.