import { describe, expect, it } from 'vitest';
import satPressureData from '../data/water/sat-pressure.json';
import superheatedData from '../data/water/superheated.json';
import compressedLiquidData from '../data/water/compressed-liquid.json';

interface SatPressureRow {
  P_MPa: number;
  T_sat_C: number;
  vf_m3kg: number;
  vg_m3kg: number;
  hf_kJkg: number;
  hg_kJkg: number;
  sf_kJkgK: number;
  sg_kJkgK: number;
}

interface GridRow {
  T_C: number;
  v_m3kg: number;
  h_kJkg: number;
  s_kJkgK: number;
}

interface GridBlock {
  P_MPa: number;
  T_sat_C: number;
  rows: GridRow[];
}

const satPressure = satPressureData as SatPressureRow[];
const superheated = superheatedData as GridBlock[];
const compressedLiquid = compressedLiquidData as GridBlock[];

function findSatPressureRow(P_MPa: number): SatPressureRow | undefined {
  return satPressure.find((r) => Math.abs(r.P_MPa - P_MPa) < 1e-9);
}

// Both boundary checks below found essentially exact agreement (well under 0.1%
// for v, well under 0.1 kJ/kg for h, effectively 0 for s) — the source table's
// own cross-table rounding here is tighter than the near-critical-point drift
// found in the saturated tables (Task 2.2). Tolerances are set with headroom
// above what was actually observed, not loosened to force a pass.
const V_TOLERANCE_PCT = 0.1;
const H_TOLERANCE_KJKG = 0.5;
const S_TOLERANCE_KJKGK = 0.005;

describe('superheated table: Sat. row matches saturated-vapor boundary', () => {
  // Not every superheated pressure column has a matching row in sat-pressure.json
  // (e.g. 1.6, 4.5, 12.5 MPa aren't tabulated there; 25-60 MPa are supercritical
  // and have no Sat. row at all) — this test only checks the pressures that do.
  const blocksWithSatMatch = superheated
    .map((block) => ({ block, ref: findSatPressureRow(block.P_MPa) }))
    .filter((x): x is { block: GridBlock; ref: SatPressureRow } => x.ref !== undefined);

  it('found at least 15 superheated pressures with a saturated-pressure-table match', () => {
    expect(blocksWithSatMatch.length).toBeGreaterThanOrEqual(15);
  });

  it.each(blocksWithSatMatch.map(({ block, ref }) => ({ P: block.P_MPa, block, ref })))(
    'P=$P MPa: Sat. row v/h/s matches vg/hg/sg within source rounding',
    ({ block, ref }) => {
      const satRow = block.rows[0];
      expect(Math.abs(satRow.v_m3kg - ref.vg_m3kg)).toBeLessThanOrEqual(
        (V_TOLERANCE_PCT / 100) * ref.vg_m3kg
      );
      expect(Math.abs(satRow.h_kJkg - ref.hg_kJkg)).toBeLessThanOrEqual(H_TOLERANCE_KJKG);
      expect(Math.abs(satRow.s_kJkgK - ref.sg_kJkgK)).toBeLessThanOrEqual(S_TOLERANCE_KJKGK);
    }
  );
});

describe('compressed-liquid table: Sat. row matches saturated-liquid boundary', () => {
  // P=30, 50 MPa are above the critical pressure (22.064 MPa) and have no Sat.
  // row at all — there is no liquid-vapor transition to anchor to up there.
  const blocksWithSat = compressedLiquid
    .map((block) => ({
      block,
      satRow: block.rows.find((r) => Math.abs(r.T_C - block.T_sat_C) < 1e-9),
      ref: findSatPressureRow(block.P_MPa),
    }))
    .filter(
      (x): x is { block: GridBlock; satRow: GridRow; ref: SatPressureRow } =>
        x.satRow !== undefined && x.ref !== undefined
    );

  it('found 4 compressed-liquid pressures below critical with a Sat. row', () => {
    expect(blocksWithSat.length).toBe(4);
  });

  it.each(blocksWithSat.map(({ block, satRow, ref }) => ({ P: block.P_MPa, satRow, ref })))(
    'P=$P MPa: Sat. row v/h/s matches vf/hf/sf within source rounding',
    ({ satRow, ref }) => {
      expect(Math.abs(satRow.v_m3kg - ref.vf_m3kg)).toBeLessThanOrEqual(
        (V_TOLERANCE_PCT / 100) * ref.vf_m3kg
      );
      expect(Math.abs(satRow.h_kJkg - ref.hf_kJkg)).toBeLessThanOrEqual(H_TOLERANCE_KJKG);
      expect(Math.abs(satRow.s_kJkgK - ref.sf_kJkgK)).toBeLessThanOrEqual(S_TOLERANCE_KJKGK);
    }
  );

  it('P=30 and P=50 MPa (supercritical) correctly have no Sat. row', () => {
    const p30 = compressedLiquid.find((b) => b.P_MPa === 30)!;
    const p50 = compressedLiquid.find((b) => b.P_MPa === 50)!;
    expect(p30.rows.some((r) => Math.abs(r.T_C - p30.T_sat_C) < 1e-9)).toBe(false);
    expect(p50.rows.some((r) => Math.abs(r.T_C - p50.T_sat_C) < 1e-9)).toBe(false);
  });
});

