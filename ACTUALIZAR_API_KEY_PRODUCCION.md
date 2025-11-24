p# 🚀 ACTUALIZAR API KEY EN PRODUCCIÓN

**Situación Actual**: ✅ Tienes API key válida que funciona  
**Problema**: ❌ La API key NO está actualizada en producción (https://etric4luf0vq.space.minimax.io)

---

## 🔍 LO QUE CONFIRMÉ

✅ **App carga correctamente** - https://etric4luf0vq.space.minimax.io  
✅ **Supabase backend conectado** - Autenticación funciona  
❌ **API key de Gemini desactualizada** - Error "Invalid API key" al registrarse  

**Causa**: La versión en producción sigue usando la API key vieja que ya no funciona.

---

## ✅ SOLUCIÓN - Actualizar API Key en Producción

### Paso 1: Verificar que tienes la nueva API key

Tu nueva API key válida debería estar en:
```
.env (archivo local)
VITE_GEMINI_API_KEY=AIzaSy... (tu nueva key)
```

### Paso 2: Actualizar Variables de Entorno en la Plataforma de Deploy

Dependiendo de dónde esté desplegada tu app, necesitas actualizar las variables:

#### Opción A: **MiniMax Space** (tu URL actual: etric4luf0vq.space.minimax.io)

1. Ve al panel de control de MiniMax
2. Selecciona tu espacio: `etric4luf0vq`
3. Settings → Environment Variables
4. **Actualiza**:
   ```
   VITE_GEMINI_API_KEY=tu_nueva_api_key_aqui
   ```
5. **Guarda** los cambios
6. **Redeploy** la aplicación

#### Opción B: **Vercel** (si estás usando Vercel)

```bash
# Opción 1: Via CLI
vercel env add VITE_GEMINI_API_KEY production
# Pega tu nueva API key

# Opción 2: Via Dashboard
1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Settings → Environment Variables
4. Edita VITE_GEMINI_API_KEY
5. Pega la nueva API key
6. Save
7. Redeploy (Deployments → ... → Redeploy)
```

#### Opción C: **Netlify** (si estás usando Netlify)

```bash
# Via Dashboard
1. Ve a: https://app.netlify.com
2. Selecciona tu sitio
3. Site settings → Environment variables
4. Edita VITE_GEMINI_API_KEY
5. Pega la nueva API key
6. Save
7. Trigger deploy (Deploys → Trigger deploy → Deploy site)
```

#### Opción D: **GitHub Pages + Build Manual**

```bash
cd c:\Users\admin\Dropbox\Ai\cabo-health-nova

# 1. Asegúrate que .env tiene la nueva API key
type .env | findstr VITE_GEMINI_API_KEY

# 2. Build con la nueva key
npm run build

# 3. Deploy la carpeta dist/ a tu hosting
```

---

## 🔧 DESPUÉS DE ACTUALIZAR

### Paso 3: Verificar que funciona

1. **Espera 2-3 minutos** (para que se actualice)
2. **Abre** en navegador: https://etric4luf0vq.space.minimax.io
3. **Recarga** con caché limpio: `Ctrl+Shift+R`
4. **Intenta registrarte** con cualquier email
5. **NO debe aparecer** "Invalid API key"

---

## 🎯 TESTING LOCAL PRIMERO (Recomendado)

Antes de actualizar producción, prueba localmente:

### 1. Verifica tu `.env`

```bash
cd c:\Users\admin\Dropbox\Ai\cabo-health-nova
type .env
```

Debe mostrar:
```env
VITE_GEMINI_API_KEY=AIzaSy... (tu nueva key válida)
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Ejecuta local

```bash
# Mata procesos previos
taskkill /IM node.exe /F

# Limpia cache
rmdir /s /q node_modules\.vite

# Inicia servidor
npm run dev
```

### 3. Prueba en http://localhost:5173

1. Abre navegador: http://localhost:5173
2. Registra una cuenta
3. **NO debe haber error "Invalid API key"**
4. Ingresa nombre de paciente
5. Haz clic en Play
6. **Debe funcionar** sin errores

✅ **Si funciona local** → Actualiza producción  
❌ **Si NO funciona local** → API key sigue inválida

---

## 🐛 TROUBLESHOOTING

### Error persiste después de actualizar

**Solución 1: Limpia caché del navegador**
```
1. Abre DevTools (F12)
2. Application tab
3. Clear storage
4. Clear site data
5. Recarga: Ctrl+Shift+R
```

**Solución 2: Verifica que la API key se guardó**
```
# En tu plataforma de deploy, verifica que:
- Variable existe
- Tiene el nombre correcto: VITE_GEMINI_API_KEY
- Valor es la nueva API key (no la vieja)
- Está en environment "production"
```

**Solución 3: Forzar rebuild completo**
```bash
# Local
npm run build

# Luego deploy manual de la carpeta dist/
```

---

## 📞 INFORMACIÓN DE DEPLOY ACTUAL

Según tu app:
- **URL Producción**: https://etric4luf0vq.space.minimax.io
- **Backend**: Supabase (cozsoshuctvhvdbmkmwc)
- **Plataforma**: MiniMax Space
- **Build Tool**: Vite

**Pasos recomendados**:
1. Accede al panel de MiniMax
2. Encuentra Settings o Environment Variables
3. Actualiza `VITE_GEMINI_API_KEY`
4. Redeploy
5. Espera 2-3 minutos
6. Prueba en navegador

---

## ✅ CHECKLIST

- [ ] Confirmé que tengo la nueva API key válida
- [ ] Actualicé `.env` local con la nueva key
- [ ] Probé localmente (npm run dev) y funciona
- [ ] Accedí al panel de mi plataforma de deploy
- [ ] Actualicé variable VITE_GEMINI_API_KEY en producción
- [ ] Guardé los cambios
- [ ] Hice redeploy de la app
- [ ] Esperé 2-3 minutos
- [ ] Recargué https://etric4luf0vq.space.minimax.io
- [ ] El error "Invalid API key" desapareció
- [ ] La app funciona correctamente

---

## 🎉 RESULTADO ESPERADO

Una vez actualizada la API key en producción:

1. Abre: https://etric4luf0vq.space.minimax.io
2. Registrate con cualquier email
3. **NO debe haber error**
4. Login exitoso
5. Ingresa nombre de paciente
6. Haz clic en Play
7. **Escucharás sonido de bienvenida**
8. Habla al micrófono
9. **IA responde en audio**
10. Haz clic en Stop
11. **Se genera resumen SOAP**
12. ¡Todo funciona! 🎉

---

**Siguiente paso**: Actualiza la API key en tu plataforma de deploy y vuelve a probar
