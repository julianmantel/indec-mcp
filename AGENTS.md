# AGENTS.md - indec-mcp

Servidor MCP (Model Context Protocol) de **solo lectura** para consultar las estadísticas oficiales del INDEC (Argentina) desde agentes de IA, sobre la API `https://api.indec.gob.ar/v1/`.

## 1. Especificaciones

1. La página de docs (`https://api.indec.gob.ar/docs`) se renderiza con JavaScript. Si el navegador no la muestra completa, **no inventes endpoints**.
2. El spec OpenAPI es público: `GET https://api.indec.gob.ar/v1/`. Descargalo a `docs/openapi.snapshot.json` y úsalo como única fuente de verdad de datasets, columnas, tipos y claves de orden.
3. La API es estilo **PostgREST**: cada dataset es una "tabla". Filtros con `col=eq.valor`, `gte.`, `lte.`, `in.(a,b)`; además `select`, `order`, `limit`, `offset`. El total exacto se pide con el header `Prefer: count=exact` y se lee de `Content-Range`.
4. La API está en **BETA**: el spec puede cambiar. Diseñá el código para tolerarlo (ver sección 6).
5. Si algo del spec contradice este archivo, **gana el spec**; avisá y actualizá este archivo.

## 2. Autenticación

- Consultar datos requiere un **token JWT gratuito** (registro en `https://api.indec.gob.ar`, verificación por OTP, se genera desde el perfil, se muestra una sola vez, vence a los 12 meses).
- Se lee de la variable de entorno `INDEC_API_TOKEN`. Verificá en el spec el esquema exacto del header (esperable: `Authorization: Bearer <token>`).
- **Nunca** hardcodear, loguear, imprimir ni commitear el token. Incluir `.env` en `.gitignore` y mantener un `.env.example` sin valores reales.
- Listar/describir datasets debe funcionar **sin token** (usa el spec público).
- Si falta el token en una tool que lo requiere, devolver un error claro y accionable, no un stack trace.

## 3. Stack utilizado

- **TypeScript** estricto (`"strict": true`), Node.js >= 20, ESM.
- SDK: `@modelcontextprotocol/sdk` (oficial). Validación de inputs con `zod`.
- Transporte: **stdio** por defecto.
- Tests: `vitest`. Lint/format: `eslint` + `prettier`.
- HTTP con `fetch` nativo. Sin dependencias innecesarias.

## 4. Diseño de tools MCP

- Prefijo `indec_` en todos los nombres (snake_case).
- Descripciones en **español**, claras y orientadas al LLM (qué hace, cuándo usarla, ejemplo).
- Flujo recomendado que las descripciones deben reforzar: `indec_list_datasets` → `indec_describe_dataset` → tool curada o `indec_query_dataset`.
- Mínimo a implementar:
  - `indec_status`: token configurado (sí/no, **nunca el valor**), base URL, y si el spec público cambió vs. el snapshot. Sin token.
  - `indec_list_datasets`: catálogo (id, área, frecuencia, resumen). Sin token.
  - `indec_describe_dataset`: columnas, tipos, claves de orden, frecuencia. Sin token.
  - `indec_query_dataset`: consulta genérica con `select`, `filters`, `order`, `limit`, `offset`.
  - `indec_count_rows`: total exacto sin traer datos.
  - Tools curadas por tema (IPC, EMAE, canasta, etc.) solo después de verificar columnas reales en el spec.
- Las tools de series de tiempo, sin rango de fechas, devuelven **solo el último período** (evita respuestas enormes).
- Todas las tools son `readOnlyHint: true`.

## 5. Reglas de respuesta

- `limit` por defecto **50**, máximo **1000**. Si hay más, indicar en la respuesta que está truncado y cómo paginar.
- Devolver JSON estructurado más un resumen corto en texto. Incluir siempre la **fuente**: "Fuente: INDEC - Catálogo API-INDEC" y el dataset consultado.
- Validar que columnas y filtros existan en el registry antes de llamar a la API; si no existen, sugerir las válidas.
- Errores HTTP mapeados a mensajes útiles: 401/403 (token inválido o vencido), 404 (dataset), 429 (rate limit, sugerir esperar), 5xx (reintentar).

## 6. Seguridad

- Timeout por request: `INDEC_REQUEST_TIMEOUT_MS` (default 30000).
- Caché en memoria: `INDEC_CACHE_TTL_SECONDS` (default 3600, 0 = sin caché).
- Reintentos con backoff exponencial solo en 429/5xx (máx. 3).
- **Prohibido el swallow silencioso de errores: todo `catch` debe relanzar, loguear a `stderr` o devolver una advertencia al usuario.** Los errores de auth (401/403) y rate limit (429) se relanzan siempre. Los logs deben ser simples, sin token ni detalles técnicos que puedan filtrar información sensible.
- `INDEC_API_BASE_URL` (default `https://api.indec.gob.ar/v1/`): aceptar **solo HTTPS** (o localhost), porque el token viaja en cada request.
- El registry de datasets se **genera** desde el spec (`npm run gen`), no se escribe a mano. `npm run gen -- --fetch` actualiza el snapshot.
- Solo lectura: no implementar ninguna operación de escritura (POST/PATCH/DELETE).
- Sanitizar todo input antes de armarlo como query param (usar `URLSearchParams`, nunca concatenar strings).
- En stdio, **nunca escribir a `stdout`** nada que no sea protocolo MCP. Los logs van a `stderr`.
- No incluir el token en mensajes de error, logs ni respuestas.

## 7. Comandos

```bash
npm install
npm run gen            # regenera registry desde docs/openapi.snapshot.json
npm run gen -- --fetch # baja el spec actualizado y regenera
npm run build
npm run dev
npm test
npm run lint
npx @modelcontextprotocol/inspector node dist/index.js   # probar tools
```

## 8. Definición de "terminado"

- [ ] `npm run build`, `npm test` y `npm run lint` pasan.
- [ ] El MCP Inspector lista todas las tools y devuelve datos reales con un token válido.
- [ ] Sin token, `indec_list_datasets` y `indec_describe_dataset` funcionan y el resto da un error claro.
- [ ] README con instalación, variables de entorno, ejemplos y aviso de no afiliación + cita de fuente.
