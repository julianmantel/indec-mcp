import { loadConfig } from "../../src/config.js";
import { createContainer } from "../../src/container.js";
import { createMcpServer } from "../../src/server.js";

export function createTestServer(options: { snapshotPath?: string } = {}) {
  return createMcpServer({
    container: createContainer({ config: loadConfig({}) }),
    ...options,
  });
}
