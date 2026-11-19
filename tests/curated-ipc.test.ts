import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecGetIpc as executeIpc,
  getIpcInputSchema,
} from "../src/tools/curated/ipc.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetIpc = (
  input: Parameters<typeof getIpcInputSchema.parse>[0],
  ctx: Parameters<typeof executeIpc>[1]
) => executeIpc(getIpcInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_ipc", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true con mensaje accionable si falta el token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetIpc({}, makeToolContext(client));

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin rango de fechas consulta y devuelve solo el último período", async () => {
    const fetchMock = vi
      .fn()
      // 1ra llamada: para averiguar el último período disponible
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{ periodo: "202410" }],
      })
      // 2da llamada: datos del último período filtrados
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-0/1" }),
        json: async () => [
          {
            periodo: "202410",
            region: "Nacional",
            tipo_de_indicador: "v_m",
            valor: 2.7,
            descripcion: "Nivel general",
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetIpc({}, makeToolContext(client));

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("select=periodo");
    expect(firstUrl).toContain("order=periodo.desc");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("periodo=eq.202410");
    expect(secondUrl).toContain("region=eq.Nacional");
    expect(secondUrl).toContain("tipo_de_indicador=eq.v_m");

    const text = res.content[0]?.text || "";
    expect(text).toContain('"periodo": "202410"');
    expect(text).toContain('"valor": 2.7');
    expect(text).toContain(
      "Fuente: INDEC - Catálogo API-INDEC, dataset ipc_nacional"
    );
  });

  it("con rango de fechas (desde / hasta) genera filtros gte y lte en orden ascendente", async () => {
    const mockRows = [
      { periodo: "202401", valor: 20.6 },
      { periodo: "202402", valor: 13.2 },
      { periodo: "202403", valor: 11.0 },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-2/3" }),
      json: async () => mockRows,
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetIpc(
      {
        desde: "202401",
        hasta: "202403",
        region: "GBA",
        tipo_indicador: "variación intermensual",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=gte.202401");
    expect(callUrl).toContain("periodo=lte.202403");
    expect(callUrl).toContain("region=eq.GBA");
    expect(callUrl).toContain("order=periodo.asc");

    const text = res.content[0]?.text || "";
    expect(text).toContain("- **Registros devueltos:** 3");
  });

  it("cuando desde y hasta coinciden genera un filtro eq", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ periodo: "202405", valor: 4.2 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetIpc(
      {
        desde: "202405",
        hasta: "202405",
      },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=eq.202405");
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
        json: async () => [{ periodo: "202410", valor: 2.7 }],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetIpc({}, makeToolContext(client));
      const text = res.content[0]?.text || "";

      expect(res.isError).toBeUndefined();
      expect(text).toContain("No se pudo determinar el último período");
      expect(text).toContain("⚠️");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo determinar el último período")
      );
      expect(consoleErrorSpy.mock.calls[0]?.[0]).not.toContain("network down");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("traduce etiquetas y niveles a los valores literales de la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ periodo: "202410", valor: 230 }],
    });
    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetIpc(
      {
        desde: "202410",
        hasta: "202410",
        tipo_indicador: "variación interanual",
        nivel: "nivel general",
      },
      makeToolContext(client)
    );

    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("tipo_de_indicador")).toBe("eq.v_ia");
    expect(params.get("nivel")).toBe("eq.Nivel General");

    expect(
      getIpcInputSchema.safeParse({ tipo_indicador: "no-existe" }).success
    ).toBe(false);
  });

  it("createMcpServer registra indec_get_ipc en la lista de tools", () => {
    const server = createTestServer();
    expect(server).toBeDefined();
  });
});
