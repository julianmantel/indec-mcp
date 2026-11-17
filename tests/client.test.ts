import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import { IndecHttpClient } from "../src/client/indec-client.js";
import {
  IndecAuthError,
  IndecHttpError,
  IndecTimeoutError,
} from "../src/client/errors.js";
import {
  buildQueryParams,
  formatFilterValue,
  parseContentRange,
} from "../src/client/postgrest.js";
import { MemoryCache } from "../src/client/cache.js";
import { loadConfig } from "../src/config.js";

describe("PostgREST Builder & Content-Range Parser", () => {
  it("formatea operadores de filtro correctamente", () => {
    expect(formatFilterValue("eq", "activo")).toBe("eq.activo");
    expect(formatFilterValue("gte", 2024)).toBe("gte.2024");
    expect(formatFilterValue("lte", 100)).toBe("lte.100");
    expect(formatFilterValue("in", ["a", "b", "c"])).toBe("in.(a,b,c)");
    expect(formatFilterValue("in", "(x,y)")).toBe("in.(x,y)");
    expect(formatFilterValue("in", ["a,b", "c"])).toBe('in.("a,b",c)');
    expect(formatFilterValue("in", ["a(b)", "c"])).toBe('in.("a(b)",c)');
    expect(formatFilterValue("in", ['a"b'])).toBe('in.("a\\"b")');
    expect(formatFilterValue("in", "a,b")).toBe('in.("a,b")');
    expect(formatFilterValue("like", "*ar*")).toBe("like.*ar*");
    expect(formatFilterValue("is", "null")).toBe("is.null");
  });

  it("construye query params usando URLSearchParams", () => {
    const params = buildQueryParams({
      select: ["col1", "col2"],
      order: ["periodo.desc", "codigo.asc"],
      limit: 50,
      offset: 100,
      filters: [
        { column: "anio", operator: "gte", value: 2020 },
        { column: "region", operator: "eq", value: "GBA" },
        { column: "rubro", operator: "in", value: [1, 2, 3] },
      ],
    });

    expect(params.get("select")).toBe("col1,col2");
    expect(params.get("order")).toBe("periodo.desc,codigo.asc");
    expect(params.get("limit")).toBe("50");
    expect(params.get("offset")).toBe("100");
    expect(params.get("anio")).toBe("gte.2020");
    expect(params.get("region")).toBe("eq.GBA");
    expect(params.get("rubro")).toBe("in.(1,2,3)");
  });

  it("parsea el header Content-Range en diferentes variantes", () => {
    expect(parseContentRange("0-49/103545")).toEqual({
      start: 0,
      end: 49,
      total: 103545,
      raw: "0-49/103545",
    });

    expect(parseContentRange("*/500")).toEqual({
      start: null,
      end: null,
      total: 500,
      raw: "*/500",
    });

    expect(parseContentRange("0-0/0")).toEqual({
      start: 0,
      end: 0,
      total: 0,
      raw: "0-0/0",
    });

    expect(parseContentRange(null)).toEqual({
      start: null,
      end: null,
      total: null,
      raw: null,
    });
  });
});

