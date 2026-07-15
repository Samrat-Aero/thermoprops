# thermoprops.com — Project Instructions

## Overview
A micro-SaaS engineering reference tool: interactive property tables and 
interpolation calculators for thermodynamics, starting with R-134a 
(Cengel Appendix Tables A-11, A-12, A-13). Static site, no backend.

## Tech stack
- Astro 5 (islands architecture — static by default, interactive components 
  as client-side islands only where needed)
- Tailwind CSS v4
- Deployed to Cloudflare Pages (free tier)
- No database, no server — all data ships as JSON with the static build

## Data provenance
- Source PDF: /reference/cengel-appendix.pdf — used ONLY for one-time 
  table extraction, never read at runtime.
- Verified data lives in /src/data as JSON.
- Pipeline for any new table: extract → spot-check 5 random rows against 
  the PDF → cross-check 2-3 points against NIST WebBook (webbook.nist.gov) 
  → only then commit and use in components.

## Phase 1 scope (current)
R-134a only:
1. Saturated-by-temperature lookup (linear interpolation)
2. Saturated-by-pressure lookup (linear interpolation)
3. Superheated lookup (bilinear interpolation across P columns and T rows)
4. Isentropic/inverse interpolation (given P and target s, find bracketing 
   T rows and interpolate T, h) — used for compressor exit state
5. Full vapor-compression cycle solver using the above

## Non-negotiable rules
- Interpolation must be LINEAR between table rows (matches how students 
  are taught to solve these by hand) — never substitute a full equation-
  of-state calculation for Phase 1.
- Every calculator result must display the bracketing table rows used 
  and the interpolation fraction, not just the final number.
- Read DESIGN.md (project root) before writing any UI component.
- Run the web-design-guidelines skill after each UI build phase, before 
  considering it done.

## Development
When starting the dev server, use background mode:
Manage the background server with `astro dev stop`, `astro dev status`, 
and `astro dev logs`.

## Documentation
Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:
- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)