import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { errorResult, sourceLine } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { isAuthOrRateLimitError } from "../../client/errors.js";
import type { DatasetId } from "../../datasets/registry.generated.js";

const DATASET_ID: DatasetId = "indice_salarios";

export const getSalariosInputSchema = z.object({
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
  sector: z
    .string()
    .max(200, "El sector no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Sector o categoría a buscar en la columna 'descripcion' (ej: 'privado registrado', 'público', 'privado no registrado', 'total'). La búsqueda es insensible a mayúsculas y acepta coincidencias parciales. Si se omite, devuelve todos los sectores del período."
    ),
  tipo_indicador: z
    .string()
    .max(200, "El tipo de indicador no puede superar los 200 caracteres")
    .optional()
    .default("índice")
    .describe(
      "Tipo de indicador a buscar en la columna 'tipo_de_indicador' (ej: 'índice', 'variación intermensual', 'variación interanual', 'variación acumulada'). La búsqueda es insensible a mayúsculas. Use 'todos' para no filtrar. Default: 'índice'."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetSalariosInput = z.infer<typeof getSalariosInputSchema>;

export async function handleIndecGetSalarios(
  args: GetSalariosInput,
  ctx: ToolContext
) {
  if (!ctx.client.hasToken()) {
    // Delega directamente a handleIndecQueryDataset para mantener mensaje uniforme de auth
    return handleIndecQueryDataset(
      { dataset: DATASET_ID, limit: 1, offset: 0 },
      ctx
    );
  }

  let periodoFiltro: { operador: "eq" | "gte"; valor: string } | undefined;
  let periodoHastaFiltro: { operador: "lte"; valor: string } | undefined;

  // Si no hay rango de fechas, averiguamos el último período publicado
  if (!args.desde && !args.hasta) {
    try {
      const latestQuery = await ctx.client.query<{ periodo: string }>(
        DATASET_ID,
        {
          select: "periodo",
          order: "periodo.desc",
          limit: 1,
          count: false,
        }
      );

      const latestPeriod = latestQuery.data[0]?.periodo;
      if (latestPeriod) {
        periodoFiltro = { operador: "eq", valor: latestPeriod };
      }
    } catch (err: unknown) {
      if (isAuthOrRateLimitError(err)) {
        throw err;
      }
      // No se continúa sin filtro: se avisa al usuario para no devolver una serie mezclada.
      console.error(
        "No se pudo determinar el último período publicado del índice de salarios."
      );
      return errorResult(
        `No se pudo determinar el último período publicado del índice de salarios. Intente nuevamente o especifique un rango de fechas.\n\n${sourceLine(DATASET_ID)}`
      );
    }
  } else {
    if (args.desde && args.hasta && args.desde === args.hasta) {
      periodoFiltro = { operador: "eq", valor: args.desde };
    } else {
      if (args.desde) {
        periodoFiltro = { operador: "gte", valor: args.desde };
      }
      if (args.hasta) {
        periodoHastaFiltro = { operador: "lte", valor: args.hasta };
      }
    }
  }

  const filters: Array<{
    columna: string;
    operador: "eq" | "gte" | "lte" | "ilike";
    valor: string;
  }> = [];

  if (periodoFiltro) {
    filters.push({
      columna: "periodo",
      operador: periodoFiltro.operador,
      valor: periodoFiltro.valor,
    });
  }

  if (periodoHastaFiltro) {
    filters.push({
      columna: "periodo",
      operador: "lte",
      valor: periodoHastaFiltro.valor,
    });
  }

  if (args.sector?.trim()) {
    filters.push({
      columna: "descripcion",
      operador: "ilike",
      valor: `*${args.sector.trim()}*`,
    });
  }

  if (args.tipo_indicador && args.tipo_indicador.toLowerCase() !== "todos") {
    filters.push({
      columna: "tipo_de_indicador",
      operador: "ilike",
      valor: `*${args.tipo_indicador}*`,
    });
  }

  const order = args.desde || args.hasta ? "periodo.asc" : "periodo.desc";

  return handleIndecQueryDataset(
    {
      dataset: DATASET_ID,
      filters,
      order,
      limit: args.limit,
      offset: 0,
    },
    ctx
  );
}
