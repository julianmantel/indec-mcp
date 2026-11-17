import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthOrRateLimitError } from "../client/errors.js";
import type { ToolContext } from "./context.js";
import {
  API_SOURCE,
  describeSourceLine,
  errorResult,
  jsonBlock,
  sourceLine,
  suggestionsSuffix,
  textResult,
} from "./presentation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getLocalSnapshotInfo(customSnapshotPath?: string): {
  title?: string;
  version?: string;
  totalPaths?: number;
  rawContent: string;
  readError?: boolean;
} {
  const rootDir = resolve(__dirname, "../..");
  const snapshotPath =
    customSnapshotPath || resolve(rootDir, "docs/openapi.snapshot.json");

  try {
    const rawContent = readFileSync(snapshotPath, "utf8");
    const parsed = JSON.parse(rawContent) as {
      info?: { title?: string; version?: string };
      paths?: Record<string, unknown>;
    };
    return {
      title: parsed.info?.title,
      version: parsed.info?.version,
      totalPaths: parsed.paths ? Object.keys(parsed.paths).length : undefined,
      rawContent,
    };
  } catch {
    return { rawContent: "", readError: true };
  }
}

interface SpecLike {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> }>;
  };
}

/**
 * Firma estable del catálogo: rutas ordenadas + columnas de cada schema.
 * No depende del orden de las claves ni de descripciones, y detecta cambios
 * de columnas aunque la cantidad de datasets se mantenga igual.
 */
export function buildSpecSignature(spec: SpecLike): string {
  const paths = Object.keys(spec.paths ?? {}).sort();
  const schemas = spec.components?.schemas ?? {};
  const columns = Object.keys(schemas)
    .sort()
    .map(
      (name) =>
        [name, Object.keys(schemas[name]?.properties ?? {}).sort()] as const
    );
  return JSON.stringify({ paths, columns });
}

export const statusInputSchema = z.object({});

export async function handleIndecStatus(ctx: ToolContext) {
  const tokenConfigured = ctx.client.hasToken();
  const baseUrl = ctx.client.getBaseUrl();
  const snapshotInfo = getLocalSnapshotInfo(ctx.snapshotPath);
  const snapshotWarning = snapshotInfo.readError
    ? "No se pudo leer el snapshot local; la comparación con el spec remoto puede no ser confiable."
    : null;

  let specUpToDate: boolean | null = null;
  let specDetails = "No se pudo verificar el spec remoto.";

  try {
    const response = await ctx.client.requestRaw("", {
      requireAuth: false,
    });

    if (response.ok) {
      const remoteText = await response.text();

      if (snapshotInfo.readError) {
        specUpToDate = null;
        specDetails =
          "No se pudo comparar el spec remoto porque falta el snapshot local.";
      } else {
        try {
          const remoteJson = JSON.parse(remoteText) as SpecLike;
          const localJson = JSON.parse(snapshotInfo.rawContent) as SpecLike;

          const remotePathsCount = Object.keys(remoteJson.paths ?? {}).length;
          const localPathsCount = Object.keys(localJson.paths ?? {}).length;
          const remoteSignature = buildSpecSignature(remoteJson);
          const localSignature = buildSpecSignature(localJson);

          if (remoteSignature === localSignature) {
            specUpToDate = true;
            specDetails = `El spec remoto coincide con el snapshot local (${localPathsCount} datasets y sus columnas).`;
          } else if (remotePathsCount === localPathsCount) {
            specUpToDate = false;
            specDetails = `El spec remoto contiene los mismos ${localPathsCount} datasets, pero sus columnas o metadatos difieren del snapshot local. Ejecute 'npm run gen -- --fetch'.`;
          } else {
            specUpToDate = false;
            specDetails = `El spec remoto contiene ${remotePathsCount} datasets frente a ${localPathsCount} del snapshot local. Ejecute 'npm run gen -- --fetch'.`;
          }
        } catch {
          specUpToDate = remoteText.trim() === snapshotInfo.rawContent.trim();
          specDetails = specUpToDate
            ? "El contenido del spec remoto coincide con el snapshot local."
            : "El spec remoto difiere del snapshot local y no se pudo interpretar como JSON.";
        }
      }
    } else {
      specDetails = `La API respondió con código HTTP ${response.status} al solicitar el spec.`;
    }
  } catch (err: unknown) {
    if (isAuthOrRateLimitError(err)) {
      throw err;
    }
    specDetails =
      "No se pudo verificar el spec en línea. La API no respondió o no está disponible.";
  }

  const result = {
    tokenConfigured,
    baseUrl,
    snapshot: {
      title: snapshotInfo.title ?? null,
      version: snapshotInfo.version ?? null,
      totalDatasets: snapshotInfo.totalPaths ?? null,
      warning: snapshotWarning ?? undefined,
    },
    specStatus: {
      upToDate: specUpToDate,
      details: specDetails,
    },
    source: `Fuente: ${API_SOURCE}`,
  };

  const snapshotSummary = snapshotInfo.readError
    ? "desconocido (no se pudo leer el snapshot local)"
    : `${snapshotInfo.totalPaths ?? "desconocido"} datasets registrados (v${snapshotInfo.version ?? "desconocida"})`;

  const textSummary = [
    `# Estado del Servidor indec-mcp`,
    `- **Token configurado:** ${tokenConfigured ? "Sí (JWT presente en entorno)" : "No (configure INDEC_API_TOKEN para consultar datos)"}`,
    `- **URL Base:** \`${baseUrl}\``,
    `- **Snapshot local:** ${snapshotSummary}`,
    ...(snapshotWarning ? [`- **⚠️ Advertencia:** ${snapshotWarning}`] : []),
    `- **Sincronización del Spec:** ${specDetails}`,
    ``,
    `*${result.source}*`,
  ].join("\n");

  return textResult(`${textSummary}\n\n${jsonBlock(result)}`);
}

