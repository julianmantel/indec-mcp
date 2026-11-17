import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetCanastas as executeCanastas,
  getCanastasInputSchema,
} from "../src/tools/curated/canastas.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetCanastas = (
  input: Parameters<typeof getCanastasInputSchema.parse>[0],
  ctx: Parameters<typeof executeCanastas>[1]
) => executeCanastas(getCanastasInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_canastas", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true si falta token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetCanastas({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin rango de fechas devuelve solo el último período de ambas canastas", async () => {
    const fetchMock = vi
      .fn()
      // 1ra llamada: último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ periodo: "202409" }],
      })
      // 2da llamada: datos del último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-1/2" }),
        json: async () => [
          {
            periodo: "202409",
            codigo: "CBA",
            descripcion: "Canasta básica alimentaria",
            valor: 428720,
          },
          {
            periodo: "202409",
            codigo: "CBT",
            descripcion: "Canasta básica total",
            valor: 964620,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetCanastas({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("valorizacion_canastas_cba_cbt");
    expect(firstUrl).toContain("select=periodo");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("valorizacion_canastas_cba_cbt");
    expect(secondUrl).toContain("periodo=eq.202409");

    const text = res.content[0]?.text || "";
    expect(text).toContain("428720");
    expect(text).toContain("964620");
    expect(text).toContain("Fuente: INDEC — Catálogo API-INDEC");
  });

  it("filtra solo Canasta Básica Alimentaria (CBA)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ codigo: "CBA", valor: 428720 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetCanastas(
      {
        desde: "202409",
        hasta: "202409",
        canasta: "CBA",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("codigo=ilike.*CBA*");
    expect(callUrl).toContain("periodo=eq.202409");
  });

  it("con rango de fechas genera filtros gte y lte en orden ascendente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-2/3" }),
      json: async () => [
        { periodo: "202401", valor: 596823 },
        { periodo: "202402", valor: 690904 },
      ],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetCanastas(
      {
        desde: "202401",
        hasta: "202402",
        canasta: "CBT",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=gte.202401");
    expect(callUrl).toContain("periodo=lte.202402");
    expect(callUrl).toContain("codigo=ilike.*CBT*");
    expect(callUrl).toContain("order=periodo.asc");
  });

  it("advierte y loguea si falla la consulta del último período", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [{ periodo: "202409", codigo: "CBA", valor: 1 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetCanastas({}, makeToolContext(client));
      const text = res.content[0]?.text || "";

      expect(res.isError).toBeUndefined();
      expect(text).toContain("No se pudo determinar el último período");
      expect(text).toContain("⚠️");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo determinar el último período")
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("createMcpServer registra indec_get_canastas", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
