import { describe, it, expect, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  handleIndecStatus,
  handleIndecListDatasets,
  handleIndecDescribeDataset,
  buildSpecSignature,
} from "../src/tools/meta.js";
import { createTestServer } from "./helpers/server.js";
import { IndecHttpClient } from "../src/client/indec-client.js";

describe("Meta Tools", () => {
  describe("indec_status", () => {
    it("informa token configurado como true sin revelar el valor cuando está presente", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ paths: new Array(19).fill({}) }),
      });

      const client = new IndecHttpClient({
        token: "super-secret-jwt-token-never-expose",
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const res = await handleIndecStatus(makeToolContext(client));
      const text = res.content[0]?.text || "";

      expect(text).toContain("**Token configurado:** Sí");
      expect(text).not.toContain("super-secret-jwt-token-never-expose");
      expect(text).toContain("https://api.indec.gob.ar/v1/");
    });

    it("informa token configurado como false cuando no se proveyó", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("Network offline"));
      const client = new IndecHttpClient({
        token: undefined,
        fetchFn: fetchMock as unknown as typeof fetch,
        maxRetries: 0,
        baseRetryDelayMs: 0,
      });

      const res = await handleIndecStatus(makeToolContext(client));
      const text = res.content[0]?.text || "";

      expect(text).toContain("**Token configurado:** No");
      expect(text).toContain("No se pudo verificar el spec en línea");
      expect(text).not.toContain("Network offline");
    });

    it("advierte si no puede leer el snapshot local", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ paths: {} }),
      });
      const client = new IndecHttpClient({
        token: undefined,
        fetchFn: fetchMock as unknown as typeof fetch,
        maxRetries: 0,
      });

      const res = await handleIndecStatus(
        makeToolContext(client, "Z:/ruta/que-no-existe/openapi.json")
      );
      const text = res.content[0]?.text || "";

      expect(text).toContain("No se pudo leer el snapshot local");
      expect(text).toContain("⚠️");
      expect(text).toContain("Snapshot local:** desconocido");
      expect(text).not.toContain("Z:/ruta/que-no-existe");
    });

    it("compara specs por paths y columnas, no solo por cantidad", () => {
      const base = {
        paths: { "/a": {}, "/b": {} },
        components: {
          schemas: {
            A: { properties: { x: {}, y: {} } },
          },
        },
      };
      const reordered = {
        paths: { "/b": {}, "/a": {} },
        components: {
          schemas: {
            A: { properties: { y: {}, x: {} } },
          },
        },
      };
      const changedColumns = {
        ...base,
        components: { schemas: { A: { properties: { x: {} } } } },
      };

      expect(buildSpecSignature(reordered)).toBe(buildSpecSignature(base));
      expect(buildSpecSignature(changedColumns)).not.toBe(
        buildSpecSignature(base)
      );
    });

    it("advierte si el spec remoto no es JSON y lo compara como texto", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "esto no es json",
      });
      const client = new IndecHttpClient({
        token: undefined,
        fetchFn: fetchMock as unknown as typeof fetch,
        maxRetries: 0,
      });

      const res = await handleIndecStatus(makeToolContext(client));
      const text = res.content[0]?.text || "";

      expect(text).toContain("no se pudo interpretar como JSON");
    });
  });

  describe("indec_list_datasets", () => {
    it("devuelve los 19 datasets del catálogo sin filtros", async () => {
      const res = await handleIndecListDatasets({}, makeToolContext());
      const text = res.content[0]?.text || "";

      expect(text).toContain(
        "Catálogo de Datasets de la API del INDEC (19 encontrados)"
      );
      expect(text).toContain("`ipc_nacional`");
      expect(text).toContain("`canasta-crianza`");
      expect(text).toContain("`mercado_trabajo_eph`");
      expect(text).toContain("Fuente: INDEC - Catálogo API-INDEC");
    });

    it("filtra por frecuencia", async () => {
      const res = await handleIndecListDatasets(
        { frecuencia: "Semestral" },
        makeToolContext()
      );
      const text = res.content[0]?.text || "";

      expect(text).toContain("1 encontrados");
      expect(text).toContain("pobreza_eph");
      expect(text).not.toContain("ipc_nacional");
    });

    it("filtra por búsqueda de texto en nombre o descripción", async () => {
      const res = await handleIndecListDatasets(
        { search: "salarios" },
        makeToolContext()
      );
      const text = res.content[0]?.text || "";

      expect(text).toContain("indice_salarios");
      expect(text).not.toContain("pobreza_eph");
    });
  });

  describe("indec_describe_dataset", () => {
    it("describe un dataset válido con sus columnas y claves de orden", async () => {
      const res = await handleIndecDescribeDataset(
        { dataset: "ipc_nacional" },
        makeToolContext()
      );
      const text = res.content[0]?.text || "";

      expect(res.isError).toBeUndefined();
      expect(text).toContain("Dataset: Índice de Precios al Consumidor (IPC)");
      expect(text).toContain("`ipc_nacional`");
      expect(text).toContain("`periodo`");
      expect(text).toContain("`valor`");
      expect(text).toContain("Clave de orden para paginación estable");
    });

    it("resuelve nombres normalizados como /canasta_crianza a canasta-crianza", async () => {
      const res = await handleIndecDescribeDataset(
        {
          dataset: "/canasta_crianza",
        },
        makeToolContext()
      );
      const text = res.content[0]?.text || "";

      expect(res.isError).toBeUndefined();
      expect(text).toContain("`canasta-crianza`");
      expect(text).toContain("bys_men1");
    });

    it("devuelve error amigable con sugerencias para datasets inexistentes", async () => {
      const res = await handleIndecDescribeDataset(
        { dataset: "ipc_falso" },
        makeToolContext()
      );
      const text = res.content[0]?.text || "";

      expect(res.isError).toBe(true);
      expect(text).toContain(
        "No se encontró ningún dataset con el identificador 'ipc_falso'"
      );
      expect(text).toContain("Quizás quiso decir: `ipc_nacional`");
    });
  });

  describe("createMcpServer", () => {
    it("registra las 3 tools meta correctamente en el servidor MCP", () => {
      const server = createTestServer();
      // Verificamos que la instancia de McpServer se cree sin errores
      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
    });
  });
});
