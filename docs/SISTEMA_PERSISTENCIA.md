# Sistema de Persistencia y Recuperación de Sesiones

## Descripcion General

El sistema de persistencia garantiza que **NUNCA** se pierda el progreso de una entrevista medica, incluso si ocurren interrupciones de red, errores de API, cierre del navegador, o cualquier otra falla.

El sistema opera en dos niveles:
1. **Checkpoints de Sesion**: Guardado automatico durante la entrevista (cada 2 mensajes)
2. **Cola de Resumenes**: Guardado del transcript completo ANTES de procesar con IA

## Características Principales

### 1. Guardado Automático Dual
- **localStorage**: Guardado inmediato para respaldo rápido
- **Supabase**: Persistencia en base de datos para acceso desde cualquier dispositivo
- **Frecuencia**: Cada 2 mensajes de conversación

### 2. Recuperación Inteligente
- Detecta sesiones interrumpidas al cargar la aplicación
- Muestra modal con información detallada de sesiones recuperables
- Permite continuar exactamente donde se quedó
- Valida integridad de datos antes de recuperar

### 3. Indicadores Visuales
- **Progress Indicator**: Muestra en tiempo real:
  - Número de preguntas respondidas
  - Tiempo transcurrido
  - Estado de guardado (guardando / guardado)
  - Barra de progreso visual

### 4. Manejo Robusto de Errores
- Reintentos automáticos con exponential backoff
- Guardado en localStorage como fallback si Supabase falla
- Validación de integridad de checkpoints
- Logs detallados para debugging

## Arquitectura Técnica

### Base de Datos

**Tabla**: `session_checkpoints`

```sql
CREATE TABLE session_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  patient_name TEXT,
  language TEXT NOT NULL,
  app_state TEXT NOT NULL,
  transcript JSONB NOT NULL DEFAULT '[]',
  current_input_transcription TEXT,
  current_output_transcription TEXT,
  session_start_time BIGINT NOT NULL,
  last_checkpoint_time BIGINT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Políticas RLS**:
- Los usuarios solo pueden ver/editar sus propios checkpoints
- Autenticación requerida para todas las operaciones

### Componentes

#### 1. `sessionPersistence.ts` (261 líneas)
Servicio principal de persistencia:

**Funciones principales**:
- `saveSessionCheckpoint()`: Guarda checkpoint dual (localStorage + Supabase)
- `findRecoverableSessions()`: Busca sesiones interrumpidas
- `loadCheckpoint()`: Carga checkpoint específico
- `clearCheckpoint()`: Limpia checkpoint al completar sesión
- `shouldSaveCheckpoint()`: Determina cuándo guardar
- `validateCheckpoint()`: Valida integridad de datos

**Características**:
- Reintentos con exponential backoff (3 intentos máximo)
- Base delay: 1 segundo, multiplicador: 2x
- Fallback a localStorage si Supabase falla

#### 2. `SessionRecoveryModal.tsx` (156 líneas)
Modal para recuperar sesiones:

**Funcionalidades**:
- Muestra lista de sesiones recuperables
- Información detallada: paciente, mensajes, tiempo transcurrido
- Preview del último mensaje
- Advertencia sobre pérdida de datos
- Opciones: Continuar o Empezar Nueva

#### 3. `ProgressIndicator.tsx` (137 líneas)
Indicador de progreso en tiempo real:

**Elementos visuales**:
- Contador de mensajes con badge azul
- Reloj con tiempo transcurrido (mm:ss o hh:mm:ss)
- Indicador de estado de guardado (con animaciones)
- Barra de progreso (asume ~20 mensajes para completar)

### Integración en App.tsx

**useEffects agregados**:

```typescript
// 1. Buscar sesiones recuperables al montar
useEffect(() => {
  const checkForRecoverableSessions = async () => {
    if (user?.id) {
      const sessions = await findRecoverableSessions(user.id);
      if (sessions.length > 0) {
        setRecoverableSessions(sessions);
        setShowRecoveryModal(true);
      }
    }
  };
  checkForRecoverableSessions();
}, [user?.id]);

