import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "ipc_nacional";

export const tipoIndicadorIpcEnum = z.enum([
  "variación intermensual",
  "variación interanual",
  "variación acumulada",
  "índice",
  "incidencia",
  "precio promedio",
]);

export const regionIpcEnum = z.enum([
  "Nacional",
  "GBA",
  "Pampeana",
  "Cuyo",
  "Noreste",
  "Noroeste",
  "Patagonia",
]);

export const getIpcInputSchema = z.object({
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
  tipo_indicador: tipoIndicadorIpcEnum
    .optional()
    .default("variación intermensual")
    .describe(
      "Tipo de indicador: 'variación intermensual' (inflación mensual), 'variación interanual', 'variación acumulada', 'índice' (base dic 2016=100), etc. Default: 'variación intermensual'."
    ),
  region: regionIpcEnum
    .optional()
    .default("Nacional")
    .describe("Región geográfica estadística. Default: 'Nacional'."),
  nivel: z
    .string()
    .max(200, "El nivel no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Nivel de apertura (ej: 'Nivel general', 'División'). Si se omite, devuelve el nivel general y las divisiones correspondientes."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetIpcInput = z.infer<typeof getIpcInputSchema>;

export async function handleIndecGetIpc(args: GetIpcInput, ctx: ToolContext) {
  if (!ctx.client.hasToken()) {
    // Delega directamente a handleIndecQueryDataset para mantener mensaje uniforme de auth
    return handleIndecQueryDataset(
      { dataset: DATASET_ID, limit: 1, offset: 0 },
      ctx
    );
  }

  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId: DATASET_ID,
    label: "el IPC",
    desde: args.desde,
    hasta: args.hasta,
    resolveLatest: !args.desde && !args.hasta,
  });

  const filters: FilterInput[] = [...period.filters];

  if (args.tipo_indicador) {
    filters.push({
      columna: "tipo_de_indicador",
      operador: "eq",
      valor: args.tipo_indicador,
    });
  }

  if (args.region) {
    filters.push({
      columna: "region",
      operador: "eq",
      valor: args.region,
    });
  }

  if (args.nivel) {
    filters.push({
      columna: "nivel",
      operador: "eq",
      valor: args.nivel,
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
