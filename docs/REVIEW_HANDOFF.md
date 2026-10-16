# Revisión de continuidad — 2026-10-16

Alcance original: revisar el avance parcial de `4c5554c` y preparar un relevo
reproducible. Los cuatro defectos priorizados se **corrigieron el mismo día**
en el segundo PC, cada uno con regresión; evidencia en `ENVIRONMENT_TESTS.md`.

## R1. Tareas de planes sin vía normal de finalización — resuelto

Antes: editar una tarea de plan con `{animalId:null,dueDate:'2026-10-01'}` se
aceptaba y luego ni `tasks.complete` ni `health.record` podían cerrarla.

Corrección: `tasks.buildTask` (alta, edición y `health.scheduleTask`) exige el
animal del registro de origen y, para planes, fecha no anterior a su inicio.
El validador compartido —el mismo de restauración e importación— rechaza
`task.animalMismatch` (también con animal nulo) y `task.beforeOrigin`.
`health.updatePlan` no adelanta el inicio por encima de tareas del plan.
Regresión: `tests/unit/health.cjs`, caso «R1 regression».

## R2. Un dataset restaurado vacío impedía crear organización — resuelto

Corrección: `settings.create` detecta un conjunto activo completamente vacío y
escribe organización, catálogos y ubicación en él con `context.execute`
(lease, revisión global e idempotencia). Con datos se rechaza; sin conjunto
activo sigue el camino prepare/activate. La UI pasa la revisión observada.
Regresión real IndexedDB: `tests/integration/business.js`, caso
`empty-restored-dataset-accepts-one-guarded-organization-creation`.

## R3. Un código manual podía bloquear altas automáticas — resuelto

Corrección: la forma `A-<número>` (sin distinguir mayúsculas) queda reservada a
la secuencia automática; los códigos manuales usan cualquier otro texto y no se
reutilizan. El validador rechaza `A-` con 16 o más dígitos (`animal.codeSequence`)
en restauraciones/importaciones. Regresión: `tests/unit/lifecycle.cjs`, «R3».

## R4. Modo lectura tras recarga hasta renovar el control — resuelto

Medición: en Chrome ninguna escritura IndexedDB lanzada en `pagehide` se
confirma, y `window.name` asignado en `pagehide` no sobrevive a la recarga.
No hay forma fiable de liberar el lease al descargar sin debilitar la exclusión.

Política adoptada: lease de 15 s renovado cada 5 s (también oculta si hay una
operación larga). Una pestaña sin control reintenta exactamente al caducar el
lease ajeno y cada 5 s; nunca quita el control a una pestaña viva que renueva.
La UI explica que tras recargar el control vuelve solo; la toma explícita sigue
disponible con confirmación. Medido: 14 976 ms (Chrome) y 14 983 ms (Edge).

## Pendientes de aceptación y rendimiento

- Recorridos negocio/lifecycle/UI en Firefox (no instalado en el segundo PC).
- Cuota agotada, terminación forzada durante preparación y puntos adicionales
  de fallo/recuperación necesitan aceptación real; cancelar cooperativamente
  no demuestra esos escenarios.
- Snapshot y validación de cada escritura son O(N). El volumen del dominio
  en Node no demuestra rendimiento/memoria en navegador. No cargar todas las
  filas/recursos en vistas operativas cuando se conecten los módulos.
- Ver `PROJECT_STATUS.md` para módulos sin completar, recuperación visible,
  importación/exportación, demo, guías, licencias y paquete comercial.
