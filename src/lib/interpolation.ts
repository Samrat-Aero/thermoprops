export interface SatTempRow {
  T_C: number;
  P_sat_MPa: number;
  vf_m3kg: number;
  vg_m3kg: number;
  uf_kJkg: number;
  ug_kJkg: number;
  hf_kJkg: number;
  hfg_kJkg: number;
  hg_kJkg: number;
  sf_kJkgK: number;
  sg_kJkgK: number;
}

export interface SatPressureRow {
  P_MPa: number;
  T_sat_C: number;
  vf_m3kg: number;
  vg_m3kg: number;
  uf_kJkg: number;
  ug_kJkg: number;
  hf_kJkg: number;
  hfg_kJkg: number;
  hg_kJkg: number;
  sf_kJkgK: number;
  sg_kJkgK: number;
}

export interface SuperheatedRow {
  T_C: number;
  v_m3kg: number;
  u_kJkg: number;
  h_kJkg: number;
  s_kJkgK: number;
}

export interface SuperheatedBlock {
  P_MPa: number;
  T_sat_C: number;
  rows: SuperheatedRow[];
}

export interface LinearInterpolationResult<TRow, K extends keyof TRow> {
  lowerRow: TRow;
  upperRow: TRow;
  fraction: number;
  values: Pick<TRow, K>;
}

type NumericKeys<TRow> = {
  [K in keyof TRow]: TRow[K] extends number ? K : never;
}[keyof TRow];

interface Bracket<T> {
  lowerRow: T;
  upperRow: T;
  fraction: number;
}

function findBracket<T>(
  table: readonly T[],
  knownValue: number,
  getKey: (row: T) => number
): Bracket<T> {
  if (table.length < 2) {
    throw new RangeError('Table must contain at least two rows to interpolate.');
  }

  const first = table[0];
  const last = table[table.length - 1];

  if (knownValue < getKey(first) || knownValue > getKey(last)) {
    throw new RangeError(
      `Value ${knownValue} is outside the table range [${getKey(first)}, ${getKey(last)}].`
    );
  }

  for (let i = 0; i < table.length - 1; i++) {
    const lowerRow = table[i];
    const upperRow = table[i + 1];
    const lowerKey = getKey(lowerRow);
    const upperKey = getKey(upperRow);

    if (knownValue === lowerKey) {
      return { lowerRow, upperRow: lowerRow, fraction: 0 };
    }

    if (knownValue > lowerKey && knownValue <= upperKey) {
      if (knownValue === upperKey) {
        return { lowerRow: upperRow, upperRow, fraction: 0 };
      }
      return {
        lowerRow,
        upperRow,
        fraction: (knownValue - lowerKey) / (upperKey - lowerKey),
      };
    }
  }

  throw new RangeError(`Unable to bracket value ${knownValue} in the given table.`);
}

export function linearInterpolate<TRow, K extends NumericKeys<TRow>>(
  table: readonly TRow[],
  knownValue: number,
  knownKey: NumericKeys<TRow>,
  targetKeys: readonly K[]
): LinearInterpolationResult<TRow, K> {
  const { lowerRow, upperRow, fraction } = findBracket(
    table,
    knownValue,
    (row) => row[knownKey] as number
  );

  const values = {} as Pick<TRow, K>;
  for (const key of targetKeys) {
    const lowerVal = lowerRow[key] as number;
    const upperVal = upperRow[key] as number;
    values[key] = (lowerVal + fraction * (upperVal - lowerVal)) as TRow[K];
  }

  return { lowerRow, upperRow, fraction, values };
}

const SUPERHEATED_PROPERTY_KEYS = ['v_m3kg', 'u_kJkg', 'h_kJkg', 's_kJkgK'] as const;

export interface BilinearInterpolationResult {
  lowerP: { block: SuperheatedBlock } & LinearInterpolationResult<
    SuperheatedRow,
    (typeof SUPERHEATED_PROPERTY_KEYS)[number]
  >;
  upperP: { block: SuperheatedBlock } & LinearInterpolationResult<
    SuperheatedRow,
    (typeof SUPERHEATED_PROPERTY_KEYS)[number]
  >;
  pFraction: number;
  values: { v_m3kg: number; u_kJkg: number; h_kJkg: number; s_kJkgK: number };
}

