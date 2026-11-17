import { describe, it, expect, vi } from "vitest";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { IndecAuthError, IndecHttpError } from "../src/client/errors.js";
import { DatasetRegistry } from "../src/datasets/registry.js";
import {
  DatasetNotFoundError,
  DatasetQueryExecutionError,
  DatasetQueryService,
  InvalidColumnError,
} from "../src/services/dataset-query.js";

const TOKEN = "valid-test-token";

function createService(fetchMock?: ReturnType<typeof vi.fn>) {
  const client = new IndecHttpClient({
    token: fetchMock ? TOKEN : undefined,
    fetchFn: fetchMock as unknown as typeof fetch,
    cacheTtlSeconds: 0,
    maxRetries: 0,
  });
  return new DatasetQueryService(new DatasetRegistry(), client);
}

describe("DatasetQueryService", () => {
  it("exige token antes de resolver el dataset", async () => {
    const service = createService();
    await expect(
      service.query({ dataset: "no_existe" })
    ).rejects.toBeInstanceOf(IndecAuthError);
  });

  it("lanza DatasetNotFoundError con sugerencias", async () => {
    const service = createService(vi.fn());
    const error = await service
      .query({ dataset: "ipc_naciona" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(DatasetNotFoundError);
    expect((error as DatasetNotFoundError).suggestions).toContain(
      "ipc_nacional"
    );
  });

  it("valida columnas de select", async () => {
    const service = createService(vi.fn());
    const error = await service
      .query({ dataset: "ipc_nacional", select: ["periodo", "fantasma"] })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(InvalidColumnError);
    const invalid = error as InvalidColumnError;
    expect(invalid.kind).toBe("select");
    expect(invalid.columns).toEqual(["fantasma"]);
    expect(invalid.validColumns).toContain("periodo");
  });

  it("valida columnas de filters y order", async () => {
    const service = createService(vi.fn());

    const filterError = await service
      .query({
        dataset: "ipc_nacional",
        filters: [{ columna: "fantasma", operador: "eq", valor: 1 }],
      })
      .catch((err: unknown) => err);
    expect(filterError).toBeInstanceOf(InvalidColumnError);
    expect((filterError as InvalidColumnError).kind).toBe("filters");

    const orderError = await service
      .query({ dataset: "ipc_nacional", order: "fantasma.desc" })
      .catch((err: unknown) => err);
    expect(orderError).toBeInstanceOf(InvalidColumnError);
    expect((orderError as InvalidColumnError).kind).toBe("order");
  });

  it("ejecuta la consulta validada contra el cliente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ periodo: "202401", valor: 100 }],
    });
    const service = createService(fetchMock);

    const result = await service.query({
      dataset: "ipc_nacional",
      select: ["periodo", "valor"],
      filters: [{ columna: "periodo", operador: "eq", valor: "202401" }],
      order: "periodo.desc",
      limit: 10,
      offset: 0,
    });

    expect(result.dataset.id).toBe("ipc_nacional");
    expect(result.queryResult.count).toBe(1);
    expect(result.queryResult.total).toBe(1);

    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("select=periodo%2Cvalor");
    expect(requestedUrl).toContain("periodo=eq.202401");
    expect(requestedUrl).toContain("order=periodo.desc");
  });

  it("envuelve errores de ejecución HTTP conservando el original", async () => {
    const failingFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ message: "boom" }),
    });
    const service = createService(failingFetch);

    const error = await service
      .query({ dataset: "ipc_nacional", limit: 1, offset: 0 })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(DatasetQueryExecutionError);
    expect((error as DatasetQueryExecutionError).originalError).toBeInstanceOf(
      IndecHttpError
    );
    expect(
      ((error as DatasetQueryExecutionError).originalError as IndecHttpError)
        .status
    ).toBe(500);
  });

  it("no envuelve el IndecAuthError de token faltante", async () => {
    const service = createService();
    const error = await service
      .countRows({ dataset: "ipc_nacional" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(IndecAuthError);
    expect(error).not.toBeInstanceOf(DatasetQueryExecutionError);
  });

  it("cuenta filas y devuelve los filtros normalizados", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "*/42" }),
      json: async () => [],
    });
    const service = createService(fetchMock);

    const result = await service.countRows({
      dataset: "ipc_nacional",
      filters: [{ columna: "periodo", operador: "eq", valor: "202401" }],
    });

    expect(result.total).toBe(42);
    expect(result.filters).toEqual([
      { column: "periodo", operator: "eq", value: "202401" },
    ]);
  });
});
