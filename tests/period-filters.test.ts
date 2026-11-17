import { describe, it, expect, vi } from "vitest";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { buildPeriodFilters } from "../src/services/period-filters.js";

function createClient(fetchMock: ReturnType<typeof vi.fn>) {
  return new IndecHttpClient({
    token: "valid-test-token",
    fetchFn: fetchMock as unknown as typeof fetch,
    cacheTtlSeconds: 0,
    maxRetries: 0,
  });
}

describe("buildPeriodFilters", () => {
  it("resuelve el último período publicado cuando no hay rango", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [{ periodo: "202405" }],
    });

    const result = await buildPeriodFilters({
      client: createClient(fetchMock),
      datasetId: "ipc_nacional",
      label: "el IPC",
      resolveLatest: true,
    });

    expect(result.filters).toEqual([
      { columna: "periodo", operador: "eq", valor: "202405" },
    ]);
    expect(result.warning).toBeUndefined();
  });

  it("devuelve una advertencia si no puede resolver el último período", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ message: "boom" }),
    });

    const result = await buildPeriodFilters({
      client: createClient(fetchMock),
      datasetId: "ipc_nacional",
      label: "el IPC",
      resolveLatest: true,
    });

    expect(result.filters).toEqual([]);
    expect(result.warning).toContain("No se pudo determinar el último período");
  });

  it("usa eq cuando desde y hasta son iguales", async () => {
    const result = await buildPeriodFilters({
      client: createClient(vi.fn()),
      datasetId: "ipc_nacional",
      label: "el IPC",
      desde: "202401",
      hasta: "202401",
      resolveLatest: false,
    });

    expect(result.filters).toEqual([
      { columna: "periodo", operador: "eq", valor: "202401" },
    ]);
  });

  it("usa gte/lte para un rango y respeta la columna personalizada", async () => {
    const result = await buildPeriodFilters({
      client: createClient(vi.fn()),
      datasetId: "canasta-crianza",
      column: "Periodo",
      label: "la canasta de crianza",
      desde: "202401",
      hasta: "202412",
      resolveLatest: false,
    });

    expect(result.filters).toEqual([
      { columna: "Periodo", operador: "gte", valor: "202401" },
      { columna: "Periodo", operador: "lte", valor: "202412" },
    ]);
  });

  it("no agrega filtros si resolveLatest es false y no hay rango", async () => {
    const result = await buildPeriodFilters({
      client: createClient(vi.fn()),
      datasetId: "mercado_trabajo_eph",
      label: "el mercado de trabajo",
      resolveLatest: false,
    });

    expect(result.filters).toEqual([]);
    expect(result.warning).toBeUndefined();
  });
});
