import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "valorizacion_canastas_cba_cbt";

export const canastaTipoEnum = z.enum(["CBA", "CBT", "todas"]);

export const canastaIndicadorEnum = z.enum([
  "todos",
  "variación intermensual",
  "variación interanual",
  "variación acumulada",
  "línea",
]);

export const getCanastasInputSchema = z.object({
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
  canasta: canastaTipoEnum
    .optional()
    .default("todas")
    .describe(
      "Tipo de canasta: 'CBA' (Alimentaria / Indigencia), 'CBT' (Total / Pobreza) o 'todas'. Default: 'todas'."
    ),
  tipo_indicador: canastaIndicadorEnum
    .optional()
    .default("todos")
    .describe(
      "Tipo de indicador: 'variación intermensual', 'variación interanual', 'línea' o 'todos'. Default: 'todos'."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetCanastasInput = z.infer<typeof getCanastasInputSchema>;

export async function handleIndecGetCanastas(
  args: GetCanastasInput,
  ctx: ToolContext
) {
  if (!ctx.client.hasToken()) {
    return handleIndecQueryDataset(
      { dataset: DATASET_ID, limit: 1, offset: 0 },
      ctx
    );
  }

  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId: DATASET_ID,
    label: "las canastas CBA y CBT",
    desde: args.desde,
    hasta: args.hasta,
    resolveLatest: !args.desde && !args.hasta,
  });

  const filters: FilterInput[] = [...period.filters];

  if (args.canasta && args.canasta !== "todas") {
    filters.push({
      columna: "codigo",
      operador: "ilike",
      valor: `*${args.canasta}*`,
    });
  }

  if (args.tipo_indicador && args.tipo_indicador !== "todos") {
    filters.push({
      columna: "tipo_de_indicador",
      operador: "ilike",
      valor: `*${args.tipo_indicador}*`,
    });
  }

  const order = args.desde || args.hasta ? "periodo.asc" : "periodo.desc";

  const result = await handleIndecQueryDataset(
    {
      dataset: DATASET_ID,
      filters,
      order,
      limit: args.limit,
      offset: 0,
    },
    ctx
  );

  return appendWarning(result, period.warning);
}
