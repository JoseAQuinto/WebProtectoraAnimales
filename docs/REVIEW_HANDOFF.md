# Revisión de continuidad — 2026-10-16

Alcance: revisar el avance parcial de `4c5554c` y preparar un relevo reproducible.
No se amplía la aplicación ni se cierra la aceptación comercial. Los defectos
siguientes se conservan explícitamente para la próxima fase de desarrollo.
Los recorridos correctos existentes no cubren estos casos adversos.

## R1. Tareas de planes pueden quedar sin vía normal de finalización

Prioridad alta antes de datos reales. Archivos:
`js/services/tasks.js` (`edit`, `complete`), `js/domain/dataset-validator.js`
(validación de `tasks.source`), `js/services/health.js` (`record`).

Reproducido durante la revisión con servicios y validador reales, utilizando
el contexto simulado del fixture de `tests/unit/health.cjs`; **no** se ejecutó
esta reproducción contra IndexedDB ni se añadió como una prueba ya aprobada.

1. Crear un plan que empiece el 2026-10-10 y programar una tarea para el día 12.
2. Editar la tarea con `{animalId:null,dueDate:'2026-10-01'}`.
3. La operación se acepta y la validación devuelve cero errores.
4. `tasks.complete` la rechaza con `ClinicalRecordRequiredError` por pertenecer
   a un plan, y `health.record` la rechaza con `InvalidStateError` por no estar
   ligada al animal. Se permite además una fecha anterior al inicio del plan.

Siguiente acción: añadir regresión que reproduzca este caso y exigir animal
y fechas coherentes con el origen desde el validador compartido y los servicios
de alta/edición. Probar importación/restauración con el mismo registro inválido.

## R2. Un dataset restaurado vacío impide crear organización

Hallazgo por inspección de contratos, **pendiente de reproducción en navegador**.
`backup-codec.js` admite `allowEmpty:true`; la restauración puede activar todas
las tablas vacías. `bootstrap.js` lo presenta como ausencia de organización.
Sin embargo, `settings.create` utiliza prepare/activate sin `datasetId`, y
el guard de `dataset-manager.js` rechaza cualquier conjunto activo existente.
La acción ofrecida de crear organización falla con `DatasetChangedError`.

Siguiente acción: fixture de backup realmente vacío, restauración y creación
de organización desde UI. Definir una transición protegida del activo vacío
que no borre registros ni eluda control/revisión si otra pestaña lo modifica.

## R3. Un código manual puede bloquear altas automáticas posteriores

Hallazgo estático, **pendiente de reproducción con persistencia**. En
`animals.registerEntry` se acepta un código de texto como
`A-9007199254740992`, pero `context.allocateAnimalCode` interpreta todos los
sufijos `A-<dígitos>` como enteros seguros de la secuencia y lanza
`RevisionOverflowError` en la próxima alta automática. El código y su actividad
histórica impiden simplemente ignorar el registro sin revisar la política.

Siguiente acción: probar esos límites y definir el prefijo reservado/manual
sin reutilizar códigos históricos ni reinterpretar identificadores externos.

## R4. Una recarga puede dejar modo lectura hasta renovar el control

Limitación demostrada en la evidencia UI de Chrome del 2026-10-15:
`organization-form-save-and-reload-persists` informa `readOnlyAfterReload:true`.
La recarga crea un owner nuevo mientras el lease anterior sigue vigente.
La toma explícita de control funciona; falta una política de recarga/caducidad
que mantenga la exclusión entre pestañas y resulte clara para el usuario.

## Pendientes de aceptación y rendimiento

- El recorrido integrado de servicios pasó en Chrome 155.0.8059.80 el
  2026-10-16; ese recorrido concreto sigue pendiente en Edge y Firefox.
- UI inicial probada en Chrome, no UI completa en tres motores ni dispositivos.
- Cuota agotada, terminación forzada durante preparación y puntos adicionales
  de fallo/recuperación necesitan aceptación real; cancelar cooperativamente
  no demuestra esos escenarios.
- Snapshot y validación de cada escritura son O(N). El volumen del dominio
  en Node no demuestra rendimiento/memoria en navegador. No cargar todas las
  filas/recursos en vistas operativas cuando se conecten los módulos.
- Ver `PROJECT_STATUS.md` para módulos sin completar, recuperación visible,
  importación/exportación, demo, guías, licencias y paquete comercial.

## Verificación efectuada para el relevo

- 330 comprobaciones estáticas, 93 subpruebas Node y `git diff --check`: correctos.
- `lifecycle.html`: 11 internas y 6 externas correctas en Chrome por file://,
  sin red de la página; datos y bytes conservados al cerrar/reabrir perfil.
- Se auditó SHA-256 de los archivos de las evidencias: las rondas business
  `validator-fix`, core `final`, UI `final` y lifecycle `review` corresponden a
  fuentes actuales. Las primeras business `final` son históricas y anteriores
  al endurecimiento de validación.
- El ejecutor UI admite ahora `--machine` y `--output`, manteniendo el nombre
  posicional anterior. Es una mejora de portabilidad del ejecutor, sin cambios
  de producción; se comprueba sintaxis y ejecución en la revisión.
