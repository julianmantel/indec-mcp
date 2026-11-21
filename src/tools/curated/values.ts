/**
 * Traducción de los valores "amigables" usados por las tools curadas a los
 * valores literales que publica hoy la API del INDEC.
 *
 * La API es PostgREST y los filtros son comparaciones exactas (o `ilike`).
 * Un error de acentuación, contracción o casing produce 0 filas sin error,
 * por eso todas las tools pasan por estas funciones antes de consultar.
 * Los literales fueron verificados contra la API en vivo; ver docs/FIXES.md.
 */

export function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** `tipo_de_indicador` de `ipc_nacional`. */
const IPC_INDICADORES: Record<string, string> = {
  "variacion intermensual": "v_m",
  intermensual: "v_m",
  v_m: "v_m",
  "variacion interanual": "v_ia",
  interanual: "v_ia",
  v_ia: "v_ia",
  "variacion acumulada": "v_acum",
  acumulada: "v_acum",
  v_acum: "v_acum",
  indice: "Indice",
  "indice base diciembre 2016 = 100": "Indice",
  incidencia: "Incidencia_m",
  "incidencia mensual": "Incidencia_m",
  incidencia_m: "Incidencia_m",
  "incidencia interanual": "Incidencia_ia",
  incidencia_ia: "Incidencia_ia",
  "incidencia acumulada": "Incidencia_acum",
  incidencia_acum: "Incidencia_acum",
  "precio promedio": "Precio promedio",
};

export function resolveIpcIndicador(value: string): string {
  return IPC_INDICADORES[normalizeLabel(value)] ?? value;
}

const IPC_NIVELES: Record<string, string> = {
  "nivel general": "Nivel General",
  division: "División",
  grupo: "Grupo",
  clase: "Clase",
  categoria: "Categoría",
  producto: "Producto",
};

export function resolveIpcNivel(value: string): string {
  return IPC_NIVELES[normalizeLabel(value)] ?? value;
}

/** `tipo_de_indicador` de `valorizacion_canastas_cba_cbt`. */
const CANASTA_INDICADORES: Record<string, string> = {
  "variacion intermensual": "v_m",
  v_m: "v_m",
  "variacion interanual": "v_ia",
  v_ia: "v_ia",
  cba: "CBA",
  cbt: "CBT",
  ice: "ICE",
  "hogar 1": "Hogar 1",
  "hogar 2": "Hogar 2",
  "hogar 3": "Hogar 3",
};

export interface CanastaIndicadorResolution {
  tipo?: string;
  codigos?: string[];
}

export function resolveCanastaIndicador(
  value: string
): CanastaIndicadorResolution {
  const key = normalizeLabel(value);
  if (key === "todos") return {};
  // "Línea" son los valores de canasta por adulto equivalente: CBA y CBT,
  // no las variaciones ni las canastas por tipo de hogar.
  if (key === "linea") return { codigos: ["CBA", "CBT"] };
  const tipo = CANASTA_INDICADORES[key];
  return tipo ? { tipo } : { tipo: value };
}

/** `tipo_de_indicador` de `indice_salarios`. `undefined` = sin filtro. */
const SALARIO_INDICADORES: Record<string, string> = {
  indice: "Indice",
  "variacion intermensual": "v_m",
  "variacion interanual": "v_ia",
  "variacion acumulada": "v_acum",
  v_m: "v_m",
  v_ia: "v_ia",
  v_acum: "v_acum",
};

export function resolveSalarioIndicador(value: string): string | undefined {
  const key = normalizeLabel(value);
  if (key === "todos") return undefined;
  return SALARIO_INDICADORES[key] ?? value;
}

/**
 * Series del índice de salarios que publican número índice (`tipo_de_indicador=Indice`).
 * Los subsectores públicos aparecen en variaciones, pero no en la serie de índice.
 */
export const SALARIO_SECTOR_LABELS = [
  "Nivel general",
  "Sector privado registrado",
  "Sector público",
  "Total registrado",
  "Total no registrado",
] as const;

const SALARIO_SECTORES: Record<string, string> = {
  "nivel general": "Nivel general",
  "sector privado registrado": "Sector privado registrado",
  "privado registrado": "Sector privado registrado",
  "sector publico": "Sector público",
  publico: "Sector público",
  "total registrado": "Total registrado",
  "total no registrado": "Total no registrado",
};

export function resolveSalarioSector(value: string): string | undefined {
  return SALARIO_SECTORES[normalizeLabel(value)];
}

/** Aperturas del ICC que publican número índice. */
export const ICC_APERTURA_LABELS = [
  "Nivel general",
  "Materiales",
  "Mano de obra",
  "Gastos generales",
  "Movimiento de tierra",
  "Estructura",
  "Albañilería",
  "Yesería",
  "Instalación sanitaria y contraincendios",
  "Instalación de gas",
  "Instalación eléctrica",
  "Carpintería metálica y herrería",
  "Carpintería de madera",
  "Ascensores",
  "Vidrios",
  "Pintura",
  "Otros trabajos y gastos",
] as const;

