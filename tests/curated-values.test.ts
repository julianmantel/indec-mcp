import { describe, expect, it } from "vitest";
import {
  resolveCanastaIndicador,
  resolveEmaeIndicador,
  resolveEphArea,
  resolveIpcIndicador,
  resolveIpcNivel,
  resolveSalarioIndicador,
} from "../src/tools/curated/values.js";

describe("Valores literales usados por las tools curadas", () => {
  it("IPC: etiquetas en español y códigos se resuelven a los valores de la API", () => {
    expect(resolveIpcIndicador("variación intermensual")).toBe("v_m");
    expect(resolveIpcIndicador("variación interanual")).toBe("v_ia");
    expect(resolveIpcIndicador("variación acumulada")).toBe("v_acum");
    expect(resolveIpcIndicador("índice")).toBe("Indice");
    expect(resolveIpcIndicador("incidencia")).toBe("Incidencia_m");
    expect(resolveIpcIndicador("Precio promedio")).toBe("Precio promedio");
    expect(resolveIpcIndicador("v_ia")).toBe("v_ia");
    expect(resolveIpcNivel("nivel general")).toBe("Nivel General");
    expect(resolveIpcNivel("División")).toBe("División");
  });

  it("EMAE: distingue nivel general de sectores y series", () => {
    expect(resolveEmaeIndicador("índice", "general")).toMatchObject({
      tipo: "Índice base 2004=100",
    });
    expect(
      resolveEmaeIndicador("variación interanual", "general")
    ).toMatchObject({
      tipo: "Variación porcentual",
      descripcion: "Var % interanual serie original",
    });
    expect(
      resolveEmaeIndicador("variación interanual", "sectores")
    ).toMatchObject({ tipo: "Variación porcentual interanual" });
    expect(
      resolveEmaeIndicador(
        "variación intermensual",
        "general",
        "tendencia-ciclo"
      )
    ).toMatchObject({
      tipo: "Variación porcentual",
      descripcion: "Var % mensual serie tendencia-ciclo",
    });
    expect(
      resolveEmaeIndicador("variación intermensual", "sectores").error
    ).toContain("no publica variación intermensual");
    expect(
      resolveEmaeIndicador(
        "variación interanual",
        "general",
        "desestacionalizada"
      ).error
    ).toContain("serie original");
    expect(
      resolveEmaeIndicador("variación acumulada", "general").error
    ).toContain("no válido");
  });

  it("Canastas: 'línea' son CBA y CBT, no los tipos de hogar", () => {
    expect(resolveCanastaIndicador("variación intermensual")).toEqual({
      tipo: "v_m",
    });
    expect(resolveCanastaIndicador("variación interanual")).toEqual({
      tipo: "v_ia",
    });
    expect(resolveCanastaIndicador("línea")).toEqual({
      codigos: ["CBA", "CBT"],
    });
    expect(resolveCanastaIndicador("todos")).toEqual({});
    expect(resolveCanastaIndicador("Hogar 1")).toEqual({ tipo: "Hogar 1" });
  });

  it("Salarios: 'índice' no lleva acento en la API", () => {
    expect(resolveSalarioIndicador("índice")).toBe("Indice");
    expect(resolveSalarioIndicador("variación intermensual")).toBe("v_m");
    expect(resolveSalarioIndicador("variación interanual")).toBe("v_ia");
    expect(resolveSalarioIndicador("variación acumulada")).toBe("v_acum");
    expect(resolveSalarioIndicador("todos")).toBeUndefined();
  });

  it("EPH: el único área publicada es T_31_A", () => {
    expect(resolveEphArea()).toEqual({ operador: "eq", valor: "T_31_A" });
    expect(resolveEphArea("Total 31 aglomerados urbanos")).toEqual({
      operador: "eq",
      valor: "T_31_A",
    });
    expect(resolveEphArea("Gran Buenos Aires")).toMatchObject({
      operador: "ilike",
      valor: "*Gran Buenos Aires*",
      warning: expect.stringContaining("T_31_A"),
    });
  });
});
