# Plan de Implementación: Gestión y Borrado de Pacientes

## 1. Análisis de la Situación Actual
Actualmente, el **Panel del Médico** (`DoctorDashboard.tsx`) muestra una lista de todas las consultas realizadas. No existe ninguna funcionalidad para eliminar registros.

## 2. Propuesta de Solución
Implementar un sistema de borrado seguro que permita al médico eliminar consultas individuales o historiales completos de pacientes.

### A. Cambios en la Interfaz (UI)
1. **Botón de Eliminación en Tarjeta**:
   - Agregar un icono de "Papelera" (🗑️) discreto pero accesible en la esquina superior derecha de cada tarjeta de paciente.
   - Color: Rojo suave (`text-red-400`) que cambia a rojo intenso (`hover:text-red-600`) al pasar el mouse.

2. **Modal de Confirmación de Seguridad**:
   - **Nunca borrar directamente**. Al hacer clic, mostrar un modal de advertencia crítica.
   - **Mensaje**: "¿Estás seguro de que deseas eliminar permanentemente la consulta de [Nombre del Paciente]?"
   - **Doble Confirmación**: Botón "Cancelar" (gris) y "Sí, Eliminar" (rojo).

### B. Lógica de Base de Datos (Supabase)
1. **Función de Borrado**:
   - Utilizar la API de Supabase para ejecutar el borrado físico del registro.
   ```typescript
   const { error } = await supabase
     .from('consultations')
     .delete()
     .eq('id', consultationId);
   ```

2. **Seguridad de Datos (RLS)**:
   - **Verificación**: Asegurarnos de que las políticas de seguridad (RLS) de Supabase permitan al rol "médico" ejecutar la acción `DELETE`.
   - Si las políticas actuales solo permiten `SELECT` e `INSERT`, tendremos que aplicar una migración SQL para habilitar `DELETE` para médicos autenticados.

### C. Flujo de Usuario Propuesto
1. Médico ve la lista de pacientes.
2. Identifica una consulta de prueba o un paciente que desea borrar.
3. Hace clic en el icono 🗑️.
4. Aparece alerta: "⚠️ Esta acción es irreversible".
5. Médico confirma.
6. El sistema borra el registro de la base de datos.
7. La lista se actualiza automáticamente (el paciente desaparece) sin recargar la página.

## 3. Recomendación Técnica
Recomiendo implementar el borrado **por consulta** inicialmente. Esto te da control granular.

**¿Por qué?**
A veces quieres borrar solo una sesión de prueba fallida de un paciente, pero mantener su historial válido. Borrar "al paciente" completo podría eliminar datos valiosos por error.

## 4. Pasos de Ejecución (Si apruebas)
1. [ ] Crear componente `DeleteConfirmationModal`.
2. [ ] Modificar `DoctorDashboard.tsx` para incluir el botón de borrar.
3. [ ] Implementar la función `handleDeleteConsultation`.
4. [ ] Verificar y ajustar políticas RLS en Supabase (si es necesario).
5. [ ] Probar el flujo completo.

¿Apruebas este plan de acción?
