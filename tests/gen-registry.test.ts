import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseOpenApiSpec,
  detectFrequency,
  extractOrderKeys,
  extractDateColumns,
  generateRegistryCode,
  type OpenApiSpec,
} from "../scripts/gen-registry.js";
import { DATASETS } from "../src/datasets/registry.generated.js";
import { DatasetRegistry } from "../src/datasets/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Generador de Registry", () => {
  const fixturePath = resolve(__dirname, "fixtures/openapi.fixture.json");
  const rawFixture = readFileSync(fixturePath, "utf8");
  const fixtureSpec = JSON.parse(rawFixture) as OpenApiSpec;

  it("detecta correctamente la frecuencia según las columnas y descripción", () => {
    expect(detectFrequency(["periodo", "anio", "mes"], "Serie mensual")).toBe(
      "Mensual"
    );
    expect(
      detectFrequency(["periodo", "anio", "trimestre"], "Serie trimestral")
    ).toBe("Trimestral");
    expect(
      detectFrequency(["periodo", "anio", "semestre"], "Serie semestral")
    ).toBe("Semestral");
    expect(
      detectFrequency(["fecha", "poblacion"], "Estimaciones anuales")
    ).toBe("Anual");
    expect(
      detectFrequency(["nombre_columna", "codigo"], "Diccionario estático")
    ).toBe("Estática / Diccionario");
  });

  it("extrae las claves completas de ordenamiento desde la descripción", () => {
    const keys = extractOrderKeys([
      {
        name: "order",
        description:
          "Ordenamiento. Para paginar, incluya la clave completa: col_a,col_b,col_c",
      },
    ]);
    expect(keys).toEqual(["col_a", "col_b", "col_c"]);

    const empty = extractOrderKeys([
      { name: "order", description: "Sin clave" },
    ]);
    expect(empty).toEqual([]);
  });

  it("extrae y ordena prioritariamente las columnas de fecha", () => {
    const dates = extractDateColumns([
      "mes",
      "descripcion",
      "periodo",
      "valor",
      "anio",
    ]);
    expect(dates).toEqual(["periodo", "anio", "mes"]);
  });

  it("parsea el fixture OpenAPI y extrae datasets con columnas y tipos", () => {
    const datasets = parseOpenApiSpec(fixtureSpec);
    expect(datasets).toHaveLength(3);

    const ipc = datasets.find((d) => d.id === "ipc_nacional");
    expect(ipc).toBeDefined();
    expect(ipc?.frecuencia).toBe("Mensual");
    expect(ipc?.area).toBe("Dirección de Índices de Precios de Consumo");
    expect(ipc?.orderKeys).toEqual(["periodo", "region", "codigo"]);
    expect(ipc?.dateColumns).toEqual(["periodo", "anio", "mes"]);

    // Verificar columnas y tipos
    const valorCol = ipc?.columns.find((c) => c.name === "valor");
    expect(valorCol).toEqual({
      name: "valor",
      type: "number",
      description: "Valor del indicador",
      nullable: true,
    });

    const periodoCol = ipc?.columns.find((c) => c.name === "periodo");
    expect(periodoCol).toEqual({
      name: "periodo",
      type: "string",
      description: "Período AAAAMM",
      nullable: false,
    });

    // Dataset trimestral
    const eph = datasets.find((d) => d.id === "mercado_trabajo_eph");
    expect(eph?.frecuencia).toBe("Trimestral");
    expect(eph?.orderKeys).toEqual(["area_geografica_nom", "periodo"]);
    expect(eph?.dateColumns).toEqual(["periodo", "anio", "trimestre"]);

    // Dataset estático
    const nom = datasets.find(
      (d) => d.id === "comercio_exterior_nomenclaturas"
    );
    expect(nom?.frecuencia).toBe("Estática / Diccionario");
    expect(nom?.orderKeys).toEqual(["nombre_columna", "codigo"]);
    expect(nom?.dateColumns).toEqual([]);
  });

  it("rechaza un path OpenAPI absoluto nombrando la ruta ofensora", () => {
    const spec = {
      paths: {
        "https://attacker.example/steal": { get: { summary: "Malicioso" } },
      },
    } as OpenApiSpec;

    expect(() => parseOpenApiSpec(spec)).toThrow(
      /Ruta OpenAPI inválida: "https:\/\/attacker\.example\/steal"/
    );
  });

  it("rechaza un path OpenAPI protocol-relative o con backslashes", () => {
    const protocolRelative = {
      paths: {
        "//attacker.example/steal": { get: { summary: "Malicioso" } },
      },
    } as OpenApiSpec;
    expect(() => parseOpenApiSpec(protocolRelative)).toThrow(
      /Ruta OpenAPI inválida: "\/\/attacker\.example\/steal"/
    );

    const withBackslash = {
      paths: {
        "/ipc\\nacional": { get: { summary: "Malicioso" } },
      },
    } as OpenApiSpec;
    expect(() => parseOpenApiSpec(withBackslash)).toThrow(
      /Ruta OpenAPI inválida/
    );
  });

  it("genera código TypeScript con encabezado NO EDITAR A MANO", () => {
    const datasets = parseOpenApiSpec(fixtureSpec);
    const code = generateRegistryCode(datasets);

    expect(code).toContain(
      "ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO"
    );
    expect(code).toContain("import type { DatasetMetadata }");
    expect(code).toContain("export type DatasetId");
    expect(code).toContain("export const DATASETS");
  });

  it("el registry generado del INDEC real tiene 19 datasets y búsqueda", () => {
    expect(Object.keys(DATASETS)).toHaveLength(19);

    const registry = new DatasetRegistry();
    const ipc = registry.get("ipc_nacional");
    expect(ipc).toBeDefined();
    expect(ipc?.endpoint).toBe("/ipc_nacional");
    expect(ipc?.columns.length).toBeGreaterThan(10);

    // Búsqueda con barra inicial
    const ipcSlash = registry.get("/ipc_nacional");
    expect(ipcSlash?.id).toBe("ipc_nacional");

    // Búsqueda flexible con guión medio o bajo
    const crianza = registry.get("canasta_crianza");
    expect(crianza?.id).toBe("canasta-crianza");

    // Dataset inexistente
    expect(registry.get("dataset_que_no_existe")).toBeUndefined();

    // Listado completo
    const list = registry.list();
    expect(list).toHaveLength(19);
  });
});
