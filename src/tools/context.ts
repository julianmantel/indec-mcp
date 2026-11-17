import type { IndecHttpClient } from "../client/indec-client.js";
import { DatasetRegistry } from "../datasets/registry.js";
import { DatasetQueryService } from "../services/dataset-query.js";

/**
 * Dependencias compartidas por todas las tools. El servidor las inyecta una
 * sola vez desde el container; las tools no construyen sus propias instancias.
 */
export interface ToolContext {
  client: IndecHttpClient;
  registry: DatasetRegistry;
  datasetQuery: DatasetQueryService;
  snapshotPath?: string;
}

export interface ToolContextOptions {
  client: IndecHttpClient;
  registry?: DatasetRegistry;
  datasetQuery?: DatasetQueryService;
  snapshotPath?: string;
}

/**
 * Construye un contexto completo a partir de un cliente. Pensado para tests y
 * para integraciones que ya tienen un cliente pero no un container.
 */
export function createToolContext(options: ToolContextOptions): ToolContext {
  const registry = options.registry ?? new DatasetRegistry();
  return {
    client: options.client,
    registry,
    datasetQuery:
      options.datasetQuery ?? new DatasetQueryService(registry, options.client),
    snapshotPath: options.snapshotPath,
  };
}
