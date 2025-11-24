# API — Edge Functions (Supabase)

> Todas las funciones responden JSON y aceptan `OPTIONS` con CORS.

## Autenticación
- Header: `Authorization: Bearer <SUPABASE_ANON_KEY>` (o token de usuario si aplica)
- `Content-Type: application/json`

---

## POST /generate-summary
- Propósito: Generar resumen SOAP con Gemini y persistirlo en `summaries`.
- Body:
```json
{
  "consultation_id": "<uuid>",
  "transcript": [
    { "sender": "user", "text": "hola" },
    { "sender": "nova", "text": "¿qué sientes?" }
  ],
  "language": "es"
}
```
- 200 OK:
```json
{ "summary_id": "<uuid>", "html": "<h2>SOAP</h2>..." }
```
- 400/401/500: error JSON con `error`.

---

## POST /save-consultation
- Propósito: Guardar consulta completa (consulta, transcripciones, checkpoints).
- Body (ejemplo mínimo):
```json
{
  "session_id": "<uuid>",
  "patient_name": "Ana Pérez",
  "language": "es",
  "transcript": [ { "sender": "user", "text": "..." } ]
}
```
- 200 OK:
```json
{ "consultation_id": "<uuid>" }
```

---

## GET /get-consultations
- Propósito: Listar historial de consultas del usuario autenticado.
- Query params: `limit`, `offset` (opcional).
- 200 OK:
```json
{ "items": [ { "id": "<uuid>", "patient_name": "Ana" } ], "total": 1 }
```

---

## POST /send-summary-email
- Propósito: Enviar el resumen clínico al correo del médico (Resend u otro).
- Body:
```json
{ "consultation_id": "<uuid>", "doctor_email": "dr@example.com" }
```
- 200 OK:
```json
{ "sent": true, "at": "2025-11-03T00:00:00Z" }
```

---

## Códigos de Error (comunes)
- 400: Parámetros inválidos / validación fallida.
- 401: No autenticado / token inválido.
- 403: No autorizado (RLS/rol).
- 404: Recurso no encontrado.
- 429: Rate limiting.
- 500: Error interno.

## Notas
- Validar input con Zod en el backend.
- Sanitizar HTML antes de guardar/mostrar.
- Añadir `correlationId` en logs cuando aplique.












