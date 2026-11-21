import { describe, expect, it, vi } from "vitest";
import { makeToolContext } from "./helpers/context.js";
import {
  calcularVariacionInputSchema,
  handleIndecCalcularVariacion as executeCalcularVariacion,
} from "../src/tools/curated/calcular-variacion.js";
import { IndecHttpClient } from "../src/client/indec-client.js";

const handleIndecCalcularVariacion = (
  input: Parameters<typeof calcularVariacionInputSchema.parse>[0],
  ctx: Parameters<typeof executeCalcularVariacion>[1]
) => executeCalcularVariacion(calcularVariacionInputSchema.parse(input), ctx);

const mockToken = "valid-jwt-token";

function jsonResponse(body: unknown, total?: number) {
  const headers = new Headers();
  if (total !== undefined) {
    headers.set(
      "Content-Range",
      `0-${Math.max((Array.isArray(body) ? body.length : 1) - 1, 0)}/${total}`
    );
  }
  return {
    ok: true,
    status: 200,
    headers,
    json: async () => body,
  };
}

function periodos(desde: string, count: number): string[] {
  let year = Number(desde.slice(0, 4));
  let month = Number(desde.slice(4, 6));
  return Array.from({ length: count }, () => {
    const periodo = `${year}${String(month).padStart(2, "0")}`;
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    return periodo;
  });
}

function seriesRows(desde: string, values: number[]) {
  return periodos(desde, values.length).map((periodo, index) => ({
    periodo,
    valor: values[index],
  }));
}

function makeClient(fetchMock: ReturnType<typeof vi.fn>) {
  return new IndecHttpClient({
    token: mockToken,
    fetchFn: fetchMock as unknown as typeof fetch,
    cacheTtlSeconds: 0,
  });
}

/** Mock que distingue la serie de índices de la variación oficial. */
function makeFetchMock(
  rows: Array<Record<string, unknown>>,
  oficial: Record<string, unknown> | null
) {
  return vi.fn(async (url: string) => {
    const params = new URL(url).searchParams;
    const tipo = params.get("tipo_de_indicador");

    if (tipo === "eq.v_acum" || tipo === "eq.v_ia") {
      return jsonResponse(oficial ? [oficial] : [], oficial ? 1 : 0);
    }

    return jsonResponse(rows, rows.length);
  });
}

