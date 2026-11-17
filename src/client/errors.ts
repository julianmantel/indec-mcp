export class IndecError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "IndecError";
  }
}

export class IndecAuthError extends IndecError {
  constructor(
    message = "Token no configurado o expirado. Configure INDEC_API_TOKEN con un JWT obtenido en https://api.indec.gob.ar"
  ) {
    super(message, "AUTH_REQUIRED");
    this.name = "IndecAuthError";
  }
}

export class IndecHttpError extends IndecError {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message, `HTTP_${status}`);
    this.name = "IndecHttpError";
  }
}

export class IndecTimeoutError extends IndecError {
  constructor(timeoutMs: number) {
    super(
      `La solicitud a la API del INDEC superó el tiempo límite de ${timeoutMs}ms.`,
      "TIMEOUT"
    );
    this.name = "IndecTimeoutError";
  }
}

export function isAuthOrRateLimitError(err: unknown): boolean {
  if (err instanceof IndecAuthError) return true;
  return (
    err instanceof IndecHttpError &&
    (err.status === 401 || err.status === 403 || err.status === 429)
  );
}

export function mapHttpStatusToMessage(
  status: number,
  details?: string
): string {
  switch (status) {
    case 400:
      return details
        ? `Consulta inválida a la API del INDEC (400): ${details}`
        : "Consulta inválida (400): el filtro, parámetro o columna especificada no es válida para este dataset.";
    case 401:
      return "Token de API no autorizado o expirado (401). Genere un nuevo JWT en https://api.indec.gob.ar y configure INDEC_API_TOKEN.";
    case 403:
      return "Acceso denegado (403): no tiene permisos para consultar este dataset en la API del INDEC.";
    case 404:
      return "Dataset o recurso no encontrado en la API del INDEC (404). Verifique el nombre consultando indec_list_datasets.";
    case 429:
      return "Límite de solicitudes alcanzado (429 Too Many Requests). Espere unos instantes antes de reintentar.";
    default:
      if (status >= 500 && status < 600) {
        return `Error interno en los servidores de la API del INDEC (${status}). Intente nuevamente más tarde.`;
      }
      return `Error HTTP ${status} al consultar la API del INDEC.`;
  }
}
