import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ColumnMetadata,
  DatasetFrequency,
  DatasetMetadata,
} from "../src/datasets/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface OpenApiProperty {
  type?: string;
  description?: string;
  anyOf?: Array<{ type: string }>;
}

export interface OpenApiSchema {
  properties?: Record<string, OpenApiProperty>;
}

export interface OpenApiParameter {
  name: string;
  in?: string;
  description?: string;
}

export interface OpenApiMethod {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  responses?: {
    "200"?: {
      content?: {
        "application/json"?: {
          schema?: {
            items?: {
              $ref?: string;
            };
          };
        };
      };
    };
  };
}

export interface OpenApiSpec {
  paths?: Record<string, { get?: OpenApiMethod }>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export function detectFrequency(
  columnNames: string[],
  description: string
): DatasetFrequency {
  const lowerCols = columnNames.map((c) => c.toLowerCase());
  if (lowerCols.includes("mes")) {
    return "Mensual";
  }
  if (lowerCols.includes("trimestre")) {
    return "Trimestral";
  }
  if (lowerCols.includes("semestre")) {
    return "Semestral";
  }
  if (lowerCols.includes("fecha") || lowerCols.includes("anio")) {
    return "Anual";
  }
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes("mensual")) return "Mensual";
  if (lowerDesc.includes("trimestral")) return "Trimestral";
  if (lowerDesc.includes("semestral")) return "Semestral";
  if (lowerDesc.includes("anual")) return "Anual";

  return "Estática / Diccionario";
}

export function extractOrderKeys(parameters?: OpenApiParameter[]): string[] {
  if (!parameters) return [];
  const orderParam = parameters.find((p) => p.name === "order");
  if (!orderParam || !orderParam.description) return [];

  const match = orderParam.description.match(
    /Para paginar,\s*incluya la clave completa:\s*([^\n\r.]+)/i
  );
  if (!match || !match[1]) return [];

  return match[1]
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function extractDateColumns(columnNames: string[]): string[] {
  const preferredPriority = [
    "periodo",
    "anio",
    "mes",
    "trimestre",
    "semestre",
    "fecha",
  ];

  const matched = columnNames.filter((name) =>
    preferredPriority.includes(name.toLowerCase())
  );

  return matched.sort((a, b) => {
    const idxA = preferredPriority.indexOf(a.toLowerCase());
    const idxB = preferredPriority.indexOf(b.toLowerCase());
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
}

function assertValidOpenApiPath(path: string): void {
  const isInvalid =
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\s\u0000-\u001f\u007f-\u009f]/.test(path);

  if (isInvalid) {
    throw new Error(
      `Ruta OpenAPI inválida: "${path}". Cada path debe ser una ruta relativa que comience con una sola "/", sin "//", barras invertidas, espacios ni caracteres de control.`
    );
  }
}

export function parseOpenApiSpec(spec: OpenApiSpec): DatasetMetadata[] {
  const paths = spec.paths || {};
  const schemas = spec.components?.schemas || {};
  const result: DatasetMetadata[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    assertValidOpenApiPath(path);

    const getMethod = pathItem.get;
    if (!getMethod) continue;

    const id = path.replace(/^\//, "");
    const endpoint = path;
    const summary = getMethod.summary || id;
    const description = getMethod.description || summary;
    const area = getMethod.tags?.[0] || "General";

    // Resolver schema desde $ref o fallback por nombre
    const ref =
      getMethod.responses?.["200"]?.content?.["application/json"]?.schema?.items
        ?.$ref;
    const schemaName = ref ? ref.split("/").pop() || id : id;
    const schema = schemas[schemaName];

    const columns: ColumnMetadata[] = [];
    if (schema?.properties) {
      for (const [colName, colDef] of Object.entries(schema.properties)) {
        let type = "string";
        let nullable = false;

        if (colDef.type) {
          type = colDef.type;
        } else if (colDef.anyOf) {
          const nonNull = colDef.anyOf.find((x) => x.type !== "null");
          type = nonNull?.type || "string";
          nullable = colDef.anyOf.some((x) => x.type === "null");
        }

        columns.push({
          name: colName,
          type,
          description: (colDef.description || "").trim(),
          nullable,
        });
      }
    }

    const columnNames = columns.map((c) => c.name);
    const frecuencia = detectFrequency(columnNames, description);
    const orderKeys = extractOrderKeys(getMethod.parameters);
    const dateColumns = extractDateColumns(columnNames);

    result.push({
      id,
      endpoint,
      summary,
      description,
      area,
      frecuencia,
      columns,
      orderKeys,
      dateColumns,
    });
  }

  return result;
}

export function generateRegistryCode(datasets: DatasetMetadata[]): string {
  const datasetIds = datasets.map((d) => JSON.stringify(d.id)).join("\n  | ");
  return `/**
 * ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO
 * Generado por: scripts/gen-registry.ts
 */

import type { DatasetMetadata } from "./types.js";

export type DatasetId =
  | ${datasetIds};

export const DATASETS: Record<string, DatasetMetadata> = ${JSON.stringify(
    Object.fromEntries(datasets.map((d) => [d.id, d])),
    null,
    2
  )};

export const DATASET_LIST: DatasetMetadata[] = Object.values(DATASETS);
`;
}

async function main(): Promise<void> {
  const rootDir = resolve(__dirname, "..");
  const snapshotPath = resolve(rootDir, "docs/openapi.snapshot.json");
  const targetPath = resolve(rootDir, "src/datasets/registry.generated.ts");

  const shouldFetch =
    process.argv.includes("--fetch") ||
    process.argv.includes("-f") ||
    process.argv.includes("fetch");
  if (shouldFetch) {
    const baseUrl =
      process.env.INDEC_API_BASE_URL || "https://api.indec.gob.ar/v1/";
    console.error(`Descargando spec OpenAPI actualizado desde ${baseUrl}...`);
    const response = await fetch(baseUrl, {
      headers: {
        Accept: "application/openapi+json, application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error al descargar spec OpenAPI: ${response.status} ${response.statusText}`
      );
    }

    const rawSpec = await response.text();
    // Validar JSON
    JSON.parse(rawSpec);
    writeFileSync(snapshotPath, rawSpec, "utf8");
    console.error(`Snapshot actualizado en ${snapshotPath}`);
  }

  console.error(`Leyendo snapshot desde ${snapshotPath}...`);
  const rawContent = readFileSync(snapshotPath, "utf8");
  const spec = JSON.parse(rawContent) as OpenApiSpec;

  const datasets = parseOpenApiSpec(spec);
  const totalColumns = datasets.reduce((acc, d) => acc + d.columns.length, 0);

  const generatedCode = generateRegistryCode(datasets);
  writeFileSync(targetPath, generatedCode, "utf8");

  console.error(
    `\x1b[32m✔ Registry generado con éxito en ${targetPath}\x1b[0m`
  );
  console.error(`Datasets generados: ${datasets.length}`);
  console.error(`Columnas generadas: ${totalColumns}`);
}

// Ejecutar solo si es invocado directamente
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main().catch((err) => {
    console.error("Error al generar el registry:", err);
    process.exit(1);
  });
}
