# Especificaciones de Backend para Unicidad de Usuarios

Este directorio contiene los archivos necesarios para implementar la restricción global de nombres de usuario únicos en la base de datos y el backend.

## Archivos Entregados

### 1. `01_schema.sql` (Script SQL)
Este script debe ejecutarse en tu base de datos PostgreSQL.
- Crea la tabla `users` (si no existe).
- **CRÍTICO**: Crea un `UNIQUE INDEX` funcional sobre `LOWER(TRIM(username))`.
    - Esto garantiza que "Uriel", "uriel" y " uriel " sean tratados como el mismo usuario a nivel de base de datos.
    - Evita duplicados incluso si dos peticiones llegan al mismo milisegundo.

### 2. `02_user_controller.js` (Lógica de Backend)
Este archivo contiene la lógica para un controlador de Express (Node.js).
- **Sanitización**: Aplica `.trim()` y `.toLowerCase()` antes de cualquier lógica.
- **Manejo de Error 409**: Captura el código de error `23505` de PostgreSQL para devolver un mensaje claro al cliente cuando el nombre ya está en uso.

## ¿Por qué validar en ambos lados?

1.  **Frontend (React)**: Mejora la experiencia de usuario (feedback rápido sin recargar).
2.  **Backend (Node)**: Primera capa de seguridad y formateo de datos.
3.  **Base de Datos (SQL)**: **La única verdad absoluta.**
    - En sistemas concurrentes, el backend puede fallar al detectar duplicados si dos usuarios se registran al mismo tiempo (Condición de Carrera).
    - El índice `UNIQUE` en la base de datos serializa las escrituras y garantiza que nunca se escriban datos corruptos o duplicados.

## Integración Frontend (Importante)

El backend devuelve un código HTTP **409 Conflict** cuando hay un duplicado. El frontend no debe asumir el éxito solo porque la petición no falló por red.

**Patrón correcto en React/Axios:**
```javascript
try {
  await axios.put('/api/users/profile', { username: newName });
  alert("Guardado con éxito");
} catch (error) {
  if (error.response?.status === 409) {
    alert("Error: El nombre de usuario ya está en uso.");
  } else {
    alert("Error interno al guardar.");
  }
}
```