// 2. Guardar checkpoint automáticamente
useEffect(() => {
  const saveCheckpoint = async () => {
    if (
      appState === 'LISTENING' &&
      shouldSaveCheckpoint(transcript.length, lastSavedMessageCount)
    ) {
      await saveSessionCheckpoint(...);
    }
  };
  saveCheckpoint();
}, [transcript.length, appState, ...]);
```

**Funciones agregadas**:
- `handleRecoverSession()`: Recupera sesión seleccionada
- `handleDismissRecovery()`: Descarta sesiones recuperables

**Modificaciones**:
- `handleEndSession()`: Limpia checkpoint al completar
- `handleStartSession()`: Resetea contadores de checkpoint

## Flujo de Usuario

### Escenario 1: Sesión Normal
1. Usuario inicia sesión con nombre de paciente
2. Comienza conversación con Nova
3. Cada 2 mensajes: guardado automático (indicador verde aparece)
4. Usuario ve progreso en tiempo real (mensajes, tiempo)
5. Al finalizar: genera resumen y limpia checkpoint

### Escenario 2: Interrupción y Recuperación
1. Usuario está en medio de entrevista (ej: 8 mensajes)
2. Ocurre interrupción (cierre de pestaña, error de red, etc.)
3. Usuario vuelve a abrir la aplicación
4. **Modal aparece automáticamente** mostrando:
   - "Sesión Interrumpida Detectada"
   - Información: paciente, 8 mensajes, tiempo transcurrido
   - Preview del último mensaje
5. Usuario hace clic en "Continuar Entrevista"
6. Transcript se restaura con los 8 mensajes previos
7. Usuario puede continuar sin pérdida de contexto

### Escenario 3: Error de Red Durante Guardado
1. Usuario responde pregunta (mensaje 10)
2. Sistema intenta guardar en Supabase
3. Red falla
4. Sistema guarda en localStorage exitosamente
5. Sistema reintenta Supabase (1s, 2s, 4s delays)
6. Si falla 3 veces: continúa con localStorage
7. Próximo guardado exitoso sincronizará Supabase

## Datos Persistidos

Para cada checkpoint se guarda:
- **Sesión**: ID único, timestamp de inicio, tiempo de último guardado
- **Paciente**: Nombre del paciente
- **Idioma**: es/en
- **Transcripción**: Array completo de mensajes con:
  - ID, remitente (You/Nova), texto, idioma
  - URLs de audio (si disponibles)
  - Timestamps
- **Estado actual**: Transcripciones en progreso (input/output)
- **Contadores**: Número de mensajes

## Validación de Integridad

Antes de recuperar un checkpoint, se valida:
- ✅ session_id existe y no está vacío
- ✅ user_id coincide con usuario actual
- ✅ language es válido (es/en)
- ✅ app_state es válido
- ✅ transcript es un array válido
- ✅ session_start_time es un número
- ✅ message_count es un número y > 0

Si la validación falla, el checkpoint se descarta.

## Configuración

### Variables de Configuración

En `sessionPersistence.ts`:

```typescript
const CHECKPOINT_INTERVAL = 2;       // Guardar cada 2 mensajes
const LOCAL_STORAGE_KEY = 'cabo_health_session_checkpoint';
const MAX_RETRY_ATTEMPTS = 3;        // Reintentos máximos
const RETRY_DELAY_BASE = 1000;       // 1 segundo base delay
```

### Personalización

Para cambiar la frecuencia de guardado:
```typescript
// En sessionPersistence.ts
const CHECKPOINT_INTERVAL = 3; // Guardar cada 3 mensajes
```

Para cambiar el comportamiento de reintentos:
```typescript
const MAX_RETRY_ATTEMPTS = 5;    // Más reintentos
const RETRY_DELAY_BASE = 2000;   // Delay más largo (2s)
```

## Testing y Debugging

### Pruebas Recomendadas

1. **Test de Guardado Automático**:
   - Iniciar sesión
   - Responder 2 preguntas
   - Verificar en DevTools > Application > Local Storage
   - Verificar en Supabase > session_checkpoints

2. **Test de Recuperación**:
   - Iniciar sesión y responder 5 preguntas
   - Cerrar pestaña sin finalizar sesión
   - Reabrir aplicación
   - Verificar que modal aparece
   - Recuperar sesión y verificar transcript

3. **Test de Fallo de Red**:
   - Iniciar sesión
   - En DevTools > Network, activar "Offline"
   - Responder 2 preguntas
   - Verificar que guardado ocurre en localStorage
   - Desactivar "Offline"
   - Responder 2 preguntas más
   - Verificar sincronización con Supabase

### Logs

El sistema genera logs en consola:
```
✅ Checkpoint guardado exitosamente
❌ Error guardando checkpoint (intento 1): [error]
🔄 Reintentando guardado en 2 segundos...
```

Para debugging, revisar:
- Console del navegador
- DevTools > Application > Local Storage
- Supabase Dashboard > Table Editor > session_checkpoints

## Limitaciones y Consideraciones

1. **LocalStorage**: Máximo 5-10MB dependiendo del navegador
2. **Sesiones antiguas**: Solo se muestran sesiones de últimas 24 horas
3. **Contexto de conversación**: La API de Gemini no persiste, solo el transcript
4. **Audio**: Solo se recupera el transcript, no los fragmentos de audio en progreso

## Mejoras Futuras Potenciales

- Sincronización en tiempo real con Supabase Realtime
- Compresión de checkpoints para reducir tamaño
- Exportación de sesiones interrumpidas
- Notificaciones push para sesiones pendientes
- Modo offline completo con queue de sincronización

## Cola de Generacion de Resumenes (pending_summaries)

### Proposito

Cuando el usuario finaliza una sesion, el sistema debe generar un resumen SOAP usando IA. Este proceso puede fallar por:
- Timeout de la API de Gemini
- Errores de red
- Limites de rate limiting
- El usuario cierra el navegador durante el procesamiento

La tabla `pending_summaries` garantiza que el transcript se guarde PRIMERO, antes de cualquier procesamiento de IA.

### Flujo de Finalizacion de Sesion

```
Usuario hace clic en "Finalizar Sesion"
           │
           ▼
