# Project Facts — Cabo Health Nova

## Stack y Versiones
- Frontend: React ^18.3.1, TypeScript ~5.6.2, Vite ^6.0.1
- UI: TailwindCSS v3.4.16, Radix UI (varios paquetes), tailwindcss-animate, lucide-react
- Estado/Forms: react-hook-form ^7.54.2, zod ^3.24.1
- Backend (BaaS): Supabase (@supabase/supabase-js ^2.78.0)
- IA: @google/genai ^1.28.0 (Gemini 2.5 Flash)
- Lint/Build: eslint ^9.15.0, @vitejs/plugin-react ^4.3.4

## Enlaces
- Producción: https://etric4luf0vq.space.minimax.io
- Documentación: docs/ (ARHITECTURE, SECURITY, OPERATIONS, SISTEMA_PERSISTENCIA)

## Comandos (pnpm)
```bash
pnpm dev            # Servidor de desarrollo (Vite)
pnpm build          # Build producción
pnpm build:prod     # Build optimizado (BUILD_MODE=prod)
pnpm preview        # Vista previa build
pnpm lint           # Lint
pnpm type-check     # TS typecheck
pnpm clean          # Limpiar caches/node_modules
```

## Variables de Entorno (Frontend)
```env
VITE_SUPABASE_URL=...            # URL Supabase
VITE_SUPABASE_ANON_KEY=...       # Public anon key
VITE_GEMINI_API_KEY=...          # API Key Gemini
```

## Variables de Entorno (Edge Functions)
```env
SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
DB_URL=...
AI_KEY=...
```

## Estructura Clave
- src/: componentes, contextos, servicios de audio, utilidades
- supabase/functions/: generate-summary, save-consultation, send-summary-email, get-consultations
- docs/: arquitectura, seguridad, operaciones, persistencia
- memory/: NOTES, TODO, DECISIONS, BLOCKERS

## Notas
- Mantener `.clinerules/` y `memory/` fuera de VCS; ver `snippets/gitignore.txt`.
- En TS, preferir `strict: true` (sugerido, confirmar antes de cambiar tsconfig).




