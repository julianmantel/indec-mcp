import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createTestServer } from "./helpers/server.js";
import { MAX_TOOL_INPUT_ELEMENTS } from "../src/server.js";

const EXPECTED_TOOLS = [
  "indec_status",
  "indec_list_datasets",
  "indec_describe_dataset",
  "indec_query_dataset",
  "indec_count_rows",
  "indec_get_ipc",
  "indec_get_emae",
  "indec_get_canastas",
  "indec_get_canasta_crianza",
  "indec_get_mercado_trabajo",
  "indec_get_pobreza",
  "indec_get_salarios",
];

describe("Servidor MCP", () => {
  it("expone las 12 tools esperadas y todas son de solo lectura", async () => {
    const server = createTestServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const mcpClient = new Client({ name: "test", version: "1.0.0" });

    await server.connect(serverTransport);
    await mcpClient.connect(clientTransport);

    try {
      const { tools } = await mcpClient.listTools();
      const names = tools.map((tool) => tool.name);

      expect(names.sort()).toEqual([...EXPECTED_TOOLS].sort());
      for (const tool of tools) {
        expect(tool.annotations?.readOnlyHint).toBe(true);
      }
    } finally {
      await mcpClient.close();
      await server.close();
    }
  });

  it("rechaza argumentos con más elementos que el techo del SDK antes de validar con zod", async () => {
    const server = createTestServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const mcpClient = new Client({ name: "test", version: "1.0.0" });

    await server.connect(serverTransport);
    await mcpClient.connect(clientTransport);

    try {
      // 6.000 filtros superan ampliamente MAX_TOOL_INPUT_ELEMENTS (5.000).
      // El SDK aborta antes de validar con zod y antes de llegar al handler,
      // por lo que no se necesita token ni se realiza ninguna llamada de red.
      const filters = Array.from({ length: 6_000 }, () => ({
        columna: "periodo",
        operador: "eq",
        valor: "202401",
      }));

      const result = await mcpClient.callTool({
        name: "indec_query_dataset",
        arguments: { dataset: "ipc_nacional", filters },
      });

      expect(result.isError).toBe(true);
      const text =
        (result.content as Array<{ type: string; text?: string }>)[0]?.text ??
        "";
      expect(text).toContain(
        `more than the maximum of ${MAX_TOOL_INPUT_ELEMENTS} elements`
      );
    } finally {
      await mcpClient.close();
      await server.close();
    }
  });
});
