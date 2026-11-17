import { describe, it, expect } from "vitest";
import { DatasetRegistry } from "../src/datasets/registry.js";
import { DATASET_LIST } from "../src/datasets/registry.generated.js";

describe("DatasetRegistry", () => {
  const registry = new DatasetRegistry();

  it("lista todos los datasets generados", () => {
    expect(registry.list()).toHaveLength(DATASET_LIST.length);
    expect(registry.list().length).toBeGreaterThan(0);
  });

  it("obtiene un dataset por id exacto", () => {
    const ipc = registry.get("ipc_nacional");
    expect(ipc?.id).toBe("ipc_nacional");
    expect(ipc?.endpoint).toBe("/ipc_nacional");
  });

  it("normaliza barra inicial y guiones/underscores", () => {
    expect(registry.get("/ipc_nacional")?.id).toBe("ipc_nacional");
    expect(registry.get("canasta_crianza")?.id).toBe("canasta-crianza");
    expect(registry.get("canasta-crianza")?.id).toBe("canasta-crianza");
  });

  it("devuelve undefined para un dataset inexistente", () => {
    expect(registry.get("dataset_que_no_existe")).toBeUndefined();
  });

  it("filtra por área, frecuencia y término de búsqueda", () => {
    const byArea = registry.search({ area: "precios" });
    expect(byArea.length).toBeGreaterThan(0);
    expect(byArea.every((d) => d.area.toLowerCase().includes("precios"))).toBe(
      true
    );

    const byFrequency = registry.search({ frecuencia: "Semestral" });
    expect(byFrequency.length).toBeGreaterThan(0);
    expect(byFrequency.every((d) => d.frecuencia === "Semestral")).toBe(true);

    const bySearch = registry.search({ search: "salarios" });
    expect(bySearch.some((d) => d.id === "indice_salarios")).toBe(true);
  });

  it("sugiere datasets parecidos a un id mal escrito", () => {
    expect(registry.suggest("ipc_nacional")).toContain("ipc_nacional");
    expect(registry.suggest("ipc")).toContain("ipc_nacional");
    expect(registry.suggest("canasta_crianza")).toContain("canasta-crianza");
    expect(registry.suggest("zzz_inexistente_zzz")).toEqual([]);
  });
});
