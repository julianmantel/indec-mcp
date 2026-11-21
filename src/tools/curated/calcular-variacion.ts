import { z } from "zod";
import type { ToolContext } from "../context.js";
import { formatQueryError } from "../errors.js";
import {
  AUTH_ERROR_MESSAGE,
  errorResult,
  jsonBlock,
  sourceLine,
  textResult,
} from "../presentation.js";
import type { FilterInput } from "../../services/dataset-query.js";
import {
  SUPPORTED_DATASETS,
  SeriesVariationError,
  computeSeriesVariation,
  type SeriesSelection,
  type SupportedDatasetId,
} from "../../services/series-variation.js";
import {
  VariationMathError,
  monthsBetween,
} from "../../services/index-math.js";
import {
  ICC_APERTURA_LABELS,
  SALARIO_SECTOR_LABELS,
  SIPM_INDICADOR_LABELS,
  resolveIpiSerie,
  resolveSalarioSector,
  resolveIccApertura,
  resolveSipmIndicador,
} from "./values.js";

const periodoSchema = z
  .string()
  .regex(/^\d{6}$/, "El formato debe ser AAAAMM (ej: '202401')")
  .refine((value) => {
    const month = Number(value.slice(4, 6));
    return month >= 1 && month <= 12;
  }, "El mes debe estar entre 01 y 12");

export const calcularVariacionInputSchema = z.object({
  dataset: z
    .enum(SUPPORTED_DATASETS)
    .describe(
      "Dataset de índices a usar: 'ipc_nacional', 'indice_salarios', 'icc_precios_construccion', 'sipm_precios_mayoristas', 'ipi_manufacturero' o 'ipi_minero'."
    ),
  desde: periodoSchema.describe(
    "Período inicial en formato AAAAMM (ej: '202401'). Debe ser anterior a 'hasta'."
  ),
  hasta: periodoSchema.describe(
    "Período final en formato AAAAMM (ej: '202412'). Debe ser posterior a 'desde'."
  ),
  region: z
    .enum([
      "Nacional",
      "GBA",
      "Pampeana",
      "Cuyo",
      "Noreste",
      "Noroeste",
      "Patagonia",
    ])
    .optional()
    .describe("Solo IPC. Región estadística. Default: 'Nacional'."),
  nivel_ipc: z
    .enum(["Nivel General", "División", "Categoría"])
    .optional()
    .describe(
      "Solo IPC. Nivel de apertura del índice. Default: 'Nivel General'."
    ),
  codigo_ipc: z
    .string()
    .max(10, "El código no puede superar los 10 caracteres")
    .optional()
    .describe(
      "Solo IPC. Código de la apertura (ej: '01' para División Alimentos y bebidas). Obligatorio si nivel_ipc no es 'Nivel General'."
    ),
  sector: z
    .enum([...SALARIO_SECTOR_LABELS])
    .optional()
    .describe(
      "Solo índice de salarios. Serie a consultar. Default: 'Nivel general'."
    ),
  apertura_icc: z
    .enum([...ICC_APERTURA_LABELS])
    .optional()
    .describe("Solo ICC. Apertura del índice. Default: 'Nivel general'."),
  indicador_sipm: z
    .enum([...SIPM_INDICADOR_LABELS])
    .optional()
    .describe("Solo SIPM. Indicador: IPIM, IPIB o IPP. Default: 'IPIM'."),
  nivel_sipm: z
    .string()
    .max(100, "El nivel no puede superar los 100 caracteres")
    .optional()
    .describe(
      "Solo SIPM. Nivel de apertura (ej: 'Nivel general', 'Clase'). Default: 'Nivel general'."
    ),
  apertura_sipm: z
    .string()
    .max(20, "El código de apertura no puede superar los 20 caracteres")
    .optional()
    .describe(
      "Solo SIPM. Código de apertura (ej: 'NG', '0111'). Default: 'NG' (nivel general)."
    ),
  serie_ipi: z
    .enum(["original", "desestacionalizada", "tendencia-ciclo"])
    .optional()
    .describe("Solo IPI. Tipo de serie. Default: 'original'."),
  descripcion_ipi: z
    .string()
    .max(200, "La descripción no puede superar los 200 caracteres")
    .optional()
    .describe(
      "Solo IPI. Descripción exacta de la serie (ej: 'IPI Manufacturero - Nivel general'). Default: nivel general del dataset."
    ),
  codigo_ipi: z
    .string()
    .max(50, "El código no puede superar los 50 caracteres")
    .optional()
    .describe(
      "Solo IPI. Código de actividad (CLaNAE 2004 en manufacturero, ClaNAE 2010 en minero). Opcional."
    ),
  monto: z
    .number()
    .positive("El monto debe ser mayor que cero")
    .optional()
    .describe(
      "Monto opcional a actualizar por la variación del índice. Ej: 1000000."
    ),
  rezago_meses: z
    .number()
    .int()
    .min(0)
    .max(12)
    .optional()
    .describe(
      "Solo si se indica 'monto'. Meses de rezago del índice usado para actualizar el monto (0 a 12). Desplaza tanto el período inicial como el final para mantener la duración del período. Default: 0."
    ),
  mostrar_serie: z
    .boolean()
    .default(false)
    .describe(
      "Si es true, incluye la serie mensual usada (período, índice y variación mensual) para auditoría. Default: false."
    ),
});

