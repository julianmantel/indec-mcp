import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Container } from "./container.js";
import type { ToolContext } from "./tools/context.js";
import {
  handleIndecStatus,
  handleIndecListDatasets,
  handleIndecDescribeDataset,
  listDatasetsInputSchema,
  describeDatasetInputSchema,
  statusInputSchema,
} from "./tools/meta.js";
import {
  handleIndecQueryDataset,
  handleIndecCountRows,
  queryDatasetInputSchema,
  countRowsInputSchema,
} from "./tools/query.js";
import { handleIndecGetIpc, getIpcInputSchema } from "./tools/curated/ipc.js";
import {
  handleIndecGetEmae,
  getEmaeInputSchema,
} from "./tools/curated/emae.js";
import {
  handleIndecGetCanastas,
  getCanastasInputSchema,
} from "./tools/curated/canastas.js";
import {
  handleIndecGetCanastaCrianza,
  getCanastaCrianzaInputSchema,
} from "./tools/curated/canasta-crianza.js";
import {
  handleIndecGetMercadoTrabajo,
  getMercadoTrabajoInputSchema,
} from "./tools/curated/mercado-trabajo.js";
import {
  handleIndecGetPobreza,
  getPobrezaInputSchema,
} from "./tools/curated/pobreza.js";
import {
  handleIndecGetSalarios,
  getSalariosInputSchema,
} from "./tools/curated/salarios.js";
import {
  handleIndecCalcularVariacion,
  calcularVariacionInputSchema,
} from "./tools/curated/calcular-variacion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Techo de elementos crudos (claves y valores anidados) aceptados en los
 * argumentos de una tool. El SDK lo evalúa ANTES de la validación con zod,
 * por lo que un payload gigantesco (p. ej. miles de `filters`) se rechaza
 * temprano sin acumular issues en memoria.
 */
export const MAX_TOOL_INPUT_ELEMENTS = 5_000;

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, "../package.json"), "utf8")
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    console.error(
      "No se pudo leer la versión desde package.json; se usa 0.0.0."
    );
    return "0.0.0";
  }
}

export interface ServerOptions {
  container: Container;
  snapshotPath?: string;
}

