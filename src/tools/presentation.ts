export interface TextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const API_SOURCE = "INDEC - Catálogo API-INDEC";
export const API_SOURCE_EM_DASH = "INDEC — Catálogo API-INDEC";

export const AUTH_ERROR_MESSAGE = [
  "Error de autenticación: Se requiere un token JWT válido para consultar datos de la API del INDEC.",
  "",
  "Para obtener su token gratuito:",
  "1. Regístrese en https://api.indec.gob.ar",
  "2. Verifique su cuenta usando el código OTP enviado a su correo",
  "3. Genere el JWT Token desde la configuración de su perfil",
  "4. Configure la variable de entorno INDEC_API_TOKEN.",
  "",
  "Nota: Las tools 'indec_list_datasets', 'indec_describe_dataset' e 'indec_status' no requieren token.",
].join("\n");

export function textResult(text: string): TextResult {
  return {
    content: [{ type: "text", text }],
  };
}

export function errorResult(text: string): TextResult {
  return {
    content: [{ type: "text", text }],
    isError: true,
  };
}

export function jsonBlock(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

/**
 * Línea de fuente para tools de datos. Sin dataset devuelve el formato en
 * cursiva usado por las tools de catálogo.
 */
export function sourceLine(datasetId?: string): string {
  return datasetId
    ? `Fuente: ${API_SOURCE_EM_DASH}, dataset ${datasetId}`
    : `*Fuente: ${API_SOURCE}*`;
}

export function describeSourceLine(datasetId: string): string {
  return `*Fuente: ${API_SOURCE} | Dataset: ${datasetId}*`;
}

export function suggestionsSuffix(suggestions: string[]): string {
  return suggestions.length > 0
    ? `\n\nQuizás quiso decir: ${suggestions.map((s) => `\`${s}\``).join(", ")}`
    : "";
}

export function truncationNotice(
  offset: number,
  count: number,
  total: number | null
): string {
  const nextOffset = offset + count;
  return `**Respuesta truncada**: Mostrando registros del ${offset + 1} al ${nextOffset}${
    total !== null ? ` de un total de ${total}` : ""
  }. Para ver los siguientes registros, ejecute la consulta incrementando el parámetro \`offset\` a \`${nextOffset}\`.`;
}

export function appendWarning(
  result: TextResult,
  warning?: string
): TextResult {
  if (!warning) return result;

  const [first, ...rest] = result.content;
  if (!first) return result;

  return {
    ...result,
    content: [
      {
        ...first,
        text: `${first.text}\n\n> ⚠️ ${warning}`,
      },
      ...rest,
    ],
  };
}
