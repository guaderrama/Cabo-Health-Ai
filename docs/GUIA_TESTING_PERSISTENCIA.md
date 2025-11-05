# Guía de Testing Manual - Sistema de Persistencia de Sesiones

## URL de Testing
**Aplicación**: https://4zruv7i6e8ic.space.minimax.io

## Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- DevTools del navegador
- Cuenta de usuario registrada (o crear una nueva)
- API Key de Gemini configurada en variables de entorno

---

## Test 1: Guardado Automático de Checkpoints

### Objetivo
Verificar que el sistema guarda automáticamente el progreso cada 2 mensajes

### Pasos

1. **Abrir DevTools**
   - Presionar F12
   - Ir a Application > Local Storage
   - Mantener abierto para monitorear

2. **Iniciar Sesión**
   - Login con tu cuenta
   - Ingresar nombre de paciente (ej: "Juan Pérez Test")
   - Hacer clic en "Iniciar Sesión"

3. **Conversar con Nova**
   - Responder las primeras 2 preguntas que Nova haga
   - Observar el indicador de progreso en la parte superior

4. **Verificar Guardado en localStorage**
   - Después del mensaje 2, verificar en DevTools > Local Storage
   - Buscar clave: `cabo_health_session_checkpoint`
   - Debe contener un objeto JSON con:
     - `session_id`
     - `patient_name`: "Juan Pérez Test"
     - `transcript`: array con 2 mensajes
     - `message_count`: 2

5. **Verificar Guardado en Supabase**
   - Ir a Supabase Dashboard
   - Table Editor > `session_checkpoints`
   - Buscar tu `session_id`
   - Verificar que existe el registro

6. **Continuar Conversación**
   - Responder 2 preguntas más (total 4 mensajes)
   - Observar indicador verde "Guardado" aparecer
   - Verificar que `message_count` se actualiza a 4

### Resultados Esperados
- ✅ Indicador de progreso muestra número de mensajes correcto
- ✅ Indicador "Guardado" aparece después de cada 2 mensajes
- ✅ localStorage contiene checkpoint actualizado
- ✅ Tabla Supabase contiene checkpoint actualizado
- ✅ Tiempo transcurrido se actualiza cada segundo

---

## Test 2: Recuperación de Sesión Interrumpida

### Objetivo
Verificar que el sistema detecta y permite recuperar sesiones interrumpidas

### Pasos

1. **Crear Sesión Interrumpida**
   - Iniciar nueva sesión (si no tienes una activa)
   - Responder al menos 4-6 preguntas
   - Esperar a ver indicador "Guardado"
   - **Cerrar la pestaña del navegador** (sin finalizar la sesión)

2. **Reabrir Aplicación**
   - Abrir nueva pestaña
   - Ir a: https://4zruv7i6e8ic.space.minimax.io
   - Login con la misma cuenta

3. **Verificar Modal de Recuperación**
   - Debe aparecer modal "Sesión Interrumpida Detectada"
   - Verificar información mostrada:
     - Nombre del paciente correcto
     - Número de mensajes correcto (4-6)
     - Tiempo transcurrido razonable
     - Preview del último mensaje

4. **Recuperar Sesión**
   - Hacer clic en "Continuar Entrevista"
   - Verificar que modal se cierra
   - Verificar que el transcript muestra todos los mensajes previos
   - Verificar que nombre del paciente está prellenado

5. **Continuar Conversación**
   - Hacer clic en "Iniciar Sesión" nuevamente
   - Continuar conversación
   - Verificar que nuevos mensajes se agregan correctamente

### Resultados Esperados
- ✅ Modal aparece automáticamente al reabrir aplicación
- ✅ Información de sesión es precisa
- ✅ Transcript completo se restaura
- ✅ Puede continuar conversación sin problemas
- ✅ Contador de mensajes continúa desde donde quedó

---

## Test 3: Descarte de Sesión Interrumpida

### Objetivo
Verificar que el usuario puede descartar sesiones antiguas y empezar de nuevo

### Pasos

1. **Crear Sesión Interrumpida**
   - Similar a Test 2, crear una sesión con 4-6 mensajes
   - Cerrar pestaña sin finalizar

2. **Reabrir y Descartar**
   - Reabrir aplicación
   - Cuando aparezca modal, hacer clic en "Empezar Nueva Sesión"
   - Leer advertencia sobre pérdida de datos

3. **Verificar Limpieza**
   - Verificar que modal se cierra
   - Verificar en localStorage que checkpoint fue eliminado
   - Verificar en Supabase que registro fue eliminado
   - Iniciar nueva sesión con nombre diferente
   - Verificar que no hay datos de sesión anterior

### Resultados Esperados
- ✅ Modal se cierra al hacer clic en "Empezar Nueva Sesión"
- ✅ Checkpoint eliminado de localStorage
- ✅ Checkpoint eliminado de Supabase
- ✅ Nueva sesión comienza limpia

---

## Test 4: Indicador de Progreso en Tiempo Real

### Objetivo
Verificar que los indicadores visuales funcionan correctamente

### Pasos

1. **Iniciar Sesión**
   - Login e iniciar nueva sesión con paciente

2. **Observar Indicador de Progreso**
   - Verificar que aparece panel azul en la parte superior
   - Componentes a verificar:
     - Badge azul con número de mensajes (debe ser 0 inicial)
     - Reloj con tiempo transcurrido (debe actualizarse cada segundo)
     - Estado de guardado (debe mostrar "Guardado" en gris inicial)
     - Barra de progreso azul (debe estar en 0%)

