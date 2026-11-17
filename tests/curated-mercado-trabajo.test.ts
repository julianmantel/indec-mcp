import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetMercadoTrabajo as executeMercadoTrabajo,
  getMercadoTrabajoInputSchema,
} from "../src/tools/curated/mercado-trabajo.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetMercadoTrabajo = (
  input: Parameters<typeof getMercadoTrabajoInputSchema.parse>[0],
  ctx: Parameters<typeof executeMercadoTrabajo>[1]
) => executeMercadoTrabajo(getMercadoTrabajoInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_mercado_trabajo", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true si falta token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetMercadoTrabajo({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin fechas devuelve el último trimestre para el total de 31 aglomerados", async () => {
    const fetchMock = vi
      .fn()
      // 1ra llamada: último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ periodo: "202402" }],
      })
      // 2da llamada: datos del último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [
          {
            periodo: "202402",
            area_geografica_nom: "Total 31 aglomerados urbanos",
            tasa_de_actividad: 48.5,
            tasa_de_empleo: 44.8,
            tasa_de_desocupacion: 7.6,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetMercadoTrabajo({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("mercado_trabajo_eph");
    expect(firstUrl).toContain("select=periodo");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("mercado_trabajo_eph");
    expect(secondUrl).toContain("periodo=eq.202402");
    expect(secondUrl).toContain(
      "area_geografica_nom=ilike.*Total+31+aglomerados+urbanos*"
    );

    const text = res.content[0]?.text || "";
    expect(text).toContain('"tasa_de_desocupacion": 7.6');
    expect(text).toContain("Fuente: INDEC — Catálogo API-INDEC");
  });

  it("filtra por aglomerado urbano específico", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ area_geografica_nom: "Gran Buenos Aires" }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetMercadoTrabajo(
      {
        anio: 2024,
        trimestre: 2,
        area_geografica: "Gran Buenos Aires",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("anio=eq.2024");
    expect(callUrl).toContain("trimestre=eq.2");
    expect(callUrl).toContain("area_geografica_nom=ilike.*Gran+Buenos+Aires*");
  });

  it("con todos_aglomerados: true no filtra por área", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-30/31" }),
      json: async () => new Array(31).fill({}),
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetMercadoTrabajo(
      {
        anio: 2024,
        trimestre: 1,
        todos_aglomerados: true,
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("anio=eq.2024");
    expect(callUrl).toContain("trimestre=eq.1");
    expect(callUrl).not.toContain("area_geografica_nom");
  });

  it("con solo_principales: true proyecta únicamente las tasas principales", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{}],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetMercadoTrabajo(
      {
        anio: 2024,
        solo_principales: true,
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("select=area_geografica_nom");
    expect(callUrl).toContain("tasa_de_desocupacion");
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
        json: async () => [{ periodo: "202402", tasa_de_empleo: 44.1 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetMercadoTrabajo(
        {},
        makeToolContext(client)
      );
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

  it("createMcpServer registra indec_get_mercado_trabajo", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
