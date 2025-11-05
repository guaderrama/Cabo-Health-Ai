# 🌟 ACCESO A LA APLICACIÓN - Cabo Health Nova

**Estado**: ✅ **APP EN VIVO Y FUNCIONANDO**

---

## 🌐 LINK PRINCIPAL (PRODUCCIÓN)

```
https://etric4luf0vq.space.minimax.io
```

👇 **HAZ CLIC AQUÍ PARA ABRIR LA APP** 👇

### Abre en tu navegador:
```
https://etric4luf0vq.space.minimax.io
```

---

## 🔐 CÓMO HACER LOGIN

### Paso 1: Llega a la pantalla de login

Verás una pantalla con dos opciones:
- **Sign In** (Inicia Sesión)
- **Sign Up** (Crear Cuenta)

### Paso 2: Opción A - Crear Nueva Cuenta

Si no tienes cuenta:

1. Haz clic en **"Sign Up"**
2. Ingresa:
   - **Email**: tu email (ej: `tumail@ejemplo.com`)
   - **Contraseña**: crea una contraseña
3. Haz clic en **"Sign Up"**
4. **Verifica tu email** (si Supabase lo requiere)
5. ¡Listo! Acceso a la app

### Paso 3: Opción B - Inicia Sesión

Si ya tienes cuenta en Supabase:

1. Haz clic en **"Sign In"**
2. Ingresa:
   - **Email**: tu email registrado
   - **Contraseña**: tu contraseña
3. Haz clic en **"Sign In"**
4. ¡Acceso!

---

## ✨ CÓMO USAR LA APP

### Una vez dentro (ya logueado):

#### 1️⃣ **Ingresa Nombre de Paciente**
   - Campo de texto en la parte izquierda
   - Ejemplo: `Juan Pérez`

#### 2️⃣ **Haz clic en Botón AZUL (Play)**
   - Inicia sesión de consulta
   - Escucharás sonido de bienvenida en audio

#### 3️⃣ **Habla al Micrófono**
   - Di algo como: "Hola, tengo dolor de cabeza desde ayer"
   - **Permiso de micrófono**: El navegador te pedirá permiso (acepta)
   - Verás transcripción en tiempo real en la pantalla

#### 4️⃣ **Escucha Respuesta de IA**
   - La IA responde en audio automáticamente
   - También ves la transcripción en la pantalla

#### 5️⃣ **Haz clic en Botón ROJO (Stop)**
   - Termina la consulta
   - Sistema genera automáticamente resumen SOAP

#### 6️⃣ **Ve el Resumen**
   - Resumen formateado en HTML
   - Secciones: S (Subjetivo), O (Objetivo), A (Apreciación), P (Plan)

---

## 📊 VERIFICAR DATOS EN SUPABASE

Para confirmar que todo funciona correctamente:

### Abre Supabase Dashboard:
```
https://supabase.com/dashboard
```

### Selecciona tu proyecto:
```
Proyecto: cozsoshuctvhvdbmkmwc
```

### Ve a Table Editor y verifica:

#### Tabla `consultations`
- Debe tener nuevos registros
- Cada fila = una consulta guardada
- Columnas: id, patient_name, language, status, created_at

#### Tabla `summaries`
- Debe tener resúmenes SOAP generados
- Columnas: id, consultation_id, soap_html, summary_text

#### Tabla `transcriptions`
- Debe tener transcripciones
- Columnas: id, consultation_id, text, speaker, timestamp

#### Tabla `session_checkpoints`
- Guarda automáticamente checkpoints durante sesión
- Permite recuperación si hay desconexión

---

## 🎯 FLUJO COMPLETO

```
┌─────────────────────────────────┐
│ 1. Abre navegador               │
│ https://etric4luf0vq.space...  │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 2. Sign In / Sign Up            │
│    (Crea o usa cuenta)          │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 3. Ingresa Nombre de Paciente   │
│    Ej: "Test Patient"           │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 4. Haz clic en Play (botón azul)│
│    Permiso de micrófono         │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 5. Habla al Micrófono           │
│    "Hola, me duele..."          │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 6. Escucha Respuesta IA         │
│    En audio + transcripción     │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 7. Haz clic en Stop (botón rojo)│
│    Termina consulta             │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 8. Resumen SOAP Generado        │
│    Formateado en HTML           │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│ 9. Se guarda en Supabase        │
│    - consultation               │
│    - summary                    │
│    - transcription              │
└─────────────────────────────────┘
```

---

## 🆘 PROBLEMAS COMUNES

### ❌ "No se conecta la app"
**Solución**: Espera 5 segundos y recarga página (Ctrl+R)

### ❌ "Pide permiso de micrófono y lo rechacé"
**Solución**: 
1. Abre DevTools (F12)
2. Console
3. Click en la app settings
4. Vuelve a permitir micrófono

### ❌ "No se escucha audio"
**Solución**:
1. Verifica volumen del navegador
2. Verifica volumen de la computadora
3. Prueba en YouTube primero
4. Recarga página

### ❌ "Resumen no se genera"
**Solución**:
1. Abre Supabase Dashboard
2. Functions → generate-summary → Logs
3. Busca error en logs
4. Verifica que GEMINI_API_KEY está configurada

### ❌ "Error: VITE_GEMINI_API_KEY"
**Solución**:
1. Este error es del servidor local
2. En producción NO aparece
3. Si ves este error, usa Link de Producción arriba

---

## 📞 INFORMACIÓN TÉCNICA

### Backend Conectado
- ✅ Supabase Proyecto: `cozsoshuctzhvdbmkmwc`
- ✅ Autenticación: Supabase Auth
- ✅ Base de Datos: PostgreSQL en Supabase
- ✅ Edge Functions: 4 funciones activas

### IA Conectada
- ✅ Google Gemini 2.5 Flash
- ✅ Audio en tiempo real (bidireccional)
- ✅ Transcripción automática
- ✅ Generación de resumen SOAP

### Variables Configuradas
- ✅ VITE_GEMINI_API_KEY
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ GEMINI_API_KEY (Edge Functions)
- ✅ SERVICE_ROLE_KEY (Edge Functions)

---

## 🚀 ENLACES ÚTILES

| Elemento | Link |
|----------|------|
| **APP (PRODUCCIÓN)** | https://etric4luf0vq.space.minimax.io |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Proyecto Supabase** | https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc |
| **API Documentation** | docs/API.md |

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### Checklist de Testing:

- [ ] Puedo acceder a https://etric4luf0vq.space.minimax.io
- [ ] Puedo crear/iniciar sesión
- [ ] Puedo ingresar nombre de paciente
- [ ] Puedo hacer clic en Play
- [ ] Se solicita permiso de micrófono
- [ ] Escucho sonido de bienvenida
- [ ] Puedo hablar al micrófono
- [ ] Veo mi transcripción en pantalla
- [ ] Escucho respuesta de IA
- [ ] Puedo hacer clic en Stop
- [ ] Se genera resumen SOAP
- [ ] Resumen se muestra en HTML
- [ ] Datos aparecen en Supabase Dashboard

---

## 🎉 ¡LISTO!

**Tu aplicación está completamente funcional.**

### Para empezar:

1. Abre: **https://etric4luf0vq.space.minimax.io**
2. Crea una cuenta o inicia sesión
3. ¡Comienza a probar!

---

**Última actualización**: 2025-01-04 01:35 AM  
**Estado**: ✅ APP EN VIVO