describe("MemoryCache", () => {
  it("almacena y recupera valores respetando el TTL", async () => {
    const cache = new MemoryCache(1); // 1 segundo
    cache.set("k1", "v1");
    expect(cache.get("k1")).toBe("v1");

    // Desactivada con TTL 0
    const noCache = new MemoryCache(0);
    noCache.set("k1", "v1");
    expect(noCache.get("k1")).toBeUndefined();
  });

  it("limpia y poda elementos expirados", async () => {
    const cache = new MemoryCache(10);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("limita la cantidad de entradas y evicta la más vieja", () => {
    const cache = new MemoryCache(10, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.size()).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});

describe("IndecHttpClient", () => {
  const mockToken = "fake-jwt-token-for-test";

  it("ejecuta una consulta exitosa (200) enviando auth y parseando datos", async () => {
    const fakeData = [{ periodo: "202401", valor: 120.5 }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "Content-Range": "0-0/1",
      }),
      json: async () => fakeData,
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const result = await client.query("ipc_nacional", { limit: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    const calledInit = fetchMock.mock.calls[0][1];

    expect(calledUrl).toContain(
      "https://api.indec.gob.ar/v1/ipc_nacional?limit=10&offset=0"
    );
    expect(calledInit.headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
    expect(result.data).toEqual(fakeData);
    expect(result.total).toBe(1);
    expect(result.isTruncated).toBe(false);
  });

  it("falla de inmediato con IndecAuthError si no hay token y requireAuth es true", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: undefined,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    await expect(client.query("ipc_nacional")).rejects.toThrow(IndecAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mapea respuesta 401 a mensaje en español sin exponer el token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "JWT expired" }),
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    try {
      await client.query("ipc_nacional");
      expect.unreachable("Debería haber lanzado error");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(IndecHttpError);
      const httpErr = err as IndecHttpError;
      expect(httpErr.status).toBe(401);
      expect(httpErr.message).toContain(
        "Token de API no autorizado o expirado (401)"
      );
      // El mensaje no debe contener el valor real del token
      expect(httpErr.message).not.toContain(mockToken);
    }
  });

  it("usa un mensaje genérico y loguea cuando el cuerpo de error no es JSON", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError("cuerpo no JSON");
      },
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      await expect(client.query("ipc_nacional")).rejects.toMatchObject({
        status: 500,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "No se pudo interpretar el detalle del error devuelto por la API."
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("reintenta con backoff exponencial ante 429 y tiene éxito al tercer intento", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 429,
          headers: new Headers(),
          json: async () => ({ message: "Too many requests" }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Range": "0-1/2" }),
        json: async () => [{ id: 1 }, { id: 2 }],
      };
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      baseRetryDelayMs: 5, // ms para tests ultra rápidos
      cacheTtlSeconds: 0,
      maxRetries: 3,
    });

    const res = await client.query("ipc_nacional");
    expect(callCount).toBe(3);
    expect(res.data).toHaveLength(2);
  });

  it("arroja IndecHttpError 429 si los reintentos se agotan", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: async () => ({ message: "Rate limit exceeded" }),
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      baseRetryDelayMs: 2,
      maxRetries: 2,
      cacheTtlSeconds: 0,
    });

    await expect(client.query("ipc_nacional")).rejects.toThrow(IndecHttpError);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 inicial + 2 reintentos
  });

  it("maneja timeout con AbortSignal arrojando IndecTimeoutError", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "TimeoutError";
      throw abortErr;
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      timeoutMs: 100,
      maxRetries: 0,
      cacheTtlSeconds: 0,
    });

    await expect(client.query("ipc_nacional")).rejects.toThrow(
      IndecTimeoutError
    );
  });

  it("gestiona paginación correctamente detectando isTruncated", async () => {
    const page1Data = new Array(10).fill({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 206,
      headers: new Headers({ "Content-Range": "0-9/50" }),
      json: async () => page1Data,
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const page1 = await client.query("ipc_nacional", { limit: 10, offset: 0 });
    expect(page1.data).toHaveLength(10);
    expect(page1.total).toBe(50);
    expect(page1.isTruncated).toBe(true);
    expect(page1.offset).toBe(0);
    expect(page1.limit).toBe(10);
  });

  it("conteo exacto con countRows lee el total sin traer datos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "*/103545" }),
      json: async () => [],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const total = await client.countRows("ipc_nacional", [
      { column: "anio", operator: "gte", value: 2024 },
    ]);

    expect(total).toBe(103545);
    const calledInit = fetchMock.mock.calls[0][1];
    expect(calledInit.headers.get("Prefer")).toBe("count=exact");
  });

  it("utiliza la caché en memoria para llamadas subsecuentes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Range": "0-0/1" }),
      json: async () => [{ valor: 42 }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 60,
    });

    const res1 = await client.query("ipc_nacional", { limit: 5 });
    const res2 = await client.query("ipc_nacional", { limit: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(res2);

    // Con skipCache: true vuelve a llamar
    await client.query("ipc_nacional", { limit: 5, skipCache: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Seguridad de endpoints y URL base", () => {
  const FAKE_TOKEN = "FAKE-PROBE-TOKEN";

  function makeOkResponse(): Response {
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [],
      text: async () => "",
    } as unknown as Response;
  }

  it("rechaza un endpoint absoluto sin llamar a fetch", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: FAKE_TOKEN,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await expect(
      client.requestRaw("https://attacker.example/steal", {
        requireAuth: true,
      })
    ).rejects.toThrow(/Endpoint de dataset inválido/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza un endpoint protocol-relative sin llamar a fetch", async () => {
    const fetchMock = vi.fn();
    const client = new IndecHttpClient({
      token: FAKE_TOKEN,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await expect(
      client.requestRaw("//attacker.example/steal", { requireAuth: true })
    ).rejects.toThrow(/Endpoint de dataset inválido/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acepta un endpoint relativo y envía auth cuando requireAuth es true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    const client = new IndecHttpClient({
      token: FAKE_TOKEN,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await client.requestRaw("/ipc_nacional", { requireAuth: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Headers;

    expect(calledUrl).toBe("https://api.indec.gob.ar/v1/ipc_nacional");
    expect(headers.get("Authorization")).toBe(`Bearer ${FAKE_TOKEN}`);
    expect(calledInit.redirect).toBe("error");
  });

  it("no envía Authorization cuando requireAuth es false", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOkResponse());
    const client = new IndecHttpClient({
      token: FAKE_TOKEN,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    await client.requestRaw("", { requireAuth: false });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Headers;

    expect(calledUrl).toBe("https://api.indec.gob.ar/v1/");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("rechaza una URL base fuera de la allowlist", () => {
    expect(() =>
      loadConfig({ INDEC_API_BASE_URL: "https://evil.example/v1/" })
    ).toThrow(/no está permitido/);

    expect(
      () => new IndecHttpClient({ baseUrl: "https://evil.example/v1/" })
    ).toThrow(/no está permitido/);
  });

  it("acepta un host extra cuando se permite explícitamente", () => {
    const config = loadConfig({
      INDEC_API_BASE_URL: "https://extra.example/v1/",
      INDEC_API_ALLOWED_HOSTS: "api.indec.gob.ar, extra.example",
    });

    expect(config.INDEC_API_BASE_URL).toBe("https://extra.example/v1/");
    expect(config.INDEC_API_ALLOWED_HOSTS).toContain("extra.example");

    const client = new IndecHttpClient({
      baseUrl: "https://extra.example/v1/",
      allowedHosts: ["extra.example"],
    });
    expect(client.getBaseUrl()).toBe("https://extra.example/v1/");
  });

  it("rechaza una URL base con usuario y contraseña", () => {
    expect(() =>
      loadConfig({
        INDEC_API_BASE_URL: "https://user:pass@api.indec.gob.ar/v1/",
      })
    ).toThrow(/usuario ni contraseña/);

    expect(
      () =>
        new IndecHttpClient({
          baseUrl: "https://user:pass@api.indec.gob.ar/v1/",
        })
    ).toThrow(/usuario ni contraseña/);
  });

  it("mantiene la URL base y la allowlist por defecto", () => {
    const config = loadConfig({});

    expect(config.INDEC_API_BASE_URL).toBe("https://api.indec.gob.ar/v1/");
    expect(config.INDEC_API_ALLOWED_HOSTS).toEqual([
      "api.indec.gob.ar",
      "localhost",
      "127.0.0.1",
      "::1",
    ]);
  });

  it("reporta una URL base inválida como ZodError, no como TypeError", () => {
    expect(() => loadConfig({ INDEC_API_BASE_URL: "not a url" })).toThrow(
      ZodError
    );
    expect(() => loadConfig({ INDEC_API_BASE_URL: "" })).toThrow(ZodError);
  });
});
