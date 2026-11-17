/**
 * ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO
 * Generado por: scripts/gen-registry.ts
 */

import type { DatasetMetadata } from "./types.js";

export type DatasetId =
  | "ipi_manufacturero"
  | "ipi_minero"
  | "estimaciones_poblacion_departamento_2022_2035"
  | "proyecciones_poblacion_jurisdiccion_2022_2040"
  | "proyecciones_poblacion_nacional_2022_2040"
  | "ipc_nacional"
  | "valorizacion_canastas_cba_cbt"
  | "indice_salarios"
  | "icc_precios_construccion"
  | "redeterminacion_precios_contratos_obras_publicas"
  | "sipm_precios_mayoristas"
  | "estimador-mensual-de-actividad-economica-nivel-general"
  | "estimador-mensual-de-actividad-economica-sectores"
  | "pobreza_eph"
  | "mercado_trabajo_eph"
  | "canasta-crianza"
  | "comercio_exterior_nomenclaturas"
  | "comercio_exterior_exportacion_bienes"
  | "comercio_exterior_importacion_bienes";

export const DATASETS: Record<string, DatasetMetadata> = {
  "ipi_manufacturero": {
    "id": "ipi_manufacturero",
    "endpoint": "/ipi_manufacturero",
    "summary": "Índice de producción industrial manufacturero",
    "description": "Índice de producción industrial manufacturero (IPI manufacturero), nivel general y aperturas por actividad económica, base 2004=100. Incluye las series original, desestacionalizada y tendencia-ciclo, expresadas como números índice y variaciones porcentuales.\n \nEste endpoint contiene información desde enero de 2016.\n \nPara más información, se puede consultar la metodología INDEC N° 31, Metodología del índice de producción industrial manufacturero, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_ipi_manufacturero_2019.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /ipi_manufacturero?order=periodo,indicador,cuadro_web,codigo_CLaNAE_2004,descripcion,serie,tipo_de_indicador&limit=1000&offset=0`\n- **Buscar texto en periodo (contiene 'valor'):**\n                      `GET /ipi_manufacturero?periodo=ilike.*valor*`\n- **Filtrar por anio mayor a 100:**\n                          `GET /ipi_manufacturero?anio=gt.100`\n- **Filtrar por mes mayor a 100:**\n                          `GET /ipi_manufacturero?mes=gt.100`\n- **Buscar texto en indicador (contiene 'valor'):**\n                      `GET /ipi_manufacturero?indicador=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /ipi_manufacturero?select=periodo,anio`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `periodo`, `indicador`, `cuadro_web`, `codigo_CLaNAE_2004`, `descripcion`, `serie`, `tipo_de_indicador`",
    "area": "Dirección de Estadísticas Mineras, Manufactureras, Energéticas y de la Construcción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM para meses",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "cuadro_web",
        "type": "string",
        "description": "Número del cuadro estadístico publicado en el sitio web del INDEC al que corresponde el dato",
        "nullable": false
      },
      {
        "name": "codigo_CLaNAE_2004",
        "type": "string",
        "description": "Código de Clasificación Nacional de Actividades Económicas 2004",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "serie",
        "type": "string",
        "description": "Tipo de serie estadística: original, desestacionalizada o tendencia-ciclo",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o peso promedio",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas.",
        "nullable": true
      }
    ],
    "orderKeys": [
      "periodo",
      "indicador",
      "cuadro_web",
      "codigo_CLaNAE_2004",
      "descripcion",
      "serie",
      "tipo_de_indicador"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "ipi_minero": {
    "id": "ipi_minero",
    "endpoint": "/ipi_minero",
    "summary": "Índice de producción industrial minero",
    "description": "IPI minero nivel general. Series original, desestacionalizada y tendencia-ciclo, base 2016=100. Este endpoint contiene información desde enero de 2017. Para más información, se puede consultar la metodología INDEC N° 41, Índice de producción industrial minero, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_ipi_minero.pdf\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /ipi_minero?order=periodo,anio,mes,indicador,cuadro_web,codigo_ClaNAE_2010,codigo_CPC_2_1,serie,descripcion,tipo_de_indicador,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en periodo (contiene 'valor'):**\n                      `GET /ipi_minero?periodo=ilike.*valor*`\n- **Filtrar por anio mayor a 100:**\n                          `GET /ipi_minero?anio=gt.100`\n- **Filtrar por mes mayor a 100:**\n                          `GET /ipi_minero?mes=gt.100`\n- **Buscar texto en indicador (contiene 'valor'):**\n                      `GET /ipi_minero?indicador=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /ipi_minero?select=periodo,anio`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `periodo`, `anio`, `mes`, `indicador`, `cuadro_web`, `codigo_ClaNAE_2010`, `codigo_CPC_2_1`, `serie`, `descripcion`, `tipo_de_indicador`, `unidad_de_medida`",
    "area": "Dirección de Estadísticas Mineras, Manufactureras, Energéticas y de la Construcción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM para meses",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "cuadro_web",
        "type": "string",
        "description": "Número del cuadro estadístico publicado en el sitio web del INDEC al que corresponde el dato",
        "nullable": false
      },
      {
        "name": "codigo_ClaNAE_2010",
        "type": "string",
        "description": "Código ClaNAE 2010",
        "nullable": false
      },
      {
        "name": "codigo_CPC_2_1",
        "type": "string",
        "description": "Código CPC 2.1",
        "nullable": false
      },
      {
        "name": "serie",
        "type": "string",
        "description": "Tipo de serie estadística: original, desestacionalizada o tendencia-ciclo",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      }
    ],
    "orderKeys": [
      "periodo",
      "anio",
      "mes",
      "indicador",
      "cuadro_web",
      "codigo_ClaNAE_2010",
      "codigo_CPC_2_1",
      "serie",
      "descripcion",
      "tipo_de_indicador",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "estimaciones_poblacion_departamento_2022_2035": {
    "id": "estimaciones_poblacion_departamento_2022_2035",
    "endpoint": "/estimaciones_poblacion_departamento_2022_2035",
    "summary": "Estimaciones de población por departamento y sexo",
    "description": "Estimaciones de población al 1° de julio de cada año calendario, por sexo y departamento, con base en el Censo Nacional de Población, Hogares y Viviendas 2022. Años 2022-2035.   \n\nPara más información, se pueden consultar la siguiente documentación metodológica:  \nhttps://www.indec.gob.ar/ftp/cuadros/publicaciones/estimaciones_departamentos_2022_2035.pdf  \n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /estimaciones_poblacion_departamento_2022_2035?order=departamento_cod,sexo_cod,fecha&limit=1000&offset=0`\n- **Buscar texto en jurisdiccion_cod (contiene 'valor'):**\n                      `GET /estimaciones_poblacion_departamento_2022_2035?jurisdiccion_cod=ilike.*valor*`\n- **Buscar texto en jurisdiccion_nom (contiene 'valor'):**\n                      `GET /estimaciones_poblacion_departamento_2022_2035?jurisdiccion_nom=ilike.*valor*`\n- **Buscar texto en departamento_cod (contiene 'valor'):**\n                      `GET /estimaciones_poblacion_departamento_2022_2035?departamento_cod=ilike.*valor*`\n- **Buscar texto en departamento_nom (contiene 'valor'):**\n                      `GET /estimaciones_poblacion_departamento_2022_2035?departamento_nom=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /estimaciones_poblacion_departamento_2022_2035?select=jurisdiccion_cod,jurisdiccion_nom`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `departamento_cod`, `sexo_cod`, `fecha`",
    "area": "Dirección de Estadísticas Poblacionales",
    "frecuencia": "Anual",
    "columns": [
      {
        "name": "jurisdiccion_cod",
        "type": "string",
        "description": "Código de dos posiciones que identifica a la jurisdicción de la República Argentina",
        "nullable": false
      },
      {
        "name": "jurisdiccion_nom",
        "type": "string",
        "description": "Nombre de la jurisdicción de la República Argentina",
        "nullable": false
      },
      {
        "name": "departamento_cod",
        "type": "string",
        "description": "Código de cinco posiciones que identifica al departamento, partido o comuna. Las dos primeras corresponden a la jurisdicción y las tres restantes al departamento, partido o comuna",
        "nullable": false
      },
      {
        "name": "departamento_nom",
        "type": "string",
        "description": "Nombre del departamento, partido o comuna",
        "nullable": false
      },
      {
        "name": "rmba",
        "type": "string",
        "description": "Indica si la jurisdicción, el departamento o el partido pertenece a la Región Metropolitana de Buenos Aires (RMBA)",
        "nullable": false
      },
      {
        "name": "sexo_cod",
        "type": "string",
        "description": "Código que identifica el sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "sexo_nom",
        "type": "string",
        "description": "Categoría de sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "poblacion",
        "type": "number",
        "description": "Cantidad de habitantes estimada (2022) o proyectada (2023-2040) para la fecha de referencia",
        "nullable": true
      },
      {
        "name": "fecha",
        "type": "string",
        "description": "Año correspondiente a la estimación o proyección de población, referida al 1 de julio",
        "nullable": false
      }
    ],
    "orderKeys": [
      "departamento_cod",
      "sexo_cod",
      "fecha"
    ],
    "dateColumns": [
      "fecha"
    ]
  },
  "proyecciones_poblacion_jurisdiccion_2022_2040": {
    "id": "proyecciones_poblacion_jurisdiccion_2022_2040",
    "endpoint": "/proyecciones_poblacion_jurisdiccion_2022_2040",
    "summary": "Proyecciones de población por jurisdicción, sexo y edad",
    "description": "Estimaciones y proyecciones de población al 1° de julio de cada año calendario, por sexo y grupos de edad, con base en el Censo Nacional de Población, Hogares y Viviendas 2022. Jurisdicciones. Años 2022-2040.   \n\nPara más información, se pueden consultar la siguiente documentación metodológica: https://www.indec.gob.ar/ftp/cuadros/publicaciones/proyecciones_jurisdicciones_2022_2040.pdf\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /proyecciones_poblacion_jurisdiccion_2022_2040?order=jurisdiccion_cod,sexo_cod,edad_cod,fecha&limit=1000&offset=0`\n- **Buscar texto en jurisdiccion_cod (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_jurisdiccion_2022_2040?jurisdiccion_cod=ilike.*valor*`\n- **Buscar texto en jurisdiccion_nom (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_jurisdiccion_2022_2040?jurisdiccion_nom=ilike.*valor*`\n- **Buscar texto en sexo_cod (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_jurisdiccion_2022_2040?sexo_cod=ilike.*valor*`\n- **Buscar texto en sexo_nom (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_jurisdiccion_2022_2040?sexo_nom=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /proyecciones_poblacion_jurisdiccion_2022_2040?select=jurisdiccion_cod,jurisdiccion_nom`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `jurisdiccion_cod`, `sexo_cod`, `edad_cod`, `fecha`",
    "area": "Dirección de Estadísticas Poblacionales",
    "frecuencia": "Anual",
    "columns": [
      {
        "name": "jurisdiccion_cod",
        "type": "string",
        "description": "Código de dos posiciones que identifica a la jurisdicción de la República Argentina",
        "nullable": false
      },
      {
        "name": "jurisdiccion_nom",
        "type": "string",
        "description": "Nombre de la jurisdicción de la República Argentina",
        "nullable": false
      },
      {
        "name": "sexo_cod",
        "type": "string",
        "description": "Código que identifica el sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "sexo_nom",
        "type": "string",
        "description": "Categoría de sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "edad_cod",
        "type": "string",
        "description": "Código que identifica al grupo quinquenal de edad",
        "nullable": false
      },
      {
        "name": "edad_nom",
        "type": "string",
        "description": "Intervalo de edad de cinco años correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "poblacion",
        "type": "number",
        "description": "Cantidad de habitantes estimada (2022) o proyectada (2023-2040) para la fecha de referencia",
        "nullable": true
      },
      {
        "name": "fecha",
        "type": "string",
        "description": "Año correspondiente a la estimación o proyección de población, referida al 1 de julio",
        "nullable": false
      }
    ],
    "orderKeys": [
      "jurisdiccion_cod",
      "sexo_cod",
      "edad_cod",
      "fecha"
    ],
    "dateColumns": [
      "fecha"
    ]
  },
  "proyecciones_poblacion_nacional_2022_2040": {
    "id": "proyecciones_poblacion_nacional_2022_2040",
    "endpoint": "/proyecciones_poblacion_nacional_2022_2040",
    "summary": "Proyecciones nacionales de población por sexo y edad",
    "description": "Estimaciones y proyecciones de población al 1° de julio de cada año calendario, por sexo y edad, con base en el Censo Nacional de Población, Hogares y Viviendas 2022. Total del país. Años 2022-2040.   \n\nPara más información, se pueden consultar la siguiente documentación metodológica: https://www.indec.gob.ar/ftp/cuadros/publicaciones/proyecciones_nacionales_2022_2040.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /proyecciones_poblacion_nacional_2022_2040?order=edad,sexo_cod,fecha&limit=1000&offset=0`\n- **Filtrar por edad mayor a 100:**\n                          `GET /proyecciones_poblacion_nacional_2022_2040?edad=gt.100`\n- **Buscar texto en sexo_cod (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_nacional_2022_2040?sexo_cod=ilike.*valor*`\n- **Buscar texto en sexo_nom (contiene 'valor'):**\n                      `GET /proyecciones_poblacion_nacional_2022_2040?sexo_nom=ilike.*valor*`\n- **Filtrar por poblacion mayor a 100:**\n                          `GET /proyecciones_poblacion_nacional_2022_2040?poblacion=gt.100`\n- **Seleccionar columnas específicas:**\n                  `GET /proyecciones_poblacion_nacional_2022_2040?select=edad,sexo_cod`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `edad`, `sexo_cod`, `fecha`",
    "area": "Dirección de Estadísticas Poblacionales",
    "frecuencia": "Anual",
    "columns": [
      {
        "name": "edad",
        "type": "number",
        "description": "Edad de las personas, expresada en años cumplidos",
        "nullable": false
      },
      {
        "name": "sexo_cod",
        "type": "string",
        "description": "Código que identifica al sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "sexo_nom",
        "type": "string",
        "description": "Categoría de sexo registrado al nacer",
        "nullable": false
      },
      {
        "name": "poblacion",
        "type": "number",
        "description": "Cantidad de habitantes estimada (2022) o proyectada (2023-2040) para la fecha de referencia",
        "nullable": true
      },
      {
        "name": "fecha",
        "type": "number",
        "description": "Año correspondiente a la estimación o proyección de población, referida al 1 de julio",
        "nullable": false
      }
    ],
    "orderKeys": [
      "edad",
      "sexo_cod",
      "fecha"
    ],
    "dateColumns": [
      "fecha"
    ]
  },
  "ipc_nacional": {
    "id": "ipc_nacional",
    "endpoint": "/ipc_nacional",
    "summary": "Índice de Precios al Consumidor (IPC)",
    "description": "Índice de precios al consumidor (IPC) de la República Argentina, con aperturas por región, división, grupo, clase y subclase, desde diciembre de 2016.\nPara más información, se puede consultar la metodología INDEC N° 32, Índice de precios al consumidor (IPC). Base diciembre 2016=100, a través del siguiente enlace:\nhttps://www.indec.gob.ar/ftp/cuadros/economia/metodologia_ipc_nacional_2019.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /ipc_nacional?order=clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en clasificador (contiene 'valor'):**\n                      `GET /ipc_nacional?clasificador=ilike.*valor*`\n- **Buscar texto en nivel (contiene 'valor'):**\n                      `GET /ipc_nacional?nivel=ilike.*valor*`\n- **Buscar texto en codigo (contiene 'valor'):**\n                      `GET /ipc_nacional?codigo=ilike.*valor*`\n- **Buscar texto en descripcion (contiene 'valor'):**\n                      `GET /ipc_nacional?descripcion=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /ipc_nacional?select=clasificador,nivel`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `clasificador`, `nivel`, `codigo`, `descripcion`, `periodo`, `anio`, `mes`, `indicador`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `region`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de Consumo",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "codigo",
        "type": "string",
        "description": "Código asignado a la categoría de acuerdo con el clasificador utilizado",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "region",
        "type": "string",
        "description": "Región estadística a la que corresponde el dato",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "clasificador",
      "nivel",
      "codigo",
      "descripcion",
      "periodo",
      "anio",
      "mes",
      "indicador",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "region",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "valorizacion_canastas_cba_cbt": {
    "id": "valorizacion_canastas_cba_cbt",
    "endpoint": "/valorizacion_canastas_cba_cbt",
    "summary": "Valorización de las canastas básicas (CBA y CBT)",
    "description": "Valorización mensual de la canasta básica alimentaria (CBA) y de la canasta básica total (CBT) desde abril de 2016. Gran Buenos Aires.\nPara más información, se puede consultar la metodología INDEC N° 22, La medición de la pobreza y la indigencia en la Argentina, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/sociedad/EPH_metodologia_22_pobreza.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /valorizacion_canastas_cba_cbt?order=clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en clasificador (contiene 'valor'):**\n                      `GET /valorizacion_canastas_cba_cbt?clasificador=ilike.*valor*`\n- **Buscar texto en nivel (contiene 'valor'):**\n                      `GET /valorizacion_canastas_cba_cbt?nivel=ilike.*valor*`\n- **Buscar texto en codigo (contiene 'valor'):**\n                      `GET /valorizacion_canastas_cba_cbt?codigo=ilike.*valor*`\n- **Buscar texto en descripcion (contiene 'valor'):**\n                      `GET /valorizacion_canastas_cba_cbt?descripcion=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /valorizacion_canastas_cba_cbt?select=clasificador,nivel`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `clasificador`, `nivel`, `codigo`, `descripcion`, `periodo`, `anio`, `mes`, `indicador`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `region`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de Consumo",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "codigo",
        "type": "string",
        "description": "Código asignado a la categoría de acuerdo con el clasificador utilizado",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "region",
        "type": "string",
        "description": "Región estadística a la que corresponde el dato",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "clasificador",
      "nivel",
      "codigo",
      "descripcion",
      "periodo",
      "anio",
      "mes",
      "indicador",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "region",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "indice_salarios": {
    "id": "indice_salarios",
    "endpoint": "/indice_salarios",
    "summary": "Índice de salarios",
    "description": "El índice de salarios estima la evolución de los salarios pagados en la economía aislando el indicador de variaciones relacionadas con conceptos tales como la cantidad de horas trabajadas, descuentos por ausentismo, premios por productividad y todo otro concepto asociado al desempeño o a las características de los individuos concretos.\n \nLa serie muestra la evolución de los salarios pagados en los sectores privado registrado y público desde noviembre de 2015. A partir de octubre de 2016 se incorporó la serie del sector privado no registrado y el cálculo del índice de salarios total, que resulta de la agregación de los índices de salarios de los componentes mencionados.\n \nPara más información, se puede consultar la metodología INDEC N° 16, Índice de salarios y coeficiente de variación salarial, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/sociedad/cvs_metodologia.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /indice_salarios?order=clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en clasificador (contiene 'valor'):**\n                      `GET /indice_salarios?clasificador=ilike.*valor*`\n- **Buscar texto en nivel (contiene 'valor'):**\n                      `GET /indice_salarios?nivel=ilike.*valor*`\n- **Buscar texto en codigo (contiene 'valor'):**\n                      `GET /indice_salarios?codigo=ilike.*valor*`\n- **Buscar texto en descripcion (contiene 'valor'):**\n                      `GET /indice_salarios?descripcion=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /indice_salarios?select=clasificador,nivel`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `clasificador`, `nivel`, `codigo`, `descripcion`, `periodo`, `anio`, `mes`, `indicador`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de la Producción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "codigo",
        "type": "string",
        "description": "Código asignado a la categoría de acuerdo con el clasificador utilizado",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "clasificador",
      "nivel",
      "codigo",
      "descripcion",
      "periodo",
      "anio",
      "mes",
      "indicador",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "icc_precios_construccion": {
    "id": "icc_precios_construccion",
    "endpoint": "/icc_precios_construccion",
    "summary": "Índice del costo de la construcción",
    "description": "Índice del costo de la construcción (ICC) en el Gran Buenos Aires, base 1993. \nEste endpoint contiene información desde noviembre de 2015.\nPara más información, se puede consultar la metodología INDEC N°  9, Índice del Costo de la Construcción en el Gran Buenos Aires, base 1993, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_icc.pdf \n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /icc_precios_construccion?order=indicador,codigo_apertura,codigo_CPC_1,clasificador,nivel,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en indicador (contiene 'valor'):**\n                      `GET /icc_precios_construccion?indicador=ilike.*valor*`\n- **Buscar texto en codigo_apertura (contiene 'valor'):**\n                      `GET /icc_precios_construccion?codigo_apertura=ilike.*valor*`\n- **Buscar texto en codigo_CPC_1 (contiene 'valor'):**\n                      `GET /icc_precios_construccion?codigo_CPC_1=ilike.*valor*`\n- **Buscar texto en clasificador (contiene 'valor'):**\n                      `GET /icc_precios_construccion?clasificador=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /icc_precios_construccion?select=indicador,codigo_apertura`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `indicador`, `codigo_apertura`, `codigo_CPC_1`, `clasificador`, `nivel`, `descripcion`, `periodo`, `anio`, `mes`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `region`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de la Producción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "codigo_apertura",
        "type": "string",
        "description": "Código que identifica el nivel de apertura o desagregación del dato",
        "nullable": false
      },
      {
        "name": "codigo_CPC_1",
        "type": "string",
        "description": "Código de la Clasificación Central Provisional de Productos (CPC) elaborada por la Organización de las Naciones Unidas.",
        "nullable": false
      },
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "region",
        "type": "string",
        "description": "Región estadística a la que corresponde el dato",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "indicador",
      "codigo_apertura",
      "codigo_CPC_1",
      "clasificador",
      "nivel",
      "descripcion",
      "periodo",
      "anio",
      "mes",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "region",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "redeterminacion_precios_contratos_obras_publicas": {
    "id": "redeterminacion_precios_contratos_obras_publicas",
    "endpoint": "/redeterminacion_precios_contratos_obras_publicas",
    "summary": "Redeterminación de precios de obras públicas",
    "description": "Aperturas del índice del costo de la construcción (ICC) y del índice de precios internos básicos al por mayor (IPIB) utilizadas para la redeterminación periódica de precios de contratos de obra pública, según el Decreto 1295/2002.\nTambién incluye indicadores requeridos por el Decreto 634/2003, relativo a las Ampliaciones de Transporte de Energía Eléctrica en Alta Tensión y por Distribución Troncal.\nEste endpoint contiene información desde diciembre de 2015.\nPara más información, se puede consultar la información disponible en el sitio web del INDEC :https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-112\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /redeterminacion_precios_contratos_obras_publicas?order=indicador,operativo,inciso,descripcion_inciso,codigo_apertura,clasificador,nivel,descripcion,origen,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en indicador (contiene 'valor'):**\n                      `GET /redeterminacion_precios_contratos_obras_publicas?indicador=ilike.*valor*`\n- **Buscar texto en operativo (contiene 'valor'):**\n                      `GET /redeterminacion_precios_contratos_obras_publicas?operativo=ilike.*valor*`\n- **Buscar texto en inciso (contiene 'valor'):**\n                      `GET /redeterminacion_precios_contratos_obras_publicas?inciso=ilike.*valor*`\n- **Buscar texto en descripcion_inciso (contiene 'valor'):**\n                      `GET /redeterminacion_precios_contratos_obras_publicas?descripcion_inciso=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /redeterminacion_precios_contratos_obras_publicas?select=indicador,operativo`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `indicador`, `operativo`, `inciso`, `descripcion_inciso`, `codigo_apertura`, `clasificador`, `nivel`, `descripcion`, `origen`, `periodo`, `anio`, `mes`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `region`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de la Producción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "operativo",
        "type": "string",
        "description": "Operativo estadístico del que proviene el dato",
        "nullable": false
      },
      {
        "name": "inciso",
        "type": "string",
        "description": "Código o denominación abreviada del inciso correspondiente al artículo 15 del Decreto 1295/2002",
        "nullable": false
      },
      {
        "name": "descripcion_inciso",
        "type": "string",
        "description": "Denominación del inciso correspondiente al artículo 15 del Decreto 1295/2002",
        "nullable": false
      },
      {
        "name": "codigo_apertura",
        "type": "string",
        "description": "Código que identifica el nivel de apertura o desagregación del dato",
        "nullable": false
      },
      {
        "name": "codigo_CPC_1",
        "type": "string",
        "description": "Código de la Clasificación Central Provisional de Productos (CPC) elaborada por la Organización de las Naciones Unidas.",
        "nullable": true
      },
      {
        "name": "codigo_CIUU_3",
        "type": "string",
        "description": "Código de la Clasificación Industrial Internacional Uniforme (CIIU), revisión 3",
        "nullable": true
      },
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "origen",
        "type": "string",
        "description": "Origen nacional o importado del producto de referencia",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "region",
        "type": "string",
        "description": "Región estadística a la que corresponde el dato",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "indicador",
      "operativo",
      "inciso",
      "descripcion_inciso",
      "codigo_apertura",
      "clasificador",
      "nivel",
      "descripcion",
      "origen",
      "periodo",
      "anio",
      "mes",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "region",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "sipm_precios_mayoristas": {
    "id": "sipm_precios_mayoristas",
    "endpoint": "/sipm_precios_mayoristas",
    "summary": "Sistema de índices de precios mayoristas",
    "description": "El Sistema de índices de precios mayoristas (SIPM) está compuesto por el índice de precios internos al por mayor (IPIM), el índice de precios internos básicos al por mayor (IPIB) y el índice de precios básicos del productor (IPP). Este endpoint contiene información desde diciembre de 2015.\nPara más información, se puede consultar la metodología INDEC N° 8, Sistema de Índices de Precios Mayoristas, base 1993, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia1_8_sipm.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /sipm_precios_mayoristas?order=operativo,indicador,clasificador,nivel,codigo_apertura,descripcion,periodo,anio,mes,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida&limit=1000&offset=0`\n- **Buscar texto en operativo (contiene 'valor'):**\n                      `GET /sipm_precios_mayoristas?operativo=ilike.*valor*`\n- **Buscar texto en indicador (contiene 'valor'):**\n                      `GET /sipm_precios_mayoristas?indicador=ilike.*valor*`\n- **Buscar texto en clasificador (contiene 'valor'):**\n                      `GET /sipm_precios_mayoristas?clasificador=ilike.*valor*`\n- **Buscar texto en nivel (contiene 'valor'):**\n                      `GET /sipm_precios_mayoristas?nivel=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /sipm_precios_mayoristas?select=operativo,indicador`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `operativo`, `indicador`, `clasificador`, `nivel`, `codigo_apertura`, `descripcion`, `periodo`, `anio`, `mes`, `tipo_de_indicador`, `tipo_de_indicador_descripcion`, `region`, `unidad_de_medida`",
    "area": "Dirección de Índices de Precios de la Producción",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "operativo",
        "type": "string",
        "description": "Operativo estadístico del que proviene el dato",
        "nullable": false
      },
      {
        "name": "indicador",
        "type": "string",
        "description": "Nombre del indicador estadístico",
        "nullable": false
      },
      {
        "name": "clasificador",
        "type": "string",
        "description": "Clasificador utilizado para organizar y codificar las categorías del dato",
        "nullable": false
      },
      {
        "name": "nivel",
        "type": "string",
        "description": "Nivel de desagregación de la categoría dentro de la estructura del clasificador",
        "nullable": false
      },
      {
        "name": "codigo_apertura",
        "type": "string",
        "description": "Código que identifica el nivel de apertura o desagregación del dato",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o precio promedio",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "region",
        "type": "string",
        "description": "Región estadística a la que corresponde el dato",
        "nullable": false
      },
      {
        "name": "unidad_de_medida",
        "type": "string",
        "description": "Unidad en la que se expresa el valor del indicador",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "operativo",
      "indicador",
      "clasificador",
      "nivel",
      "codigo_apertura",
      "descripcion",
      "periodo",
      "anio",
      "mes",
      "tipo_de_indicador",
      "tipo_de_indicador_descripcion",
      "region",
      "unidad_de_medida"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "estimador-mensual-de-actividad-economica-nivel-general": {
    "id": "estimador-mensual-de-actividad-economica-nivel-general",
    "endpoint": "/estimador-mensual-de-actividad-economica-nivel-general",
    "summary": "Estimador mensual de actividad económica. Nivel general",
    "description": "Estimador mensual de actividad económica (EMAE), nivel general, base 2004=100. Incluye la serie original, desestacionalizada y tendencia-ciclo, expresadas como números índice y variaciones porcentuales.\n\nEste endpoint contiene información desde enero de 2004.\n\nPara más información, se puede consultar la metodología INDEC N° 20, Estimador Mensual de Actividad Económica (EMAE), Base año 2004, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_emae_ago_16.pdf\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /estimador-mensual-de-actividad-economica-nivel-general?order=tipo_de_indicador_descripcion,anio,mes,periodo,tipo_de_indicador&limit=1000&offset=0`\n- **Buscar texto en tipo_de_indicador_descripcion (contiene 'valor'):**\n                      `GET /estimador-mensual-de-actividad-economica-nivel-general?tipo_de_indicador_descripcion=ilike.*valor*`\n- **Filtrar por anio mayor a 100:**\n                          `GET /estimador-mensual-de-actividad-economica-nivel-general?anio=gt.100`\n- **Filtrar por mes mayor a 100:**\n                          `GET /estimador-mensual-de-actividad-economica-nivel-general?mes=gt.100`\n- **Buscar texto en periodo (contiene 'valor'):**\n                      `GET /estimador-mensual-de-actividad-economica-nivel-general?periodo=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /estimador-mensual-de-actividad-economica-nivel-general?select=tipo_de_indicador_descripcion,anio`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `tipo_de_indicador_descripcion`, `anio`, `mes`, `periodo`, `tipo_de_indicador`",
    "area": "Dirección Nacional de Cuentas Nacionales",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "tipo_de_indicador_descripcion",
        "type": "string",
        "description": "Descripción del tipo de indicador",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o peso promedio",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "tipo_de_indicador_descripcion",
      "anio",
      "mes",
      "periodo",
      "tipo_de_indicador"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "estimador-mensual-de-actividad-economica-sectores": {
    "id": "estimador-mensual-de-actividad-economica-sectores",
    "endpoint": "/estimador-mensual-de-actividad-economica-sectores",
    "summary": "Estimador mensual de actividad económica. Sectores",
    "description": "Estimador mensual de actividad económica (EMAE) por sector de actividad económica, base 2004=100 (serie original). Incluye números índice y variaciones porcentuales interanuales para cada sector desde enero de 2004.\n\nPara más información, se puede consultar la metodología INDEC N° 20, Estimador Mensual de Actividad Económica (EMAE), Base año 2004, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_emae_ago_16.pdf\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /estimador-mensual-de-actividad-economica-sectores?order=anio,mes,codigo,descripcion,periodo,tipo_de_indicador&limit=1000&offset=0`\n- **Filtrar por anio mayor a 100:**\n                          `GET /estimador-mensual-de-actividad-economica-sectores?anio=gt.100`\n- **Filtrar por mes mayor a 100:**\n                          `GET /estimador-mensual-de-actividad-economica-sectores?mes=gt.100`\n- **Buscar texto en codigo (contiene 'valor'):**\n                      `GET /estimador-mensual-de-actividad-economica-sectores?codigo=ilike.*valor*`\n- **Buscar texto en descripcion (contiene 'valor'):**\n                      `GET /estimador-mensual-de-actividad-economica-sectores?descripcion=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /estimador-mensual-de-actividad-economica-sectores?select=anio,mes`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `anio`, `mes`, `codigo`, `descripcion`, `periodo`, `tipo_de_indicador`",
    "area": "Dirección Nacional de Cuentas Nacionales",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "codigo",
        "type": "string",
        "description": "Código letra de la Clasificación nacional de actividades económicas 2004 (ClaNAE04)",
        "nullable": false
      },
      {
        "name": "descripcion",
        "type": "string",
        "description": "Denominación de la categoría correspondiente al código informado",
        "nullable": false
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "tipo_de_indicador",
        "type": "string",
        "description": "Tipo de cálculo o presentación del indicador, como índice, variación intermensual, variación interanual, variación acumulada, incidencia o peso promedio",
        "nullable": false
      },
      {
        "name": "valor",
        "type": "number",
        "description": "Valor del indicador para el período y las categorías informadas",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas necesarias para el valor informado",
        "nullable": true
      }
    ],
    "orderKeys": [
      "anio",
      "mes",
      "codigo",
      "descripcion",
      "periodo",
      "tipo_de_indicador"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "mes"
    ]
  },
  "pobreza_eph": {
    "id": "pobreza_eph",
    "endpoint": "/pobreza_eph",
    "summary": "Incidencia de la pobreza y la indigencia (EPH)",
    "description": "Incidencia de la pobreza y la indigencia en hogares y personas a partir de la Encuesta Permanente de Hogares (EPH) para el total de 31 aglomerados urbanos. La información se presenta con frecuencia semestral desde el segundo semestre de 2016.\n\nPara más información, se puede consultar la metodología INDEC N° 22, la medición de la pobreza y la indigencia en la Argentina, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/sociedad/metodologia_eph_continua.pdf . Y se puede acceder a los informes técnicos y datos complementarios en: https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-31-58\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /pobreza_eph?order=area_geografica_nom,periodo&limit=1000&offset=0`\n- **Buscar texto en area_geografica_nom (contiene 'valor'):**\n                      `GET /pobreza_eph?area_geografica_nom=ilike.*valor*`\n- **Filtrar por area_geografica_cod mayor a 100:**\n                          `GET /pobreza_eph?area_geografica_cod=gt.100`\n- **Buscar texto en periodo (contiene 'valor'):**\n                      `GET /pobreza_eph?periodo=ilike.*valor*`\n- **Filtrar por anio mayor a 100:**\n                          `GET /pobreza_eph?anio=gt.100`\n- **Seleccionar columnas específicas:**\n                  `GET /pobreza_eph?select=area_geografica_nom,area_geografica_cod`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `area_geografica_nom`, `periodo`",
    "area": "Dirección Nacional de Estadísticas de Condiciones de Vida",
    "frecuencia": "Semestral",
    "columns": [
      {
        "name": "area_geografica_nom",
        "type": "string",
        "description": "Denominación del área geográfica a la que corresponde el dato.",
        "nullable": false
      },
      {
        "name": "area_geografica_cod",
        "type": "number",
        "description": "Código que identifica el área geográfica a la que corresponde el dato. Ver diseño de registros y estructura para las bases preliminares (hogares y personas) de EPH en https://www.indec.gob.ar/indec/web/Institucional-Indec-BasesDeDatos .",
        "nullable": true
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAANS (número de semestre)",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato.",
        "nullable": false
      },
      {
        "name": "semestre",
        "type": "number",
        "description": "Número del semestre correspondiente al año de referencia. Utiliza los valores 1 (primer semestre) y 2 (segundo semestre).",
        "nullable": false
      },
      {
        "name": "tasa_pobreza_hogares",
        "type": "number",
        "description": "Porcentaje de hogares cuyos ingresos se encuentran por debajo de su respectiva línea de pobreza en relación con el total de hogares.",
        "nullable": true
      },
      {
        "name": "tasa_pobreza_personas",
        "type": "number",
        "description": "Porcentaje de personas que habitan en hogares cuyos ingresos se encuentran por debajo de su respectiva línea de pobreza en relación con el total de personas.",
        "nullable": true
      },
      {
        "name": "tasa_indigencia_hogares",
        "type": "number",
        "description": "Porcentaje de hogares cuyos ingresos se encuentran por debajo de su respectiva línea de indigencia en relación con el total de hogares.",
        "nullable": true
      },
      {
        "name": "tasa_indigencia_personas",
        "type": "number",
        "description": "Porcentaje de personas que habitan en hogares cuyos ingresos se encuentran por debajo de su respectiva línea de indigencia en relación con el total de personas.",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas vinculadas a los valores informados.",
        "nullable": true
      }
    ],
    "orderKeys": [
      "area_geografica_nom",
      "periodo"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "semestre"
    ]
  },
  "mercado_trabajo_eph": {
    "id": "mercado_trabajo_eph",
    "endpoint": "/mercado_trabajo_eph",
    "summary": "Principales tasas del mercado de trabajo (EPH)",
    "description": "Principales tasas del mercado de trabajo estimadas a partir de la Encuesta Permanente de Hogares (EPH), correspondientes al total de 31 aglomerados urbanos. Incluye las tasas de actividad, empleo, empleo formal e informal, desocupación, ocupación demandante de empleo y subocupación. La información se presenta con frecuencia trimestral desde el segundo trimestre de 2016.\nPara más información, se puede consultar la metodología INDEC de la EPH a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/sociedad/metodologia_eph_continua.pdf\nY acceder a informes técnicos y datos complementarios en: https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-31-58 \n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /mercado_trabajo_eph?order=area_geografica_nom,periodo&limit=1000&offset=0`\n- **Buscar texto en area_geografica_nom (contiene 'valor'):**\n                      `GET /mercado_trabajo_eph?area_geografica_nom=ilike.*valor*`\n- **Filtrar por area_geografica_cod mayor a 100:**\n                          `GET /mercado_trabajo_eph?area_geografica_cod=gt.100`\n- **Buscar texto en periodo (contiene 'valor'):**\n                      `GET /mercado_trabajo_eph?periodo=ilike.*valor*`\n- **Filtrar por anio mayor a 100:**\n                          `GET /mercado_trabajo_eph?anio=gt.100`\n- **Seleccionar columnas específicas:**\n                  `GET /mercado_trabajo_eph?select=area_geografica_nom,area_geografica_cod`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `area_geografica_nom`, `periodo`",
    "area": "Dirección Nacional de Estadísticas de Condiciones de Vida",
    "frecuencia": "Trimestral",
    "columns": [
      {
        "name": "area_geografica_nom",
        "type": "string",
        "description": "Denominación del área geográfica a la que corresponde el dato.",
        "nullable": false
      },
      {
        "name": "area_geografica_cod",
        "type": "number",
        "description": "Código que identifica el área geográfica a la que corresponde el dato. Ver diseño de registros y estructura para las bases preliminares (hogares y personas) de EPH en https://www.indec.gob.ar/indec/web/Institucional-Indec-BasesDeDatos .",
        "nullable": true
      },
      {
        "name": "periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAANT (número de trimestre que utiliza valores comprendidos entre 1 Y 4).",
        "nullable": false
      },
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato.",
        "nullable": false
      },
      {
        "name": "trimestre",
        "type": "number",
        "description": "Número del trimestre correspondiente al año de referencia. Utiliza valores comprendidos entre 1 (primer trimestre) y 4 (cuarto trimestre).",
        "nullable": false
      },
      {
        "name": "tasa_de_actividad",
        "type": "number",
        "description": "Porcentaje de la población económicamente activa con respecto a la población total de referencia.",
        "nullable": true
      },
      {
        "name": "tasa_de_empleo",
        "type": "number",
        "description": "Porcentaje de la población ocupada con respecto a la población total de referencia.",
        "nullable": true
      },
      {
        "name": "tasa_de_empleo_formal",
        "type": "number",
        "description": "Porcentaje de la población ocupada con empleo formal con respecto a la población total de referencia.",
        "nullable": true
      },
      {
        "name": "tasa_de_empleo_informal",
        "type": "number",
        "description": "Porcentaje de la población ocupada con empleo informal con respecto a la población total de referencia.",
        "nullable": true
      },
      {
        "name": "tasa_de_desocupacion",
        "type": "number",
        "description": "Porcentaje de la población desocupada con respecto a la población económicamente activa.",
        "nullable": true
      },
      {
        "name": "tasa_de_ocupacion_demandante",
        "type": "number",
        "description": "Porcentaje de la población ocupada que busca activamente otra ocupación con respecto a la población económicamente activa.",
        "nullable": true
      },
      {
        "name": "tasa_de_subocupacion",
        "type": "number",
        "description": "Porcentaje de la población subocupada con respecto a la población económicamente activa.",
        "nullable": true
      },
      {
        "name": "tasa_de_subocupacion_demandante",
        "type": "number",
        "description": "Porcentaje de la población subocupada que busca activamente otra ocupación con respecto a la población económicamente activa.",
        "nullable": true
      },
      {
        "name": "tasa_de_subocupacion_no_demandante",
        "type": "number",
        "description": "Porcentaje de la población subocupada que busca activamente otra ocupación con respecto a la población económicamente activa.",
        "nullable": true
      },
      {
        "name": "observaciones",
        "type": "string",
        "description": "Notas vinculadas a los valores informados.",
        "nullable": true
      }
    ],
    "orderKeys": [
      "area_geografica_nom",
      "periodo"
    ],
    "dateColumns": [
      "periodo",
      "anio",
      "trimestre"
    ]
  },
  "canasta-crianza": {
    "id": "canasta-crianza",
    "endpoint": "/canasta-crianza",
    "summary": "Valorización de la canasta de crianza",
    "description": "Valorización mensual de la canasta de crianza de la primera infancia, la niñez y la adolescencia. Está conformada por el costo de los bienes y servicios, y la valorización del tiempo de cuidado. La estimación se realiza para cuatro tramos de edad: menores de 1 año, de 1 a 3 años, de 4 a 5 años y de 6 a 12 años. \n\nGran Buenos Aires.\n\nEste endpoint contiene información desde enero de 2020. \n\nPara más información sobre la canasta de crianza, se puede consultar el siguiente enlace: https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-43-173\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /canasta-crianza?order=Periodo&limit=1000&offset=0`\n- **Filtrar por anio mayor a 100:**\n                          `GET /canasta-crianza?anio=gt.100`\n- **Filtrar por Mes mayor a 100:**\n                          `GET /canasta-crianza?Mes=gt.100`\n- **Buscar texto en Periodo (contiene 'valor'):**\n                      `GET /canasta-crianza?Periodo=ilike.*valor*`\n- **Filtrar por bys_men1 mayor a 100:**\n                          `GET /canasta-crianza?bys_men1=gt.100`\n- **Seleccionar columnas específicas:**\n                  `GET /canasta-crianza?select=anio,Mes`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `Periodo`",
    "area": "Dirección Nacional de Estadísticas de Condiciones de Vida",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "Mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "Periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "bys_men1",
        "type": "number",
        "description": "Costo mensual de los bienes y servicios incluidos en la canasta de crianza para menores de 1 año, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "cuid_men1",
        "type": "number",
        "description": "Valorización mensual del tiempo de cuidado requerido para menores de 1 año, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "tot_men1",
        "type": "number",
        "description": "Valor mensual total de la canasta de crianza para menores de 1 año, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "bys_1a3",
        "type": "number",
        "description": "Costo mensual de los bienes y servicios incluidos en la canasta de crianza para niñas y niños de 1 a 3 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "cuid_1a3",
        "type": "number",
        "description": "Valorización mensual del tiempo de cuidado requerido para niñas y niños de 1 a 3 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "tot_1a3",
        "type": "number",
        "description": "Valor mensual total de la canasta de crianza para niñas y niños de 1 a 3 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "bys_4a5",
        "type": "number",
        "description": "Costo mensual de los bienes y servicios incluidos en la canasta de crianza para niñas y niños de 4 a 5 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "cuid_4a5",
        "type": "number",
        "description": "Valorización mensual del tiempo de cuidado requerido para niñas y niños de 4 a 5 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "tot_4a5",
        "type": "number",
        "description": "Valor mensual total de la canasta de crianza para niñas y niños de 4 a 5 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "bys_6a12",
        "type": "number",
        "description": "Costo mensual de los bienes y servicios incluidos en la canasta de crianza para niñas, niños y adolescentes de 6 a 12 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "cuid_6a12",
        "type": "number",
        "description": "Valorización mensual del tiempo de cuidado requerido para niñas, niños y adolescentes de 6 a 12 años, expresado en pesos argentinos",
        "nullable": true
      },
      {
        "name": "tot_6a12",
        "type": "number",
        "description": "Valor mensual total de la canasta de crianza para niñas, niños y adolescentes de 6 a 12 años, expresado en pesos argentinos",
        "nullable": true
      }
    ],
    "orderKeys": [
      "Periodo"
    ],
    "dateColumns": [
      "Periodo",
      "anio",
      "Mes"
    ]
  },
  "comercio_exterior_nomenclaturas": {
    "id": "comercio_exterior_nomenclaturas",
    "endpoint": "/comercio_exterior_nomenclaturas",
    "summary": "Códigos y denominaciones de comercio exterior",
    "description": "Diccionario de códigos y nomenclaturas utilizados en los servicios de datos de comercio exterior de la Dirección Nacional de Estadísticas del Sector Externo y Cuentas Internacionales.\nIncluye los códigos de país, grandes rubros y subrubros de las exportaciones, y los usos económicos y grandes categorías económicas de las importaciones.\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /comercio_exterior_nomenclaturas?order=nombre_columna,codigo&limit=1000&offset=0`\n- **Buscar texto en nombre_columna (contiene 'valor'):**\n                      `GET /comercio_exterior_nomenclaturas?nombre_columna=ilike.*valor*`\n- **Buscar texto en codigo (contiene 'valor'):**\n                      `GET /comercio_exterior_nomenclaturas?codigo=ilike.*valor*`\n- **Buscar texto en codigo_descripcion (contiene 'valor'):**\n                      `GET /comercio_exterior_nomenclaturas?codigo_descripcion=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /comercio_exterior_nomenclaturas?select=nombre_columna,codigo`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `nombre_columna`, `codigo`",
    "area": "Dirección Nacional de Estadísticas del Sector Externo y Cuentas Internacionales",
    "frecuencia": "Estática / Diccionario",
    "columns": [
      {
        "name": "nombre_columna",
        "type": "string",
        "description": "Nombre de la columna de los servicios de datos de comercio exterior en la que se utiliza el código",
        "nullable": false
      },
      {
        "name": "codigo",
        "type": "string",
        "description": "Código utilizado en la columna indicada de los servicios de datos de comercio exterior",
        "nullable": false
      },
      {
        "name": "codigo_descripcion",
        "type": "string",
        "description": "Denominación correspondiente al código informado",
        "nullable": false
      }
    ],
    "orderKeys": [
      "nombre_columna",
      "codigo"
    ],
    "dateColumns": []
  },
  "comercio_exterior_exportacion_bienes": {
    "id": "comercio_exterior_exportacion_bienes",
    "endpoint": "/comercio_exterior_exportacion_bienes",
    "summary": "Exportaciones de bienes por rubros y países de destino",
    "description": "Exportaciones argentinas de bienes por grandes rubros, subrubros y país de destino desde enero de 1986. Incluye el valor FOB expresado en dólares estadounidenses y el peso neto de las mercaderías expresado en kilogramos. \nLa información se presenta con frecuencia mensual. Se aplican criterios de supresión para resguardar el secreto estadístico y la confidencialidad de la información aduanera. El signo convencional “s” indica que se registraron operaciones, pero el número de operadores fue insuficiente para publicar el valor.\n\nPara conocer los códigos de país, rubro y subrubro, se encuentra disponible el servicio de datos llamado “Códigos y nomencladores de comercio exterior” (https://api.indec.gob.ar/v1/comercio_exterior_nomenclaturas).\n\nPara más información, se puede consultar la metodología INDEC N° 26, Metodología de comercio exterior, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_comex.pdf\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /comercio_exterior_exportacion_bienes?order=Anio,Mes,Periodo,rubro_cod,subrubro_cod,pais_cod&limit=1000&offset=0`\n- **Filtrar por Anio mayor a 100:**\n                          `GET /comercio_exterior_exportacion_bienes?Anio=gt.100`\n- **Filtrar por Mes mayor a 100:**\n                          `GET /comercio_exterior_exportacion_bienes?Mes=gt.100`\n- **Buscar texto en Periodo (contiene 'valor'):**\n                      `GET /comercio_exterior_exportacion_bienes?Periodo=ilike.*valor*`\n- **Buscar texto en rubro_cod (contiene 'valor'):**\n                      `GET /comercio_exterior_exportacion_bienes?rubro_cod=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /comercio_exterior_exportacion_bienes?select=Anio,Mes`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `Anio`, `Mes`, `Periodo`, `rubro_cod`, `subrubro_cod`, `pais_cod`",
    "area": "Dirección Nacional de Estadísticas del Sector Externo y Cuentas Internacionales",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "Anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "Mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "Periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "rubro_cod",
        "type": "string",
        "description": "Código que identifica el rubro al que pertenece la exportación",
        "nullable": false
      },
      {
        "name": "subrubro_cod",
        "type": "string",
        "description": "Código de tres posiciones que identifica el subrubro de exportación dentro del rubro correspondiente",
        "nullable": false
      },
      {
        "name": "pais_cod",
        "type": "string",
        "description": "Código que identifica el país de origen de las importaciones o de destino de las exportaciones",
        "nullable": false
      },
      {
        "name": "valor_FOB",
        "type": "number",
        "description": "Valor de las exportaciones a precios FOB, expresado en dólares estadounidenses",
        "nullable": true
      },
      {
        "name": "Peso_Neto",
        "type": "number",
        "description": "Peso neto de los bienes que componen el rubro o subrubro informado, expresado en kilogramos",
        "nullable": true
      }
    ],
    "orderKeys": [
      "Anio",
      "Mes",
      "Periodo",
      "rubro_cod",
      "subrubro_cod",
      "pais_cod"
    ],
    "dateColumns": [
      "Periodo",
      "Anio",
      "Mes"
    ]
  },
  "comercio_exterior_importacion_bienes": {
    "id": "comercio_exterior_importacion_bienes",
    "endpoint": "/comercio_exterior_importacion_bienes",
    "summary": "Importaciones de bienes por uso económico y país de origen",
    "description": "Importaciones argentinas de bienes por uso económico, grandes categorías económica y país de origen. Incluye el valor CIF expresado en dólares estadounidenses y el peso neto de las mercaderías expresado en kilogramos. La información se presenta con frecuencia mensual. \n\nEste endpoint contiene información desde enero de 1986. \n\nPara conocer los códigos de país, uso económico y gran categoría económica, se encuentra disponible el servicio de datos llamado “Códigos y nomencladores de comercio exterior” (https://api.indec.gob.ar/v1/comercio_exterior_nomenclaturas).\n\nPara más información, se puede consultar la metodología INDEC N° 26, Metodología de comercio exterior, a través del siguiente enlace: https://www.indec.gob.ar/ftp/cuadros/economia/metodologia_comex.pdf\n\n\n### Ejemplos de uso para esta tabla\n\n- **Obtener todo (paginado):**\n  `GET /comercio_exterior_importacion_bienes?order=Anio,Mes,Periodo,uso_economico_cod,gce_cod,pais_cod&limit=1000&offset=0`\n- **Filtrar por Anio mayor a 100:**\n                          `GET /comercio_exterior_importacion_bienes?Anio=gt.100`\n- **Filtrar por Mes mayor a 100:**\n                          `GET /comercio_exterior_importacion_bienes?Mes=gt.100`\n- **Buscar texto en Periodo (contiene 'valor'):**\n                      `GET /comercio_exterior_importacion_bienes?Periodo=ilike.*valor*`\n- **Buscar texto en uso_economico_cod (contiene 'valor'):**\n                      `GET /comercio_exterior_importacion_bienes?uso_economico_cod=ilike.*valor*`\n- **Seleccionar columnas específicas:**\n                  `GET /comercio_exterior_importacion_bienes?select=Anio,Mes`\n\n### Clave primaria\n\nEstas columnas identifican de forma única cada fila: `Anio`, `Mes`, `Periodo`, `uso_economico_cod`, `gce_cod`, `pais_cod`",
    "area": "Dirección Nacional de Estadísticas del Sector Externo y Cuentas Internacionales",
    "frecuencia": "Mensual",
    "columns": [
      {
        "name": "Anio",
        "type": "number",
        "description": "Año correspondiente al período de referencia del dato",
        "nullable": false
      },
      {
        "name": "Mes",
        "type": "number",
        "description": "Número del mes correspondiente al período de referencia. Utiliza valores comprendidos entre 1 (enero) y 12 (diciembre)",
        "nullable": false
      },
      {
        "name": "Periodo",
        "type": "string",
        "description": "Período de referencia del dato, expresado en formato AAAAMM (meses)",
        "nullable": false
      },
      {
        "name": "uso_economico_cod",
        "type": "string",
        "description": "Código que identifica el uso económico de las importaciones",
        "nullable": false
      },
      {
        "name": "gce_cod",
        "type": "string",
        "description": "Código que identifica la gran categoría económica dentro del uso económico de importación correspondiente",
        "nullable": false
      },
      {
        "name": "pais_cod",
        "type": "string",
        "description": "Código que identifica el país de origen de las importaciones o de destino de las exportaciones",
        "nullable": false
      },
      {
        "name": "valor_CIF",
        "type": "number",
        "description": "Valor de las importaciones a precios CIF, expresado en dólares estadounidenses",
        "nullable": true
      },
      {
        "name": "peso_neto",
        "type": "number",
        "description": "Peso neto de los bienes que componen el uso económico o categoría económica informada, expresado en kilogramos",
        "nullable": true
      }
    ],
    "orderKeys": [
      "Anio",
      "Mes",
      "Periodo",
      "uso_economico_cod",
      "gce_cod",
      "pais_cod"
    ],
    "dateColumns": [
      "Periodo",
      "Anio",
      "Mes"
    ]
  }
};

export const DATASET_LIST: DatasetMetadata[] = Object.values(DATASETS);
