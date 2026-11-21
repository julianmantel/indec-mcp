# indec-mcp

[![npm](https://img.shields.io/npm/v/@julianmantel/indec-mcp)](https://www.npmjs.com/package/@julianmantel/indec-mcp)

**Conectá tu asistente de IA con los datos oficiales del INDEC (Argentina)** para que te responda sobre inflación, actividad económica, canastas, pobreza, empleo, salarios y más, con cifras reales y actualizadas, no de memoria.

> Proyecto **no oficial**, sin afiliación con el INDEC. Los datos pertenecen al Instituto Nacional de Estadística y Censos de la República Argentina.

## ¿Qué es esto, en simple?

Los asistentes de IA (Claude, Cursor, etc.) saben mucho, pero no tienen acceso directo a las estadísticas más recientes del INDEC. Este proyecto es un **"enchufe"** que les da ese acceso.

Una vez instalado, le preguntás a tu asistente en lenguaje normal y él mismo consulta al INDEC y te trae la respuesta:

```text
Cuál fue la última inflación mensual publicada por el INDEC?
Comparame la inflación interanual de GBA y Patagonia durante 2024.
Cuánto cuesta hoy la canasta básica total? Y la de crianza para un niño de 1 a 3 años?
Mostrame la evolución de la desocupación en el Gran Buenos Aires desde 2022.
Qué datasets tiene la API del INDEC sobre comercio exterior?
```

## Índice

- [Lo que vas a necesitar](#lo-que-vas-a-necesitar)
- [Guía paso a paso](#guía-paso-a-paso)
- [Qué podés pedirle a tu asistente](#qué-podés-pedirle-a-tu-asistente)
- [Instalación en otros programas](#instalación-en-otros-programas)
- [Problemas frecuentes](#problemas-frecuentes)
- [Glosario](#glosario)
- [Referencia técnica](#referencia-técnica)
- [Fuente de los datos](#fuente-de-los-datos)

## Lo que vas a necesitar

| Qué                                   | Para qué                                                                                                                                                                             | Costo             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| **Un asistente de IA compatible**     | Es donde vas a hacer las preguntas. Los más simples para empezar son [Claude Desktop](https://claude.ai/download) o Claude Code. También funciona con Cursor, OpenCode y Antigravity | Según el programa |
| **Node.js** (versión 20.6 o superior) | Es un programa necesario para que el sistema funcione. Se instala una sola vez                                                                                                       | Gratis            |
| **Un token del INDEC**                | Es una clave personal que te da acceso a los datos. Se obtiene con una cuenta gratuita                                                                                               | Gratis            |

## Guía paso a paso

### Paso 1. Instalá Node.js

1. Entrá a <https://nodejs.org> y descargá la versión marcada como **LTS**.
2. Abrí el instalador y seguí las pantallas dejando todo por defecto.
3. Verificá que quedó bien. Abrí una **terminal**:
   - **Windows:** apretá la tecla Windows, escribí `PowerShell` y abrilo.
   - **Mac:** apretá `Cmd + Espacio`, escribí `Terminal` y abrila.
4. Escribí esto y apretá Enter:

   ```bash
   node -v
   ```

   Tiene que aparecer un número que empiece con `v20` o más (por ejemplo `v22.1.0`). Si aparece uno menor a `v20.6`, instalá la versión LTS de nuevo.

### Paso 2. Conseguí tu token del INDEC

1. Registrate en <https://api.indec.gob.ar>.
2. Revisá tu mail: te llega un **código de verificación (OTP)**. Ingresalo para confirmar tu cuenta.
3. Desde tu perfil, generá tu **token**.
4. **Copialo y guardalo enseguida** (por ejemplo, en un bloc de notas): se muestra **una sola vez**. Si lo perdés, tenés que generar otro.

> El token vence a los **12 meses**. Cuando deje de funcionar, generá uno nuevo y reemplazalo donde lo pusiste.
>
> Tratalo como una contraseña: no lo publiques ni lo compartas.

### Paso 3. Conectalo a tu asistente

Elegí **una** de estas dos opciones, la que corresponda a tu programa. Si no estás seguro, usá **Claude Desktop**.

#### Opción A: Claude Desktop (la más común)

1. Abrí Claude Desktop y andá a **Settings → Developer → Edit Config**. Se abre una carpeta con un archivo llamado `claude_desktop_config.json`.
2. Abrí ese archivo con el Bloc de notas (o cualquier editor de texto).
3. Si el archivo está vacío o dice solo `{}`, **borrá todo y pegá esto**, reemplazando `PEGA_AQUI_TU_TOKEN` por tu token (dejá las comillas):

   ```json
   {
     "mcpServers": {
       "indec": {
         "command": "npx",
         "args": ["-y", "@julianmantel/indec-mcp"],
         "env": {
           "INDEC_API_TOKEN": "PEGA_AQUI_TU_TOKEN"
         }
       }
     }
   }
   ```

   Si el archivo **ya tenía otros servidores** en `mcpServers`, agregá solo el bloque `"indec": { ... }` dentro de esa lista, separado del anterior por una coma.

4. Guardá el archivo.
5. **Cerrá Claude Desktop por completo** (no alcanza con cerrar la ventana: en Windows, cerralo también desde el ícono de la barra de tareas; en Mac, usá `Cmd + Q`) y volvelo a abrir.

> **En Windows:** si más adelante te dice que no encuentra `npx`, cambiá `"command": "npx"` por `"command": "npx.cmd"`.

#### Opción B: Claude Code

Pegá este comando en la terminal, reemplazando `<tu_token>` por tu token:

```bash
claude mcp add indec --env INDEC_API_TOKEN=<tu_token> -- npx -y @julianmantel/indec-mcp
```

Para ver que quedó conectado: `claude mcp list`.

¿Usás Cursor, VS Code, OpenCode o Antigravity? Mirá la sección [Instalación en otros programas](#instalación-en-otros-programas).

### Paso 4. Probalo

Abrí una conversación nueva en tu asistente y escribí:

```text
Usá el servidor indec y decime el estado de la conexión (indec_status).
```

- Si todo salió bien, te va a mostrar **`Token configurado: Sí`**.
- Después hacele una pregunta real, por ejemplo: _"Cuál fue la última inflación mensual publicada por el INDEC?"_

Es posible que tu asistente te pida **permiso** la primera vez que usa la herramienta. Es normal: aceptá para que pueda consultar los datos.

Si algo no funciona, mirá [Problemas frecuentes](#problemas-frecuentes).

## Qué podés pedirle a tu asistente

No necesitás aprender comandos ni nombres técnicos. Preguntale como le preguntarías a una persona, y el asistente elige solo qué herramienta usar. Estas son las áreas disponibles:

| Si querés saber sobre...       | Ejemplo de pregunta                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| **Inflación** (IPC)            | _"Cuál fue la inflación del último mes y la interanual?"_                                 |
| **Actividad económica** (EMAE) | _"Cómo viene la actividad económica comparada con el año pasado?"_                        |
| **Canastas básicas**           | _"Cuánto cuesta la canasta básica total para una familia de 4?"_                          |
| **Canasta de crianza**         | _"Cuánto cuesta criar a un niño de 1 a 3 años?"_                                          |
| **Empleo y desocupación**      | _"Cómo evolucionó el desempleo en Gran Buenos Aires desde 2022?"_                         |
| **Pobreza e indigencia**       | _"Cuál es el último dato de pobreza en personas y en hogares?"_                           |
| **Salarios**                   | _"Cómo evolucionó el índice de salarios por sector?"_                                     |
| **Actualizar montos**          | _"Tengo $500.000 de marzo de 2025: cuánto equivalen en septiembre de 2025 según el IPC?"_ |
| **Otros temas**                | _"Qué datos tiene el INDEC sobre comercio exterior?"_                                     |

Consejos para mejores respuestas:

- **Indicá el período** que te interesa ("desde 2022", "en 2024"). Si no lo hacés, te trae solo el **último dato publicado**.
- Pedile que **te aclare de qué período es cada dato** y si es provisorio.
- Si necesitás **citar la fuente**, pedile el nombre exacto del dataset y los filtros usados.

> Las herramientas que exploran el catálogo (qué datos existen y cómo están armados) funcionan incluso **sin token**. Para traer cifras sí hace falta.

## Instalación en otros programas

Todos necesitan lo mismo: el comando `npx`, el paquete `@julianmantel/indec-mcp` y la variable `INDEC_API_TOKEN` (tu token). Lo único que cambia entre programas es **en qué archivo** se configura y **cómo se llama la clave principal** (`mcpServers`, `servers` o `mcp`).

| Programa       | Dónde se configura                        | Clave principal |
| -------------- | ----------------------------------------- | --------------- |
| Claude Code    | Comando `claude mcp add`                  | -               |
| Claude Desktop | `claude_desktop_config.json`              | `mcpServers`    |
| Cursor         | `~/.cursor/mcp.json` o `.cursor/mcp.json` | `mcpServers`    |
| VS Code        | `.vscode/mcp.json`                        | `servers`       |
| OpenCode       | `opencode.json`                           | `mcp`           |
| Antigravity    | `mcp_config.json` (desde la interfaz)     | `mcpServers`    |

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
<summary><b>Otro programa compatible con MCP</b></summary>

Cualquier cliente compatible con transporte **stdio** funciona. Necesita:

- **Comando:** `npx`
- **Argumentos:** `-y`, `@julianmantel/indec-mcp`
- **Variable de entorno:** `INDEC_API_TOKEN=<tu_token>`

</details>

<details>
<summary><b>Avanzado: guardar el token en un archivo <code>.env</code> (solo si clonaste el repositorio)</b></summary>

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

</details>

## Problemas frecuentes

| Problema                                                                                    | Qué probar                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No aparece el servidor** en mi asistente                                                  | Cerrá el programa **por completo** y abrilo de nuevo. Revisá que el archivo de configuración esté bien guardado.                                                        |
| **Dice que no encuentra `npx`** (Windows)                                                   | Cambiá `"command": "npx"` por `"command": "npx.cmd"`. Si sigue igual, reinstalá Node.js y reiniciá la computadora.                                                      |
| **Error al abrir el archivo de configuración** o el programa no arranca después de editarlo | Casi siempre es una coma o una comilla de más o de menos. Copiá de nuevo el bloque de esta guía y respetá las llaves `{ }` y las comas.                                 |
| **"Token no configurado"** o **"Error de autenticación"**                                   | El token no llegó al servidor. Revisá que lo pegaste en `INDEC_API_TOKEN`, entre comillas y sin espacios. Pedile al asistente: _"usá indec_status"_ para verificar.     |
| **Error 401** al consultar                                                                  | El token es inválido o venció (duran 12 meses). Generá uno nuevo en <https://api.indec.gob.ar>.                                                                         |
| **Error 429**                                                                               | Hiciste muchas consultas seguidas. Esperá unos segundos: el servidor reintenta solo.                                                                                    |
| **Resultados incompletos** o una columna que no existe                                      | La API del INDEC está en versión **BETA** y puede cambiar. Pedile al asistente que ejecute `indec_status` y `indec_describe_dataset` para revisar la estructura actual. |
| El asistente **responde de memoria** y no usa el servidor                                   | Pedíselo explícitamente: _"Usá el servidor indec para..."_.                                                                                                             |

### Detalle técnico por programa

| Síntoma                                                   | Causa probable y solución                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El servidor no aparece o figura como desconectado         | Con el paquete publicado, confirmá que el cliente usa `npx -y @julianmantel/indec-mcp` (o `npx.cmd` en Windows). Si usás un clon, compilá con `npm run build` y revisá la ruta absoluta a `dist/index.js`. Reiniciá el cliente tras editar la config. |
| `Error de autenticación` / `Token no configurado`         | `INDEC_API_TOKEN` no llegó al proceso. Revisá el bloque `env` (u `environment` en OpenCode) o la ruta de `--env-file`. `indec_status` te lo confirma.                                                                                                 |
| `node: bad option: --env-file`                            | Tu Node es anterior a 20.6. Actualizalo o usá el bloque `env` del cliente.                                                                                                                                                                            |
| Falla en OpenCode con la config copiada de otro cliente   | OpenCode usa `mcp` → nombre → `type`/`command` (arreglo)/`environment`. No acepta `mcpServers` ni `env`.                                                                                                                                              |
| Antigravity registra el servidor pero no hay herramientas | Revisá el JSON en _View raw config_ y recargá el panel MCP. Para servidores locales se usa `command`/`args`/`env`.                                                                                                                                    |

Para depurar de forma aislada, abrí el servidor en el inspector oficial de MCP (reemplazá el token):

```bash
INDEC_API_TOKEN=<tu_token> npx @modelcontextprotocol/inspector npx -y @julianmantel/indec-mcp
```

Si estás probando un clon local, reemplazá el último comando por `node dist/index.js` después de `npm run build`.

Los logs del servidor salen por `stderr`; `stdout` está reservado al protocolo MCP.

> **Nota:** si en la terminal ejecutás `npx -y @julianmantel/indec-mcp` directamente y ves el mensaje _"Servidor indec-mcp inicializado correctamente por stdio"_ y se queda esperando, **es normal**: significa que funciona, y está esperando que tu asistente le hable. Cortalo con `Ctrl + C`. No hace falta dejarlo abierto, tu asistente lo inicia solo.

## Referencia técnica

### Instalación global (opcional)

`npx` descarga y ejecuta la versión publicada automáticamente. Si preferís tenerlo siempre disponible, instalalo globalmente y usá `indec-mcp` como comando:

```bash
npm install -g @julianmantel/indec-mcp
```

### Variables de entorno

| Variable                   | Obligatoria | Por defecto                    | Descripción                                                         |
| -------------------------- | :---------: | ------------------------------ | ------------------------------------------------------------------- |
| `INDEC_API_TOKEN`          | Para datos  | -                              | Token JWT de la API del INDEC.                                      |
| `INDEC_API_BASE_URL`       |     No      | `https://api.indec.gob.ar/v1/` | URL base de la API. Solo se acepta HTTPS o `localhost`.             |
| `INDEC_API_ALLOWED_HOSTS`  |     No      | `api.indec.gob.ar`, loopback   | Hosts permitidos para la URL base, separados por coma y sin puerto. |
| `INDEC_CACHE_TTL_SECONDS`  |     No      | `3600`                         | Vida de la caché en memoria, en segundos. `0` la desactiva.         |
| `INDEC_REQUEST_TIMEOUT_MS` |     No      | `30000`                        | Timeout por solicitud HTTP, en milisegundos.                        |

### Herramientas disponibles

El flujo recomendado para consultas libres es: **listar → describir → consultar**. Las herramientas temáticas (`indec_get_*`) ya traen los filtros resueltos para los indicadores más usados. Tu asistente las elige solo; esta tabla es informativa.

#### Catálogo (sin token)

| Herramienta              | Descripción                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `indec_status`           | Estado del servidor, si el token está configurado y si el spec remoto cambió respecto al snapshot. |
| `indec_list_datasets`    | Catálogo de datasets con identificador, área, frecuencia y resumen.                                |
| `indec_describe_dataset` | Columnas, tipos, nulabilidad, claves de orden y dimensiones temporales de un dataset.              |

#### Consultas genéricas (requieren token)

| Herramienta           | Descripción                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `indec_query_dataset` | Consulta con `select`, `filters`, `order`, `limit` (máx. 1000) y `offset`.         |
| `indec_count_rows`    | Total exacto de filas, con filtros opcionales, sin transferir el dataset completo. |

#### Indicadores temáticos (requieren token)

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

#### Cálculo de variaciones (requieren token)

| Herramienta                | Descripción                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `indec_calcular_variacion` | Variación acumulada, anualizada y promedio mensual entre dos períodos de un índice; actualiza montos y contrasta con la variación oficial. |

### Casos de uso

#### 1. Perfil regional para focalizar programas

**Situación:** un organismo público o un equipo de investigación necesita un panorama actualizado de pobreza, empleo y costo de vida para un informe o una presentación.

**Prompt para el agente**

```text
Preparame un tablero de situación social con el último semestre publicado:
pobreza e indigencia (personas y hogares) con su variación contra el semestre
anterior, la desocupación del período más cercano y el costo de la canasta
básica total para un hogar de 4 integrantes. Indicá el período de cada dato
y si está marcado como provisorio.
```

**Qué hace el servidor:** consulta pobreza, mercado de trabajo y canastas (`indec_get_pobreza`, `indec_get_mercado_trabajo`, `indec_get_canastas`).

**Resultado:** una tabla con el valor de cada indicador, su variación y su período, con las observaciones de la fuente (por ejemplo, datos provisorios).

#### 2. Series con fuente verificable para investigación y periodismo

**Situación:** una nota o un trabajo académico requiere datos con origen verificable y mencionar qué dataset se usó.

**Prompt para el agente**

```text
Listá los datasets del INDEC relacionados con comercio exterior, describí las
columnas del más relevante y traé la serie de los últimos 5 años.
Indicá el nombre exacto del dataset y los filtros aplicados para que pueda
citarlo.
```

**Qué hace el servidor:** recorre el catálogo y la estructura de los datasets (`indec_list_datasets`, `indec_describe_dataset`) y ejecuta la consulta (`indec_query_dataset`).

**Resultado:** serie con nombre de dataset, filtros y período, para citar y reproducir.

### Desarrollo

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

### Estructura del proyecto

```text
src/
├── index.ts                  # composition root (stdio)
├── server.ts                 # registro de las 13 herramientas MCP
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
│   ├── period-filters.ts     # filtros de período de las herramientas curadas
│   ├── index-math.ts         # matemática de variaciones (sin I/O)
│   └── series-variation.ts   # cálculo de variaciones sobre una serie del registry
└── tools/
    ├── context.ts            # contexto inyectado en las herramientas
    ├── presentation.ts       # formato de respuestas y advertencias
    ├── errors.ts             # presentación de errores
    ├── meta.ts               # status, list y describe
    ├── query.ts              # query y count genéricos
    └── curated/              # herramientas por tema
```

## Fuente de los datos

Fuente: INDEC - Catálogo API-INDEC, <https://api.indec.gob.ar>.
Este proyecto solo facilita el acceso a la API pública y no modifica ni reinterpreta las cifras oficiales.