const ICC_APERTURAS: Record<string, string> = Object.fromEntries(
  ICC_APERTURA_LABELS.map((label) => [normalizeLabel(label), label])
);

export function resolveIccApertura(value: string): string | undefined {
  return ICC_APERTURAS[normalizeLabel(value)];
}

export const SIPM_INDICADOR_LABELS = ["IPIM", "IPIB", "IPP"] as const;

const SIPM_INDICADORES: Record<string, string> = Object.fromEntries(
  SIPM_INDICADOR_LABELS.map((label) => [normalizeLabel(label), label])
);

export function resolveSipmIndicador(value: string): string | undefined {
  return SIPM_INDICADORES[normalizeLabel(value)];
}

export type IpiSerie = "original" | "desestacionalizada" | "tendencia-ciclo";

/**
 * Los literales de `serie` cambian de casing entre los dos datasets del IPI:
 * manufacturero usa minúsculas y minero usa mayúsculas iniciales.
 */
export function resolveIpiSerie(
  dataset: "ipi_manufacturero" | "ipi_minero",
  value: string
): string | undefined {
  const key = normalizeLabel(value);
  let serie: IpiSerie | undefined;

  if (key.includes("desestacional")) {
    serie = "desestacionalizada";
  } else if (key.includes("tendencia")) {
    serie = "tendencia-ciclo";
  } else if (key.includes("original")) {
    serie = "original";
  }

  if (!serie) return undefined;

  if (dataset === "ipi_minero") {
    return {
      original: "Serie Original",
      desestacionalizada: "Serie Desestacionalizada",
      "tendencia-ciclo": "Serie Tendencia-Ciclo",
    }[serie];
  }

  return {
    original: "Serie original",
    desestacionalizada: "Serie desestacionalizada",
    "tendencia-ciclo": "Serie tendencia-ciclo",
  }[serie];
}

export const EPH_AREA_TOTAL = "T_31_A";
const EPH_AREA_ALIASES = new Set([
  "t_31_a",
  "t31a",
  "total 31 aglomerados urbanos",
  "total de 31 aglomerados urbanos",
  "31 aglomerados urbanos",
  "nacional",
  "total nacional",
]);

export interface EphAreaResolution {
  operador: "eq" | "ilike";
  valor: string;
  warning?: string;
}

export function resolveEphArea(area?: string): EphAreaResolution {
  const trimmed = area?.trim();
  if (!trimmed || EPH_AREA_ALIASES.has(normalizeLabel(trimmed))) {
    return { operador: "eq", valor: EPH_AREA_TOTAL };
  }

  return {
    operador: "ilike",
    valor: `*${trimmed}*`,
    warning: `La API del INDEC solo publica el área '${EPH_AREA_TOTAL}' (total de 31 aglomerados urbanos) en este dataset. El filtro '${trimmed}' puede devolver 0 registros.`,
  };
}

export type EmaeSerie = "original" | "desestacionalizada" | "tendencia-ciclo";
export type EmaeDatasetKind = "general" | "sectores";

export interface EmaeResolution {
  tipo: string;
  descripcion?: string;
  error?: string;
}

/**
 * Resuelve el tipo de indicador y, cuando corresponde, el patrón de
 * `tipo_de_indicador_descripcion` que distingue la serie.
 */
export function resolveEmaeIndicador(
  value: string,
  datasetKind: EmaeDatasetKind,
  serie?: EmaeSerie
): EmaeResolution {
  const key = normalizeLabel(value);
  const soloOriginal = serie !== undefined && serie !== "original";

  if (key === "indice" || key.startsWith("indice base 2004")) {
    return {
      tipo: "Índice base 2004=100",
      descripcion: serie ? `Índice serie ${serie}` : undefined,
    };
  }

  if (
    key === "interanual" ||
    key === "variacion interanual" ||
    key === "variacion porcentual" ||
    key === "variacion porcentual interanual"
  ) {
    if (soloOriginal) {
      return {
        tipo: "",
        error:
          "La variación interanual del EMAE solo se publica para la serie original. No use el parámetro 'serie' con este indicador.",
      };
    }
    return datasetKind === "sectores"
      ? { tipo: "Variación porcentual interanual" }
      : {
          tipo: "Variación porcentual",
          descripcion: "Var % interanual serie original",
        };
  }

  if (key === "intermensual" || key === "variacion intermensual") {
    if (datasetKind === "sectores") {
      return {
        tipo: "",
        error:
          "La tabla de sectores del EMAE no publica variación intermensual. Use 'variación interanual' o 'índice'.",
      };
    }
    return {
      tipo: "Variación porcentual",
      descripcion: `Var % mensual serie ${serie ?? "desestacionalizada"}`,
    };
  }

  return {
    tipo: "",
    error: `Tipo de indicador '${value}' no válido para el EMAE. Use 'índice', 'variación interanual' o 'variación intermensual'.`,
  };
}
