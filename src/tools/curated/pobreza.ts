import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "pobreza_eph";

export const enfoquePobrezaEnum = z.enum(["todos", "personas", "hogares"]);

export const getPobrezaInputSchema = z.object({
  anio: z
    .number()
    .int()
    .min(2016)
    .max(2040)
    .optional()
    .describe("Año de referencia (ej: 2024). Opcional."),
  semestre: z
    .number()
    .int()
    .min(1)
    .max(2)
    .optional()
    .describe(
      "Número de semestre: 1 (primer semestre) o 2 (segundo semestre). Opcional."
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
    .describe("Período final (ej: '202401'). Opcional."),
  area_geografica: z
    .string()
    .max(200, "El área geográfica no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Nombre del área o aglomerado urbano (ej: 'Total 31 aglomerados urbanos', 'Gran Buenos Aires', 'Gran Córdoba'). Si se omite y todos_aglomerados es false, busca por defecto el total de 31 aglomerados."
    ),
  todos_aglomerados: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Si es true, devuelve la pobreza e indigencia de todos los aglomerados urbanos para el período en lugar de solo el total nacional."
    ),
  enfoque: enfoquePobrezaEnum
    .optional()
    .default("todos")
    .describe(
      "Filtrar tasas: 'personas' (tasa de pobreza e indigencia en personas), 'hogares' (tasa en hogares) o 'todos'. Default: 'todos'."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetPobrezaInput = z.infer<typeof getPobrezaInputSchema>;

export async function handleIndecGetPobreza(
  args: GetPobrezaInput,
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
    args.semestre === undefined &&
    !args.desde &&
    !args.hasta;

  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId: DATASET_ID,
    label: "la pobreza",
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

  if (args.semestre !== undefined) {
    filters.push({
      columna: "semestre",
      operador: "eq",
      valor: args.semestre,
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
  if (args.enfoque === "personas") {
    select = [
      "area_geografica_nom",
      "periodo",
      "anio",
      "semestre",
      "tasa_pobreza_personas",
      "tasa_indigencia_personas",
    ];
  } else if (args.enfoque === "hogares") {
    select = [
      "area_geografica_nom",
      "periodo",
      "anio",
      "semestre",
      "tasa_pobreza_hogares",
      "tasa_indigencia_hogares",
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
