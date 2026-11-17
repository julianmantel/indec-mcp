import { DEFAULT_ALLOWED_HOSTS, normalizeHostname } from "../config.js";
import {
  IndecAuthError,
  IndecError,
  IndecHttpError,
  IndecTimeoutError,
  mapHttpStatusToMessage,
} from "./errors.js";

export interface IndecTransportOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  allowedHosts?: string[];
  fetchFn?: typeof fetch;
}

function assertSafeEndpoint(endpoint: string): void {
  const hasUnsafeCharacters = /[\\\s\u0000-\u001f\u007f-\u009f]/.test(endpoint);
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(endpoint);
  const isProtocolRelative = endpoint.startsWith("//");

  if (hasUnsafeCharacters || hasScheme || isProtocolRelative) {
    throw new IndecError(
      "Endpoint de dataset inválido: solo se permiten rutas relativas a la API del INDEC.",
      "UNSAFE_ENDPOINT"
    );
  }
}

export interface RequestRawOptions {
  queryParams?: URLSearchParams;
  preferCount?: boolean;
  requireAuth?: boolean;
}

/**
 * Transporte HTTP puro: auth, timeout y reintentos. No conoce caché ni
 * el formato de los datasets.
 */
export class IndecTransport {
  private readonly baseUrl: string;
  private readonly baseOrigin: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: IndecTransportOptions = {}) {
    const rawBaseUrl = options.baseUrl || "https://api.indec.gob.ar/v1/";
    this.baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;

    let parsedBase: URL;
    try {
      parsedBase = new URL(this.baseUrl);
    } catch {
      throw new IndecError(
        "La URL base de la API del INDEC no es válida.",
        "INVALID_BASE_URL"
      );
    }

    if (parsedBase.username || parsedBase.password) {
      throw new IndecError(
        "La URL base de la API del INDEC no debe incluir usuario ni contraseña.",
        "INVALID_BASE_URL"
      );
    }

    this.baseOrigin = parsedBase.origin;
    this.assertAllowedHost(options.allowedHosts, parsedBase.hostname);
    this.token = options.token?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 300;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  hasToken(): boolean {
    return Boolean(this.token && this.token.length > 0);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async requestRaw(
    endpoint: string,
    options: RequestRawOptions = {}
  ): Promise<Response> {
    const fullUrl = this.buildFullUrl(endpoint, options.queryParams);

    if (options.requireAuth && !this.hasToken()) {
      throw new IndecAuthError();
    }

    const headers = this.buildHeaders(
      options.preferCount,
      options.requireAuth === true
    );
    let lastNetworkError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchFn(fullUrl, {
          method: "GET",
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        // Reintentos por estado HTTP transitorio (429 / 5xx).
        if (this.isRetryableHttpStatus(response.status)) {
          if (attempt < this.maxRetries) {
            await this.sleep(this.parseRetryAfter(response, attempt));
            continue;
          }
        }

        if (!response.ok) {
          const errorDetails = await this.readErrorDetails(response);
          throw new IndecHttpError(
            response.status,
            mapHttpStatusToMessage(response.status, errorDetails),
            errorDetails
          );
        }

        return response;
      } catch (err: unknown) {
        if (err instanceof IndecHttpError) {
          throw err;
        }

        if (this.isTimeoutError(err)) {
          throw new IndecTimeoutError(this.timeoutMs);
        }

        // Reintentos por errores de red (sin respuesta HTTP).
        lastNetworkError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await this.sleep(this.networkRetryDelay(attempt));
          continue;
        }
      }
    }

    throw (
      lastNetworkError ||
      new IndecError(
        "Fallo desconocido al conectar con la API del INDEC.",
        "NETWORK_ERROR"
      )
    );
  }

  private buildFullUrl(
    endpoint: string,
    queryParams?: URLSearchParams
  ): string {
    assertSafeEndpoint(endpoint);

    const cleanEndpoint = endpoint.replace(/^\//, "");
    const base = new URL(cleanEndpoint, this.baseUrl);

    if (base.origin !== this.baseOrigin) {
      throw new IndecError(
        "El endpoint resuelto no pertenece al origen de la API del INDEC configurado.",
        "CROSS_ORIGIN_ENDPOINT"
      );
    }

    if (queryParams) {
      queryParams.forEach((value, key) => {
        base.searchParams.append(key, value);
      });
    }
    return base.toString();
  }

  private buildHeaders(preferCount?: boolean, includeAuth = false): Headers {
    const headers = new Headers();
    headers.set("Accept", "application/json");

    if (includeAuth && this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    if (preferCount) {
      headers.set("Prefer", "count=exact");
    }

    return headers;
  }

  private assertAllowedHost(
    allowedHosts: string[] | undefined,
    baseHostname: string
  ): void {
    const configured =
      allowedHosts && allowedHosts.length > 0
        ? allowedHosts
        : DEFAULT_ALLOWED_HOSTS;
    const normalized = configured.map((host) => normalizeHostname(host));
    const host = normalizeHostname(baseHostname);

    if (!normalized.includes(host)) {
      throw new IndecError(
        `El host de la URL base de la API del INDEC no está permitido. Agregue '${host}' a INDEC_API_ALLOWED_HOSTS.`,
        "HOST_NOT_ALLOWED"
      );
    }
  }

  private isRetryableHttpStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status < 600);
  }

  private isTimeoutError(err: unknown): boolean {
    return (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    );
  }

  private networkRetryDelay(attempt: number): number {
    return this.baseRetryDelayMs * Math.pow(2, attempt);
  }

  private parseRetryAfter(response: Response, attempt: number): number {
    const retryHeader = response.headers.get("Retry-After");
    if (retryHeader) {
      const parsedSeconds = parseInt(retryHeader, 10);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        return parsedSeconds * 1000;
      }
      const parsedDate = Date.parse(retryHeader);
      if (!isNaN(parsedDate) && parsedDate > Date.now()) {
        return parsedDate - Date.now();
      }
    }
    // Backoff exponencial con jitter leve
    const backoff = this.baseRetryDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 50);
    return backoff + jitter;
  }

  private async readErrorDetails(response: Response): Promise<string> {
    try {
      const errJson = (await response.json()) as {
        message?: string;
        hint?: string;
      };
      return errJson.message || errJson.hint || "";
    } catch {
      // El cuerpo de error no era JSON; se usa el mensaje genérico por status.
      console.error(
        "No se pudo interpretar el detalle del error devuelto por la API."
      );
      return "";
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
