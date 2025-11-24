# 0002 — Upgrade Plan

## Fases

### 1) Higiene
- Reforzar `.gitignore`.
- Alinear estándares de lint/format.
- Verificar TS `strict` (solo propuesta).

### 2) Arquitectura
- Documentar API (docs/API.md).
- Alinear contratos (Zod) en Edge Functions.

### 3) Pruebas y CI
- Añadir pruebas unitarias básicas (servicios/utilidades).
- Configurar CI para lint + type-check.

### 4) Deploy
- Documentar variables, runbooks, health checks.
- Proponer alertas de plataforma.

## VERIFY
```bash
# Revisar API docs
sed -n '1,200p' docs/API.md

# Verificar snippets
sed -n '1,200p' snippets/commands.md
sed -n '1,200p' snippets/gitignore.txt
```

## Rollback
- Revertir archivos nuevos si se decide no continuar con la estandarización.












