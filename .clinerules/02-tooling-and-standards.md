# Tooling & Standards — Cabo Health Nova

## Languages/TS
- TypeScript con `strict` recomendado; definir interfaces/types para DTOs/respuestas.
- Evitar `any` silencioso. Preferir async/await; try/catch con mensajes útiles y códigos consistentes.
- Módulos pequeños y de responsabilidad única.

## Lint & Format
- ESLint + (formateo consistente). Bloquear merges en CI si falla lint.
- Reglas mínimas: no-unused-vars=error, explicit-function-return-type=warn, prefer-const=error, no-var=error.
- Formato: 2 espacios, comillas simples, punto y coma ON, trailing commas en multilínea.

## Testing
- Unit + integración (mock de APIs externas cuando aplique).
- Meta inicial: cobertura líneas 60%, ramas 40% (ajustar según evolución).
- Patrón Arrange–Act–Assert.

## API Contract (Edge Functions)
- Documentar en OpenAPI 3.0 cuando sea viable; incluir ejemplos de request/response y códigos de error.
- Versionado semántico (v1, v1.1…) para breaking changes.

## Seguridad
- Nunca commitear secretos; rotación periódica; principio de mínimo privilegio.
- Validación de esquema (Zod) y sanitización; rate limiting por IP/API key.
- CORS restringido; CSP/HSTS cuando aplique. No loggear datos sensibles.

## Observabilidad
- Logging estructurado con `correlationId` (cuando aplique en Edge Functions).
- Métricas: p50/p95/p99, tasa de error por función, throughput, cold starts.

## Cline Workflow
- PLAN → DIFFS → VERIFY; no aplicar cambios sin aprobación explícita.
- JIT-first: usar glob/grep/head/tail antes de abrir archivos completos.
- Compaction: cada 10–15 acciones, resumir en 15–25 líneas y limpiar salidas previas.
- Web Search (si aplica): resumen + 1–3 citas, máximo 10–20 resultados.
- Respuestas cortas y semánticas; evitar blobs/IDs/logs extensos.




