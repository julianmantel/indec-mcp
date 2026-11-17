import { describe, it, expect, vi } from "vitest";
import { appendWarning } from "../src/tools/presentation.js";
import { resolveLatestPeriod } from "../src/services/latest-period.js";
import { IndecHttpClient } from "../src/client/indec-client.js";

describe("resolveLatestPeriod", () => {
  const mockToken = "valid-jwt-token";

  it("devuelve el período cuando la consulta funciona", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [{ periodo: "202410" }],
    });

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
    });

    const result = await resolveLatestPeriod(
      client,
      "ipc_nacional",
      "periodo",
      "el IPC"
    );

    expect(result.period).toBe("202410");
    expect(result.warning).toBeUndefined();
  });

  it("ante un error genérico loguea y devuelve una advertencia simple", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));

    const client = new IndecHttpClient({
      token: mockToken,
      fetchFn: fetchMock as unknown as typeof fetch,
      cacheTtlSeconds: 0,
      maxRetries: 0,
    });

    try {
      const result = await resolveLatestPeriod(
        client,
        "ipc_nacional",
        "periodo",
        "el IPC"
      );

      expect(result.period).toBeUndefined();
      expect(result.warning).toContain(
        "No se pudo determinar el último período publicado para el IPC"
      );
      expect(result.warning).toContain("puede incluir varios períodos");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "No se pudo determinar el último período publicado para el IPC."
      );
      expect(consoleErrorSpy.mock.calls[0]?.[0]).not.toContain(mockToken);
      expect(consoleErrorSpy.mock.calls[0]?.[0]).not.toContain("network down");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("relanza errores 401 y 429 en lugar de ocultarlos", async () => {
    for (const status of [401, 429]) {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: new Headers(),
        json: async () => ({ message: "error" }),
      });

      const client = new IndecHttpClient({
        token: mockToken,
        fetchFn: fetchMock as unknown as typeof fetch,
        cacheTtlSeconds: 0,
        maxRetries: 0,
      });

      await expect(
        resolveLatestPeriod(client, "ipc_nacional", "periodo", "el IPC")
      ).rejects.toMatchObject({ status });
    }
  });

  it("appendWarning agrega la advertencia al texto de la tool", () => {
    const result = appendWarning(
      { content: [{ type: "text" as const, text: "Resultado" }] },
      "Advertencia de prueba"
    );

    expect(result.content[0]?.text).toContain("Resultado");
    expect(result.content[0]?.text).toContain("⚠️ Advertencia de prueba");
  });
});
