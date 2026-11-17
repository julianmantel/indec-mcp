import type { IndecHttpClient, QueryResult } from "../client/indec-client.js";
import { IndecAuthError } from "../client/errors.js";
import type { PostgrestFilter, PostgrestOperator } from "../client/postgrest.js";
import type { DatasetMetadata } from "../datasets/types.js";
import type { DatasetRegistry } from "../datasets/registry.js";

export type InvalidColumnKind = "select" | "filters" | "order";

export interface FilterInput {
  columna: string;
  operador: PostgrestOperator;
  valor: string | number | boolean | Array<string | number>;
}

export interface DatasetQueryInput {
  dataset: string;
  select?: string | string[];
  filters?: FilterInput[];
  order?: string | string[];
  limit?: number;
  offset?: number;
}

export interface DatasetCountInput {
  dataset: string;
  filters?: FilterInput[];
}

export interface DatasetQueryResult {
  dataset: DatasetMetadata;
  queryResult: QueryResult<unknown>;
}

export interface DatasetCountResult {
  dataset: DatasetMetadata;
  total: number;
  filters: PostgrestFilter[];
}

export class DatasetNotFoundError extends Error {
  constructor(
    public readonly datasetId: string,
    public readonly suggestions: string[]
  ) {
    super(`No se encontró ningún dataset con el identificador '${datasetId}'.`);
    this.name = "DatasetNotFoundError";
  }
}

export class InvalidColumnError extends Error {
  constructor(
    public readonly datasetId: string,
    public readonly kind: InvalidColumnKind,
    public readonly columns: string[],
    public readonly validColumns: string[]
  ) {
    super(
      `La columna '${columns.join(", ")}' no existe en el dataset '${datasetId}'.`
    );
    this.name = "InvalidColumnError";
  }
}

export class DatasetQueryExecutionError extends Error {
  constructor(
    public readonly datasetId: string,
    public readonly originalError: unknown
  ) {
    super(
      originalError instanceof Error
        ? originalError.message
        : String(originalError)
    );
    this.name = "DatasetQueryExecutionError";
    this.cause = originalError;
  }
}

function parseSelectColumns(select?: string | string[]): string[] {
  if (!select) return [];
  if (Array.isArray(select)) {
    return select.map((s) => s.trim()).filter(Boolean);
  }
  return select
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOrderColumns(order?: string | string[]): string[] {
  if (!order) return [];
  const list = Array.isArray(order) ? order : order.split(",");
  return list
    .map((item) => {
      const parts = item.trim().split(".");
      return parts[0]?.trim() || "";
    })
    .filter(Boolean);
}

/**
 * Servicio de consulta: valida contra el registry y ejecuta contra la API.
 * No conoce markdown ni el formato de respuesta MCP.
 */
export class DatasetQueryService {
  constructor(
    private readonly registry: DatasetRegistry,
    private readonly client: IndecHttpClient
  ) {}

  async query(input: DatasetQueryInput): Promise<DatasetQueryResult> {
    this.assertAuth();
    const dataset = this.requireDataset(input.dataset);
    const validColumns = dataset.columns.map((c) => c.name);

    const selectColumns = parseSelectColumns(input.select);
    const invalidSelect = selectColumns.filter(
      (col) => !validColumns.includes(col)
    );
    if (invalidSelect.length > 0) {
      throw new InvalidColumnError(
        dataset.id,
        "select",
        invalidSelect,
        validColumns
      );
    }

    const filters = this.validateFilters(dataset, input.filters, validColumns);

    const orderColumns = parseOrderColumns(input.order);
    const invalidOrder = orderColumns.filter(
      (col) => !validColumns.includes(col)
    );
    if (invalidOrder.length > 0) {
      throw new InvalidColumnError(
        dataset.id,
        "order",
        invalidOrder,
        validColumns
      );
    }

    try {
      const queryResult = await this.client.query(dataset.endpoint, {
        select: input.select,
        filters,
        order: input.order,
        limit: input.limit,
        offset: input.offset,
        count: true,
      });
      return { dataset, queryResult };
    } catch (err: unknown) {
      if (err instanceof IndecAuthError) {
        throw err;
      }
      throw new DatasetQueryExecutionError(dataset.id, err);
    }
  }

  async countRows(input: DatasetCountInput): Promise<DatasetCountResult> {
    this.assertAuth();
    const dataset = this.requireDataset(input.dataset);
    const validColumns = dataset.columns.map((c) => c.name);
    const filters = this.validateFilters(dataset, input.filters, validColumns);

    try {
      const total = await this.client.countRows(dataset.endpoint, filters);
      return { dataset, total, filters };
    } catch (err: unknown) {
      if (err instanceof IndecAuthError) {
        throw err;
      }
      throw new DatasetQueryExecutionError(dataset.id, err);
    }
  }

  private assertAuth(): void {
    if (!this.client.hasToken()) {
      throw new IndecAuthError();
    }
  }

  private requireDataset(id: string): DatasetMetadata {
    const dataset = this.registry.get(id);
    if (!dataset) {
      throw new DatasetNotFoundError(id, this.registry.suggest(id));
    }
    return dataset;
  }

  private validateFilters(
    dataset: DatasetMetadata,
    filters: FilterInput[] | undefined,
    validColumns: string[]
  ): PostgrestFilter[] {
    if (!filters || filters.length === 0) {
      return [];
    }

    const clientFilters: PostgrestFilter[] = [];
    for (const filter of filters) {
      if (!validColumns.includes(filter.columna)) {
        throw new InvalidColumnError(
          dataset.id,
          "filters",
          [filter.columna],
          validColumns
        );
      }
      clientFilters.push({
        column: filter.columna,
        operator: filter.operador,
        value: filter.valor,
      });
    }
    return clientFilters;
  }
}
