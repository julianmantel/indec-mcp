import { MemoryCache } from "./cache.js";
import { IndecError } from "./errors.js";
import { buildQueryParams, parseContentRange, type PostgrestQueryParamsOptions } from "./postgrest.js";
import { IndecTransport, type IndecTransportOptions } from "./transport.js";

export interface IndecHttpClientOptions extends IndecTransportOptions {
  cacheTtlSeconds?: number;
  maxCacheEntries?: number;
  cache?: MemoryCache;
}

export interface QueryOptions extends PostgrestQueryParamsOptions {
  count?: boolean;
  skipCache?: boolean;
}

export interface QueryResult<T = unknown> {
  data: T[];
  total: number | null;
  count: number;
  offset: number;
  limit: number;
  isTruncated: boolean;
  contentRange: string | null;
}

/**
 * Cliente de datos: combina transporte HTTP, caché en memoria y PostgREST.
 */
export class IndecHttpClient {
  private readonly transport: IndecTransport;
  public readonly cache: MemoryCache;

  constructor(options: IndecHttpClientOptions = {}) {
    this.transport = new IndecTransport(options);
    this.cache =
      options.cache ??
      new MemoryCache(
        options.cacheTtlSeconds ?? 3600,
        options.maxCacheEntries ?? 500
      );
  }

  hasToken(): boolean {
    return this.transport.hasToken();
  }

  getBaseUrl(): string {
    return this.transport.getBaseUrl();
  }

  requestRaw(
    endpoint: string,
    options: {
      queryParams?: URLSearchParams;
      preferCount?: boolean;
      requireAuth?: boolean;
    } = {}
  ): Promise<Response> {
    return this.transport.requestRaw(endpoint, options);
  }

  async query<T = unknown>(
    endpoint: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const queryParams = buildQueryParams({
      select: options.select,
      filters: options.filters,
      order: options.order,
      limit,
      offset,
    });

    const preferCount = options.count ?? false;
    const cacheKey = `QUERY:${endpoint}:${queryParams.toString()}:count=${preferCount}`;

    if (!options.skipCache) {
      const cached = this.cache.get<QueryResult<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.transport.requestRaw(endpoint, {
      queryParams,
      preferCount,
      requireAuth: true,
    });

    const data = (await response.json()) as T[];
    const contentRangeHeader = response.headers.get("Content-Range");
    const parsedRange = parseContentRange(contentRangeHeader);

    const total = parsedRange.total;
    const count = Array.isArray(data) ? data.length : 0;
    const isTruncated =
      total !== null ? offset + count < total : count >= limit;

    const result: QueryResult<T> = {
      data,
      total,
      count,
      offset,
      limit,
      isTruncated,
      contentRange: contentRangeHeader,
    };

    if (!options.skipCache) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  async countRows(
    endpoint: string,
    filters?: PostgrestQueryParamsOptions["filters"]
  ): Promise<number> {
    const queryParams = buildQueryParams({
      filters,
      limit: 0,
      offset: 0,
    });

    const cacheKey = `COUNT:${endpoint}:${queryParams.toString()}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const response = await this.transport.requestRaw(endpoint, {
      queryParams,
      preferCount: true,
      requireAuth: true,
    });

    const contentRangeHeader = response.headers.get("Content-Range");
    const parsed = parseContentRange(contentRangeHeader);

    if (parsed.total === null) {
      throw new IndecError(
        "No se pudo determinar el total de filas: el header Content-Range no fue retornado por la API.",
        "COUNT_ERROR"
      );
    }

    this.cache.set(cacheKey, parsed.total);
    return parsed.total;
  }
}
