# Seguridad - Cabo Health Nova

> Configuración de variables de entorno, secretos y medidas de seguridad

## 🔒 Resumen de Seguridad

Cabo Health Nova implementa un enfoque de seguridad multicapa que protege tanto los datos del usuario como la integridad del sistema médico.

### Estado Actual de Seguridad ✅
- ✅ **RLS habilitado** en todas las tablas de base de datos
- ✅ **Autenticación JWT** con Supabase Auth
- ✅ **Sanitización HTML** con DOMPurify
- ✅ **Variables de entorno** seguras para API keys
- ✅ **CORS configurado** en todas las Edge Functions
- ✅ **Rate limiting** en Edge Functions
- ✅ **Input validation** en formularios

## 🛡️ Variables de Entorno

### Configuración de Producción

#### Variables Frontend (Vite)
```bash
# Requeridas para el frontend
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

#### Variables Backend (Supabase Edge Functions)
```bash
# Variables de Edge Functions (sin prefijo VITE_)
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MjY0MiwiZXhwIjoyMDc3NjE4NjQyfQ.8HAy0tbp6Teq8hFn0zeu6yku1TP_R03P3hoOMHItTOo
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
DB_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
AI_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

#### Variables Opcionales
```bash
# Para envío real de emails (opcional)
RESEND_API_KEY=re_...
```

### Cómo Configurar Variables

#### 1. Variables Frontend (.env)
```bash
# En la raíz del proyecto
cd cabo-health-nova
cp .env.example .env

# Editar .env
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

#### 2. Variables Supabase Dashboard
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar proyecto `cozsoshuctvhvdbmkmwc`
3. Ir a **Settings** > **Environment Variables**
4. Añadir cada variable:

```
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
DB_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
AI_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

⚠️ **Importante**: No usar prefijo `SUPABASE_` - está prohibido por Supabase

#### 3. Variables Edge Functions
Se configuran automáticamente desde el dashboard o CLI:
```bash
# Usando Supabase CLI
supabase secrets set GEMINI_API_KEY=tu_key_aqui
supabase secrets set SERVICE_ROLE_KEY=tu_key_aqui
```

## 🔐 Autenticación y Autorización

### Supabase Auth

```typescript
// Cliente configurado
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

### JWT Token Structure

```json
{
  "sub": "uuid-del-usuario",
  "email": "usuario@email.com",
  "aud": "authenticated",
  "role": "authenticated",
  "iss": "supabase",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Contexto de Autenticación

```typescript
// Context API para manejo de estado
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

## 🗄️ Row Level Security (RLS)

### Políticas Implementadas

#### 1. Tabla `patients`
```sql
-- Habilitar RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Política principal: Solo el propietario puede acceder
CREATE POLICY "Users can access their own patients" ON patients
  FOR ALL USING (auth.uid() = user_id);

-- Política para Edge Functions
CREATE POLICY "Service role can access all patients" ON patients
  FOR ALL USING (auth.role() = 'service_role');
```

#### 2. Tabla `consultations`
```sql
-- RLS habilitado
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Política: Acceso basado en user_id
CREATE POLICY "Users can access their own consultations" ON consultations
  FOR ALL USING (auth.uid() = user_id);

-- Edge Functions access
CREATE POLICY "Service role access consultations" ON consultations
  FOR ALL USING (auth.role() = 'service_role');
```

#### 3. Tabla `transcriptions`
```sql
-- RLS habilitado
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Política: Acceso a través de consultation_id
CREATE POLICY "Users can access transcriptions of their consultations" 
ON transcriptions
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM consultations 
      WHERE id = consultation_id
    )
  );
```

#### 4. Tabla `summaries`
```sql
-- RLS habilitado
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Política similar a transcriptions
CREATE POLICY "Users can access summaries of their consultations" 
ON summaries
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM consultations 
      WHERE id = consultation_id
    )
  );
```

#### 5. Tabla `session_checkpoints`
```sql
-- RLS habilitado
ALTER TABLE session_checkpoints ENABLE ROW LEVEL SECURITY;

-- Política: Solo el propietario
CREATE POLICY "Users can access their own checkpoints" 
ON session_checkpoints
  FOR ALL USING (auth.uid() = user_id);
```

### Verificación de Políticas

```sql
-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('patients', 'consultations', 'transcriptions', 'summaries', 'sessions', 'session_checkpoints');

-- Ver políticas activas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🔍 Sanitización de Datos

### DOMPurify Configuration

```typescript
// Configuración segura para contenido médico
import DOMPurify from 'dompurify';

// Configuración permisiva para resúmenes SOAP
const soapSanitizer = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'strong', 'em', 'u', 's', 'br', 'hr',
    'ul', 'ol', 'li',
    'a', 'table', 'tbody', 'thead', 'tr', 'td', 'th'
  ],
  ALLOWED_ATTR: ['href', 'class', 'id', 'colspan', 'rowspan', 'style'],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['style'], // Opcional: forbid inline styles
  
  // Configuración para prevenir XSS
  KEEP_CONTENT: false,
  RETURN_TRUSTED_TYPE: false
});

// Configuración estricta para inputs de usuario
const userInputSanitizer = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: false
});
```

### Uso Seguro

