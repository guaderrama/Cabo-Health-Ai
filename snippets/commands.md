# Snippets — Comandos útiles

## Desarrollo
```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm type-check
pnpm clean
```

## Supabase Edge Functions (ejemplos)
```bash
# Invocar generate-summary
curl -X POST "https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/generate-summary" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"consultation_id":"<uuid>","transcript":[{"sender":"user","text":"..."}]}'

# Obtener historial
curl -X GET "https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/get-consultations" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

## Health Check Básico
```bash
curl -I https://etric4luf0vq.space.minimax.io
```




