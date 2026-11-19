import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { createContainer } from "../src/container.js";
import type { ToolContext } from "../src/tools/context.js";
import {
  handleIndecGetIpc,
  getIpcInputSchema,
} from "../src/tools/curated/ipc.js";
import {
  handleIndecGetEmae,
  getEmaeInputSchema,
} from "../src/tools/curated/emae.js";
import {
  handleIndecGetCanastas,
  getCanastasInputSchema,
} from "../src/tools/curated/canastas.js";
import {
  handleIndecGetCanastaCrianza,
  getCanastaCrianzaInputSchema,
} from "../src/tools/curated/canasta-crianza.js";
import {
  handleIndecGetMercadoTrabajo,
  getMercadoTrabajoInputSchema,
} from "../src/tools/curated/mercado-trabajo.js";
import {
  handleIndecGetPobreza,
  getPobrezaInputSchema,
} from "../src/tools/curated/pobreza.js";
import {
  handleIndecGetSalarios,
  getSalariosInputSchema,
} from "../src/tools/curated/salarios.js";

// El token nunca se imprime. Las pruebas solo se activan explícitamente con
// INDEC_RUN_LIVE_TESTS=1 (ver docs/FIXES.md) para no depender de la red en CI.
if (!process.env.INDEC_API_TOKEN) {
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const match = env.match(/^INDEC_API_TOKEN\s*=\s*(.*)$/m);
    const token = match?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (token) process.env.INDEC_API_TOKEN = token;
  } catch {
    // Sin .env: las pruebas en vivo quedan omitidas.
  }
}

const runLive =
  process.env.INDEC_RUN_LIVE_TESTS === "1" &&
  Boolean(process.env.INDEC_API_TOKEN?.trim());
const live = runLive ? describe : describe.skip;

interface ToolCase {
  name: string;
  run: (ctx: ToolContext) => Promise<{ content: Array<{ text: string }> }>;
}

live("Contrato en vivo de las tools curadas", () => {
  it("cada tool devuelve al menos un registro con sus argumentos por defecto", async () => {
    const ctx: ToolContext = createContainer({ config: loadConfig() });

    const cases: ToolCase[] = [
      {
        name: "indec_get_ipc",
        run: (c) => handleIndecGetIpc(getIpcInputSchema.parse({}), c),
      },
      {
        name: "indec_get_emae",
        run: (c) => handleIndecGetEmae(getEmaeInputSchema.parse({}), c),
      },
      {
        name: "indec_get_canastas",
        run: (c) => handleIndecGetCanastas(getCanastasInputSchema.parse({}), c),
      },
      {
        name: "indec_get_canasta_crianza",
        run: (c) =>
          handleIndecGetCanastaCrianza(
            getCanastaCrianzaInputSchema.parse({}),
            c
          ),
      },
      {
        name: "indec_get_mercado_trabajo",
        run: (c) =>
          handleIndecGetMercadoTrabajo(
            getMercadoTrabajoInputSchema.parse({}),
            c
          ),
      },
      {
        name: "indec_get_pobreza",
        run: (c) => handleIndecGetPobreza(getPobrezaInputSchema.parse({}), c),
      },
      {
        name: "indec_get_salarios",
        run: (c) => handleIndecGetSalarios(getSalariosInputSchema.parse({}), c),
      },
    ];

    const failures: string[] = [];
    for (const tool of cases) {
      const result = await tool.run(ctx);
      const text = result.content[0]?.text ?? "";
      const count = Number(
        text.match(/Registros devueltos:\*\* (\d+)/)?.[1] ?? 0
      );
      if (count < 1) failures.push(`${tool.name}: ${count} registros`);
    }

    expect(failures).toEqual([]);
  }, 180_000);

  it("las opciones no default también devuelven registros", async () => {
    const ctx: ToolContext = createContainer({ config: loadConfig() });

    const cases: ToolCase[] = [
      {
        name: "ipc GBA/v_ia",
        run: (c) =>
          handleIndecGetIpc(
            getIpcInputSchema.parse({ region: "GBA", tipo_indicador: "v_ia" }),
            c
          ),
      },
      {
        name: "emae sectores",
        run: (c) =>
          handleIndecGetEmae(
            getEmaeInputSchema.parse({ desglosar_sectores: true }),
            c
          ),
      },
      {
        name: "emae índice tendencia-ciclo",
        run: (c) =>
          handleIndecGetEmae(
            getEmaeInputSchema.parse({
              tipo_indicador: "índice",
              serie: "tendencia-ciclo",
            }),
            c
          ),
      },
      {
        name: "canastas línea",
        run: (c) =>
          handleIndecGetCanastas(
            getCanastasInputSchema.parse({ tipo_indicador: "línea" }),
            c
          ),
      },
      {
        name: "crianza solo_totales",
        run: (c) =>
          handleIndecGetCanastaCrianza(
            getCanastaCrianzaInputSchema.parse({ solo_totales: true }),
            c
          ),
      },
      {
        name: "mercado solo_principales",
        run: (c) =>
          handleIndecGetMercadoTrabajo(
            getMercadoTrabajoInputSchema.parse({ solo_principales: true }),
            c
          ),
      },
      {
        name: "pobreza personas",
        run: (c) =>
          handleIndecGetPobreza(
            getPobrezaInputSchema.parse({ enfoque: "personas" }),
            c
          ),
      },
      {
        name: "salarios v_m",
        run: (c) =>
          handleIndecGetSalarios(
            getSalariosInputSchema.parse({ tipo_indicador: "v_m" }),
            c
          ),
      },
    ];

    const failures: string[] = [];
    for (const tool of cases) {
      const result = await tool.run(ctx);
      const text = result.content[0]?.text ?? "";
      const count = Number(
        text.match(/Registros devueltos:\*\* (\d+)/)?.[1] ?? 0
      );
      if (count < 1) failures.push(`${tool.name}: ${count} registros`);
    }

    expect(failures).toEqual([]);
  }, 180_000);
});
