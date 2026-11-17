import { z } from "zod";
import type { ToolContext } from "./context.js";
import { formatCountError, formatQueryError } from "./errors.js";
import {
  jsonBlock,
  sourceLine,
  textResult,
  truncationNotice,
} from "./presentation.js";

export const postgrestOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "is",
]);

export const filterItemSchema = z.object({
  columna: z
    .string()
    .max(200, "El nombre de columna no puede superar los 200 caracteres")
    .describe("Nombre exacto de la columna a filtrar"),
  operador: postgrestOperatorSchema.describe(
    "Operador PostgREST: 'eq' (=), 'neq' (!=), 'gt' (>), 'gte' (>=), 'lt' (<), 'lte' (<=), 'like' (patrón sensible), 'ilike' (patrón insensible), 'in' (lista en paréntesis), 'is' (null/true/false)"
  ),
  valor: z
    .union([
      z.string().max(2000, "El valor no puede superar los 2000 caracteres"),
      z.number(),
      z.boolean(),
      z
        .array(
          z.union([
            z
              .string()
              .max(
                2000,
                "Cada valor de la lista no puede superar los 2000 caracteres"
              ),
            z.number(),
          ])
        )
        .max(100, "La lista de valores no puede superar los 100 elementos"),
    ])
    .describe("Valor del filtro"),
});

export const queryDatasetInputSchema = z.object({
  dataset: z
    .string()
    .min(1)
    .max(
      200,
      "El identificador del dataset no puede superar los 200 caracteres"
    )
    .describe(
      "Identificador del dataset a consultar (ej: 'ipc_nacional', 'canasta-crianza', 'mercado_trabajo_eph')"
    ),
  select: z
    .union([
      z.string().max(2000, "select no puede superar los 2000 caracteres"),
      z
        .array(
          z
            .string()
            .max(
              200,
              "Cada columna de select no puede superar los 200 caracteres"
            )
        )
        .max(100, "select no puede superar las 100 columnas"),
    ])
    .optional()
    .describe(
      "Columnas específicas a consultar separadas por coma o como array. Si se omite, devuelve todas las columnas."
    ),
  filters: z
    .array(filterItemSchema)
    .max(50, "filters no puede superar los 50 filtros")
    .optional()
    .describe(
      "Array de filtros a aplicar. Cada filtro contiene { columna, operador, valor }."
    ),
  order: z
    .union([
      z.string().max(1000, "order no puede superar los 1000 caracteres"),
      z
        .array(
          z
            .string()
            .max(
              200,
              "Cada criterio de order no puede superar los 200 caracteres"
            )
        )
        .max(100, "order no puede superar los 100 criterios"),
    ])
    .optional()
    .describe(
      "Criterio de ordenamiento (ej: 'periodo.desc', 'periodo.desc,codigo.asc')."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe(
      "Cantidad máxima de registros a retornar (default: 50, máx: 1000)."
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Cantidad de registros a omitir para paginación (default: 0)."),
});

export type QueryDatasetInput = z.infer<typeof queryDatasetInputSchema>;

export const countRowsInputSchema = z.object({
  dataset: z
    .string()
    .min(1)
    .max(
      200,
      "El identificador del dataset no puede superar los 200 caracteres"
    )
    .describe("Identificador del dataset cuyo total de filas se desea contar."),
  filters: z
    .array(filterItemSchema)
    .max(50, "filters no puede superar los 50 filtros")
    .optional()
    .describe(
      "Filtros opcionales para contar filas que cumplan condiciones específicas."
    ),
});

export type CountRowsInput = z.infer<typeof countRowsInputSchema>;

export async function handleIndecQueryDataset(
  args: QueryDatasetInput,
  ctx: ToolContext
) {
  try {
    const { dataset, queryResult } = await ctx.datasetQuery.query({
      dataset: args.dataset,
      select: args.select,
      filters: args.filters,
      order: args.order,
      limit: args.limit,
      offset: args.offset,
    });

    const lines: string[] = [
      `# Consulta: ${dataset.summary} (\`${dataset.id}\`)`,
      `- **Registros devueltos:** ${queryResult.count}`,
      `- **Total en dataset / filtro:** ${queryResult.total !== null ? queryResult.total : "No disponible"}`,
      `- **Paginación:** limit=${queryResult.limit}, offset=${queryResult.offset}`,
    ];

    if (queryResult.isTruncated) {
      lines.push(
        ``,
        truncationNotice(
          queryResult.offset,
          queryResult.count,
          queryResult.total
        )
      );
    }

    lines.push(``, jsonBlock(queryResult.data), ``, sourceLine(dataset.id));

    return textResult(lines.join("\n"));
  } catch (err: unknown) {
    return formatQueryError(err, args.dataset);
  }
}

export async function handleIndecCountRows(
  args: CountRowsInput,
  ctx: ToolContext
) {
  try {
    const { dataset, total, filters } = await ctx.datasetQuery.countRows({
      dataset: args.dataset,
      filters: args.filters,
    });

    const filterDesc =
      filters.length > 0
        ? ` con ${filters.length} filtro(s) aplicado(s)`
        : " sin filtros";

    const text = [
      `# Total de Filas: ${dataset.summary} (\`${dataset.id}\`)`,
      `- **Total exacto${filterDesc}:** **${total.toLocaleString("es-AR")}** filas`,
      ``,
      jsonBlock({
        dataset: dataset.id,
        total,
        filtrosAplicados: filters,
      }),
      ``,
      sourceLine(dataset.id),
    ].join("\n");

    return textResult(text);
  } catch (err: unknown) {
    return formatCountError(err, args.dataset);
  }
}
