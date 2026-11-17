#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createContainer } from "./container.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const container = createContainer({ config });
  const server = createMcpServer({ container });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor indec-mcp inicializado correctamente por stdio.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error fatal al inicializar indec-mcp: ${message}`);
  process.exit(1);
});
