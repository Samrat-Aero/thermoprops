import { describe, expect, it } from 'vitest';
import {
  bilinearInterpolate,
  inverseInterpolateByEntropy,
  inverseInterpolateByProperty,
  linearInterpolate,
  type SatTempRow,
  type SuperheatedBlock,
} from './interpolation';
import satTempData from '../data/r134a-sat-temp.json';
import superheatedData from '../data/r134a-superheated.json';

const satTempTable = satTempData as SatTempRow[];
const superheatedTable = superheatedData as SuperheatedBlock[];

describe('linearInterpolate', () => {
  it('returns the exact row with fraction 0 on an exact match (A-11, T=-10°C)', () => {
    const result = linearInterpolate(satTempTable, -10, 'T_C', [
      'P_sat_MPa',
      'hg_kJkg',
      'sg_kJkgK',
    ]);

    expect(result.fraction).toBe(0);
    expect(result.lowerRow.T_C).toBe(-10);
    expect(result.upperRow.T_C).toBe(-10);
    expect(result.values.P_sat_MPa).toBeCloseTo(0.20074, 5);
    expect(result.values.hg_kJkg).toBeCloseTo(244.51, 5);
    expect(result.values.sg_kJkgK).toBeCloseTo(0.93766, 5);
  });

  it('interpolates at the midpoint between two A-11 rows (T=-12°C and T=-10°C)', () => {
    const result = linearInterpolate(satTempTable, -11, 'T_C', ['P_sat_MPa', 'hg_kJkg']);

    expect(result.lowerRow.T_C).toBe(-12);
    expect(result.upperRow.T_C).toBe(-10);
    expect(result.fraction).toBeCloseTo(0.5, 10);
    expect(result.values.P_sat_MPa).toBeCloseTo((0.18537 + 0.20074) / 2, 6);
    expect(result.values.hg_kJkg).toBeCloseTo((243.3 + 244.51) / 2, 6);
  });
});

describe('bilinearInterpolate', () => {
  it('interpolates a known superheated point at the midpoint of both P and T brackets', () => {
    // Bracketed by the 0.14 MPa and 0.18 MPa blocks; T=25 sits at the midpoint
    // of the 20/30°C rows present in both blocks.
    const result = bilinearInterpolate(superheatedTable, 0.16, 25);

    expect(result.lowerP.block.P_MPa).toBe(0.14);
    expect(result.upperP.block.P_MPa).toBe(0.18);
    expect(result.pFraction).toBeCloseTo(0.5, 10);
    expect(result.lowerP.fraction).toBeCloseTo(0.5, 10);
    expect(result.upperP.fraction).toBeCloseTo(0.5, 10);
    expect(result.values.h_kJkg).toBeCloseTo(275.2975, 3);
    expect(result.values.u_kJkg).toBeCloseTo(251.8, 3);
    expect(result.values.s_kJkgK).toBeCloseTo(1.065625, 5);
    expect(result.values.v_m3kg).toBeCloseTo(0.14928, 5);
  });

  it('throws a RangeError when T is outside one bracketing pressure column range', () => {
    // P=0.08 brackets the 0.06 MPa block (rows valid from T=-36.95°C) and the
    // 0.10 MPa block (rows valid only from T=-26.37°C). T=-30 is in range for
    // the lower column but out of range for the upper one.
    expect(() => bilinearInterpolate(superheatedTable, 0.08, -30)).toThrow(RangeError);
  });
});

describe('inverseInterpolateByEntropy', () => {
  it('reproduces the isentropic compressor-exit state (Tevap=-10°C, Tcond=45°C)', () => {
    const satRowAtMinus10 = satTempTable.find((row) => row.T_C === -10);
    if (!satRowAtMinus10) {
      throw new Error('Expected a T=-10°C row in r134a-sat-temp.json');
    }
    const s1 = satRowAtMinus10.sg_kJkgK;
    const P2 = 1.1602;

    const result = inverseInterpolateByEntropy(superheatedTable, P2, s1);

    expect(Math.abs(result.values.T_C - 51.68)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(result.values.h_kJkg - 281.09)).toBeLessThanOrEqual(0.1);
  });
});

describe('inverseInterpolateByProperty', () => {
  it('matches inverseInterpolateByEntropy when knownKey is s (Problem 1: Tevap=-10°C, Tcond=40°C)', () => {
    const state1 = satTempTable.find((row) => row.T_C === -10);
    const state34 = satTempTable.find((row) => row.T_C === 40);
    if (!state1 || !state34) {
      throw new Error('Expected T=-10°C and T=40°C rows in r134a-sat-temp.json');
    }
    const s1 = state1.sg_kJkgK;
    const P2 = state34.P_sat_MPa;

    const viaEntropy = inverseInterpolateByEntropy(superheatedTable, P2, s1);
    const viaGeneral = inverseInterpolateByProperty(superheatedTable, P2, 's_kJkgK', s1, [
      'T_C',
      'h_kJkg',
    ]);

    expect(viaGeneral.values.T_C).toBeCloseTo(viaEntropy.values.T_C, 10);
    expect(viaGeneral.values.h_kJkg).toBeCloseTo(viaEntropy.values.h_kJkg, 10);
  });

  it('supports h, u, and v as the known key', () => {
    const P = 0.5;

    const byH = inverseInterpolateByProperty(superheatedTable, P, 'h_kJkg', 280, [
      'T_C',
      's_kJkgK',
    ]);
    expect(byH.values.T_C).toBeGreaterThan(0);

    const byU = inverseInterpolateByProperty(superheatedTable, P, 'u_kJkg', 260, ['T_C']);
    expect(byU.values.T_C).toBeGreaterThan(0);

    const byV = inverseInterpolateByProperty(superheatedTable, P, 'v_m3kg', 0.045, ['T_C']);
    expect(byV.values.T_C).toBeGreaterThan(0);
  });
});
