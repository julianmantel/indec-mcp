import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "mercado_trabajo_eph";

export const getMercadoTrabajoInputSchema = z.object({
  anio: z
    .number()
    .int()
    .min(2016)
    .max(2040)
    .optional()
    .describe("Año de referencia (ej: 2024). Opcional."),
  trimestre: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe(
      "Número de trimestre del 1 al 4 (ej: 2 para segundo trimestre). Opcional."
    ),
  desde: z
    .string()
    .max(200, "El período no puede superar los 200 caracteres")
    .optional()
    .describe("Período inicial (ej: '202301'). Opcional."),
  hasta: z
    .string()
    .max(200, "El período no puede superar los 200 caracteres")
    .optional()
    .describe("Período final (ej: '202402'). Opcional."),
  area_geografica: z
    .string()
    .max(200, "El área geográfica no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Nombre del área o aglomerado urbano (ej: 'Total 31 aglomerados urbanos', 'Gran Buenos Aires', 'Córdoba', 'Rosario'). Si se omite y todos_aglomerados es false, busca por defecto el total de 31 aglomerados."
    ),
  todos_aglomerados: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Si es true, no filtra por área geográfica y devuelve las tasas de todos los aglomerados urbanos para el período."
    ),
  solo_principales: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Si es true, proyecta únicamente las tasas principales (actividad, empleo, desocupación y subocupación)."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetMercadoTrabajoInput = z.infer<
  typeof getMercadoTrabajoInputSchema
>;

export async function handleIndecGetMercadoTrabajo(
  args: GetMercadoTrabajoInput,
  ctx: ToolContext
) {
  if (!ctx.client.hasToken()) {
    return handleIndecQueryDataset(
      { dataset: DATASET_ID, limit: 1, offset: 0 },
      ctx
    );
  }

  const sinFechas =
    args.anio === undefined &&
    args.trimestre === undefined &&
    !args.desde &&
    !args.hasta;

  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId: DATASET_ID,
    label: "el mercado de trabajo",
    desde: args.desde,
    hasta: args.hasta,
    resolveLatest: sinFechas,
  });

  const filters: FilterInput[] = [...period.filters];

  if (args.anio !== undefined) {
    filters.push({
      columna: "anio",
      operador: "eq",
      valor: args.anio,
    });
  }

  if (args.trimestre !== undefined) {
    filters.push({
      columna: "trimestre",
      operador: "eq",
      valor: args.trimestre,
    });
  }

  if (!args.todos_aglomerados) {
    const area = args.area_geografica?.trim() || "Total 31 aglomerados urbanos";
    filters.push({
      columna: "area_geografica_nom",
      operador: "ilike",
      valor: `*${area}*`,
    });
  }

  let select: string[] | undefined;
  if (args.solo_principales) {
    select = [
      "area_geografica_nom",
      "periodo",
      "anio",
      "trimestre",
      "tasa_de_actividad",
      "tasa_de_empleo",
      "tasa_de_desocupacion",
      "tasa_de_subocupacion",
    ];
  }

  const order = sinFechas ? "periodo.desc" : "periodo.asc";

  const result = await handleIndecQueryDataset(
    {
      dataset: DATASET_ID,
      select,
      filters,
      order,
      limit: args.limit,
      offset: 0,
    },
    ctx
  );

  return appendWarning(result, period.warning);
}
