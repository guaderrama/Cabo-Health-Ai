# Guía Rápida: Configurar MCP Server de Supabase en Cursor

## 🎯 Pasos Rápidos

### 1. Obtener Token de Acceso (Opción más simple)

**Método A: Usar Dashboard de Supabase**
1. Ve a: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc/settings/account
2. Ve a la sección "Access Tokens"
3. Haz clic en "Generate new token"
4. Copia el token (solo se muestra una vez)

**Método B: OAuth (Recomendado)**
1. Ve a: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc
2. Haz clic en "Connect" → pestaña "MCP"
3. Sigue las instrucciones para autenticación OAuth

### 2. Configurar en Cursor

**Opción 1: Via Settings UI**
1. Abre Cursor
2. Presiona `Ctrl + ,` (o `Cmd + ,` en Mac)
3. Busca "MCP" en la barra de búsqueda
4. Si aparece la opción, añade la configuración ahí

**Opción 2: Via JSON (Más directo)**
1. Presiona `Ctrl + Shift + P` (o `Cmd + Shift + P` en Mac)
2. Escribe: `Preferences: Open User Settings (JSON)`
3. Añade esto al final del archivo (antes del último `}`):

```json
"mcpServers": {
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp",
    "headers": {
      "Authorization": "Bearer TU_TOKEN_AQUI"
    }
  }
}
```

4. Guarda el archivo (`Ctrl + S` / `Cmd + S`)
5. Reinicia Cursor

**Opción 3: Editar archivo manualmente**

**Windows:**
```
%APPDATA%\Cursor\User\settings.json
```

**Mac:**
```
~/Library/Application Support/Cursor/User/settings.json
```

**Linux:**
```
~/.config/Cursor/User/settings.json
```

### 3. Verificar

1. Reinicia Cursor
2. Abre la configuración de MCP (si está disponible en la UI)
3. Deberías ver "supabase" como servidor configurado
4. Prueba preguntando al asistente: "¿Cuántas tablas hay en mi base de datos de Supabase?"

## 📝 Nota Importante

Si tu versión de Cursor no muestra opciones de MCP en la UI, puede que:
- Necesites actualizar Cursor a la versión más reciente
- La funcionalidad MCP esté en desarrollo
- Necesites usar una extensión adicional

## 🔗 Referencias

- Documentación completa: `docs/MCP_SETUP.md`
- Configuración de ejemplo: `snippets/cursor-mcp-supabase-config.json`

