import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  handleIndecGetSalarios as executeSalarios,
  getSalariosInputSchema,
} from "../src/tools/curated/salarios.js";
import { IndecHttpClient } from "../src/client/indec-client.js";
import { createTestServer } from "./helpers/server.js";

const handleIndecGetSalarios = (
  input: Parameters<typeof getSalariosInputSchema.parse>[0],
  ctx: Parameters<typeof executeSalarios>[1]
) => executeSalarios(getSalariosInputSchema.parse(input), ctx);

describe("Curated Tool: indec_get_salarios", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve isError: true con mensaje accionable si falta el token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecGetSalarios({}, makeToolContext(client));

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
            descripcion: "Sector privado registrado",
            tipo_de_indicador: "Indice",
            valor: 12345.6,
          },
        ],
      });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetSalarios(
      { sector: "privado" },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = fetchMock.mock.calls[0][0];
    expect(firstUrl).toContain("select=periodo");
    expect(firstUrl).toContain("order=periodo.desc");

    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain("periodo=eq.202410");
    expect(secondUrl).toContain("descripcion=ilike.*privado*");
    expect(new URL(secondUrl).searchParams.get("tipo_de_indicador")).toBe(
      "eq.Indice"
    );
    expect(secondUrl).toContain("order=periodo.desc");

    const text = res.content[0]?.text || "";
    expect(text).toContain('"periodo": "202410"');
    expect(text).toContain('"valor": 12345.6');
    expect(text).toContain(
      "Fuente: INDEC - Catálogo API-INDEC, dataset indice_salarios"
    );
  });

  it("con rango de fechas genera filtros gte y lte en orden ascendente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-2/3" }),
      json: async () => [
        { periodo: "202301", valor: 100 },
        { periodo: "202302", valor: 101 },
        { periodo: "202303", valor: 102 },
      ],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const res = await handleIndecGetSalarios(
      {
        desde: "202301",
        hasta: "202312",
        sector: "privado registrado",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=gte.202301");
    expect(callUrl).toContain("periodo=lte.202312");
    expect(callUrl).toContain("descripcion=ilike.*privado+registrado*");
    expect(callUrl).toContain("order=periodo.asc");

    const text = res.content[0]?.text || "";
    expect(text).toContain("- **Registros devueltos:** 3");
  });

  it("tipo_indicador 'todos' no aplica filtro de tipo de indicador", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ periodo: "202410", valor: 1 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetSalarios(
      { desde: "202410", hasta: "202410", tipo_indicador: "todos" },
      makeToolContext(client)
    );

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("periodo=eq.202410");
    expect(callUrl).not.toContain("tipo_de_indicador");
  });

  it("si falla la búsqueda del último período devuelve un error en vez de toda la serie", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down"));

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const res = await handleIndecGetSalarios({}, makeToolContext(client));

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain("último período publicado");
      expect(res.content[0]?.text).not.toContain("network down");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "No se pudo determinar el último período publicado del índice de salarios."
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("relanza errores de auth y rate limit al buscar el último período", async () => {
    for (const status of [401, 429]) {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: new Headers(),
        json: async () => ({ message: "error" }),
      });

      const client = new IndecHttpClient({
        token: mockToken,
        fetchFn: fetchMock as unknown as typeof fetch,
        cacheTtlSeconds: 0,
        maxRetries: 0,
      });

      await expect(
        handleIndecGetSalarios({}, makeToolContext(client))
      ).rejects.toMatchObject({ status });
    }
  });

  it("traduce las etiquetas de indicador a los códigos de la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ periodo: "202410", valor: 1 }],
    });
    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await handleIndecGetSalarios(
      {
        desde: "202410",
        hasta: "202410",
        tipo_indicador: "variación interanual",
      },
      makeToolContext(client)
    );

    expect(
      new URL(fetchMock.mock.calls[0][0]).searchParams.get("tipo_de_indicador")
    ).toBe("eq.v_ia");
  });

  it("createMcpServer registra indec_get_salarios en la lista de tools", async () => {
    const server = createTestServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const mcpClient = new Client({ name: "test", version: "1.0.0" });

    await server.connect(serverTransport);
    await mcpClient.connect(clientTransport);

    try {
      const { tools } = await mcpClient.listTools();
      expect(tools.map((tool) => tool.name)).toContain("indec_get_salarios");
    } finally {
      await mcpClient.close();
      await server.close();
    }
  });
});