export type CalcularVariacionInput = z.infer<
  typeof calcularVariacionInputSchema
>;

const IPC_DEFAULT_CODIGO = "0";
const SIPM_DEFAULT_NIVEL = "Nivel general";
const SIPM_DEFAULT_APERTURA = "NG";

function unsupported(dataset: SupportedDatasetId, fields: string[]): never {
  throw new SeriesVariationError(
    "UNSUPPORTED_SELECTOR",
    `Los parámetros ${fields.map((f) => `'${f}'`).join(", ")} no aplican al dataset '${dataset}'. Consulte la descripción de cada parámetro para saber a qué dataset corresponde.`
  );
}

function buildSelection(args: CalcularVariacionInput): SeriesSelection {
  const dataset = args.dataset;

  if (dataset !== "ipc_nacional") {
    const fields = [
      args.region !== undefined ? "region" : undefined,
      args.nivel_ipc !== undefined ? "nivel_ipc" : undefined,
      args.codigo_ipc !== undefined ? "codigo_ipc" : undefined,
    ].filter((field): field is string => field !== undefined);
    if (fields.length > 0) unsupported(dataset, fields);
  }

  if (dataset !== "indice_salarios" && args.sector !== undefined) {
    unsupported(dataset, ["sector"]);
  }

  if (
    dataset !== "icc_precios_construccion" &&
    args.apertura_icc !== undefined
  ) {
    unsupported(dataset, ["apertura_icc"]);
  }

  if (dataset !== "sipm_precios_mayoristas") {
    const fields = [
      args.indicador_sipm !== undefined ? "indicador_sipm" : undefined,
      args.nivel_sipm !== undefined ? "nivel_sipm" : undefined,
      args.apertura_sipm !== undefined ? "apertura_sipm" : undefined,
    ].filter((field): field is string => field !== undefined);
    if (fields.length > 0) unsupported(dataset, fields);
  }

  if (dataset !== "ipi_manufacturero" && dataset !== "ipi_minero") {
    const fields = [
      args.serie_ipi !== undefined ? "serie_ipi" : undefined,
      args.descripcion_ipi !== undefined ? "descripcion_ipi" : undefined,
      args.codigo_ipi !== undefined ? "codigo_ipi" : undefined,
    ].filter((field): field is string => field !== undefined);
    if (fields.length > 0) unsupported(dataset, fields);
  }

  switch (dataset) {
    case "ipc_nacional": {
      const region = args.region ?? "Nacional";
      const nivel = args.nivel_ipc ?? "Nivel General";
      let codigo = IPC_DEFAULT_CODIGO;

      if (nivel === "Nivel General") {
        if (args.codigo_ipc !== undefined && args.codigo_ipc !== "0") {
          throw new SeriesVariationError(
            "UNSUPPORTED_SELECTOR",
            "Para el nivel 'Nivel General' del IPC el código es '0'. Omita 'codigo_ipc' o use '0'."
          );
        }
      } else {
        if (!args.codigo_ipc) {
          throw new SeriesVariationError(
            "UNSUPPORTED_SELECTOR",
            `Para el nivel '${nivel}' del IPC indique 'codigo_ipc' (ej: '01' para Alimentos y bebidas no alcohólicas).`
          );
        }
        codigo = args.codigo_ipc;
      }

      return {
        dataset,
        label: `IPC - ${region} - ${nivel}${nivel === "Nivel General" ? "" : ` (${codigo})`}`,
        filters: [
          { columna: "region", operador: "eq", valor: region },
          { columna: "nivel", operador: "eq", valor: nivel },
          { columna: "codigo", operador: "eq", valor: codigo },
        ],
        indexLiteral: "Indice",
        officialVariationLiteral: "v_ia",
        officialAccumulatedLiteral: "v_acum",
        observationsColumn: "observaciones",
      };
    }

    case "indice_salarios": {
      const sector = resolveSalarioSector(args.sector ?? "Nivel general");
      if (!sector) {
        throw new SeriesVariationError(
          "UNSUPPORTED_SELECTOR",
          `Sector '${args.sector}' no válido. Use: ${SALARIO_SECTOR_LABELS.join(", ")}.`
        );
      }

      return {
        dataset,
        label: `Índice de salarios - ${sector}`,
        filters: [{ columna: "descripcion", operador: "eq", valor: sector }],
        indexLiteral: "Indice",
        officialVariationLiteral: "v_ia",
        officialAccumulatedLiteral: "v_acum",
        observationsColumn: "observaciones",
      };
    }

    case "icc_precios_construccion": {
      const apertura = resolveIccApertura(args.apertura_icc ?? "Nivel general");
      if (!apertura) {
        throw new SeriesVariationError(
          "UNSUPPORTED_SELECTOR",
          `Apertura '${args.apertura_icc}' no válida para el ICC.`
        );
      }

      return {
        dataset,
        label: `ICC - ${apertura}`,
        filters: [{ columna: "descripcion", operador: "eq", valor: apertura }],
        indexLiteral: "Indice",
        officialVariationLiteral: "v_ia",
        officialAccumulatedLiteral: "v_acum",
        observationsColumn: "observaciones",
      };
    }

    case "sipm_precios_mayoristas": {
      const indicador = resolveSipmIndicador(args.indicador_sipm ?? "IPIM");
      if (!indicador) {
        throw new SeriesVariationError(
          "UNSUPPORTED_SELECTOR",
          `Indicador '${args.indicador_sipm}' no válido. Use: ${SIPM_INDICADOR_LABELS.join(", ")}.`
        );
      }

      const nivel = args.nivel_sipm ?? SIPM_DEFAULT_NIVEL;
      const apertura = args.apertura_sipm ?? SIPM_DEFAULT_APERTURA;

      return {
        dataset,
        label: `SIPM ${indicador} - ${nivel}${apertura === SIPM_DEFAULT_APERTURA ? "" : ` (${apertura})`}`,
        filters: [
          { columna: "indicador", operador: "eq", valor: indicador },
          { columna: "nivel", operador: "eq", valor: nivel },
          { columna: "codigo_apertura", operador: "eq", valor: apertura },
        ],
        indexLiteral: "Indice",
        officialVariationLiteral: "v_ia",
        officialAccumulatedLiteral: "v_acum",
        observationsColumn: "observaciones",
      };
    }

    case "ipi_manufacturero":
    case "ipi_minero": {
      const serieLiteral = resolveIpiSerie(
        dataset,
        args.serie_ipi ?? "original"
      );
      if (!serieLiteral) {
        throw new SeriesVariationError(
          "UNSUPPORTED_SELECTOR",
          `Serie '${args.serie_ipi}' no válida. Use 'original', 'desestacionalizada' o 'tendencia-ciclo'.`
        );
      }

      const defaultDescripcion =
        dataset === "ipi_manufacturero"
          ? "IPI Manufacturero - Nivel general"
          : "Nivel General - IPI Minero";
      const descripcion = args.descripcion_ipi ?? defaultDescripcion;

      const filters: FilterInput[] = [
        { columna: "descripcion", operador: "eq", valor: descripcion },
        { columna: "serie", operador: "eq", valor: serieLiteral },
      ];

      if (args.codigo_ipi !== undefined) {
        filters.push({
          columna:
            dataset === "ipi_manufacturero"
              ? "codigo_CLaNAE_2004"
              : "codigo_ClaNAE_2010",
          operador: "eq",
          valor: args.codigo_ipi,
        });
      }

      return {
        dataset,
        label: `${dataset === "ipi_manufacturero" ? "IPI Manufacturero" : "IPI Minero"} - ${descripcion} (${serieLiteral})`,
        filters,
        indexLiteral: "Índice",
        officialVariationLiteral: "Variación interanual",
      };
    }
  }
}

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatIndex(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatPct(value: number): string {
  return `${formatNumber(value, 2)}%`;
}

/** Número sin decimales forzados, hasta 4 decimales. */
function formatValue(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatAmount(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function handleIndecCalcularVariacion(
  args: CalcularVariacionInput,
  ctx: ToolContext
) {
  if (!ctx.client.hasToken()) {
    return errorResult(AUTH_ERROR_MESSAGE);
  }

  try {
    let meses: number;
    try {
      meses = monthsBetween(args.desde, args.hasta);
    } catch (err: unknown) {
      return errorResult(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (meses === 0) {
      return errorResult(
        `Error: 'desde' (${args.desde}) debe ser anterior a 'hasta' (${args.hasta}).`
      );
    }

    if (args.monto === undefined && args.rezago_meses !== undefined) {
      return errorResult(
        "Error: 'rezago_meses' solo aplica cuando se indica 'monto'."
      );
    }

    const selection = buildSelection(args);
    const result = await computeSeriesVariation(ctx, selection, {
      desde: args.desde,
      hasta: args.hasta,
      monto: args.monto,
      rezagoMeses: args.rezago_meses,
    });

    const lines: string[] = [
      `# Variación calculada: ${result.label}`,
      "",
      `- **Dataset:** \`${result.dataset}\``,
      `- **Período inicial:** ${result.desde} (índice ${formatIndex(result.indiceInicial)})`,
      `- **Período final:** ${result.hasta} (índice ${formatIndex(result.indiceFinal)})`,
      `- **Meses transcurridos:** ${result.meses}`,
      `- **Variación acumulada:** **${formatPct(result.variacionAcumulada)}**`,
      `- **Variación anualizada:** ${formatPct(result.variacionAnualizada)}`,
      `- **Promedio mensual (geométrico):** ${formatPct(result.promedioMensual)}`,
    ];

    if (
      result.monto !== undefined &&
      result.montoActualizado !== undefined &&
      result.periodoEfectivoMonto !== undefined
    ) {
      const rezago = result.rezagoMeses ?? 0;
      const rezagoTexto =
        rezago === 0
          ? ""
          : ` con rezago de ${rezago} mes(es); período efectivo ${result.periodoEfectivoDesde} al ${result.periodoEfectivoMonto}`;
      lines.push(
        `- **Monto actualizado:** ${formatAmount(result.montoActualizado)} (monto original ${formatAmount(result.monto)}, variación ${formatPct(result.variacionMonto ?? 0)}${rezagoTexto})`
      );
    }

    const verificacion = result.verificacionOficial;
    if (verificacion.disponible) {
      lines.push(
        `- **Verificación oficial:** ${verificacion.tipo} ${verificacion.periodo} = ${formatValue(verificacion.valorOficial)}% (calculado ${formatValue(verificacion.valorCalculado)}%; diferencia ${formatNumber(verificacion.diferenciaPp, 4)} pp) ${verificacion.coincide ? "✅" : "⚠️"}`
      );
    } else {
      lines.push(
        `- **Verificación oficial:** no disponible para este tramo. ${verificacion.motivo}`
      );
    }

    if (result.observaciones.length > 0) {
      lines.push(
        `- **Observaciones de la fuente:** ${result.observaciones.join("; ")}`
      );
    }

    if (result.advertencias.length > 0) {
      lines.push("", "## Advertencias");
      for (const advertencia of result.advertencias) {
        lines.push(`> ⚠️ ${advertencia}`);
      }
    }

    if (args.mostrar_serie) {
      lines.push(
        "",
        "## Serie mensual usada",
        "",
        "| Período | Índice | Variación mensual |",
        "| --- | ---: | ---: |"
      );
      for (const point of result.serieMensual) {
        lines.push(
          `| ${point.periodo} | ${formatIndex(point.valor)} | ${point.variacionMensual === null ? "—" : formatPct(point.variacionMensual)} |`
        );
      }
    }

    const jsonPayload = {
      dataset: result.dataset,
      serie: result.label,
      filtros: result.filters,
      desde: result.desde,
      hasta: result.hasta,
      meses: result.meses,
      indiceInicial: result.indiceInicial,
      indiceFinal: result.indiceFinal,
      variacionAcumulada: result.variacionAcumulada,
      variacionAnualizada: result.variacionAnualizada,
      promedioMensual: result.promedioMensual,
      monto: result.monto,
      montoActualizado: result.montoActualizado,
      periodoEfectivoDesde: result.periodoEfectivoDesde,
      periodoEfectivoMonto: result.periodoEfectivoMonto,
      variacionMonto: result.variacionMonto,
      rezagoMeses: result.rezagoMeses,
      observaciones: result.observaciones,
      verificacionOficial: result.verificacionOficial,
      advertencias: result.advertencias,
      ...(args.mostrar_serie ? { serieMensual: result.serieMensual } : {}),
    };

    lines.push("", jsonBlock(jsonPayload), "", sourceLine(result.dataset));

    return textResult(lines.join("\n"));
  } catch (err: unknown) {
    if (err instanceof SeriesVariationError) {
      return errorResult(`Error: ${err.message}`);
    }
    if (err instanceof VariationMathError) {
      return errorResult(`Error de cálculo: ${err.message}`);
    }
    return formatQueryError(err, args.dataset);
  }
}