3. **Durante Conversación**
   - Responder 2 preguntas
   - Verificar que badge cambia a "2"
   - Verificar que barra de progreso avanza (10% aprox)
   - Verificar que estado cambia a "Guardando..." luego "Guardado" (verde)
   - Verificar que tiempo continúa avanzando

4. **Progreso Completo**
   - Responder hasta 10 mensajes
   - Verificar que barra de progreso está al 50%
   - Verificar que todos los indicadores funcionan

### Resultados Esperados
- ✅ Badge de mensajes se actualiza correctamente
- ✅ Reloj muestra tiempo transcurrido en formato correcto (mm:ss)
- ✅ Estado de guardado cambia: gris → "Guardando..." → verde "Guardado"
- ✅ Barra de progreso avanza proporcionalmente
- ✅ Animaciones son suaves y profesionales

---

## Test 5: Finalización de Sesión y Limpieza

### Objetivo
Verificar que los checkpoints se limpian al completar exitosamente una sesión

### Pasos

1. **Completar Sesión**
   - Iniciar sesión y responder 4-6 preguntas
   - Hacer clic en "Finalizar Sesión"
   - Esperar a que genere el resumen SOAP

2. **Verificar Limpieza Automática**
   - Ir a DevTools > Local Storage
   - Verificar que `cabo_health_session_checkpoint` fue eliminado
   - Ir a Supabase Dashboard
   - Verificar que registro de checkpoint fue eliminado

3. **Nueva Sesión**
   - Hacer clic en "Nueva Consulta"
   - Verificar que no aparece modal de recuperación
   - Iniciar nueva sesión y verificar que comienza limpia

### Resultados Esperados
- ✅ Resumen SOAP se genera correctamente
- ✅ Checkpoint eliminado de localStorage
- ✅ Checkpoint eliminado de Supabase
- ✅ Nueva sesión no muestra modal de recuperación

---

## Test 6: Manejo de Errores de Red (Avanzado)

### Objetivo
Verificar que el sistema maneja fallos de conexión correctamente

### Pasos

1. **Iniciar con Red Activa**
   - Iniciar sesión y responder 2 preguntas
   - Verificar guardado exitoso

2. **Simular Fallo de Red**
   - Abrir DevTools > Network
   - Activar "Offline" mode
   - Responder 2 preguntas más

3. **Verificar Fallback a localStorage**
   - Verificar en localStorage que checkpoint se guardó
   - Observar en consola si hay errores de Supabase (esperado)
   - Verificar que indicador de guardado funciona

4. **Restaurar Red**
   - Desactivar "Offline" mode
   - Responder 2 preguntas más
   - Verificar que Supabase se sincroniza

### Resultados Esperados
- ✅ Sistema continúa funcionando sin red
- ✅ localStorage guarda checkpoints offline
- ✅ Al restaurar red, Supabase se sincroniza
- ✅ Usuario no ve errores disruptivos

---

## Test 7: Validación de Integridad (Edge Cases)

### Objetivo
Verificar que el sistema valida datos antes de recuperar

### Pasos

1. **Corromper Checkpoint Manualmente**
   - Iniciar sesión y crear checkpoint
   - Abrir DevTools > Local Storage
   - Editar `cabo_health_session_checkpoint`
   - Eliminar campo `session_id` o `user_id`
   - Cerrar y reabrir aplicación

2. **Verificar Rechazo**
   - Modal NO debe aparecer
   - Aplicación debe iniciar normalmente
   - Checkpoint corrupto debe ser ignorado

3. **Checkpoint Antiguo**
   - En Supabase, editar `last_checkpoint_time` a hace 2 días
   - Reabrir aplicación
   - Verificar que checkpoint antiguo no se muestra

### Resultados Esperados
- ✅ Checkpoints corruptos son ignorados
- ✅ Checkpoints antiguos (>24h) no se muestran
- ✅ Aplicación maneja errores gracefully
- ✅ No hay crashes o errores visuales

---

## Checklist de Validación Final

Después de completar todos los tests:

- [ ] Guardado automático cada 2 mensajes funciona
- [ ] Recuperación de sesiones interrumpidas funciona
- [ ] Modal de recuperación muestra información correcta
- [ ] Descarte de sesiones funciona correctamente
- [ ] Indicador de progreso se actualiza en tiempo real
- [ ] Limpieza de checkpoints al completar sesión funciona
- [ ] Sistema maneja errores de red correctamente
- [ ] Validación de integridad rechaza datos corruptos
- [ ] UI es intuitiva y profesional
- [ ] No hay errores en consola del navegador

## Problemas Conocidos / Limitaciones

- **Contexto de API**: Gemini API no persiste contexto, solo el transcript se recupera
- **Audio en Progreso**: Fragmentos de audio actuales no se guardan en checkpoint
- **Límite de localStorage**: Sesiones muy largas (>100 mensajes) podrían exceder límite

## Reportar Bugs

Si encuentras problemas:
1. Tomar screenshot del error
2. Copiar mensajes de consola (F12 > Console)
3. Describir pasos para reproducir
4. Indicar navegador y versión
5. Incluir datos de sesión (session_id si es posible)

---

## Información de Soporte Técnico

**Tabla Supabase**: `session_checkpoints`
**LocalStorage Key**: `cabo_health_session_checkpoint`
**Frecuencia de Guardado**: Cada 2 mensajes
**Ventana de Recuperación**: 24 horas
**Reintentos**: 3 intentos con exponential backoff (1s, 2s, 4s)
