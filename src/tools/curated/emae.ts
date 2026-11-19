import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning, errorResult, sourceLine } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";
import {
  resolveEmaeIndicador,
  type EmaeDatasetKind,
  type EmaeSerie,
} from "./values.js";

const DATASET_NIVEL_GENERAL: DatasetId =
  "estimador-mensual-de-actividad-economica-nivel-general";
const DATASET_SECTORES: DatasetId =
  "estimador-mensual-de-actividad-economica-sectores";

export const tipoIndicadorEmaeEnum = z.enum([
  "variación interanual",
  "variación intermensual",
  "índice",
  "Variación porcentual",
  "Variación porcentual interanual",
  "Índice base 2004=100",
]);

export const serieEmaeEnum = z.enum([
  "original",
  "desestacionalizada",
  "tendencia-ciclo",
]);

export const getEmaeInputSchema = z.object({
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
  tipo_indicador: tipoIndicadorEmaeEnum
    .optional()
    .default("variación interanual")
    .describe(
      "Tipo de indicador: 'variación interanual' (crecimiento interanual del EMAE), 'variación intermensual' (solo nivel general) o 'índice' (base 2004=100). También acepta los valores literales de la API. No hay variación acumulada en este dataset. Default: 'variación interanual'."
    ),
  serie: serieEmaeEnum
    .optional()
    .describe(
      "Serie de cálculo (solo para nivel general): 'original', 'desestacionalizada' o 'tendencia-ciclo'."
    ),
  sector: z
    .string()
    .max(200, "El sector no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Filtrar por código de letra (ej: 'D') o nombre del sector (ej: 'Industria', 'Comercio', 'Agricultura'). Si se especifica, consulta automáticamente la tabla de sectores."
    ),
  desglosar_sectores: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Si es true, consulta el EMAE desagregado por todos los sectores de actividad económica en lugar del nivel general."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe("Cantidad máxima de registros a retornar (default: 50)."),
});

export type GetEmaeInput = z.infer<typeof getEmaeInputSchema>;

export async function handleIndecGetEmae(args: GetEmaeInput, ctx: ToolContext) {
  const consultarSectores = Boolean(args.sector || args.desglosar_sectores);
  const datasetId: DatasetId = consultarSectores
    ? DATASET_SECTORES
    : DATASET_NIVEL_GENERAL;

  if (!ctx.client.hasToken()) {
    return handleIndecQueryDataset(
      { dataset: datasetId, limit: 1, offset: 0 },
      ctx
    );
  }

  const datasetKind: EmaeDatasetKind = consultarSectores
    ? "sectores"
    : "general";
  const indicador = resolveEmaeIndicador(
    args.tipo_indicador,
    datasetKind,
    args.serie as EmaeSerie | undefined
  );
  if (indicador.error) {
    return errorResult(`${indicador.error}\n\n${sourceLine(datasetId)}`);
  }

  const period = await buildPeriodFilters({
    client: ctx.client,
    datasetId,
    label: "el EMAE",
    desde: args.desde,
    hasta: args.hasta,
    resolveLatest: !args.desde && !args.hasta,
  });

  const filters: FilterInput[] = [...period.filters];

  filters.push({
    columna: "tipo_de_indicador",
    operador: "eq",
    valor: indicador.tipo,
  });

  if (consultarSectores && args.sector) {
    const isLetterCode =
      args.sector.trim().length === 1 && /^[A-Za-z]$/.test(args.sector.trim());

    if (isLetterCode) {
      filters.push({
        columna: "codigo",
        operador: "eq",
        valor: args.sector.trim().toUpperCase(),
      });
    } else {
      filters.push({
        columna: "descripcion",
        operador: "ilike",
        valor: `*${args.sector.trim()}*`,
      });
    }
  }

  if (indicador.descripcion) {
    filters.push({
      columna: "tipo_de_indicador_descripcion",
      operador: "ilike",
      valor: `*${indicador.descripcion}*`,
    });
  }

  const order = args.desde || args.hasta ? "periodo.asc" : "periodo.desc";

  const result = await handleIndecQueryDataset(
    {
      dataset: datasetId,
      filters,
      order,
      limit: args.limit,
      offset: 0,
    },
    ctx
  );

  return appendWarning(result, period.warning);
}
