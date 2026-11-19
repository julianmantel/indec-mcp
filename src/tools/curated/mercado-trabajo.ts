import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";
import { resolveEphArea } from "./values.js";

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
    .regex(
      /^\d{4}[1-4]T$/,
      "El formato debe ser AAAAT (ej: '202401' = primer trimestre de 2024)"
    )
    .optional()
    .describe(
      "Período inicial en formato AAAAT, donde T es el trimestre 1 a 4 (ej: '202401'). Opcional."
    ),
  hasta: z
    .string()
    .regex(
      /^\d{4}[1-4]T$/,
      "El formato debe ser AAAAT (ej: '202404' = cuarto trimestre de 2024)"
    )
    .optional()
    .describe(
      "Período final en formato AAAAT, donde T es el trimestre 1 a 4 (ej: '202404'). Opcional."
    ),
  area_geografica: z
    .string()
    .max(200, "El área geográfica no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Área geográfica. La API solo publica 'T_31_A' (total de 31 aglomerados urbanos); también acepta ese nombre en español. Si se omite y todos_aglomerados es false, filtra por 'T_31_A'."
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

  const areaFilter = args.todos_aglomerados
    ? undefined
    : resolveEphArea(args.area_geografica);
  if (areaFilter) {
    filters.push({
      columna: "area_geografica_nom",
      operador: areaFilter.operador,
      valor: areaFilter.valor,
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

  const warning = [period.warning, areaFilter?.warning]
    .filter(Boolean)
    .join("\n\n");
  return appendWarning(result, warning || undefined);
}
