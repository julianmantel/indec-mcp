import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";
import { resolveIpcIndicador, resolveIpcNivel } from "./values.js";

const DATASET_ID: DatasetId = "ipc_nacional";

// Se aceptan etiquetas en español y los códigos literales de la API.
export const tipoIndicadorIpcEnum = z.enum([
  "variación intermensual",
  "variación interanual",
  "variación acumulada",
  "índice",
  "incidencia",
  "precio promedio",
  "v_m",
  "v_ia",
  "v_acum",
  "Indice",
  "Incidencia_m",
  "Incidencia_acum",
  "Incidencia_ia",
  "Precio promedio",
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
      "Tipo de indicador: 'variación intermensual' (v_m, inflación mensual), 'variación interanual' (v_ia), 'variación acumulada' (v_acum), 'índice' (Indice, base dic 2016=100), 'incidencia', 'precio promedio' o el código literal de la API. Default: 'variación intermensual'."
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
      "Nivel de apertura (ej: 'Nivel General', 'División', 'Grupo', 'Clase', 'Categoría', 'Producto'). Si se omite, no filtra por nivel."
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
      valor: resolveIpcIndicador(args.tipo_indicador),
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
      valor: resolveIpcNivel(args.nivel),
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
