import type { ToolContext } from "../tools/context.js";
import type { FilterInput } from "./dataset-query.js";
import {
  accumulateMonthly,
  addMonths,
  annualize,
  averageMonthly,
  formatPeriodo,
  monthsBetween,
  parsePeriodo,
  roundTo,
  updateAmount,
  variationBetween,
} from "./index-math.js";

export const SUPPORTED_DATASETS = [
  "ipc_nacional",
  "indice_salarios",
  "icc_precios_construccion",
  "sipm_precios_mayoristas",
  "ipi_manufacturero",
  "ipi_minero",
] as const;

export type SupportedDatasetId = (typeof SUPPORTED_DATASETS)[number];

export type SeriesVariationErrorCode =
  | "UNSUPPORTED_SELECTOR"
  | "INVALID_RANGE"
  | "NO_DATA"
  | "MISSING_ENDPOINT"
  | "MISSING_PERIOD"
  | "DUPLICATE_SERIES"
  | "INVALID_VALUE"
  | "TRUNCATED";

export class SeriesVariationError extends Error {
  constructor(
    public readonly code: SeriesVariationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SeriesVariationError";
  }
}

/**
 * Descripción de una única serie de índices, ya resuelta a los literales
 * exactos de la API. La construye la tool y la consume este servicio.
 */
export interface SeriesSelection {
  dataset: SupportedDatasetId;
  label: string;
  /** Filtros que identifican la serie, sin `tipo_de_indicador` ni período. */
  filters: FilterInput[];
  indexLiteral: string;
  officialVariationLiteral: string;
  /** Solo para datasets con variación acumulada punto a punto. */
  officialAccumulatedLiteral?: string;
  observationsColumn?: string;
}

export interface SeriesPoint {
  periodo: string;
  valor: number;
  observaciones: string | null;
  variacionMensual: number | null;
}

export type OfficialCheck =
  | {
      disponible: true;
      tipo: string;
      periodo: string;
      valorOficial: number;
      valorCalculado: number;
      diferenciaPp: number;
      coincide: boolean;
    }
  | { disponible: false; motivo: string };

export interface SeriesVariationResult {
  dataset: SupportedDatasetId;
  label: string;
  filters: FilterInput[];
  desde: string;
  hasta: string;
  meses: number;
  indiceInicial: number;
  indiceFinal: number;
  variacionAcumulada: number;
  variacionAnualizada: number;
  promedioMensual: number;
  monto?: number;
  montoActualizado?: number;
  periodoEfectivoDesde?: string;
  periodoEfectivoMonto?: string;
  variacionMonto?: number;
  rezagoMeses?: number;
  serieMensual: SeriesPoint[];
  observaciones: string[];
  verificacionOficial: OfficialCheck;
  advertencias: string[];
}

export interface SeriesVariationOptions {
  desde: string;
  hasta: string;
  monto?: number;
  rezagoMeses?: number;
}

const MAX_PAGES = 10;
const PAGE_SIZE = 1000;
/** Diferencia tolerada entre la variación calculada y la oficial publicada. */
export const OFFICIAL_TOLERANCE_PP = 0.1;