┌─────────────────────────────────┐
│  1. GUARDAR en pending_summaries │  ◄── PRIMERO: datos seguros
│     status: 'pending'            │
│     transcript: [...mensajes]    │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  2. INTENTAR generar resumen     │
│     Gemini 3 Flash (primario)    │
│     Timeout: 120 segundos        │
└─────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 Exito         Fallo
    │             │
    ▼             ▼
┌─────────┐  ┌─────────────────────┐
│ status: │  │ INTENTAR fallback   │
│'completed'│  │ Gemini 2.5 Flash   │
│ summary: │  └─────────────────────┘
│ "..."    │           │
└─────────┘     ┌──────┴──────┐
                │             │
                ▼             ▼
             Exito         Fallo
                │             │
                ▼             ▼
          ┌─────────┐  ┌─────────┐
          │'completed'│  │ 'failed' │
          │ summary  │  │ error_msg│
          └─────────┘  └─────────┘
```

### Esquema de la Tabla

```sql
CREATE TABLE pending_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  transcript JSONB NOT NULL,           -- Array de mensajes
  patient_name TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  session_duration INTEGER,            -- Duracion en segundos
  status TEXT DEFAULT 'pending',       -- pending/processing/completed/failed
  summary TEXT,                        -- Resumen generado (si exitoso)
  error_message TEXT,                  -- Mensaje de error (si fallo)
  attempts INTEGER DEFAULT 0,          -- Numero de intentos
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ             -- Cuando se completo/fallo
);
```

### Servicio summaryQueue.ts

El servicio `src/services/summaryQueue.ts` proporciona las siguientes funciones:

| Funcion | Proposito |
|---------|-----------|
| `savePendingSummary()` | Guarda transcript en la cola |
| `savePendingSummaryWithRetry()` | Guarda con reintentos (backoff exponencial) |
| `updateSummaryStatus()` | Actualiza estado de un registro |
| `completeSummary()` | Marca como completado con resumen |
| `failSummary()` | Marca como fallido con mensaje de error |
| `incrementAttempts()` | Incrementa contador de intentos |
| `getPendingSummary()` | Obtiene registro por session_id |
| `getUserPendingSummaries()` | Lista resumenes pendientes de un usuario |
| `deletePendingSummary()` | Elimina registro (despues de enviar al medico) |

### Tipos TypeScript

```typescript
type PendingSummaryStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface PendingSummary {
  id?: string;
  session_id: string;
  user_id: string;
  transcript: TranscriptMessage[];
  patient_name?: string;
  language: Language;
  session_duration?: number;
  status: PendingSummaryStatus;
  summary?: string;
  error_message?: string;
  attempts: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}
```

### UX durante Procesamiento

El componente `SummaryPanel.tsx` muestra feedback visual durante el procesamiento:

1. **Badge Verde**: "Entrevista guardada" - confirma que los datos estan seguros
2. **Animacion de Carga**: Icono de cerebro/IA con anillo pulsante
3. **Barra de Progreso**: Animacion shimmer infinita
4. **Tiempo Estimado**: "Generando con Gemini 3 Flash (30-60 segundos)"
5. **Mensaje de Tranquilidad**: "Tus datos estan seguros. Puedes cerrar esta pagina y volver mas tarde."

### Modelo de IA para Resumenes

El sistema usa una estrategia de modelo primario con fallback:

| Modelo | Rol | Timeout | Caracteristicas |
|--------|-----|---------|-----------------|
| Gemini 3 Flash (`gemini-3-flash-preview`) | Primario | 120s | thinkingLevel: HIGH, 3x mas rapido |
| Gemini 2.5 Flash | Fallback | 120s | Sin thinking mode |

**Razon del cambio**: Gemini 2.5 Pro tenia thinking mode obligatorio que causaba timeouts de mas de 180 segundos.

### Migracion SQL

Archivo: `supabase/migrations/20260123000000_create_pending_summaries.sql`

Incluye:
- Creacion de tabla con todas las columnas
- RLS habilitado con politicas para usuarios
- Indices para busquedas eficientes (status, user_id)
- Trigger para auto-actualizar `updated_at`

## Soporte

Para problemas o preguntas:
1. Revisar logs en consola del navegador
2. Verificar tabla session_checkpoints en Supabase
3. Verificar tabla pending_summaries para resumenes fallidos
4. Validar permisos RLS estan configurados
5. Verificar que usuario esta autenticado correctamente
