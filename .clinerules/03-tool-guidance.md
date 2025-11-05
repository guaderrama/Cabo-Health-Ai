# Tool Guidance — Cline en Cabo Health Nova

## Modo de Trabajo
- Usa PLAN → DIFFS → VERIFY.
- Espera aprobación antes de aplicar cambios grandes o sensibles.

## JIT-first
- Prefiere glob/grep/head/tail para localizar antes de leer archivos completos.
- Evita abrir archivos enteros si solo se necesita un fragmento.

## Compaction
- Cada 10–15 acciones: resume en 15–25 líneas y purga salidas previas de herramientas.

## Ediciones Seguras
- No modificar `src/` ni funciones Edge sin issue/tarea aprobada.
- Mantener `.clinerules/` y `memory/` fuera de VCS (ver `snippets/gitignore.txt`).

## Entregables
- PLAN (bullets + por qué) → DIFFS (diff unificado) → VERIFY (comandos).

## Notas
- Integrar hallazgos en `memory/DECISIONS.md` con fecha (YYYY-MM-DD).
- Actualizar `memory/NOTES.md` al cerrar sesión.




