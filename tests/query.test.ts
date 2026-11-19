import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecQueryDataset,
  handleIndecCountRows,
  queryDatasetInputSchema,
  countRowsInputSchema,
} from "../src/tools/query.js";
import { IndecHttpClient } from "../src/client/indec-client.js";

function buildFilters(count: number) {
  return Array.from({ length: count }, () => ({
    columna: "periodo",
    operador: "eq" as const,
    valor: "202401",
  }));
}

describe("Query Tools", () => {
  const mockToken = "valid-test-token";

  describe("límites de entrada (SEC-03)", () => {
    it("acepta 50 filtros y 100 columnas en select", () => {
      const result = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: buildFilters(50),
        select: Array.from({ length: 100 }, (_, i) => `columna_${i}`),
      });

      expect(result.success).toBe(true);
    });

    it("rechaza más de 50 filtros", () => {
      const result = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: buildFilters(51),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("50 filtros");
      }
    });

    it("rechaza más de 50 filtros en indec_count_rows", () => {
      const result = countRowsInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: buildFilters(51),
      });

      expect(result.success).toBe(false);
    });

    it("rechaza un select con más de 100 entradas o una entrada demasiado larga", () => {
      const tooMany = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        select: Array.from({ length: 101 }, (_, i) => `columna_${i}`),
      });
      expect(tooMany.success).toBe(false);

      const tooLong = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        select: ["x".repeat(201)],
      });
      expect(tooLong.success).toBe(false);

      const tooLongString = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        select: "x".repeat(2001),
      });
      expect(tooLongString.success).toBe(false);
    });

    it("rechaza un order con más de 100 entradas o una entrada demasiado larga", () => {
      const tooMany = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        order: Array.from({ length: 101 }, (_, i) => `columna_${i}.asc`),
      });
      expect(tooMany.success).toBe(false);

      const tooLong = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        order: "x".repeat(1001),
      });
      expect(tooLong.success).toBe(false);
    });

    it("rechaza un valor de filtro demasiado largo o una lista con más de 100 elementos", () => {
      const oversizedString = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: [
          { columna: "periodo", operador: "eq", valor: "x".repeat(2001) },
        ],
      });
      expect(oversizedString.success).toBe(false);

      const oversizedList = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: [
          {
            columna: "periodo",
            operador: "in",
            valor: Array.from({ length: 101 }, (_, i) => `valor_${i}`),
          },
        ],
      });
      expect(oversizedList.success).toBe(false);

      const oversizedItem = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: [
          {
            columna: "periodo",
            operador: "in",
            valor: ["valor_valido", "x".repeat(2001)],
          },
        ],
      });
      expect(oversizedItem.success).toBe(false);

      const tooLongColumn = queryDatasetInputSchema.safeParse({
        dataset: "ipc_nacional",
        filters: [
          { columna: "c".repeat(201), operador: "eq", valor: "202401" },
        ],
      });
      expect(tooLongColumn.success).toBe(false);
    });

    it("rechaza un dataset con un identificador demasiado largo", () => {
      const result = queryDatasetInputSchema.safeParse({
        dataset: "d".repeat(201),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("indec_query_dataset", () => {
    it("devuelve isError: true con mensaje accionable si falta el token", async () => {
      const fetchMock = vi.fn();
      const client = new IndecHttpClient({
        token: undefined,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const res = await handleIndecQueryDataset(
        { dataset: "ipc_nacional", limit: 10, offset: 0 },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain("Error de autenticación");
      expect(res.content[0]?.text).toContain("INDEC_API_TOKEN");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("valida que el dataset exista en el registry", async () => {
      const client = new IndecHttpClient({ token: mockToken });
      const res = await handleIndecQueryDataset(
        { dataset: "tabla_que_no_existe", limit: 10, offset: 0 },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain(
        "No se encontró ningún dataset con el identificador 'tabla_que_no_existe'"
      );
    });

    it("valida columnas inexistentes en select y sugiere las válidas", async () => {
      const client = new IndecHttpClient({ token: mockToken });
      const res = await handleIndecQueryDataset(
        {
          dataset: "ipc_nacional",
          select: "periodo,columna_fantasma",
          limit: 10,
          offset: 0,
        },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain(
        "La(s) columna(s) en select no existe(n) en el dataset 'ipc_nacional': 'columna_fantasma'"
      );
      expect(res.content[0]?.text).toContain("Columnas válidas del dataset:");
      expect(res.content[0]?.text).toContain("`periodo`");
      expect(res.content[0]?.text).toContain("`valor`");
    });

    it("valida columnas inexistentes en filters y sugiere las válidas", async () => {
      const client = new IndecHttpClient({ token: mockToken });
      const res = await handleIndecQueryDataset(
        {
          dataset: "ipc_nacional",
          filters: [
            { columna: "periodo", operador: "eq", valor: "202401" },
            { columna: "campo_invalido", operador: "gt", valor: 10 },
          ],
          limit: 10,
          offset: 0,
        },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain(
        "La columna de filtro 'campo_invalido' no existe en el dataset 'ipc_nacional'"
      );
      expect(res.content[0]?.text).toContain("Columnas válidas del dataset:");
    });

    it("valida columnas inexistentes en order", async () => {
      const client = new IndecHttpClient({ token: mockToken });
      const res = await handleIndecQueryDataset(
        {
          dataset: "ipc_nacional",
          order: "columna_rara.desc",
          limit: 10,
          offset: 0,
        },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain(
        "La(s) columna(s) de ordenamiento no existe(n) en el dataset 'ipc_nacional': 'columna_rara'"
      );
    });

    it("ejecuta consulta exitosa devolviendo JSON, resumen y línea de fuente", async () => {
      const mockRows = [
        { periodo: "202401", region: "Nacional", valor: 250.4 },
        { periodo: "202402", region: "Nacional", valor: 280.1 },
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

      const res = await handleIndecQueryDataset(
        {
          dataset: "ipc_nacional",
          select: ["periodo", "region", "valor"],
          filters: [{ columna: "region", operador: "eq", valor: "Nacional" }],
          limit: 10,
          offset: 0,
        },
        makeToolContext(client)
      );

      expect(res.isError).toBeUndefined();
      const text = res.content[0]?.text || "";

      expect(text).toContain(
        "# Consulta: Índice de Precios al Consumidor (IPC) (`ipc_nacional`)"
      );
      expect(text).toContain("- **Registros devueltos:** 2");
      expect(text).toContain("- **Total en dataset / filtro:** 2");
      expect(text).toContain('"periodo": "202401"');
      expect(text).toContain(
        "Fuente: INDEC - Catálogo API-INDEC, dataset ipc_nacional"
      );
      expect(text).not.toContain("Respuesta truncada");
    });

    it("muestra advertencia de truncado y cómo paginar cuando hay más registros", async () => {
      const mockRows = new Array(50).fill({ periodo: "202401", valor: 100 });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 206,
        headers: new Headers({ "Content-Range": "0-49/200" }),
        json: async () => mockRows,
      });

      const client = new IndecHttpClient({
        token: mockToken,
        fetchFn: fetchMock as unknown as typeof fetch,
        cacheTtlSeconds: 0,
      });

      const res = await handleIndecQueryDataset(
        {
          dataset: "ipc_nacional",
          limit: 50,
          offset: 0,
        },
        makeToolContext(client)
      );

      const text = res.content[0]?.text || "";
      expect(text).toContain("**Respuesta truncada**");
      expect(text).toContain(
        "Mostrando registros del 1 al 50 de un total de 200"
      );
      expect(text).toContain("incrementando el parámetro `offset` a `50`");
    });
  });

  describe("indec_count_rows", () => {
    it("devuelve isError: true si falta token", async () => {
      const fetchMock = vi.fn();
      const client = new IndecHttpClient({
        token: undefined,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const res = await handleIndecCountRows(
        { dataset: "ipc_nacional" },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain("Error de autenticación");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("obtiene el total exacto sin traer filas", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "*/103545" }),
        json: async () => [],
      });

      const client = new IndecHttpClient({
        token: mockToken,
        fetchFn: fetchMock as unknown as typeof fetch,
        cacheTtlSeconds: 0,
      });

      const res = await handleIndecCountRows(
        {
          dataset: "ipc_nacional",
          filters: [{ columna: "anio", operador: "gte", valor: 2024 }],
        },
        makeToolContext(client)
      );

      expect(res.isError).toBeUndefined();
      const text = res.content[0]?.text || "";

      expect(text).toContain(
        "# Total de Filas: Índice de Precios al Consumidor (IPC) (`ipc_nacional`)"
      );
      expect(text).toContain("103.545");
      expect(text).toContain(
        "Fuente: INDEC - Catálogo API-INDEC, dataset ipc_nacional"
      );

      const calledInit = fetchMock.mock.calls[0][1];
      expect(calledInit.headers.get("Prefer")).toBe("count=exact");
    });

    it("valida columnas inexistentes en los filtros de conteo", async () => {
      const client = new IndecHttpClient({ token: mockToken });
      const res = await handleIndecCountRows(
        {
          dataset: "ipc_nacional",
          filters: [{ columna: "col_inexistente", operador: "eq", valor: "x" }],
        },
        makeToolContext(client)
      );

      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toContain(
        "La columna de filtro 'col_inexistente' no existe en el dataset 'ipc_nacional'"
      );
    });
  });
});
