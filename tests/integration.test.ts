import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";
import { createContainer } from "../src/container.js";

const hasToken = Boolean(process.env.INDEC_API_TOKEN?.trim());
const integration = hasToken ? describe : describe.skip;

integration("Integración real con la API del INDEC", () => {
  it("consulta el último período del IPC con un token válido", async () => {
    const config = loadConfig();
    const container = createContainer({ config });

    expect(container.client.hasToken()).toBe(true);
    expect(container.registry.list().length).toBeGreaterThan(0);

    const result = await container.datasetQuery.query({
      dataset: "ipc_nacional",
      select: ["periodo", "valor"],
      order: "periodo.desc",
      limit: 1,
      offset: 0,
    });

    expect(result.dataset.id).toBe("ipc_nacional");
    expect(result.queryResult.count).toBe(1);
    expect(result.queryResult.data).toHaveLength(1);
  }, 60000);
});
