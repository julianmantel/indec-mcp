/**
 * Matemática pura para variaciones de series de índices.
 *
 * Sin I/O: todas las funciones reciben números o puntos ya obtenidos de la API.
 * Los resultados se redondean a una precisión fija para evitar artefactos de
 * punto flotante (por ejemplo 21.000000000000014 en lugar de 21).
 */

export type VariationErrorCode =
  | "INVALID_VALUE"
  | "ZERO_VALUE"
  | "INVALID_PERIODS"
  | "MISSING_PERIOD"
  | "INVALID_MONTHS";

export class VariationMathError extends Error {
  constructor(
    public readonly code: VariationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "VariationMathError";
  }
}

export interface IndexPoint {
  periodo: string;
  valor: number | null;
}

const PERIOD_RE = /^(\d{4})(\d{2})$/;

/** Valida y separa un período AAAAMM. */
export function parsePeriodo(periodo: string): {
  year: number;
  month: number;
} {
  const match = PERIOD_RE.exec(periodo);
  if (!match) {
    throw new VariationMathError(
      "INVALID_PERIODS",
      `El período '${periodo}' no tiene formato AAAAMM.`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new VariationMathError(
      "INVALID_PERIODS",
      `El período '${periodo}' tiene un mes inválido (debe estar entre 01 y 12).`
    );
  }

  return { year, month };
}

export function formatPeriodo(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}${String(month).padStart(2, "0")}`;
}

/** Suma (o resta, con delta negativo) meses a un período AAAAMM. */
export function addMonths(periodo: string, delta: number): string {
  if (!Number.isInteger(delta)) {
    throw new VariationMathError(
      "INVALID_MONTHS",
      `La cantidad de meses a sumar debe ser un entero (recibido: ${delta}).`
    );
  }

  const { year, month } = parsePeriodo(periodo);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;
  return formatPeriodo(newYear, newMonth);
}

/**
 * Cantidad de tramos mensuales entre dos períodos.
 * `202401` → `202412` = 11 (once cambios mensuales).
 */
export function monthsBetween(from: string, to: string): number {
  const start = parsePeriodo(from);
  const end = parsePeriodo(to);
  const diff = (end.year - start.year) * 12 + (end.month - start.month);
  if (diff < 0) {
    throw new VariationMathError(
      "INVALID_PERIODS",
      `El período final '${to}' es anterior al inicial '${from}'.`
    );
  }
  return diff;
}

export function roundTo(value: number, decimals = 6): number {
  return Number(value.toFixed(decimals));
}

function requireFinite(
  value: number | null | undefined,
  label: string
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new VariationMathError(
      "INVALID_VALUE",
      `${label} no es un número finito.`
    );
  }
  return value;
}

function requirePositive(
  value: number | null | undefined,
  label: string
): number {
  const numeric = requireFinite(value, label);
  if (numeric <= 0) {
    throw new VariationMathError(
      "ZERO_VALUE",
      `${label} debe ser mayor que cero (recibido: ${numeric}).`
    );
  }
  return numeric;
}

/** Variación porcentual entre dos índices: `(fin / inicio - 1) * 100`. */
export function variationBetween(indexStart: number, indexEnd: number): number {
  const start = requirePositive(indexStart, "El índice inicial");
  const end = requirePositive(indexEnd, "El índice final");
  return roundTo((end / start - 1) * 100, 6);
}

/** Compone variaciones mensuales porcentuales: `Π(1 + v/100) - 1`. */
export function accumulateMonthly(variations: number[]): number {
  if (variations.length === 0) {
    throw new VariationMathError(
      "INVALID_VALUE",
      "Se requiere al menos una variación mensual para acumular."
    );
  }

  let factor = 1;
  for (const variation of variations) {
    const numeric = requireFinite(variation, "La variación mensual");
    if (numeric <= -100) {
      throw new VariationMathError(
        "ZERO_VALUE",
        `Una variación mensual de ${numeric}% implica un índice menor o igual a cero.`
      );
    }
    factor *= 1 + numeric / 100;
  }

  return roundTo((factor - 1) * 100, 6);
}

/** Anualiza una variación total: `((1 + v/100)^(12/meses) - 1) * 100`. */
export function annualize(totalVariationPct: number, months: number): number {
  const total = requireFinite(totalVariationPct, "La variación total");
  if (!Number.isInteger(months) || months <= 0) {
    throw new VariationMathError(
      "INVALID_MONTHS",
      `La cantidad de meses debe ser un entero positivo (recibido: ${months}).`
    );
  }

  const base = 1 + total / 100;
  if (base <= 0) {
    throw new VariationMathError(
      "ZERO_VALUE",
      `No se puede anualizar una variación de ${total}%: el índice final sería menor o igual a cero.`
    );
  }

  return roundTo((Math.pow(base, 12 / months) - 1) * 100, 6);
}

/** Promedio mensual geométrico de una variación total. */
export function averageMonthly(
  totalVariationPct: number,
  months: number
): number {
  const total = requireFinite(totalVariationPct, "La variación total");
  if (!Number.isInteger(months) || months <= 0) {
    throw new VariationMathError(
      "INVALID_MONTHS",
      `La cantidad de meses debe ser un entero positivo (recibido: ${months}).`
    );
  }

  const base = 1 + total / 100;
  if (base <= 0) {
    throw new VariationMathError(
      "ZERO_VALUE",
      `No se puede calcular el promedio mensual de una variación de ${total}%: el índice final sería menor o igual a cero.`
    );
  }

  return roundTo((Math.pow(base, 1 / months) - 1) * 100, 6);
}

/**
 * Reescribe una serie con base 100 en `basePeriod`.
 * Exige períodos ordenados, sin duplicados y sin huecos.
 */
export function rebase(series: IndexPoint[], basePeriod: string): IndexPoint[] {
  if (series.length === 0) {
    throw new VariationMathError(
      "INVALID_VALUE",
      "La serie no tiene puntos para rebasar."
    );
  }

  const normalized = series.map((point) => ({
    periodo: point.periodo,
    valor: requirePositive(
      point.valor,
      `El valor del período ${point.periodo}`
    ),
  }));

  for (const point of normalized) {
    parsePeriodo(point.periodo);
  }

  for (let i = 1; i < normalized.length; i++) {
    const previous = normalized[i - 1];
    const current = normalized[i];
    if (!previous || !current) continue;

    const diff = monthsBetween(previous.periodo, current.periodo);
    if (diff === 0) {
      throw new VariationMathError(
        "INVALID_PERIODS",
        `El período ${current.periodo} está duplicado en la serie.`
      );
    }
    if (diff > 1) {
      throw new VariationMathError(
        "MISSING_PERIOD",
        `Falta el período ${addMonths(previous.periodo, 1)} entre ${previous.periodo} y ${current.periodo}.`
      );
    }
  }

  const base = normalized.find((point) => point.periodo === basePeriod);
  if (!base) {
    throw new VariationMathError(
      "MISSING_PERIOD",
      `La serie no contiene el período base ${basePeriod}.`
    );
  }

  const baseValue = requirePositive(
    base.valor,
    `El valor base del período ${basePeriod}`
  );

  return normalized.map((point) => ({
    periodo: point.periodo,
    valor: roundTo(
      (requirePositive(point.valor, `El valor del período ${point.periodo}`) /
        baseValue) *
        100,
      6
    ),
  }));
}

/** Actualiza un monto aplicando una variación porcentual. */
export function updateAmount(amount: number, variationPct: number): number {
  const numericAmount = requireFinite(amount, "El monto");
  if (numericAmount < 0) {
    throw new VariationMathError(
      "INVALID_VALUE",
      `El monto no puede ser negativo (recibido: ${numericAmount}).`
    );
  }

  const variation = requireFinite(
    variationPct,
    "La variación para actualizar el monto"
  );
  if (variation <= -100) {
    throw new VariationMathError(
      "ZERO_VALUE",
      `Una variación de ${variation}% dejaría el monto en cero o negativo.`
    );
  }

  const updated = numericAmount * (1 + variation / 100);
  if (!Number.isFinite(updated)) {
    throw new VariationMathError(
      "INVALID_VALUE",
      "El monto actualizado excede el rango numérico representable."
    );
  }

  return roundTo(updated, 2);
}
