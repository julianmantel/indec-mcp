import { IndecAuthError } from "../client/errors.js";
import {
  DatasetNotFoundError,
  DatasetQueryExecutionError,
  InvalidColumnError,
} from "../services/dataset-query.js";
import {
  AUTH_ERROR_MESSAGE,
  errorResult,
  sourceLine,
  suggestionsSuffix,
  type TextResult,
} from "./presentation.js";

export function formatInvalidColumn(
  err: InvalidColumnError,
  label: string
): string {
  const valid = err.validColumns.map((c) => `\`${c}\``).join(", ");
  switch (err.kind) {
    case "select":
      return [
        `Error: La(s) columna(s) en select no existe(n) en el dataset '${err.datasetId}': ${err.columns.map((c) => `'${c}'`).join(", ")}.`,
        "",
        `${label}: ${valid}.`,
      ].join("\n");
    case "filters":
      return [
        `Error: La columna de filtro '${err.columns[0]}' no existe en el dataset '${err.datasetId}'.`,
        "",
        `${label}: ${valid}.`,
      ].join("\n");
    case "order":
      return [
        `Error: La(s) columna(s) de ordenamiento no existe(n) en el dataset '${err.datasetId}': ${err.columns.map((c) => `'${c}'`).join(", ")}.`,
        "",
        `${label}: ${valid}.`,
      ].join("\n");
  }
}

export function formatQueryError(
  err: unknown,
  requestedDataset: string
): TextResult {
  if (err instanceof IndecAuthError) {
    return errorResult(AUTH_ERROR_MESSAGE);
  }

  if (err instanceof DatasetNotFoundError) {
    return errorResult(
      `Error: No se encontró ningún dataset con el identificador '${err.datasetId}'. Consulte \`indec_list_datasets\` para ver los nombres válidos.${suggestionsSuffix(err.suggestions)}`
    );
  }

  if (err instanceof InvalidColumnError) {
    return errorResult(
      formatInvalidColumn(err, "Columnas válidas del dataset")
    );
  }

  const datasetId =
    err instanceof DatasetQueryExecutionError
      ? err.datasetId
      : requestedDataset;
  const message = err instanceof Error ? err.message : String(err);
  return errorResult(
    `Error al consultar la API del INDEC (${datasetId}): ${message}\n\n${sourceLine(datasetId)}`
  );
}

export function formatCountError(
  err: unknown,
  requestedDataset: string
): TextResult {
  if (err instanceof IndecAuthError) {
    return errorResult(AUTH_ERROR_MESSAGE);
  }

  if (err instanceof DatasetNotFoundError) {
    return errorResult(
      `Error: No se encontró ningún dataset con el identificador '${err.datasetId}'. Consulte \`indec_list_datasets\`.`
    );
  }

  if (err instanceof InvalidColumnError) {
    return errorResult(formatInvalidColumn(err, "Columnas válidas"));
  }

  const datasetId =
    err instanceof DatasetQueryExecutionError
      ? err.datasetId
      : requestedDataset;
  const message = err instanceof Error ? err.message : String(err);
  return errorResult(
    `Error al contar filas en '${datasetId}': ${message}\n\n${sourceLine(datasetId)}`
  );
}