export const listDatasetsInputSchema = z.object({
  area: z
    .string()
    .max(200, "El área no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Filtrar datasets por área o dirección del INDEC (ej: 'Consumo', 'Condiciones de Vida', 'Poblacionales')"
    ),
  frecuencia: z
    .enum([
      "Mensual",
      "Trimestral",
      "Semestral",
      "Anual",
      "Estática / Diccionario",
    ])
    .optional()
    .describe("Filtrar datasets por periodicidad"),
  search: z
    .string()
    .max(200, "La búsqueda no puede superar los 200 caracteres")
    .optional()
    .describe("Buscar por palabra clave en el ID, título o descripción"),
});

export type ListDatasetsInput = z.infer<typeof listDatasetsInputSchema>;

export async function handleIndecListDatasets(
  args: ListDatasetsInput,
  ctx: ToolContext
) {
  const datasets = ctx.registry.search(args);

  const items = datasets.map((d) => ({
    id: d.id,
    endpoint: d.endpoint,
    nombre: d.summary,
    area: d.area,
    frecuencia: d.frecuencia,
    totalColumnas: d.columns.length,
    clavesOrden: d.orderKeys,
  }));

  const textSummary = [
    `# Catálogo de Datasets de la API del INDEC (${items.length} encontrados)`,
    ``,
    `Utilice la tool \`indec_describe_dataset\` con el campo \`id\` para conocer todas las columnas, filtros posibles y claves de orden antes de consultar datos.`,
    ``,
    `| ID | Nombre | Área | Frecuencia |`,
    `| :--- | :--- | :--- | :--- |`,
    ...items.map(
      (item) =>
        `| \`${item.id}\` | ${item.nombre} | ${item.area} | ${item.frecuencia} |`
    ),
    ``,
    sourceLine(),
  ].join("\n");

  return textResult(
    `${textSummary}\n\n${jsonBlock({ total: items.length, datasets: items })}`
  );
}

export const describeDatasetInputSchema = z.object({
  dataset: z
    .string()
    .min(1)
    .max(
      200,
      "El identificador del dataset no puede superar los 200 caracteres"
    )
    .describe(
      "Identificador del dataset a describir (ej: 'ipc_nacional', 'canasta-crianza', 'estimador-mensual-de-actividad-economica-nivel-general')"
    ),
});

export type DescribeDatasetInput = z.infer<typeof describeDatasetInputSchema>;

export async function handleIndecDescribeDataset(
  args: DescribeDatasetInput,
  ctx: ToolContext
) {
  const dataset = ctx.registry.get(args.dataset);

  if (!dataset) {
    const suggestions = ctx.registry.suggest(args.dataset);

    return errorResult(
      `Error: No se encontró ningún dataset con el identificador '${args.dataset}'. Consulte \`indec_list_datasets\` para ver el catálogo disponible.${suggestionsSuffix(suggestions)}\n\n${sourceLine()}`
    );
  }

  const columnTable = [
    `| Columna | Tipo | Nulable | Descripción |`,
    `| :--- | :--- | :--- | :--- |`,
    ...dataset.columns.map(
      (c) =>
        `| \`${c.name}\` | ${c.type} | ${c.nullable ? "Sí" : "No"} | ${c.description || "-"} |`
    ),
  ].join("\n");

  const textSummary = [
    `# Dataset: ${dataset.summary} (\`${dataset.id}\`)`,
    `- **Área:** ${dataset.area}`,
    `- **Frecuencia:** ${dataset.frecuencia}`,
    `- **Endpoint:** \`${dataset.endpoint}\``,
    `- **Clave de orden para paginación estable:** ${dataset.orderKeys.map((k) => `\`${k}\``).join(", ") || "Ninguna"}`,
    `- **Dimensiones temporales:** ${dataset.dateColumns.map((d) => `\`${d}\``).join(", ") || "No aplica"}`,
    ``,
    `### Columnas disponibles (${dataset.columns.length}):`,
    columnTable,
    ``,
    describeSourceLine(dataset.id),
  ].join("\n");

  return textResult(`${textSummary}\n\n${jsonBlock(dataset)}`);
}
