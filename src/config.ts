import { z } from "zod";

export const DEFAULT_ALLOWED_HOSTS = [
  "api.indec.gob.ar",
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
] as const;

export function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
}

const urlSchema = z
  .string()
  .url()
  .refine(
    (rawUrl) => {
      if (!URL.canParse(rawUrl)) {
        return false;
      }
      const parsed = new URL(rawUrl);
      const isHttps = parsed.protocol === "https:";
      const isLocalhost =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname === "[::1]";
      return isHttps || isLocalhost;
    },
    {
      message:
        "INDEC_API_BASE_URL debe utilizar el protocolo HTTPS o ser localhost.",
    }
  )
  .refine(
    (rawUrl) => {
      if (!URL.canParse(rawUrl)) {
        return true;
      }
      const parsed = new URL(rawUrl);
      return parsed.username === "" && parsed.password === "";
    },
    {
      message: "INDEC_API_BASE_URL no debe incluir usuario ni contraseña.",
    }
  );

const allowedHostsSchema = z
  .string()
  .optional()
  .transform((rawHosts) => {
    const hosts = (rawHosts ?? "")
      .split(",")
      .map((host) => normalizeHostname(host))
      .filter(Boolean);

    const resolvedHosts =
      hosts.length > 0
        ? hosts
        : DEFAULT_ALLOWED_HOSTS.map((host) => normalizeHostname(host));

    return Array.from(new Set(resolvedHosts));
  });

export const configSchema = z
  .object({
    INDEC_API_TOKEN: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    INDEC_API_BASE_URL: urlSchema
      .default("https://api.indec.gob.ar/v1/")
      .transform((url) => (url.endsWith("/") ? url : `${url}/`)),
    INDEC_API_ALLOWED_HOSTS: allowedHostsSchema,
    INDEC_CACHE_TTL_SECONDS: z.coerce
      .number()
      .int("INDEC_CACHE_TTL_SECONDS debe ser un entero")
      .nonnegative("INDEC_CACHE_TTL_SECONDS no puede ser negativo")
      .default(3600),
    INDEC_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int("INDEC_REQUEST_TIMEOUT_MS debe ser un entero")
      .positive("INDEC_REQUEST_TIMEOUT_MS debe ser mayor a 0")
      .default(30000),
  })
  .superRefine((config, ctx) => {
    // El error de formato/URL ya lo reporta el schema del campo.
    if (!URL.canParse(config.INDEC_API_BASE_URL)) {
      return;
    }

    const parsed = new URL(config.INDEC_API_BASE_URL);
    const host = normalizeHostname(parsed.hostname);

    if (!config.INDEC_API_ALLOWED_HOSTS.includes(host)) {
      ctx.addIssue({
        code: "custom",
        path: ["INDEC_API_BASE_URL"],
        message: `El host '${host}' de INDEC_API_BASE_URL no está permitido. Agreguelo a INDEC_API_ALLOWED_HOSTS.`,
      });
    }
  });

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse({
    INDEC_API_TOKEN: env.INDEC_API_TOKEN,
    INDEC_API_BASE_URL: env.INDEC_API_BASE_URL,
    INDEC_API_ALLOWED_HOSTS: env.INDEC_API_ALLOWED_HOSTS,
    INDEC_CACHE_TTL_SECONDS: env.INDEC_CACHE_TTL_SECONDS,
    INDEC_REQUEST_TIMEOUT_MS: env.INDEC_REQUEST_TIMEOUT_MS,
  });
}
