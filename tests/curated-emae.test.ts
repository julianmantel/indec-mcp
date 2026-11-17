import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetEmae as executeEmae,
  getEmaeInputSchema,
} from "../src/tools/curated/emae.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetEmae = (
  input: Parameters<typeof getEmaeInputSchema.parse>[0],
  ctx: Parameters<typeof executeEmae>[1]
) => executeEmae(getEmaeInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_emae", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true con mensaje accionable si falta el token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetEmae({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin rango de fechas consulta el último período a nivel general", async () => {
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
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [
          {
            periodo: "202409",
            tipo_de_indicador: "variación interanual",
            tipo_de_indicador_descripcion: "Serie original",
            valor: -3.8,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetEmae({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain(
      "estimador-mensual-de-actividad-economica-nivel-general"
    );
    expect(firstUrl).toContain("select=periodo");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain(
      "estimador-mensual-de-actividad-economica-nivel-general"
    );
    expect(secondUrl).toContain("periodo=eq.202409");
    expect(secondUrl).toContain(
      "tipo_de_indicador=eq.variaci%C3%B3n+interanual"
    );

    const text = res.content[0]?.text || "";
    expect(text).toContain('"valor": -3.8');
    expect(text).toContain("Fuente: INDEC — Catálogo API-INDEC");
  });

  it("con rango de fechas y serie desestacionalizada filtra adecuadamente", async () => {
    const mockRows = [
      { periodo: "202401", valor: -1.2 },
      { periodo: "202402", valor: -0.3 },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-1/2" }),
      json: async () => mockRows,
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetEmae(
      {
        desde: "202401",
        hasta: "202402",
        serie: "desestacionalizada",
        tipo_indicador: "variación intermensual",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=gte.202401");
    expect(callUrl).toContain("periodo=lte.202402");
    expect(callUrl).toContain(
      "tipo_de_indicador_descripcion=ilike.*desestacionalizada*"
    );
    expect(callUrl).toContain(
      "tipo_de_indicador=eq.variaci%C3%B3n+intermensual"
    );
    expect(callUrl).toContain("order=periodo.asc");
  });

  it("con sector específico consulta la tabla de sectores", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [
        {
          periodo: "202408",
          codigo: "D",
          descripcion: "Industria manufacturera",
          valor: -6.7,
        },
      ],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    // Caso letra única: código
    await handleIndecGetEmae(
      {
        desde: "202408",
        hasta: "202408",
        sector: "D",
      },
      makeToolContext(client)
    );

    const callUrl1 = fetchMock.mock.calls[0][0];
    expect(callUrl1).toContain(
      "estimador-mensual-de-actividad-economica-sectores"
    );
    expect(callUrl1).toContain("codigo=eq.D");

    // Caso texto: descripción ilike
    await handleIndecGetEmae(
      {
        desde: "202408",
        hasta: "202408",
        sector: "Comercio",
      },
      makeToolContext(client)
    );

    const callUrl2 = fetchMock.mock.calls[1][0];
    expect(callUrl2).toContain(
      "estimador-mensual-de-actividad-economica-sectores"
    );
    expect(callUrl2).toContain("descripcion=ilike.*Comercio*");
  });

  it("con desglosar_sectores: true consulta la tabla de sectores para todos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ periodo: "202409" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-14/15" }),
        json: async () => [{ sector: "A" }, { sector: "B" }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetEmae(
      {
        desglosar_sectores: true,
      },
      makeToolContext(client)
    );

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain(
      "estimador-mensual-de-actividad-economica-sectores"
    );
    expect(secondUrl).toContain("periodo=eq.202409");
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
        json: async () => [{ periodo: "202409", valor: -3.8 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetEmae({}, makeToolContext(client));
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

  it("createMcpServer registra indec_get_emae", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
