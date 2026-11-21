import { describe, expect, it } from "vitest";
import {
  VariationMathError,
  accumulateMonthly,
  addMonths,
  annualize,
  averageMonthly,
  monthsBetween,
  parsePeriodo,
  rebase,
  roundTo,
  updateAmount,
  variationBetween,
} from "../src/services/index-math.js";

describe("index-math: variación entre dos índices", () => {
  it("100 → 150 es 50%", () => {
    expect(variationBetween(100, 150)).toBe(50);
  });

  it("un índice que baja devuelve una variación negativa", () => {
    expect(variationBetween(200, 150)).toBe(-25);
  });

  it("rechaza índices nulos, no finitos o menores o iguales a cero", () => {
    expect(() => variationBetween(0, 150)).toThrow(VariationMathError);
    expect(() => variationBetween(100, 0)).toThrow(VariationMathError);
    expect(() => variationBetween(Number.NaN, 150)).toThrow(VariationMathError);
    expect(() => variationBetween(Number.POSITIVE_INFINITY, 150)).toThrow(
      VariationMathError
    );
    expect(() => variationBetween(null as unknown as number, 150)).toThrow(
      VariationMathError
    );
  });
});

describe("index-math: composición de variaciones mensuales", () => {
  it("dos meses de +10% acumulan 21%", () => {
    expect(accumulateMonthly([10, 10])).toBe(21);
  });

  it("compone variaciones positivas y negativas", () => {
    // (1.10) * (0.90) - 1 = -1%
    expect(accumulateMonthly([10, -10])).toBe(-1);
  });

  it("rechaza listas vacías, valores no finitos y variaciones ≤ -100%", () => {
    expect(() => accumulateMonthly([])).toThrow(VariationMathError);
    expect(() => accumulateMonthly([10, Number.NaN])).toThrow(
      VariationMathError
    );
    expect(() => accumulateMonthly([-100])).toThrow(VariationMathError);
  });
});

describe("index-math: anualización y promedio mensual", () => {
  it("21% en 24 meses equivale a 10% anual", () => {
    expect(annualize(21, 24)).toBe(10);
  });

  it("21% en 24 meses equivale a 0,797414% mensual geométrico", () => {
    expect(averageMonthly(21, 24)).toBe(0.797414);
  });

  it("una variación de 12 meses se anualiza a sí misma", () => {
    expect(annualize(25, 12)).toBe(25);
  });

  it("rechaza meses no enteros o no positivos", () => {
    expect(() => annualize(21, 0)).toThrow(VariationMathError);
    expect(() => annualize(21, -3)).toThrow(VariationMathError);
    expect(() => annualize(21, 1.5)).toThrow(VariationMathError);
    expect(() => averageMonthly(21, 0)).toThrow(VariationMathError);
  });

  it("rechaza anualizar una variación que dejaría el índice en cero o menos", () => {
    expect(() => annualize(-100, 12)).toThrow(VariationMathError);
    expect(() => averageMonthly(-150, 12)).toThrow(VariationMathError);
  });
});

describe("index-math: rebase", () => {
  it("rebasa [200, 220, 250] sobre el primer período a [100, 110, 125]", () => {
    const rebased = rebase(
      [
        { periodo: "202401", valor: 200 },
        { periodo: "202402", valor: 220 },
        { periodo: "202403", valor: 250 },
      ],
      "202401"
    );

    expect(rebased).toEqual([
      { periodo: "202401", valor: 100 },
      { periodo: "202402", valor: 110 },
      { periodo: "202403", valor: 125 },
    ]);
  });

  it("falla con períodos idénticos", () => {
    expect(() =>
      rebase(
        [
          { periodo: "202401", valor: 200 },
          { periodo: "202401", valor: 220 },
        ],
        "202401"
      )
    ).toThrow(/duplicado/);
  });

  it("falla con períodos desordenados o invertidos", () => {
    expect(() =>
      rebase(
        [
          { periodo: "202403", valor: 250 },
          { periodo: "202402", valor: 220 },
        ],
        "202403"
      )
    ).toThrow(/anterior al inicial/);
  });

  it("falla si falta un período en el medio", () => {
    expect(() =>
      rebase(
        [
          { periodo: "202401", valor: 200 },
          { periodo: "202403", valor: 250 },
        ],
        "202401"
      )
    ).toThrow(/Falta el período 202402/);
  });

  it("falla si el período base no está en la serie o el valor es cero/nulo", () => {
    expect(() => rebase([{ periodo: "202401", valor: 200 }], "202402")).toThrow(
      /período base/
    );
    expect(() => rebase([{ periodo: "202401", valor: 0 }], "202401")).toThrow(
      VariationMathError
    );
    expect(() =>
      rebase([{ periodo: "202401", valor: null }], "202401")
    ).toThrow(VariationMathError);
  });
});

describe("index-math: actualización de montos", () => {
  it("1.000.000 con +21% es 1.210.000", () => {
    expect(updateAmount(1_000_000, 21)).toBe(1_210_000);
  });

  it("redondea a dos decimales", () => {
    expect(updateAmount(1000, 12.3456)).toBe(1123.46);
  });

  it("rechaza montos negativos y variaciones ≤ -100%", () => {
    expect(() => updateAmount(-1, 10)).toThrow(VariationMathError);
    expect(() => updateAmount(1000, -100)).toThrow(VariationMathError);
  });

  it("nunca devuelve Infinity si el monto actualizado desborda", () => {
    expect(() => updateAmount(1e308, 100)).toThrow(VariationMathError);
    expect(() => updateAmount(Number.MAX_VALUE, 100)).toThrow(
      VariationMathError
    );
  });
});

describe("index-math: períodos", () => {
  it("calcula la cantidad de tramos mensuales", () => {
    expect(monthsBetween("202401", "202412")).toBe(11);
    expect(monthsBetween("202401", "202501")).toBe(12);
    expect(monthsBetween("202401", "202401")).toBe(0);
  });

  it("rechaza un rango invertido", () => {
    expect(() => monthsBetween("202412", "202401")).toThrow(VariationMathError);
  });

  it("valida el formato AAAAMM y el mes", () => {
    expect(parsePeriodo("202401")).toEqual({ year: 2024, month: 1 });
    expect(() => parsePeriodo("2024-01")).toThrow(VariationMathError);
    expect(() => parsePeriodo("202413")).toThrow(VariationMathError);
    expect(() => parsePeriodo("202400")).toThrow(VariationMathError);
  });

  it("suma y resta meses cruzando el año", () => {
    expect(addMonths("202401", -1)).toBe("202312");
    expect(addMonths("202412", 1)).toBe("202501");
    expect(addMonths("202610", -10)).toBe("202512");
  });

  it("redondea sin dejar artefactos de punto flotante", () => {
    expect(roundTo(21.000000000000014)).toBe(21);
  });
});
