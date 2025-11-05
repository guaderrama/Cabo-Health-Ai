# Configuración del MCP Server de Supabase para Cursor

## Información del Proyecto
- **Proyecto Supabase ID**: `cozsoshuctvhvdbmkmwc`
- **URL del Proyecto**: `https://cozsoshuctvhvdbmkmwc.supabase.co`
- **MCP Server URL**: `https://mcp.supabase.com/mcp`

## Método 1: Configuración mediante Dashboard de Supabase (Recomendado)

### Paso 1: Acceder al Dashboard
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: `cozsoshuctvhvdbmkmwc`

### Paso 2: Configurar MCP
1. En el Dashboard, busca la opción **"Connect"** o **"MCP"**
2. Haz clic y navega a la pestaña **MCP**
3. Selecciona las características que deseas habilitar:
   - ✅ Consultar base de datos
   - ✅ Modificar esquema (opcional)
   - ✅ Ejecutar queries
   - ✅ Gestionar Edge Functions (opcional)

### Paso 3: Generar Configuración para Cursor
1. El Dashboard generará automáticamente la configuración JSON
2. Copia la configuración generada

### Paso 4: Configurar en Cursor
1. Abre Cursor
2. Presiona `Ctrl + Shift + P` (Windows) o `Cmd + Shift + P` (Mac)
3. Escribe: `Preferences: Open User Settings (JSON)`
4. Agrega la configuración del MCP server

**Ejemplo de configuración (OAuth):**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "transport": {
        "type": "sse",
        "headers": {}
      }
    }
  }
}
```

5. Guarda el archivo
6. Reinicia Cursor
7. Cuando uses el MCP por primera vez, Cursor te pedirá autenticarte con Supabase
8. Se abrirá una ventana del navegador para autenticación
9. Asegúrate de seleccionar la organización correcta

## Método 2: Autenticación Manual con Personal Access Token (PAT)

Si prefieres autenticación manual o estás en CI:

### Paso 1: Crear Personal Access Token
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → Access Tokens
3. Click en "Create new token"
4. Dale un nombre descriptivo (ej: "Cursor MCP")
5. Copia el token generado (solo se muestra una vez)

### Paso 2: Configurar en Cursor
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "transport": {
        "type": "sse",
        "headers": {
          "Authorization": "Bearer TU_PERSONAL_ACCESS_TOKEN_AQUI"
        }
      }
    }
  }
}
```

**⚠️ IMPORTANTE**: No compartas tu PAT. Guárdalo de forma segura.

## Verificación

### Probar la Conexión
Una vez configurado, puedes probar que funciona preguntando al asistente:

- "Lista las tablas de mi base de datos de Supabase"
- "¿Cuántas consultas hay en la tabla consultations?"
- "Muéstrame el esquema de la tabla patients"

### Troubleshooting

**Problema**: "No se puede conectar al servidor MCP"
- Verifica que la URL sea correcta: `https://mcp.supabase.com/mcp`
- Asegúrate de estar conectado a internet
- Verifica que el token PAT sea válido (si usas autenticación manual)

**Problema**: "Error de autenticación"
- Si usas OAuth, reinicia Cursor y vuelve a autenticarte
- Si usas PAT, verifica que el token no haya expirado
- Regenera el token si es necesario

**Problema**: "No se encuentran recursos"
- Verifica que hayas seleccionado el proyecto correcto en Supabase Dashboard
- Asegúrate de tener permisos en el proyecto

## Mejores Prácticas de Seguridad

1. ✅ Usa OAuth cuando sea posible (más seguro que PATs)
2. ✅ Limita los permisos del MCP a solo lo necesario
3. ✅ No versiones tokens o credenciales en git
4. ✅ Rota tokens periódicamente
5. ✅ Usa RLS (Row Level Security) en Supabase para proteger datos

## Referencias

- [Documentación oficial de Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Mejores prácticas de seguridad](https://supabase.com/docs/guides/getting-started/mcp#step-1-follow-our-security-best-practices)

---
*Última actualización: 2025-01-03*




