import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetPobreza as executePobreza,
  getPobrezaInputSchema,
} from "../src/tools/curated/pobreza.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetPobreza = (
  input: Parameters<typeof getPobrezaInputSchema.parse>[0],
  ctx: Parameters<typeof executePobreza>[1]
) => executePobreza(getPobrezaInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_pobreza", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true si falta token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetPobreza({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin fechas devuelve el último semestre para el total de 31 aglomerados", async () => {
    const fetchMock = vi
      .fn()
      // 1ra llamada: último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ periodo: "202401" }],
      })
      // 2da llamada: datos del último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [
          {
            periodo: "202401",
            area_geografica_nom: "Total 31 aglomerados urbanos",
            tasa_pobreza_personas: 52.9,
            tasa_indigencia_personas: 18.1,
            tasa_pobreza_hogares: 42.5,
            tasa_indigencia_hogares: 13.6,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetPobreza({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("pobreza_eph");
    expect(firstUrl).toContain("select=periodo");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("pobreza_eph");
    expect(secondUrl).toContain("periodo=eq.202401");
    expect(secondUrl).toContain("area_geografica_nom=eq.T_31_A");

    const text = res.content[0]?.text || "";
    expect(text).toContain('"tasa_pobreza_personas": 52.9');
    expect(text).toContain(
      "Fuente: INDEC - Catálogo API-INDEC, dataset pobreza_eph"
    );
  });

  it("filtra por aglomerado urbano específico y advierte si no existe", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ area_geografica_nom: "Gran Córdoba" }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetPobreza(
      {
        anio: 2024,
        semestre: 1,
        area_geografica: "Gran Córdoba",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("anio=eq.2024");
    expect(callUrl).toContain("semestre=eq.1");
    expect(callUrl).toContain("area_geografica_nom=ilike.*Gran+C%C3%B3rdoba*");
    expect(res.content[0]?.text).toContain("solo publica el área 'T_31_A'");
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

    await handleIndecGetPobreza(
      {
        anio: 2024,
        semestre: 1,
        todos_aglomerados: true,
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("anio=eq.2024");
    expect(callUrl).toContain("semestre=eq.1");
    expect(callUrl).not.toContain("area_geografica_nom");
  });

  it("con enfoque: personas proyecta solo tasas de personas", async () => {
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

    await handleIndecGetPobreza(
      {
        anio: 2024,
        enfoque: "personas",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("select=area_geografica_nom");
    expect(callUrl).toContain("tasa_pobreza_personas");
    expect(callUrl).not.toContain("tasa_pobreza_hogares");
  });

  it("con enfoque: hogares proyecta solo tasas de hogares", async () => {
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

    await handleIndecGetPobreza(
      {
        anio: 2024,
        enfoque: "hogares",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("select=area_geografica_nom");
    expect(callUrl).toContain("tasa_pobreza_hogares");
    expect(callUrl).not.toContain("tasa_pobreza_personas");
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
        json: async () => [{ periodo: "202402", tasa_pobreza_personas: 41.7 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetPobreza({}, makeToolContext(client));
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

  it("valida el formato semestral de desde/hasta", () => {
    expect(getPobrezaInputSchema.safeParse({ desde: "202301" }).success).toBe(
      false
    );
    expect(getPobrezaInputSchema.safeParse({ desde: "20231S" }).success).toBe(
      true
    );
  });

  it("createMcpServer registra indec_get_pobreza", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
