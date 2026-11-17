import type { IndecHttpClient } from "../client/indec-client.js";
import type { FilterInput } from "./dataset-query.js";
import { resolveLatestPeriod } from "./latest-period.js";

export interface PeriodFilterOptions {
  client: IndecHttpClient;
  datasetId: string;
  /** Columna de período del dataset. Default: "periodo". */
  column?: string;
  /** Etiqueta legible usada en advertencias (ej: "el IPC"). */
  label: string;
  desde?: string;
  hasta?: string;
  /**
   * Si es true, se consulta el último período publicado cuando no hay rango.
   * Si es false, solo se aplican los filtros desde/hasta provistos.
   */
  resolveLatest: boolean;
}

export interface PeriodFilterResult {
  filters: FilterInput[];
  warning?: string;
}

/**
 * Construye los filtros de período comunes a las tools curadas, incluyendo la
 * resolución del último período publicado cuando corresponde.
 */
export async function buildPeriodFilters(
  options: PeriodFilterOptions
): Promise<PeriodFilterResult> {
  const column = options.column ?? "periodo";

  if (options.resolveLatest) {
    const latest = await resolveLatestPeriod(
      options.client,
      options.datasetId,
      column,
      options.label
    );

    return {
      filters: latest.period
        ? [{ columna: column, operador: "eq", valor: latest.period }]
        : [],
      warning: latest.warning,
    };
  }

  if (options.desde && options.hasta && options.desde === options.hasta) {
    return {
      filters: [{ columna: column, operador: "eq", valor: options.desde }],
    };
  }

  const filters: FilterInput[] = [];
  if (options.desde) {
    filters.push({ columna: column, operador: "gte", valor: options.desde });
  }
  if (options.hasta) {
    filters.push({ columna: column, operador: "lte", valor: options.hasta });
  }
  return { filters };
}
