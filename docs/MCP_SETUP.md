# Configuración del MCP Server de Supabase

## 📋 Información del Proyecto

- **Proyecto ID**: `cozsoshuctvhvdbmkmwc`
- **URL del Proyecto**: `https://cozsoshuctvhvdbmkmwc.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc

## 🚀 Instalación del MCP Server de Supabase

El MCP server de Supabase NO se instala como paquete npm. Es un servicio HTTP hospedado que se configura directamente en Cursor.

### Opción 1: Autenticación OAuth (Recomendada)

1. **Abrir Dashboard de Supabase**
   - Ve a: https://supabase.com/dashboard
   - Inicia sesión con tu cuenta

2. **Configurar MCP en Supabase Dashboard**
   - Haz clic en "Connect" en tu proyecto
   - Navega a la pestaña **MCP**
   - Selecciona las características que deseas habilitar
   - Genera la configuración para Cursor

3. **Configurar en Cursor**
   - Durante la configuración, Cursor te pedirá iniciar sesión en Supabase
   - Se abrirá una ventana del navegador para autenticarte
   - Selecciona la organización que contiene tu proyecto
   - Autoriza el acceso

### Opción 2: Personal Access Token (PAT) - Para CI/CD o uso manual

1. **Crear Personal Access Token**
   - Ve a: https://supabase.com/dashboard/account/tokens
   - Haz clic en "Generate new token"
   - Copia el token generado (solo se muestra una vez)

2. **Configurar en Cursor**
   - Abre la configuración de Cursor
   - Ubicación del archivo de configuración:
     - **Windows**: `%APPDATA%\Cursor\User\settings.json`
     - **Mac**: `~/Library/Application Support/Cursor/User/settings.json`
     - **Linux**: `~/.config/Cursor/User/settings.json`
   
   - Añade la siguiente configuración:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer TU_PERSONAL_ACCESS_TOKEN_AQUI"
      }
    }
  }
}
```

   - Reemplaza `TU_PERSONAL_ACCESS_TOKEN_AQUI` con tu token real

3. **Alternativa: Usar Command Palette**
   - Abre Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Busca: "Preferences: Open User Settings (JSON)"
   - Añade la configuración del MCP server

## 🔒 Seguridad - Mejores Prácticas

### ⚠️ Importante
- **NUNCA** commitees tokens o credenciales en el repositorio
- Usa variables de entorno para tokens en producción
- Rotar tokens periódicamente
- Usa el principio de menor privilegio

### Recomendaciones
1. **OAuth es más seguro** que PATs para uso local
2. **PATs** son útiles para CI/CD o automatización
3. **Revisa permisos** del token antes de usarlo
4. **Monitorea** el uso de tokens en el dashboard

## ✅ Verificación

Una vez configurado, deberías poder:

1. **Probar la conexión**
   - Abre Cursor
   - Verifica que el MCP server de Supabase esté conectado
   - Busca en la configuración de MCP si aparece "supabase" como servidor activo

2. **Probar funcionalidades**
   - Pide al asistente que consulte tu base de datos
   - Ejemplo: "¿Cuántas consultas hay en la tabla consultations?"
   - Verifica que puede acceder a los recursos del proyecto

## 📚 Referencias

- [Documentación oficial de Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Mejores prácticas de seguridad](https://supabase.com/docs/guides/getting-started/mcp#step-1-follow-our-security-best-practices)

## 🐛 Troubleshooting

### El servidor MCP no aparece en Cursor
- Verifica que la versión de Cursor sea compatible con MCP
- Revisa el archivo de configuración JSON por errores de sintaxis
- Reinicia Cursor después de hacer cambios

### Error de autenticación
- Verifica que el token sea válido
- Asegúrate de que el token no haya expirado
- Regenera el token si es necesario

### No puede acceder a la base de datos
- Verifica que el proyecto ID sea correcto
- Confirma que tienes permisos en el proyecto
- Revisa las políticas RLS si aplica

---

**Última actualización**: 2025-01-XX  
**Proyecto**: Cabo Health Nova  
**MCP Server**: Supabase HTTP

