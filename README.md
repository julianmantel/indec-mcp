# indec-mcp

Servidor [MCP](https://modelcontextprotocol.io) de **solo lectura** que permite a asistentes de IA (Claude, Cursor, VS Code, OpenCode, Antigravity, etc.) consultar las estadísticas oficiales del **INDEC** (Argentina): inflación, actividad económica, canastas, pobreza, empleo, salarios y más.

> Proyecto **no oficial**, sin afiliación con el INDEC. Los datos pertenecen al Instituto Nacional de Estadística y Censos de la República Argentina.

Una vez instalado, podés preguntarle a tu asistente cosas como:

```text
Cuál fue la última inflación mensual publicada por el INDEC?
Comparame la inflación interanual de GBA y Patagonia durante 2024.
Cuánto cuesta hoy la canasta básica total? Y la de crianza para un niño de 1 a 3 años?
Mostrame la evolución de la desocupación en el Gran Buenos Aires desde 2022.
Qué datasets tiene la API del INDEC sobre comercio exterior?
```

## Índice

- [Inicio rápido](#inicio-rápido)
- [Instalación por cliente](#instalación-por-cliente)
- [Variables de entorno](#variables-de-entorno)
- [Herramientas disponibles](#herramientas-disponibles)
- [Solución de problemas](#solución-de-problemas)
- [Desarrollo](#desarrollo)
- [Arquitectura](#arquitectura)
- [Fuente de los datos](#fuente-de-los-datos)

## Inicio rápido

**Requisitos**

- Node.js **20.6 o superior** (`node -v`).
- Un cliente MCP (Claude Desktop, Claude Code, Cursor, VS Code, OpenCode, Antigravity u otro).
- Un **token JWT gratuito** de la API del INDEC. Solo hace falta para consultar datos: el catálogo (`indec_list_datasets`, `indec_describe_dataset`) funciona sin token.

**1. Obtené tu token**

1. Registrate en <https://api.indec.gob.ar>.
2. Verificá tu cuenta con el código OTP que llega por mail.
3. Generá el token JWT desde tu perfil. **Se muestra una sola vez**, guardalo. Vence a los 12 meses.

**2. Instalá el servidor desde npm**

La forma recomendada es `npx`: descarga y ejecuta la versión publicada, sin clonar el repositorio ni compilar. El comando que usarán los clientes es:

```bash
npx -y @julianmantel/indec-mcp
```

Si preferís tenerlo siempre disponible, instalalo globalmente y usá `indec-mcp` como comando:

```bash
npm install -g @julianmantel/indec-mcp
```

No hace falta anotar rutas ni ejecutar `npm run build`: el paquete publicado ya incluye `dist/`.

**3. Conectalo a tu cliente**

Elegí tu cliente en la sección siguiente. Si no sabés cuál usar, el más directo es **Claude Code** (un solo comando) o **Claude Desktop** (un archivo JSON).

**4. Probalo**

Reiniciá el cliente y pedile algo simple:

```text
Usá el servidor indec y decime el estado de la conexión (indec_status).
```

Deberías ver `Token configurado: Sí`. Después probá una consulta real, por ejemplo la última inflación.

## Instalación por cliente

Todos los clientes necesitan lo mismo: el comando `npx`, el paquete `@julianmantel/indec-mcp` y la variable `INDEC_API_TOKEN`. Si instalaste el paquete globalmente, podés usar `indec-mcp` en lugar de `npx -y @julianmantel/indec-mcp`. Lo que cambia entre clientes es **dónde** se configura y **cómo se llama la clave raíz** (`mcpServers`, `servers` o `mcp`).

> En Windows, si el cliente no encuentra `npx`, usá `npx.cmd` en el campo `command`.

| Cliente        | Dónde se configura                        | Clave raíz   |
| -------------- | ----------------------------------------- | ------------ |
| Claude Code    | Comando `claude mcp add`                  | -            |
| Claude Desktop | `claude_desktop_config.json`              | `mcpServers` |
| Cursor         | `~/.cursor/mcp.json` o `.cursor/mcp.json` | `mcpServers` |
| VS Code        | `.vscode/mcp.json`                        | `servers`    |
| OpenCode       | `opencode.json`                           | `mcp`        |
| Antigravity    | `mcp_config.json` (desde la UI)           | `mcpServers` |

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add indec --env INDEC_API_TOKEN=<tu_token> -- npx -y @julianmantel/indec-mcp
```

Verificá con `claude mcp list`. Dentro de Claude Code, el comando `/mcp` muestra el estado de cada servidor.

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Abrí **Settings → Developer → Edit Config**, o editá el archivo directamente:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "indec": {
      "command": "npx",
      "args": ["-y", "@julianmantel/indec-mcp"],
      "env": {
        "INDEC_API_TOKEN": "<tu_token>"
      }
    }
  }
}
```

Guardá y **reiniciá Claude Desktop por completo**. Las herramientas aparecen en el ícono de herramientas del chat.

</details>

<details>
<summary><b>Cursor</b></summary>

Abrí **Settings → Cursor Settings → MCP → Add new global MCP server**, o editá `~/.cursor/mcp.json` (global) o `.cursor/mcp.json` (solo el proyecto actual):

```json
{
  "mcpServers": {
    "indec": {
      "command": "npx",
      "args": ["-y", "@julianmantel/indec-mcp"],
      "env": {
        "INDEC_API_TOKEN": "<tu_token>"
      }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

Creá `.vscode/mcp.json` en tu workspace. VS Code usa la clave `servers` (no `mcpServers`) y exige `type`. Para no dejar el token escrito en el archivo, podés pedirlo al iniciar con `inputs`:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "indec-token",
      "description": "Token JWT de la API del INDEC",
      "password": true
    }
  ],
  "servers": {
    "indec": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@julianmantel/indec-mcp"],
      "env": {
        "INDEC_API_TOKEN": "${input:indec-token}"
      }
    }
  }
}
```

</details>

<details>
<summary><b>OpenCode</b></summary>

OpenCode define los servidores directamente bajo `mcp`, con `command` como **arreglo** y las variables en `environment`. Editá `opencode.json` (en el proyecto) o `~/.config/opencode/opencode.json` (global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "indec": {
      "type": "local",
      "command": ["npx", "-y", "@julianmantel/indec-mcp"],
      "enabled": true,
      "environment": {
        "INDEC_API_TOKEN": "<tu_token>"
      }
    }
  }
}
```

Verificá con `opencode mcp list`. Para usarlo, mencioná el servidor en el prompt (por ejemplo: _"…usá indec"_).

</details>

<details>
<summary><b>Google Antigravity</b></summary>

1. En el panel del agente abrí el menú **⋯ → MCP Servers → Manage MCP Servers**.
2. Hacé clic en **View raw config** (abre `mcp_config.json`; la ubicación del archivo puede variar según la versión, por eso conviene abrirlo desde la interfaz).
3. Agregá el servidor:

```json
{
  "mcpServers": {
    "indec": {
      "command": "npx",
      "args": ["-y", "@julianmantel/indec-mcp"],
      "env": {
        "INDEC_API_TOKEN": "<tu_token>"
      }
    }
  }
}
```

4. Guardá y recargá el panel de MCP: `indec` debería aparecer con sus herramientas.

</details>

<details>
<summary><b>Otro cliente MCP</b></summary>

Cualquier cliente compatible con transporte **stdio** funciona. Necesita:

- **Comando:** `npx`
- **Argumentos:** `-y`, `@julianmantel/indec-mcp`
- **Variable de entorno:** `INDEC_API_TOKEN=<tu_token>`

</details>

### Alternativa: token desde un archivo `.env` (si clonaste el repositorio)

Si instalaste desde npm, poné el token en el bloque `env`/`environment` del cliente. Si clonaste el repositorio y preferís no escribirlo en la configuración (por ejemplo, porque ese archivo se sincroniza o se comparte), guardalo en un `.env` y pasalo con el flag `--env-file` de Node:

```bash
cp .env.example .env
# editá .env y completá INDEC_API_TOKEN
```

Después reemplazá el comando del cliente por:

```json
{
  "command": "node",
  "args": [
    "--env-file=<RUTA_AL_PROYECTO>/indec-mcp/.env",
    "<RUTA_AL_PROYECTO>/indec-mcp/dist/index.js"
  ]
}
```

> `.env.example` es solo una plantilla: el servidor **no** carga archivos `.env` por sí solo. El token se lee únicamente si la variable está en el entorno del proceso o si se usa `--env-file`. Esta opción requiere Node.js 20.6+.

## Variables de entorno

| Variable                   | Obligatoria | Por defecto                    | Descripción                                                         |
| -------------------------- | :---------: | ------------------------------ | ------------------------------------------------------------------- |
| `INDEC_API_TOKEN`          | Para datos  | -                              | Token JWT de la API del INDEC.                                      |
| `INDEC_API_BASE_URL`       |     No      | `https://api.indec.gob.ar/v1/` | URL base de la API. Solo se acepta HTTPS o `localhost`.             |
| `INDEC_API_ALLOWED_HOSTS`  |     No      | `api.indec.gob.ar`, loopback   | Hosts permitidos para la URL base, separados por coma y sin puerto. |
| `INDEC_CACHE_TTL_SECONDS`  |     No      | `3600`                         | Vida de la caché en memoria, en segundos. `0` la desactiva.         |
| `INDEC_REQUEST_TIMEOUT_MS` |     No      | `30000`                        | Timeout por solicitud HTTP, en milisegundos.                        |

## Herramientas disponibles

El flujo recomendado para consultas libres es: **listar → describir → consultar**. Las herramientas temáticas (`indec_get_*`) ya traen los filtros resueltos para los indicadores más usados.

### Catálogo (sin token)

| Herramienta              | Descripción                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `indec_status`           | Estado del servidor, si el token está configurado y si el spec remoto cambió respecto al snapshot. |
| `indec_list_datasets`    | Catálogo de datasets con identificador, área, frecuencia y resumen.                                |
| `indec_describe_dataset` | Columnas, tipos, nulabilidad, claves de orden y dimensiones temporales de un dataset.              |

### Consultas genéricas (requieren token)

| Herramienta           | Descripción                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `indec_query_dataset` | Consulta con `select`, `filters`, `order`, `limit` (máx. 1000) y `offset`.         |
| `indec_count_rows`    | Total exacto de filas, con filtros opcionales, sin transferir el dataset completo. |

### Indicadores temáticos (requieren token)

Si no indicás fechas, devuelven **solo el último período publicado**.

| Herramienta                 | Descripción                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `indec_get_ipc`             | IPC e inflación: nivel general o divisiones, por región y variación. |
| `indec_get_emae`            | EMAE a nivel general o desagregado por sectores de actividad.        |
| `indec_get_canastas`        | Canastas Básicas Alimentaria (CBA) y Total (CBT).                    |
| `indec_get_canasta_crianza` | Canasta de crianza por tramos de edad.                               |
| `indec_get_mercado_trabajo` | Tasas de actividad, empleo, desocupación y subocupación (EPH).       |
| `indec_get_pobreza`         | Incidencia de pobreza e indigencia en personas y hogares (EPH).      |
| `indec_get_salarios`        | Índice de Salarios por sector y tipo de indicador.                   |

## Solución de problemas

| Síntoma                                                   | Causa probable y solución                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El servidor no aparece o figura como desconectado         | Con el paquete publicado, confirmá que el cliente usa `npx -y @julianmantel/indec-mcp` (o `npx.cmd` en Windows). Si usás un clon, compilá con `npm run build` y revisá la ruta absoluta a `dist/index.js`. Reiniciá el cliente tras editar la config. |
| `Error de autenticación` / `Token no configurado`         | `INDEC_API_TOKEN` no llegó al proceso. Revisá el bloque `env` (u `environment` en OpenCode) o la ruta de `--env-file`. `indec_status` te lo confirma.                                                                                                 |
| Error 401 al consultar                                    | El token es inválido o venció (duran 12 meses). Generá uno nuevo en <https://api.indec.gob.ar>.                                                                                                                                                       |
| Error 429                                                 | Límite de solicitudes de la API. Esperá unos segundos; el servidor ya reintenta automáticamente con espera creciente.                                                                                                                                 |
| `node: bad option: --env-file`                            | Tu Node es anterior a 20.6. Actualizalo o usá el bloque `env` del cliente.                                                                                                                                                                            |
| Falla en OpenCode con la config copiada de otro cliente   | OpenCode usa `mcp` → nombre → `type`/`command` (arreglo)/`environment`. No acepta `mcpServers` ni `env`.                                                                                                                                              |
| Antigravity registra el servidor pero no hay herramientas | Revisá el JSON en _View raw config_ y recargá el panel MCP. Para servidores locales se usa `command`/`args`/`env`.                                                                                                                                    |
| Resultados incompletos o columnas que no existen          | La API del INDEC está en **BETA** y puede cambiar. Ejecutá `indec_status` para ver si el spec remoto difiere y consultá `indec_describe_dataset`.                                                                                                     |

Para depurar de forma aislada, abrí el servidor en el inspector oficial de MCP (reemplazá el token):

```bash
INDEC_API_TOKEN=<tu_token> npx @modelcontextprotocol/inspector npx -y @julianmantel/indec-mcp
```

Si estás probando un clon local, reemplazá el último comando por `node dist/index.js` después de `npm run build`.

Los logs del servidor salen por `stderr`; `stdout` está reservado al protocolo MCP.

## Desarrollo

```bash
npm install
npm run gen               # regenera el registry desde docs/openapi.snapshot.json
npm run gen -- --fetch    # descarga el spec actualizado del INDEC y regenera
npm run build             # compila a dist/
npm run dev               # ejecuta con tsx (sin compilar)
npm test                  # tests con vitest (ninguno llama a la API real)
npm run lint              # eslint + prettier
```

Notas:

- `src/datasets/registry.generated.ts` es un archivo generado: **no se edita a mano**.
- Los tests usan `fetch` simulado; ninguno requiere token ni red.
- Las convenciones del proyecto y las reglas para agentes de código están en [`AGENTS.md`](./AGENTS.md).

## Arquitectura

```text
src/
├── index.ts                  # composition root (stdio)
├── server.ts                 # registro de las 12 herramientas MCP
├── container.ts              # construcción de cliente, registry y servicio
├── config.ts                 # variables de entorno validadas con zod
├── client/
│   ├── transport.ts          # autenticación, timeout y reintentos
│   ├── indec-client.ts       # transporte, caché y PostgREST
│   ├── postgrest.ts          # construcción de parámetros de consulta
│   ├── cache.ts              # caché en memoria con TTL y límite de entradas
│   └── errors.ts             # errores de dominio y mapeo de estados HTTP
├── datasets/
│   ├── types.ts              # tipos de datasets y columnas
│   ├── registry.ts           # búsqueda, obtención y sugerencias
│   └── registry.generated.ts # archivo generado desde el snapshot OpenAPI
├── services/
│   ├── dataset-query.ts      # validación y ejecución de consultas
│   ├── latest-period.ts      # resolución del último período publicado
│   └── period-filters.ts     # filtros de período de las herramientas curadas
└── tools/
    ├── context.ts            # contexto inyectado en las herramientas
    ├── presentation.ts       # formato de respuestas y advertencias
    ├── errors.ts             # presentación de errores
    ├── meta.ts               # status, list y describe
    ├── query.ts              # query y count genéricos
    └── curated/              # herramientas por tema
```

## Casos de uso

### 1. Perfil regional para focalizar programas

**Situación:** un organismo público o un equipo de investigación necesita un panorama actualizado de pobreza, empleo y costo de vida para un informe o una presentación.

**Prompt pasado el agente**

```text
Preparame un tablero de situación social con el último semestre publicado:
pobreza e indigencia (personas y hogares) con su variación contra el semestre
anterior, la desocupación del período más cercano y el costo de la canasta
básica total para un hogar de 4 integrantes. Indicá el período de cada dato
y si está marcado como provisorio.
```

**Qué hace el servidor:** consulta pobreza, mercado de trabajo y canastas (`indec_get_pobreza`, `indec_get_mercado_trabajo`, `indec_get_canastas`).

**Resultado:** una tabla con el valor de cada indicador, su variación y su período, con las observaciones de la fuente (por ejemplo, datos provisorios).

### 2. Series con fuente verificable para investigación y periodismo

**Situación:** una nota o un trabajo académico requiere datos con origen verificable y mencionar qué dataset se usó.

**Prompt pasado el agente**

```text
Listá los datasets del INDEC relacionados con comercio exterior, describí las
columnas del más relevante y traé la serie de los últimos 5 años.
Indicá el nombre exacto del dataset y los filtros aplicados para que pueda
citarlo.
```

**Qué hace el servidor:** recorre el catálogo y la estructura de los datasets (`indec_list_datasets`, `indec_describe_dataset`) y ejecuta la consulta (`indec_query_dataset`).

**Resultado:** serie con nombre de dataset, filtros y período, para citar y reproducir.

## Fuente de los datos

Fuente: INDEC - Catálogo API-INDEC, <https://api.indec.gob.ar>.
Este proyecto solo facilita el acceso a la API pública y no modifica ni reinterpreta las cifras oficiales.
