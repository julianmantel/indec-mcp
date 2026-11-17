import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "canasta-crianza";

export const tramoEdadEnum = z.enum([
  "todos",
  "menor_1",
  "1_a_3",
  "4_a_5",
  "6_a_12",
]);

export const getCanastaCrianzaInputSchema = z.object({
  desde: z
    .string()
    .regex(/^\d{6}$/, "El formato debe ser AAAAMM (ej: '202401')")
    .optional()
    .describe("Período inicial en formato AAAAMM (ej: '202401'). Opcional."),
  hasta: z
    .string()
    .regex(/^\d{6}$/, "El formato debe ser AAAAMM (ej: '202412')")
    .optional()
    .describe("Período final en formato AAAAMM (ej: '202412'). Opcional."),
  tramo_edad: tramoEdadEnum
    .optional()
    .default("todos")
    .describe(
      "Tramo de edad a consultar: 'menor_1' (< 1 año), '1_a_3' (1 a 3 años), '4_a_5' (4 a 5 años), '6_a_12' (6 a 12 años) o 'todos'. Default: 'todos'."
    ),
  solo_totales: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Si es true, devuelve únicamente las columnas de valor total mensual para cada tramo etario (ideal para cuotas alimentarias), omitiendo la apertura de bienes y cuidados."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetCanastaCrianzaInput = z.infer<
  typeof getCanastaCrianzaInputSchema
>;

export async function handleIndecGetCanastaCrianza(
  args: GetCanastaCrianzaInput,
  ctx: ToolContext
) {
  if (!ctx.client.hasToken()) {
    return handleIndecQueryDataset(
      { dataset: DATASET_ID, limit: 1, offset: 0 },
      ctx
    );
  }

  // En canasta-crianza la columna es 'Periodo' con mayúscula
  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId: DATASET_ID,
    column: "Periodo",
    label: "la canasta de crianza",
    desde: args.desde,
    hasta: args.hasta,
    resolveLatest: !args.desde && !args.hasta,
  });

  const filters: FilterInput[] = [...period.filters];

  let select: string[] | undefined;

  if (args.solo_totales) {
    select = [
      "anio",
      "Mes",
      "Periodo",
      "tot_men1",
      "tot_1a3",
      "tot_4a5",
      "tot_6a12",
    ];
  } else if (args.tramo_edad && args.tramo_edad !== "todos") {
    switch (args.tramo_edad) {
      case "menor_1":
        select = [
          "anio",
          "Mes",
          "Periodo",
          "tot_men1",
          "bys_men1",
          "cuid_men1",
        ];
        break;
      case "1_a_3":
        select = ["anio", "Mes", "Periodo", "tot_1a3", "bys_1a3", "cuid_1a3"];
        break;
      case "4_a_5":
        select = ["anio", "Mes", "Periodo", "tot_4a5", "bys_4a5", "cuid_4a5"];
        break;
      case "6_a_12":
        select = [
          "anio",
          "Mes",
          "Periodo",
          "tot_6a12",
          "bys_6a12",
          "cuid_6a12",
        ];
        break;
    }
  }

  const order = args.desde || args.hasta ? "Periodo.asc" : "Periodo.desc";

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
