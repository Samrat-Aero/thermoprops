import { describe, expect, it } from 'vitest';
import satTempData from '../data/water/sat-temp.json';
import satPressureData from '../data/water/sat-pressure.json';

interface WaterSatRow {
  uf_kJkg: number;
  ufg_kJkg: number;
  ug_kJkg: number;
  hf_kJkg: number;
  hfg_kJkg: number;
  hg_kJkg: number;
  sf_kJkgK: number;
  sfg_kJkgK: number;
  sg_kJkgK: number;
}

// Source-verified tolerances (not arbitrary): the printed table rounds uf, ufg,
// ug (and hf, hfg, hg) independently, so uf + ufg does not reproduce ug to more
// than ~0.01 kJ/kg for most rows. Near the critical point (roughly T > 250°C /
// P > 3 MPa) ufg and hfg shrink toward zero while the f/g pair converges to
// nearly equal large values, so the same per-column rounding produces larger
// absolute drift in the derived fg quantity — observed up to ~0.8 kJ/kg (u) and
// ~1.4 kJ/kg (h) in the extracted data, confirmed against the source table
// (e.g. T=350°C: hf=1671.9, hfg=892.7, hg=2563.9 as printed; 1671.9+892.7=2564.6).
// Entropy does not show this effect (source stays consistent to ~0.0001).
const ENERGY_TOLERANCE_KJKG = 1.5;
const ENTROPY_TOLERANCE_KJKGK = 0.001;

function checkTable(table: WaterSatRow[], label: string) {
  it(`${label}: ug = uf + ufg for every row (within source rounding)`, () => {
    for (const row of table) {
      expect(Math.abs(row.ug_kJkg - (row.uf_kJkg + row.ufg_kJkg))).toBeLessThanOrEqual(
        ENERGY_TOLERANCE_KJKG
      );
    }
  });

  it(`${label}: hg = hf + hfg for every row (within source rounding)`, () => {
    for (const row of table) {
      expect(Math.abs(row.hg_kJkg - (row.hf_kJkg + row.hfg_kJkg))).toBeLessThanOrEqual(
        ENERGY_TOLERANCE_KJKG
      );
    }
  });

  it(`${label}: sg = sf + sfg for every row (within source rounding)`, () => {
    for (const row of table) {
      expect(Math.abs(row.sg_kJkgK - (row.sf_kJkgK + row.sfg_kJkgK))).toBeLessThanOrEqual(
        ENTROPY_TOLERANCE_KJKGK
      );
    }
  });
}

describe('water saturated-temperature table internal consistency', () => {
  checkTable(satTempData as WaterSatRow[], 'sat-temp');
});

describe('water saturated-pressure table internal consistency', () => {
  checkTable(satPressureData as WaterSatRow[], 'sat-pressure');
});

describe('water saturation tables sanity', () => {
  it('sat-temp and sat-pressure both have full row coverage', () => {
    expect((satTempData as WaterSatRow[]).length).toBeGreaterThan(70);
    expect((satPressureData as WaterSatRow[]).length).toBeGreaterThan(70);
  });
});