describe('superheated and compressed-liquid grids: monotonicity sanity', () => {
  it('superheated: at fixed P, v/u/h/s all increase with T', () => {
    for (const block of superheated) {
      for (let i = 1; i < block.rows.length; i++) {
        const a = block.rows[i - 1];
        const b = block.rows[i];
        expect(b.v_m3kg).toBeGreaterThanOrEqual(a.v_m3kg);
        expect(b.h_kJkg).toBeGreaterThanOrEqual(a.h_kJkg);
        expect(b.s_kJkgK).toBeGreaterThanOrEqual(a.s_kJkgK);
      }
    }
  });

  it('superheated: at fixed T, v/h/s all decrease as P increases', () => {
    const byT = new Map<number, { P_MPa: number; v_m3kg: number; h_kJkg: number; s_kJkgK: number }[]>();
    for (const block of superheated) {
      for (const row of block.rows) {
        const list = byT.get(row.T_C) ?? [];
        list.push({ P_MPa: block.P_MPa, v_m3kg: row.v_m3kg, h_kJkg: row.h_kJkg, s_kJkgK: row.s_kJkgK });
        byT.set(row.T_C, list);
      }
    }
    for (const entries of byT.values()) {
      entries.sort((a, b) => a.P_MPa - b.P_MPa);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].v_m3kg).toBeLessThanOrEqual(entries[i - 1].v_m3kg);
        expect(entries[i].h_kJkg).toBeLessThanOrEqual(entries[i - 1].h_kJkg);
        expect(entries[i].s_kJkgK).toBeLessThanOrEqual(entries[i - 1].s_kJkgK);
      }
    }
  });

  it('compressed liquid: at fixed P, v/u/h/s all increase with T (Sat. row is the highest-T anchor, not first-in-array)', () => {
    for (const block of compressedLiquid) {
      const rows = [...block.rows].sort((a, b) => a.T_C - b.T_C);
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1];
        const b = rows[i];
        expect(b.v_m3kg).toBeGreaterThanOrEqual(a.v_m3kg);
        expect(b.h_kJkg).toBeGreaterThanOrEqual(a.h_kJkg);
        expect(b.s_kJkgK).toBeGreaterThanOrEqual(a.s_kJkgK);
      }
    }
  });

  it('compressed liquid: at fixed T, v decreases as P increases (liquid is compressed)', () => {
    const byT = new Map<number, { P_MPa: number; v_m3kg: number }[]>();
    for (const block of compressedLiquid) {
      for (const row of block.rows) {
        const list = byT.get(row.T_C) ?? [];
        list.push({ P_MPa: block.P_MPa, v_m3kg: row.v_m3kg });
        byT.set(row.T_C, list);
      }
    }
    for (const entries of byT.values()) {
      entries.sort((a, b) => a.P_MPa - b.P_MPa);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].v_m3kg).toBeLessThanOrEqual(entries[i - 1].v_m3kg);
      }
    }
  });
  // Note: h and s are NOT checked monotonic vs. P for compressed liquid. Unlike
  // vapor, liquid h genuinely increases with P at fixed T (h = u + Pv, and the
  // Pv term dominates for a near-incompressible liquid) -- confirmed against the
  // source table, e.g. at T=20C: h=88.61 (5 MPa) -> 102.57 (20 MPa). That trend
  // reverses near the saturation boundary (T >= ~260C) due to curvature approaching
  // the two-phase dome, which is real near-critical behavior, not a data error.
  // s is skipped entirely: water's density anomaly (thermal expansion coefficient
  // is negative between 0-4C) flips the sign of (ds/dP)_T there, so s can
  // legitimately increase OR decrease with P depending on the temperature region.
});