describe("Curated Tool: indec_calcular_variacion", () => {
  it("devuelve isError: true con mensaje accionable si falta el token", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202610" },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Error de autenticación");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calcula la variación acumulada y la compara con la oficial", async () => {
    const rows = seriesRows(
      "202512",
      Array.from({ length: 11 }, (_, index) => 100 + index)
    );
    const fetchMock = makeFetchMock(rows, { periodo: "202610", valor: 10 });
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202610" },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || "";

    expect(text).toContain("- **Período inicial:** 202512 (índice 100)");
    expect(text).toContain("- **Período final:** 202610 (índice 110)");
    expect(text).toContain("- **Variación acumulada:** **10,00%**");
    expect(text).toContain("- **Verificación oficial:** v_acum 202610 = 10");
    expect(text).toContain("✅");
    expect(text).toContain(
      "Fuente: INDEC - Catálogo API-INDEC, dataset ipc_nacional"
    );

    const seriesCall = fetchMock.mock.calls.find(
      ([url]) =>
        new URL(url).searchParams.get("tipo_de_indicador") === "eq.Indice"
    );
    expect(seriesCall).toBeDefined();

    const params = new URL(seriesCall?.[0] as string).searchParams;
    expect(params.get("region")).toBe("eq.Nacional");
    expect(params.get("nivel")).toBe("eq.Nivel General");
    expect(params.get("codigo")).toBe("eq.0");
    expect(params.get("periodo")).toBe("gte.202512");
    expect(params.getAll("periodo")).toContain("lte.202610");
    expect(params.get("order")).toBe("periodo.asc");
    expect(params.get("select")).toContain("observaciones");
  });

  it("advierte cuando la variación calculada difiere de la oficial en más de 0,1 pp", async () => {
    const rows = seriesRows(
      "202512",
      Array.from({ length: 11 }, (_, index) => 100 + index)
    );
    const fetchMock = makeFetchMock(rows, { periodo: "202610", valor: 5 });
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202610" },
      makeToolContext(client)
    );

    const text = res.content[0]?.text || "";
    expect(text).toContain("⚠️");
    expect(text).toContain("difiere de la oficial publicada");
  });

  it("falla con un mensaje claro si falta un período en el medio", async () => {
    const rows = seriesRows(
      "202512",
      Array.from({ length: 11 }, (_, index) => 100 + index)
    ).filter((row) => row.periodo !== "202603");
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202610" },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain(
      "Faltan períodos en la serie: 202603"
    );
  });

  it("rechaza desde >= hasta antes de llamar a la API", async () => {
    const fetchMock = vi.fn();
    const client = makeClient(fetchMock);

    const iguales = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202512" },
      makeToolContext(client)
    );
    expect(iguales.isError).toBe(true);
    expect(iguales.content[0]?.text).toContain("debe ser anterior");

    const invertidos = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202610", hasta: "202512" },
      makeToolContext(client)
    );
    expect(invertidos.isError).toBe(true);
    expect(invertidos.content[0]?.text).toContain("anterior al inicial");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falla si los filtros devuelven más de una fila por período", async () => {
    const rows = [
      { periodo: "202512", valor: 100 },
      { periodo: "202512", valor: 101 },
      { periodo: "202601", valor: 102 },
    ];
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202512", hasta: "202601" },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("más de una fila por período");
  });

  it("aborta si la paginación no alcanza para traer la serie completa", async () => {
    const page = Array.from({ length: 1000 }, () => ({
      periodo: "202501",
      valor: 100,
    }));
    const fetchMock = vi.fn(async () => jsonResponse(page, 20000));
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202501", hasta: "202601" },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("límite de paginación");
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("falla con un mensaje claro si el índice no tiene valor publicado", async () => {
    const rows = [
      { periodo: "202510", valor: null },
      { periodo: "202511", valor: 100 },
    ];
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "indice_salarios",
        desde: "202510",
        hasta: "202511",
        sector: "Nivel general",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain(
      "no tiene un número índice publicado"
    );
  });

  it("actualiza un monto con la variación del tramo", async () => {
    const values = Array.from({ length: 12 }, () => 100);
    values[values.length - 1] = 121;
    const rows = seriesRows("202501", values);
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "ipc_nacional",
        desde: "202501",
        hasta: "202512",
        monto: 1_000_000,
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || "";
    expect(text).toContain("- **Variación acumulada:** **21,00%**");
    expect(text).toContain("Monto actualizado");
    expect(text).toContain("1.210.000");
  });

  it("aplica rezago_meses solo al monto y lo informa", async () => {
    const values = Array.from({ length: 12 }, () => 100);
    values[values.length - 2] = 110;
    values[values.length - 1] = 121;
    const rows = [
      { periodo: "202412", valor: 100 },
      ...seriesRows("202501", values),
    ];
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "ipc_nacional",
        desde: "202501",
        hasta: "202512",
        monto: 1_000_000,
        rezago_meses: 1,
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || "";
    expect(text).toContain("- **Variación acumulada:** **21,00%**");
    expect(text).toContain("1.100.000");
    expect(text).toContain("202412");
    expect(text).toContain("202511");
  });

  it("incluye la serie mensual solo si mostrar_serie es true", async () => {
    const rows = seriesRows("202501", [100, 110, 121]);
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const sinSerie = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202501", hasta: "202503" },
      makeToolContext(client)
    );
    expect(sinSerie.content[0]?.text).not.toContain("Serie mensual usada");
    expect(sinSerie.content[0]?.text).not.toContain('"serieMensual"');

    const conSerie = await handleIndecCalcularVariacion(
      {
        dataset: "ipc_nacional",
        desde: "202501",
        hasta: "202503",
        mostrar_serie: true,
      },
      makeToolContext(client)
    );
    const text = conSerie.content[0]?.text || "";
    expect(text).toContain("## Serie mensual usada");
    expect(text).toContain("| 202501 | 100 | — |");
    expect(text).toContain('"serieMensual"');
  });

  it("rechaza rezago_meses sin monto", async () => {
    const fetchMock = vi.fn();
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "ipc_nacional",
        desde: "202501",
        hasta: "202503",
        rezago_meses: 1,
      },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain(
      "'rezago_meses' solo aplica cuando se indica 'monto'"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza selectores que no corresponden al dataset", async () => {
    const fetchMock = vi.fn();
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "ipc_nacional",
        desde: "202501",
        hasta: "202503",
        sector: "Nivel general",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("'sector'");
    expect(res.content[0]?.text).toContain("no aplican al dataset");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("usa los literales exactos del IPI minero", async () => {
    const rows = seriesRows("202601", [100, 105]);
    const fetchMock = makeFetchMock(rows, null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      {
        dataset: "ipi_minero",
        desde: "202601",
        hasta: "202602",
        serie_ipi: "original",
      },
      makeToolContext(client)
    );

    expect(res.isError).toBeUndefined();
    const params = new URL(fetchMock.mock.calls[0]?.[0] as string).searchParams;
    expect(params.get("tipo_de_indicador")).toBe("eq.Índice");
    expect(params.get("descripcion")).toBe("eq.Nivel General - IPI Minero");
    expect(params.get("serie")).toBe("eq.Serie Original");
  });

  it("falla si no hay datos en el rango pedido", async () => {
    const fetchMock = makeFetchMock([], null);
    const client = makeClient(fetchMock);

    const res = await handleIndecCalcularVariacion(
      { dataset: "ipc_nacional", desde: "202501", hasta: "202503" },
      makeToolContext(client)
    );

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("No hay datos de la serie");
  });

  it("valida el formato de períodos y los límites del schema", () => {
    expect(
      calcularVariacionInputSchema.safeParse({
        dataset: "ipc_nacional",
        desde: "202413",
        hasta: "202501",
      }).success
    ).toBe(false);

    expect(
      calcularVariacionInputSchema.safeParse({
        dataset: "ipc_nacional",
        desde: "202401",
        hasta: "202412",
        rezago_meses: 13,
      }).success
    ).toBe(false);

    expect(
      calcularVariacionInputSchema.safeParse({
        dataset: "ipc_nacional",
        desde: "202401",
        hasta: "202412",
        monto: -1,
      }).success
    ).toBe(false);

    expect(
      calcularVariacionInputSchema.safeParse({
        dataset: "desconocido",
        desde: "202401",
        hasta: "202412",
      }).success
    ).toBe(false);
  });
});