```typescript
// En componentes React
function SummaryDisplay({ summaryHtml }: { summaryHtml: string }) {
  const cleanHtml = soapSanitizer(summaryHtml);
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
      className="prose max-w-none"
    />
  );
}

// Para inputs de usuario
function PatientForm({ onSubmit }: { onSubmit: (data: string) => void }) {
  const [input, setInput] = useState('');
  
  const handleSubmit = useCallback(() => {
    const cleanInput = userInputSanitizer(input);
    onSubmit(cleanInput);
  }, [input, onSubmit]);
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Información del paciente"
      />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

## 🌐 CORS Configuration

### Edge Functions CORS

```typescript
// Headers CORS en todas las Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción: dominio específico
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// En cada función
Deno.serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    // Lógica de la función
    const result = await processRequest(req);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

## 🚫 Rate Limiting

### Edge Functions Rate Limiting

```typescript
// Implementación básica de rate limiting
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  checkLimit(identifier: string, limit: number, window: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Filtrar requests dentro de la ventana de tiempo
    const validRequests = userRequests.filter(
      time => now - time < window
    );
    
    if (validRequests.length >= limit) {
      return false; // Límite excedido
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
}

// Uso en Edge Function
const rateLimiter = new RateLimiter();
const clientIP = req.headers.get('x-forwarded-for') || 'unknown';

if (!rateLimiter.checkLimit(clientIP, 100, 15 * 60 * 1000)) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': '900' // 15 minutos
      } 
    }
  );
}
```

## 📊 Monitoring de Seguridad

### Logs de Seguridad

```typescript
// Logging de eventos de seguridad en Edge Functions
const logSecurityEvent = (event: string, data: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'SECURITY',
    event,
    data
  }));
};

// Ejemplos de uso
logSecurityEvent('AUTH_FAILED', { email: 'user@example.com', reason: 'invalid_password' });
logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: '192.168.1.1', endpoint: '/generate-summary' });
logSecurityEvent('RLS_VIOLATION', { user_id: user.id, table: 'consultations' });
```

### Alertas de Seguridad

```typescript
// Configuración de alertas (en Supabase Dashboard)
const securityAlerts = {
  failed_logins: {
    threshold: 10,
    window: 3600, // 1 hora
    action: 'temporary_ban'
  },
  rate_limit_exceeded: {
    threshold: 100,
    window: 900, // 15 minutos
    action: 'notify_admin'
  },
  data_export: {
    threshold: 50, // consultas por día
    window: 86400, // 1 día
    action: 'review_required'
  }
};
```

## 🔒 Best Practices Implementadas

### 1. Principio de Menor Privilegio
- ✅ Solo `anon` key en frontend
- ✅ `service_role` solo en Edge Functions
- ✅ RLS políticas restrictivas
- ✅ Permisos mínimos necesarios

### 2. Defense in Depth
- ✅ Autenticación + RLS
- ✅ Validación frontend + backend
- ✅ Sanitización de entrada + salida
- ✅ Rate limiting + monitoring

### 3. Secure by Default
- ✅ RLS habilitado por defecto
- ✅ Variables de entorno requeridas
- ✅ HTTPS obligatorio
- ✅ CORS configurado por defecto

### 4. Input Validation
```typescript
// Validación con Zod
import { z } from 'zod';

const ConsultationSchema = z.object({
  patient_name: z.string().min(1).max(100),
  language: z.enum(['es', 'en']),
  session_id: z.string().uuid()
});

function validateConsultation(data: unknown) {
  try {
    return ConsultationSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid consultation data: ${error.message}`);
  }
}
```

## 🚨 Incident Response Plan

### Procedimientos de Emergencia

#### 1. Compromiso de API Keys
```bash
# 1. Revocar keys comprometidas en Google AI Studio
# 2. Regenerar nuevas keys
# 3. Actualizar variables en Supabase
# 4. Notificar a usuarios si es necesario
```

#### 2. Base de Datos Comprometida
```bash
# 1. Revisar logs de Supabase
# 2. Identificar registros afectados
# 3. Backup inmediato
# 4. Resetear passwords de usuarios
# 5. Revisar y reforzar RLS policies
```

#### 3. Edge Functions Comprometidas
```bash
# 1. Revisar logs de functions
# 2. Desactivar functions afectadas temporalmente
# 3. Auditar código y dependencias
# 4. Redeployar con código limpio
```

### Contactos de Emergencia
- **Supabase Support**: https://supabase.com/support
- **Google AI Support**: https://ai.google.dev/support
- **Administrador del Sistema**: [Contact info]

---

## 📋 Checklist de Seguridad

### Antes del Deploy
- [ ] Variables de entorno configuradas
- [ ] RLS habilitado en todas las tablas
- [ ] CORS configurado correctamente
- [ ] Rate limiting implementado
- [ ] Sanitización HTML activada

### Monitoreo Regular
- [ ] Revisar logs de Supabase semanalmente
- [ ] Verificar rate limiting metrics
- [ ] Auditar RLS policies mensualmente
- [ ] Rotar API keys trimestralmente
- [ ] Review de permisos de usuarios

### Incident Response
- [ ] Documentación actualizada
- [ ] Contactos de emergencia verificados
- [ ] Procedures de backup probadas
- [ ] Plan de comunicación definido

---

*🔒 Última actualización: 2025-11-03*  
*📧 Contactar al equipo de seguridad para incidentes*

---

## Integración con Cline
- Mantener `.clinerules/` y `memory/` fuera de VCS (ver `snippets/gitignore.txt`).
- No incluir `.env` ni secretos en commits. Validar en CI.