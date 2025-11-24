# 🚀 Guía de Despliegue - Cabo Health Nova

## Opción Recomendada: Vercel

Vercel es la mejor opción para este proyecto porque:
- ✅ Deploy automático desde GitHub
- ✅ HTTPS gratis automático
- ✅ Variables de entorno seguras
- ✅ Edge network global (rápido en todo el mundo)
- ✅ Soporte nativo para Vite + React

---

## 📋 Pasos para Desplegar

### 1. Preparar el Repositorio en GitHub

Si aún no has subido el código a GitHub:

```bash
# Asegúrate de estar en la carpeta del proyecto
cd "c:\Users\admin\Dropbox\Ai\cabo-health-nova"

# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Crear commit
git commit -m "🚀 Deploy: Cabo Health Nova v1.2.0 con todos los fixes"

# Agregar remote (reemplaza con tu repo)
git remote add origin https://github.com/tu-usuario/cabo-health-nova.git

# Push a GitHub
git push -u origin main
```

### 2. Conectar con Vercel

**Opción A: Desde la Web (Más Fácil)**

1. Ve a [vercel.com](https://vercel.com)
2. Login con tu cuenta de GitHub
3. Click en **"Add New Project"**
4. Selecciona el repositorio `cabo-health-nova`
5. Vercel detectará automáticamente que es un proyecto Vite
6. Click en **"Deploy"**

**Opción B: Desde la Terminal (Rápido)**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login a Vercel
vercel login

# Deploy
vercel

# Seguir las instrucciones:
# - Set up and deploy? Y
# - Which scope? (tu cuenta)
# - Link to existing project? N
# - Project name? cabo-health-nova
# - In which directory is your code? ./
# - Auto-detected framework: Vite
# - Override settings? N
```

### 3. Configurar Variables de Entorno

**IMPORTANTE:** Debes configurar las variables de entorno en Vercel:

En Vercel Dashboard → Tu Proyecto → Settings → Environment Variables:

```
VITE_GEMINI_API_KEY=tu_api_key_real_de_gemini
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SENTRY_DSN=(opcional)
```

**Cómo agregar:**
1. Ve a Project Settings → Environment Variables
2. Para cada variable:
   - Name: `VITE_GEMINI_API_KEY`
   - Value: `tu_api_key_real`
   - Environment: Production, Preview, Development (selecciona todos)
3. Click "Save"
4. **Redeploy** para que tome las nuevas variables

### 4. Verificar el Deploy

Una vez desplegado, Vercel te dará una URL como:

```
https://cabo-health-nova.vercel.app
```

O puedes usar un dominio personalizado:

```
https://nova.cabohealth.com
```

---

## 🌐 Configurar Dominio Personalizado (Opcional)

Si tienes un dominio propio:

1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Domains
2. Click "Add Domain"
3. Ingresa tu dominio: `nova.cabohealth.com`
4. Sigue las instrucciones para configurar los DNS

**Registros DNS necesarios:**

```
Type: CNAME
Name: nova (o www)
Value: cname.vercel-dns.com
```

---

## 🔒 Configuración de Supabase para Producción

**IMPORTANTE:** Debes autorizar el dominio de Vercel en Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → Settings → API
3. Scroll a "URL Configuration"
4. Agrega tu URL de Vercel a:
   - **Site URL**: `https://cabo-health-nova.vercel.app`
   - **Redirect URLs**:
     ```
     https://cabo-health-nova.vercel.app/**
     https://*.vercel.app/**
     ```

Esto solucionará los problemas de CORS automáticamente.

---

## 🧪 Testing Post-Deploy

Una vez desplegado, verifica:

1. ✅ La app carga correctamente
2. ✅ Puedes hacer login/registro
3. ✅ El micrófono funciona (HTTPS automático en Vercel)
4. ✅ Nova saluda automáticamente
5. ✅ El visualizador se ve correcto
6. ✅ Las transcripciones funcionan

---

## 🔄 Deploys Automáticos

Vercel configurará CI/CD automático:

- **Push a `main`** → Deploy a Producción
- **Push a otras branches** → Deploy de Preview
- **Pull Requests** → Deploy de Preview con URL única

Para desplegar cambios:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

Vercel desplegará automáticamente en ~2 minutos.

---

## 📊 Monitoreo y Analytics

Vercel incluye gratis:

- ✅ Analytics de visitas
- ✅ Web Vitals (performance)
- ✅ Logs en tiempo real
- ✅ Build logs

Accede desde: Dashboard → Tu Proyecto → Analytics

---

## 🐛 Troubleshooting

### Error: "Build Failed"

**Solución:** Verifica que todas las dependencias estén en `package.json`:

```bash
npm install
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push
```

### Error: "Environment Variables Not Found"

**Solución:** Verifica que configuraste las variables en Vercel y hiciste redeploy.

### Error: CORS con Supabase

**Solución:** Agrega el dominio de Vercel en Supabase (ver sección arriba).

### Micrófono No Funciona

**Solución:** Vercel automáticamente tiene HTTPS, así que debería funcionar. Si no:
1. Verifica permisos del navegador
2. Usa Chrome/Edge (mejor compatibilidad)

---

## 💰 Costos

**Vercel:**
- Hobby Plan: **GRATIS**
  - 100GB bandwidth/mes
  - Builds ilimitados
  - HTTPS incluido
  - Perfecto para este proyecto

**Supabase:**
- Free Tier: **GRATIS hasta 500MB de DB** + 1GB de storage
- Ya está configurado

**Gemini API:**
- Según tu plan de Google AI Studio
- Cobran por tokens usados

---

## 🚀 Comandos Útiles

```bash
# Deploy manual
vercel

# Deploy a producción directamente
vercel --prod

# Ver logs en tiempo real
vercel logs

# Ver deployments recientes
vercel ls

# Redeploy el último build
vercel redeploy
```

---

## 📝 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas en Vercel
- [ ] Dominio de Vercel autorizado en Supabase
- [ ] Código subido a GitHub
- [ ] Build local funciona: `npm run build`
- [ ] Preview local funciona: `npm run preview`
- [ ] Todos los tests pasan

---

## 🎉 ¡Listo!

Tu app estará en vivo en:
```
https://cabo-health-nova.vercel.app
```

**Próximos pasos después del deploy:**
1. Compartir el link con usuarios de prueba
2. Monitorear analytics y errores
3. Iterar basado en feedback
4. Configurar dominio personalizado (opcional)

---

## 📞 Soporte

Si tienes problemas:
1. Vercel Support: [vercel.com/support](https://vercel.com/support)
2. Supabase Support: [supabase.com/support](https://supabase.com/support)
3. Revisa logs: `vercel logs cabo-health-nova`