export function createMcpServer(options: ServerOptions): McpServer {
  const server = new McpServer(
    {
      name: "indec-mcp",
      version: readPackageVersion(),
    },
    { maxToolInputElements: MAX_TOOL_INPUT_ELEMENTS }
  );

  const toolContext: ToolContext = {
    ...options.container,
    snapshotPath: options.snapshotPath,
  };

  // 1. indec_status
  server.registerTool(
    "indec_status",
    {
      title: "Estado del servidor y conexión con API INDEC",
      description:
        "Muestra si INDEC_API_TOKEN está configurado en el entorno, la URL base y verifica si el spec OpenAPI público de la API del INDEC cambió respecto al snapshot local. No requiere token.",
      inputSchema: statusInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      return handleIndecStatus(toolContext);
    }
  );

  // 2. indec_list_datasets
  server.registerTool(
    "indec_list_datasets",
    {
      title: "Listar catálogo de datasets del INDEC",
      description:
        "Devuelve el catálogo de datasets estadísticos oficiales disponibles en la API del INDEC (Argentina), con su identificador (id), área temática, frecuencia de actualización y resumen. Permite filtrar por área, periodicidad o término de búsqueda. No requiere token. Es el punto de partida recomendado antes de describir o consultar un dataset.",
      inputSchema: listDatasetsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecListDatasets(args, toolContext);
    }
  );

  // 3. indec_describe_dataset
  server.registerTool(
    "indec_describe_dataset",
    {
      title: "Describir estructura y columnas de un dataset del INDEC",
      description:
        "Devuelve el esquema detallado de un dataset: nombres exactos de columnas, tipos de datos, si aceptan valores nulos, claves primarias de ordenamiento y dimensiones temporales para filtrar. No requiere token. Siempre use esta tool antes de armar consultas con indec_query_dataset.",
      inputSchema: describeDatasetInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecDescribeDataset(args, toolContext);
    }
  );

  // 4. indec_query_dataset
  server.registerTool(
    "indec_query_dataset",
    {
      title: "Consultar datos de un dataset del INDEC",
      description:
        "Realiza consultas genéricas con filtrado estilo PostgREST sobre cualquier dataset del INDEC. Permite seleccionar columnas (select), filtrar por valores y operadores (eq, neq, gt, gte, lt, lte, like, ilike, in, is), ordenar (order) y paginar con limit (default 50, máx 1000) y offset. Requiere INDEC_API_TOKEN.",
      inputSchema: queryDatasetInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecQueryDataset(args, toolContext);
    }
  );

  // 5. indec_count_rows
  server.registerTool(
    "indec_count_rows",
    {
      title: "Contar cantidad total exacta de filas en un dataset",
      description:
        "Obtiene el total exacto de filas disponibles en un dataset del INDEC (o de aquellas que cumplan los filtros indicados), utilizando el encabezado 'Prefer: count=exact' sin transferir el conjunto de datos completo. Requiere INDEC_API_TOKEN.",
      inputSchema: countRowsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecCountRows(args, toolContext);
    }
  );

  // 6. indec_get_ipc (Tool Curada)
  server.registerTool(
    "indec_get_ipc",
    {
      title: "Consultar IPC e Inflación oficial de Argentina",
      description:
        "Consulta el Índice de Precios al Consumidor (IPC) e inflación oficial de la República Argentina. Permite consultar el nivel general o divisiones por región y tipo de variación (intermensual, interanual, acumulada o número índice). Si no se indican fechas, devuelve únicamente el último período publicado.\n\nEjemplos:\n- Última inflación mensual nacional: {}\n- Inflación mensual de 2024: { desde: '202401', hasta: '202412', tipo_indicador: 'variación intermensual', region: 'Nacional' }\n- Evolución del índice en GBA: { desde: '202301', tipo_indicador: 'índice', region: 'GBA' }",
      inputSchema: getIpcInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetIpc(args, toolContext);
    }
  );

  // 7. indec_get_emae (Tool Curada)
  server.registerTool(
    "indec_get_emae",
    {
      title: "Consultar Estimador Mensual de Actividad Económica (EMAE)",
      description:
        "Consulta el Estimador Mensual de Actividad Económica (EMAE) de Argentina, indicador que anticipa la evolución del PBI. Permite consultar la serie a nivel general (original, desestacionalizada o tendencia-ciclo) o desagregada por sectores de actividad económica (Agricultura, Industria, Comercio, etc.). Si no se especifican fechas, devuelve únicamente el último período publicado.\n\nEjemplos:\n- Última actividad económica nivel general: {}\n- Serie desestacionalizada de 2024: { desde: '202401', hasta: '202412', serie: 'desestacionalizada' }\n- Desglose por todos los sectores en el último mes: { desglosar_sectores: true }\n- Actividad del sector industrial: { sector: 'Industria', desde: '202401' }",
      inputSchema: getEmaeInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetEmae(args, toolContext);
    }
  );

  // 8. indec_get_canastas (Tool Curada)
  server.registerTool(
    "indec_get_canastas",
    {
      title:
        "Consultar Canastas Básicas CBA y CBT (Líneas de Pobreza e Indigencia)",
      description:
        "Consulta el valor mensual y variaciones de la Canasta Básica Alimentaria (CBA - línea de indigencia) y Canasta Básica Total (CBT - línea de pobreza) para Gran Buenos Aires. Permite filtrar por canasta (CBA, CBT o ambas), tipo de indicador y rango de fechas. Si no se indican fechas, devuelve únicamente el último período publicado.\n\nEjemplos:\n- Último valor de ambas canastas: {}\n- Solo canasta alimentaria (CBA): { canasta: 'CBA' }\n- Evolución de la línea de pobreza (CBT) en 2024: { canasta: 'CBT', desde: '202401', hasta: '202412' }",
      inputSchema: getCanastasInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetCanastas(args, toolContext);
    }
  );

  // 9. indec_get_canasta_crianza (Tool Curada)
  server.registerTool(
    "indec_get_canasta_crianza",
    {
      title:
        "Consultar Canasta de Crianza oficial (Bienes y Cuidados por Edad)",
      description:
        "Consulta el costo mensual oficial de la canasta de crianza (bienes y servicios + costo del cuidado), utilizada frecuentemente como referencia judicial para cuotas alimentarias en Argentina. Desagregada en 4 tramos de edad: menores de 1 año, 1 a 3 años, 4 a 5 años y 6 a 12 años. Si no se indican fechas, devuelve únicamente el último período publicado.\n\nEjemplos:\n- Último costo de crianza para todas las edades: {}\n- Solo totales por tramo de edad en el último mes: { solo_totales: true }\n- Canasta para niñas/niños de 1 a 3 años durante 2024: { tramo_edad: '1_a_3', desde: '202401', hasta: '202412' }",
      inputSchema: getCanastaCrianzaInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetCanastaCrianza(args, toolContext);
    }
  );

  // 10. indec_get_mercado_trabajo (Tool Curada)
  server.registerTool(
    "indec_get_mercado_trabajo",
    {
      title:
        "Consultar Tasas del Mercado de Trabajo (EPH - Empleo y Desocupación)",
      description:
        "Consulta las tasas oficiales de empleo, desocupación, actividad y subocupación de la Encuesta Permanente de Hogares (EPH) del INDEC con frecuencia trimestral. Permite consultar el total nacional (31 aglomerados urbanos) o un aglomerado específico. Si no se indican fechas, devuelve únicamente el último trimestre publicado.\n\nEjemplos:\n- Últimas tasas para el total de 31 aglomerados: {}\n- Evolución de la desocupación en 2024: { anio: 2024 }\n- Tasas en Gran Buenos Aires: { area_geografica: 'Gran Buenos Aires' }\n- Desglose de todos los aglomerados del último trimestre: { todos_aglomerados: true }",
      inputSchema: getMercadoTrabajoInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetMercadoTrabajo(args, toolContext);
    }
  );

  // 11. indec_get_pobreza (Tool Curada)
  server.registerTool(
    "indec_get_pobreza",
    {
      title: "Consultar Incidencia de Pobreza e Indigencia (EPH)",
      description:
        "Consulta las tasas oficiales semestrales de pobreza e indigencia en personas y hogares estimadas a partir de la Encuesta Permanente de Hogares (EPH) del INDEC. Permite consultar el total nacional (31 aglomerados urbanos) o desagregar por aglomerado específico. Si no se indican fechas, devuelve únicamente el último semestre publicado.\n\nEjemplos:\n- Última tasa de pobreza e indigencia nacional: {}\n- Evolución de la pobreza en 2024: { anio: 2024 }\n- Solo tasas en personas para Gran Buenos Aires: { area_geografica: 'Gran Buenos Aires', enfoque: 'personas' }\n- Pobreza en todos los aglomerados del último semestre: { todos_aglomerados: true }",
      inputSchema: getPobrezaInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetPobreza(args, toolContext);
    }
  );

  // 12. indec_get_salarios (Tool Curada)
  server.registerTool(
    "indec_get_salarios",
    {
      title: "Consultar Índice de Salarios oficial de Argentina",
      description:
        "Consulta el Índice de Salarios del INDEC, que estima la evolución de los salarios pagados en la economía. Permite filtrar por sector (privado registrado, público, privado no registrado o total), tipo de indicador (índice, variación intermensual, interanual o acumulada) y rango de fechas. Si no se indican fechas, devuelve únicamente el último período publicado.\n\nEjemplos:\n- Último índice de salarios de todos los sectores: {}\n- Evolución del sector privado registrado en 2023: { desde: '202301', hasta: '202312', sector: 'privado registrado' }\n- Variación interanual del sector público: { tipo_indicador: 'variación interanual', sector: 'público' }\n- Todos los tipos de indicador del último período: { tipo_indicador: 'todos' }",
      inputSchema: getSalariosInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecGetSalarios(args, toolContext);
    }
  );

  // 13. indec_calcular_variacion (Tool Curada)
  server.registerTool(
    "indec_calcular_variacion",
    {
      title: "Calcular variación porcentual de un índice del INDEC",
      description:
        "Calcula en el servidor la variación porcentual entre dos períodos de una serie de números índice del INDEC, de forma determinística y auditable. Devuelve la variación acumulada, la anualizada, el promedio mensual geométrico, opcionalmente un monto actualizado y, si se pide, la serie mensual usada. Compara el resultado con la variación oficial publicada (interanual o acumulada desde diciembre) y advierte si difiere en más de 0,1 pp.\n\nDatasets soportados: 'ipc_nacional' (IPC), 'indice_salarios' (Índice de Salarios), 'icc_precios_construccion' (ICC), 'sipm_precios_mayoristas' (SIPM/IPIM/IPIB/IPP), 'ipi_manufacturero' e 'ipi_minero'.\n\nEjemplos:\n- Inflación acumulada entre dic-2025 y oct-2026: { dataset: 'ipc_nacional', desde: '202512', hasta: '202610' }\n- Actualizar un monto de $1.000.000 por el IPC: { dataset: 'ipc_nacional', desde: '202512', hasta: '202610', monto: 1000000 }\n- Salarios privados registrados en 2025: { dataset: 'indice_salarios', desde: '202501', hasta: '202512', sector: 'Sector privado registrado' }\n- IPI manufacturero serie desestacionalizada con serie mensual: { dataset: 'ipi_manufacturero', desde: '202501', hasta: '202609', serie_ipi: 'desestacionalizada', mostrar_serie: true }",
      inputSchema: calcularVariacionInputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      return handleIndecCalcularVariacion(args, toolContext);
    }
  );

  return server;
}
