import { IndecHttpClient } from "./client/indec-client.js";
import type { Config } from "./config.js";
import { DatasetRegistry } from "./datasets/registry.js";
import { DatasetQueryService } from "./services/dataset-query.js";

export interface Container {
  client: IndecHttpClient;
  registry: DatasetRegistry;
  datasetQuery: DatasetQueryService;
}

export interface ContainerOptions {
  config: Config;
  client?: IndecHttpClient;
  registry?: DatasetRegistry;
}

export function createContainer(options: ContainerOptions): Container {
  const client =
    options.client ??
    new IndecHttpClient({
      baseUrl: options.config.INDEC_API_BASE_URL,
      token: options.config.INDEC_API_TOKEN,
      timeoutMs: options.config.INDEC_REQUEST_TIMEOUT_MS,
      cacheTtlSeconds: options.config.INDEC_CACHE_TTL_SECONDS,
      allowedHosts: options.config.INDEC_API_ALLOWED_HOSTS,
    });

  const registry = options.registry ?? new DatasetRegistry();
  const datasetQuery = new DatasetQueryService(registry, client);

  return { client, registry, datasetQuery };
}
