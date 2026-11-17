import type { IndecHttpClient } from "../client/indec-client.js";
import { isAuthOrRateLimitError } from "../client/errors.js";

export interface LatestPeriodResult {
  period?: string;
  warning?: string;
}

export async function resolveLatestPeriod(
  client: IndecHttpClient,
  datasetId: string,
  periodColumn: string,
  label: string
): Promise<LatestPeriodResult> {
  try {
    const latestQuery = await client.query<Record<string, unknown>>(datasetId, {
      select: periodColumn,
      order: `${periodColumn}.desc`,
      limit: 1,
      count: false,
    });

    const period = latestQuery.data[0]?.[periodColumn];
    if (typeof period === "string" && period.length > 0) {
      return { period };
    }

    return {
      warning: `No se encontraron períodos publicados para ${label}.`,
    };
  } catch (err: unknown) {
    if (isAuthOrRateLimitError(err)) {
      throw err;
    }
    console.error(
      `No se pudo determinar el último período publicado para ${label}.`
    );

    return {
      warning: `No se pudo determinar el último período publicado para ${label}; la respuesta puede incluir varios períodos.`,
    };
  }
}
