import { z } from "zod";
import { handleIndecQueryDataset } from "../query.js";
import { appendWarning } from "../presentation.js";
import type { ToolContext } from "../context.js";
import { buildPeriodFilters } from "../../services/period-filters.js";
import type { FilterInput } from "../../services/dataset-query.js";
import type { DatasetId } from "../../datasets/registry.generated.js";
import { resolveEphArea } from "./values.js";

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
    .regex(
      /^\d{4}[12]S$/,
      "El formato debe ser AAAAS (ej: '20241' = primer semestre de 2024)"
    )
    .optional()
    .describe(
      "Período inicial en formato AAAAS, donde S es el semestre 1 o 2 (ej: '20241'). Opcional."
    ),
  hasta: z
    .string()
    .regex(
      /^\d{4}[12]S$/,
      "El formato debe ser AAAAS (ej: '20242' = segundo semestre de 2024)"
    )
    .optional()
    .describe(
      "Período final en formato AAAAS, donde S es el semestre 1 o 2 (ej: '20242'). Opcional."
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

  const warning = [period.warning, areaFilter?.warning]
    .filter(Boolean)
    .join("\n\n");
  return appendWarning(result, warning || undefined);
}