async function fetchIndexRows(
  ctx: ToolContext,
  selection: SeriesSelection,
  desde: string,
  hasta: string
): Promise<Record<string, unknown>[]> {
  const select = ["periodo", "valor"];
  if (selection.observationsColumn) {
    select.push(selection.observationsColumn);
  }

  const filters: FilterInput[] = [
    ...selection.filters,
    {
      columna: "tipo_de_indicador",
      operador: "eq",
      valor: selection.indexLiteral,
    },
    { columna: "periodo", operador: "gte", valor: desde },
    { columna: "periodo", operador: "lte", valor: hasta },
  ];

  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await ctx.datasetQuery.query({
      dataset: selection.dataset,
      select,
      filters,
      order: "periodo.asc",
      limit: PAGE_SIZE,
      offset,
    });

    const pageRows = result.queryResult.data as Record<string, unknown>[];
    rows.push(...pageRows);

    if (!result.queryResult.isTruncated) {
      return rows;
    }
    if (pageRows.length === 0) {
      break;
    }
    offset += pageRows.length;
  }

  throw new SeriesVariationError(
    "TRUNCATED",
    "La consulta de la serie superó el límite de paginación; se aborta para no calcular una variación incompleta."
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function parseRows(
  selection: SeriesSelection,
  rows: Record<string, unknown>[]
): SeriesPoint[] {
  const points: SeriesPoint[] = [];

  for (const row of rows) {
    const periodo = row.periodo;
    if (typeof periodo !== "string") {
      throw new SeriesVariationError(
        "INVALID_VALUE",
        "La API devolvió una fila sin período válido."
      );
    }

    try {
      parsePeriodo(periodo);
    } catch (err: unknown) {
      throw new SeriesVariationError(
        "INVALID_VALUE",
        err instanceof Error ? err.message : String(err)
      );
    }

    const valor = toNumber(row.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new SeriesVariationError(
        "INVALID_VALUE",
        `El período ${periodo} no tiene un número índice publicado (la API devuelve 'valor' nulo o no positivo). Elija un período con dato disponible.`
      );
    }

    const rawObservation = selection.observationsColumn
      ? row[selection.observationsColumn]
      : undefined;

    points.push({
      periodo,
      valor,
      observaciones:
        typeof rawObservation === "string" && rawObservation.trim() !== ""
          ? rawObservation
          : null,
      variacionMensual: null,
    });
  }

  return points;
}

function assertSingleRowPerPeriod(points: SeriesPoint[]): void {
  const counts = new Map<string, number>();
  for (const point of points) {
    counts.set(point.periodo, (counts.get(point.periodo) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([periodo]) => periodo);

  if (duplicates.length > 0) {
    throw new SeriesVariationError(
      "DUPLICATE_SERIES",
      `Los filtros devuelven más de una fila por período (${duplicates
        .slice(0, 5)
        .join(
          ", "
        )}${duplicates.length > 5 ? "…" : ""}). Ajuste los filtros para identificar una única serie.`
    );
  }
}

function assertEndpointsAndContinuity(
  points: SeriesPoint[],
  desde: string,
  hasta: string
): void {
  const byPeriod = new Map(points.map((point) => [point.periodo, point]));
  const first = byPeriod.get(desde);
  const last = byPeriod.get(hasta);

  if (!first || !last) {
    const missing = [!first ? desde : undefined, !last ? hasta : undefined]
      .filter((periodo): periodo is string => periodo !== undefined)
      .join(" y ");

    const available =
      points.length > 0
        ? `${points[0]?.periodo} a ${points[points.length - 1]?.periodo}`
        : "ninguno";

    throw new SeriesVariationError(
      "MISSING_ENDPOINT",
      `No hay datos para el período ${missing}. Períodos disponibles en la serie: ${available}.`
    );
  }

  const missingPeriods: string[] = [];
  for (
    let periodo = desde;
    periodo !== hasta;
    periodo = addMonths(periodo, 1)
  ) {
    if (!byPeriod.has(periodo)) {
      missingPeriods.push(periodo);
    }
  }

  if (missingPeriods.length > 0) {
    const shown = missingPeriods.slice(0, 12).join(", ");
    const rest =
      missingPeriods.length > 12 ? ` y ${missingPeriods.length - 12} más` : "";
    throw new SeriesVariationError(
      "MISSING_PERIOD",
      `Faltan períodos en la serie: ${shown}${rest}. No se calcula una variación con huecos.`
    );
  }
}

function isDecemberOfPreviousYear(desde: string, hasta: string): boolean {
  const end = parsePeriodo(hasta);
  return desde === formatPeriodo(end.year - 1, 12);
}

async function checkOfficialVariation(
  ctx: ToolContext,
  selection: SeriesSelection,
  options: {
    desde: string;
    hasta: string;
    meses: number;
    variacionCalculada: number;
  }
): Promise<OfficialCheck> {
  let tipo: string | undefined;

  if (options.meses === 12) {
    tipo = selection.officialVariationLiteral;
  } else if (
    selection.officialAccumulatedLiteral &&
    isDecemberOfPreviousYear(options.desde, options.hasta)
  ) {
    tipo = selection.officialAccumulatedLiteral;
  }

  if (!tipo) {
    return {
      disponible: false,
      motivo:
        "La API no publica una variación oficial punto a punto para este tramo. Solo se compara con la variación interanual (12 meses) o con la acumulada desde diciembre del año anterior.",
    };
  }

  const filters: FilterInput[] = [
    ...selection.filters,
    { columna: "tipo_de_indicador", operador: "eq", valor: tipo },
    { columna: "periodo", operador: "eq", valor: options.hasta },
  ];

  const result = await ctx.datasetQuery.query({
    dataset: selection.dataset,
    select: ["periodo", "valor"],
    filters,
    limit: 1,
  });

  const row = result.queryResult.data[0] as Record<string, unknown> | undefined;
  const valorOficial = toNumber(row?.valor);

  if (!Number.isFinite(valorOficial)) {
    return {
      disponible: false,
      motivo: `La API no publicó '${tipo}' para ${options.hasta} con esta serie.`,
    };
  }

  const diferenciaPp = roundTo(
    Math.abs(options.variacionCalculada - valorOficial),
    6
  );

  return {
    disponible: true,
    tipo,
    periodo: options.hasta,
    valorOficial,
    valorCalculado: options.variacionCalculada,
    diferenciaPp,
    coincide: diferenciaPp <= OFFICIAL_TOLERANCE_PP,
  };
}

/**
 * Obtiene la serie de índices, valida que sea única y continua, y calcula
 * todas las variaciones en el servidor.
 */
export async function computeSeriesVariation(
  ctx: ToolContext,
  selection: SeriesSelection,
  options: SeriesVariationOptions
): Promise<SeriesVariationResult> {
  let meses: number;
  try {
    meses = monthsBetween(options.desde, options.hasta);
  } catch (err: unknown) {
    throw new SeriesVariationError(
      "INVALID_RANGE",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (meses === 0) {
    throw new SeriesVariationError(
      "INVALID_RANGE",
      "El período inicial y el final deben ser distintos."
    );
  }

  const rezagoMeses =
    options.monto !== undefined ? (options.rezagoMeses ?? 0) : 0;
  if (rezagoMeses < 0) {
    throw new SeriesVariationError(
      "INVALID_RANGE",
      "El rezago en meses no puede ser negativo."
    );
  }

  const periodoEfectivoDesde =
    rezagoMeses > 0 ? addMonths(options.desde, -rezagoMeses) : options.desde;
  const periodoEfectivoHasta =
    rezagoMeses > 0 ? addMonths(options.hasta, -rezagoMeses) : options.hasta;

  const fetchDesde =
    periodoEfectivoDesde < options.desde ? periodoEfectivoDesde : options.desde;
  const fetchHasta = options.hasta;

  const rows = await fetchIndexRows(ctx, selection, fetchDesde, fetchHasta);

  if (rows.length === 0) {
    throw new SeriesVariationError(
      "NO_DATA",
      `No hay datos de la serie '${selection.label}' entre ${fetchDesde} y ${fetchHasta}.`
    );
  }

  const points = parseRows(selection, rows);
  points.sort((a, b) => a.periodo.localeCompare(b.periodo));
  assertSingleRowPerPeriod(points);
  assertEndpointsAndContinuity(points, fetchDesde, fetchHasta);

  const byPeriod = new Map(points.map((p) => [p.periodo, p]));
  const first = byPeriod.get(options.desde);
  const last = byPeriod.get(options.hasta);
  if (!first || !last) {
    throw new SeriesVariationError(
      "NO_DATA",
      "La serie no contiene puntos suficientes para calcular la variación."
    );
  }

  const variacionAcumulada = variationBetween(first.valor, last.valor);
  const variacionAnualizada = annualize(variacionAcumulada, meses);
  const promedioMensual = averageMonthly(variacionAcumulada, meses);

  const mainPoints = points.filter(
    (p) => p.periodo >= options.desde && p.periodo <= options.hasta
  );
  const serieMensual = mainPoints.map((point, index) => {
    const previous = index > 0 ? mainPoints[index - 1] : undefined;
    return {
      ...point,
      variacionMensual: previous
        ? variationBetween(previous.valor, point.valor)
        : null,
    };
  });

  const advertencias: string[] = [];

  const monthlyVariations = serieMensual
    .map((point) => point.variacionMensual)
    .filter((value): value is number => value !== null);

  if (monthlyVariations.length > 0) {
    const compounded = accumulateMonthly(monthlyVariations);
    if (Math.abs(compounded - variacionAcumulada) > 0.001) {
      advertencias.push(
        `La composición de las variaciones mensuales (${compounded}%) no coincide exactamente con la variación entre extremos (${variacionAcumulada}%); puede haber redondeos en la fuente.`
      );
    }
  }

  const observaciones = [
    ...new Set(
      points
        .map((point) => point.observaciones)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim() !== ""
        )
    ),
  ];

  const verificacionOficial = await checkOfficialVariation(ctx, selection, {
    desde: options.desde,
    hasta: options.hasta,
    meses,
    variacionCalculada: variacionAcumulada,
  });

  if (verificacionOficial.disponible && !verificacionOficial.coincide) {
    advertencias.push(
      `La variación calculada (${variacionAcumulada}%) difiere de la oficial publicada (${verificacionOficial.valorOficial}%) en ${verificacionOficial.diferenciaPp} pp.`
    );
  }

  let montoActualizado: number | undefined;
  let periodoEfectivoMonto: string | undefined;
  let variacionMonto: number | undefined;

  if (options.monto !== undefined) {
    const effectiveStart = byPeriod.get(periodoEfectivoDesde);
    const effectiveEnd = byPeriod.get(periodoEfectivoHasta);

    if (!effectiveStart || !effectiveEnd) {
      const missing = !effectiveStart
        ? periodoEfectivoDesde
        : periodoEfectivoHasta;
      throw new SeriesVariationError(
        "MISSING_ENDPOINT",
        `No hay datos para el período efectivo ${missing} usado para actualizar el monto.`
      );
    }

    variacionMonto = variationBetween(effectiveStart.valor, effectiveEnd.valor);
    montoActualizado = updateAmount(options.monto, variacionMonto);
    periodoEfectivoMonto = periodoEfectivoHasta;
  }

  return {
    dataset: selection.dataset,
    label: selection.label,
    filters: [
      ...selection.filters,
      {
        columna: "tipo_de_indicador",
        operador: "eq",
        valor: selection.indexLiteral,
      },
    ],
    desde: options.desde,
    hasta: options.hasta,
    meses,
    indiceInicial: first.valor,
    indiceFinal: last.valor,
    variacionAcumulada,
    variacionAnualizada,
    promedioMensual,
    monto: options.monto,
    montoActualizado,
    periodoEfectivoDesde:
      options.monto !== undefined ? periodoEfectivoDesde : undefined,
    periodoEfectivoMonto,
    variacionMonto,
    rezagoMeses: options.monto !== undefined ? rezagoMeses : undefined,
    serieMensual,
    observaciones,
    verificacionOficial,
    advertencias,
  };
}