export function bilinearInterpolate(
  table: readonly SuperheatedBlock[],
  P: number,
  T: number
): BilinearInterpolationResult {
  const { lowerRow: lowerBlock, upperRow: upperBlock } = findBracket(
    table,
    P,
    (block) => block.P_MPa
  );

  const lowerT = linearInterpolate(lowerBlock.rows, T, 'T_C', SUPERHEATED_PROPERTY_KEYS);
  const upperT = linearInterpolate(upperBlock.rows, T, 'T_C', SUPERHEATED_PROPERTY_KEYS);

  const pRows = [
    { P_MPa: lowerBlock.P_MPa, ...lowerT.values },
    { P_MPa: upperBlock.P_MPa, ...upperT.values },
  ];
  const pResult = linearInterpolate(pRows, P, 'P_MPa', SUPERHEATED_PROPERTY_KEYS);

  return {
    lowerP: { block: lowerBlock, ...lowerT },
    upperP: { block: upperBlock, ...upperT },
    pFraction: pResult.fraction,
    values: pResult.values,
  };
}

const INVERSE_ENTROPY_TARGET_KEYS = ['T_C', 'h_kJkg'] as const;

export interface InverseEntropyResult {
  lowerP: { block: SuperheatedBlock } & LinearInterpolationResult<
    SuperheatedRow,
    (typeof INVERSE_ENTROPY_TARGET_KEYS)[number]
  >;
  upperP: { block: SuperheatedBlock } & LinearInterpolationResult<
    SuperheatedRow,
    (typeof INVERSE_ENTROPY_TARGET_KEYS)[number]
  >;
  pFraction: number;
  values: { T_C: number; h_kJkg: number };
}

export function inverseInterpolateByEntropy(
  table: readonly SuperheatedBlock[],
  P: number,
  targetS: number
): InverseEntropyResult {
  return inverseInterpolateByProperty(table, P, 's_kJkgK', targetS, INVERSE_ENTROPY_TARGET_KEYS);
}

type SuperheatedKey = NumericKeys<SuperheatedRow>;

export interface InversePropertyResult<K extends SuperheatedKey> {
  lowerP: { block: SuperheatedBlock } & LinearInterpolationResult<SuperheatedRow, K>;
  upperP: { block: SuperheatedBlock } & LinearInterpolationResult<SuperheatedRow, K>;
  pFraction: number;
  values: Pick<SuperheatedRow, K>;
}

/**
 * Given a pressure and one known superheated property (s, h, u, or v),
 * finds the bracketing temperature rows in both bracketing pressure columns
 * and interpolates the requested target properties (e.g. T, h) at that state.
 */
export function inverseInterpolateByProperty<K extends SuperheatedKey>(
  table: readonly SuperheatedBlock[],
  P: number,
  knownKey: SuperheatedKey,
  knownValue: number,
  targetKeys: readonly K[]
): InversePropertyResult<K> {
  const { lowerRow: lowerBlock, upperRow: upperBlock } = findBracket(
    table,
    P,
    (block) => block.P_MPa
  );

  const lowerResult = linearInterpolate(lowerBlock.rows, knownValue, knownKey, targetKeys);
  const upperResult = linearInterpolate(upperBlock.rows, knownValue, knownKey, targetKeys);

  const pFraction =
    lowerBlock.P_MPa === upperBlock.P_MPa ? 0 : (P - lowerBlock.P_MPa) / (upperBlock.P_MPa - lowerBlock.P_MPa);

  const values = {} as Pick<SuperheatedRow, K>;
  for (const key of targetKeys) {
    const lowerVal = lowerResult.values[key] as number;
    const upperVal = upperResult.values[key] as number;
    values[key] = (lowerVal + pFraction * (upperVal - lowerVal)) as SuperheatedRow[K];
  }

  return {
    lowerP: { block: lowerBlock, ...lowerResult },
    upperP: { block: upperBlock, ...upperResult },
    pFraction,
    values,
  };
}
