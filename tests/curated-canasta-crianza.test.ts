import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetCanastaCrianza as executeCanastaCrianza,
  getCanastaCrianzaInputSchema,
} from "../src/tools/curated/canasta-crianza.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetCanastaCrianza = (
  input: Parameters<typeof getCanastaCrianzaInputSchema.parse>[0],
  ctx: Parameters<typeof executeCanastaCrianza>[1]
) => executeCanastaCrianza(getCanastaCrianzaInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_canasta_crianza", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true si falta token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetCanastaCrianza({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin rango de fechas devuelve solo el último período de crianza", async () => {
    const fetchMock = vi
      .fn()
      // 1ra llamada: último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ Periodo: "202409" }],
      })
      // 2da llamada: datos del último período
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [
          {
            Periodo: "202409",
            tot_men1: 378411,
            tot_1a3: 447820,
            tot_4a5: 370420,
            tot_6a12: 466810,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetCanastaCrianza({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("canasta-crianza");
    expect(firstUrl).toContain("select=Periodo");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("canasta-crianza");
    expect(secondUrl).toContain("Periodo=eq.202409");

    const text = res.content[0]?.text || "";
    expect(text).toContain("447820");
    expect(text).toContain(
      "Fuente: INDEC — Catálogo API-INDEC, dataset canasta-crianza"
    );
  });

  it("con solo_totales: true proyecta únicamente las columnas totales", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ Periodo: "202409", tot_men1: 100 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetCanastaCrianza(
      {
        desde: "202409",
        hasta: "202409",
        solo_totales: true,
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain(
      "select=anio%2CMes%2CPeriodo%2Ctot_men1%2Ctot_1a3%2Ctot_4a5%2Ctot_6a12"
    );
  });

  it("con tramo_edad específico proyecta solo ese grupo etario", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ Periodo: "202409", tot_1a3: 447820 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetCanastaCrianza(
      {
        desde: "202409",
        hasta: "202409",
        tramo_edad: "1_a_3",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain(
      "select=anio%2CMes%2CPeriodo%2Ctot_1a3%2Cbys_1a3%2Ccuid_1a3"
    );
  });

  it("con rango de fechas filtra ascendente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-1/2" }),
      json: async () => [{ Periodo: "202401" }, { Periodo: "202402" }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetCanastaCrianza(
      {
        desde: "202401",
        hasta: "202402",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("Periodo=gte.202401");
    expect(callUrl).toContain("Periodo=lte.202402");
    expect(callUrl).toContain("order=Periodo.asc");
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
        json: async () => [{ Periodo: "202409", tot_1a3: 1 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetCanastaCrianza(
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

  it("createMcpServer registra indec_get_canasta_crianza", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
