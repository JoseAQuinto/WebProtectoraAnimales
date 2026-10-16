# Servicios de tareas y salud

`tasks.js` y `health.js` preparan conjuntos de cambios mediante
`services.context.execute`. La validación relacional y el commit coordinado
preceden a la confirmación. Cargar `finance.js` y `tasks.js` antes de `health.js`.
Todas las escrituras aceptan `command` al final: `operationId` estable para
repetir una intención sin duplicados y `expectedRevision` del formulario o vista
previa. Los métodos devuelven el recibo del contexto con IDs dentro de `result`.

## Tareas

- `tasks.create(input,command)`: título, fecha prevista, tipo, descripción/notas,
  prioridad, animal/contacto/responsable opcionales y hora local opcional.
  La zona IANA se copia de la organización si se introduce hora sin zona.
  Un origen relacionado admite `{type,id}` y recibe clave de origen única.
- `tasks.edit(id,patch,command)`: modifica una tarea pendiente o en curso.
  Puede alternar esos dos estados; completar y cancelar son acciones explícitas.
  No permite inyectar ID, revisiones, origen, fechas de cierre ni metadatos.
- `tasks.complete(id,{date?},command)`: finaliza una tarea general confirmando
  fecha realizada. Los tipos `veterinary_visit`, `vaccination`, `medication` y
  tareas originadas por un plan requieren `health.record` para documentar el acto.
- `tasks.cancel(id,{reason,date?},command)`: cancela explícitamente con motivo.
  Una tarea terminada o cancelada no se sobrescribe mediante estas acciones.
- `tasks.list(tables,filters)`: consulta pura de las mismas filas para lista,
  agenda y calendario. Filtros por estado, prioridad, tipo, animal, contacto,
  responsable y rango inclusivo `from/to`; admite arrays por filtro (OR) y
  combina filtros distintos mediante AND. Orden: fecha, hora local e ID.
- `tasks.urgency(task,today)`: deriva `overdue`, `today`, `next_week`, `later` o
  `closed`; próximos siete días incluye el séptimo. No modifica el estado.

No se convierte una fecha sin hora en un instante UTC ni se crean eventos de
calendario duplicados. Un vencimiento no realiza un acto ni administra medicación.
No hay alarmas garantizadas mientras la aplicación esté cerrada.

## Actos sanitarios realizados

`health.record(input,options?,command)` registra animal, tipo, fecha realizada,
título, descripción, resultados, notas, veterinario/clínica, plan opcional,
condición activa/resuelta cuando corresponda y próxima tarea existente opcional.
Solo admite los campos definidos por el contrato; los servicios generan fuentes,
IDs y revisiones. La fecha debe ser real y no futura en la organización.

Opciones explícitas:

- `expense: {categoryId,concept,amountMinor,date?,contactId?,notes?}` crea un
  único gasto relacionado con el animal y el registro clínico. La moneda es la
  de la organización. Se incluye en el mismo conjunto de cambios.
- `expenseMovementId` selecciona un gasto existente, confirmado y del mismo
  animal. Permite asociar varios actos de una factura combinada por selección
  explícita sin generar otro gasto ni volver a sumar importes. Es excluyente
  con `expense`.
- `completeTaskId` confirma la realización y fecha de una única tarea abierta
  del mismo animal. Se conserva `sourceTaskId`, único, y se completa esa fila.
  Una vacuna debe corresponder a acto `vaccination` y medicación a
  `medication_administration`. Si procede de un plan, se conserva esa relación.
- `completePlan: true` cierra el plan seleccionado después del acto. Requiere
  haber resuelto las otras tareas pendientes del mismo plan; no las cancela
  silenciosamente. Sin esta opción, registrar el acto no cierra el plan.

El resultado incluye `id`, `expenseMovementId`, `eventId` y `completedTaskId`.
Registro, gasto, tarea completada, cambio de esterilización, evento de historial
y actividad se preparan juntos. Si cualquier validación falla, no se confirma
ninguno. Volver a ejecutar el mismo `operationId` devuelve el recibo anterior.
Una tarea ya realizada no puede generar otro acto mediante una operación nueva.

Un acto de esterilización actualiza `sterilizationStatus` y `sterilizationDate`
del animal en el mismo commit. Si ya hay una fecha diferente, se exige revisar
el hecho existente antes de introducir otra; no se cambia historia a escondidas.
Historial enlaza al registro clínico mediante clave única, sin duplicar texto
completo ni coste. Los tipos de historia genéricos conservan el enlace al acto
preciso, consultable desde el registro de origen.

## Planes y programación

- `health.createPlan(input,command)` crea un plan `planned` o `active`, con
  animal, tipo, nombre, fechas, medicamento e instrucciones humanas opcionales.
- `health.updatePlan(id,patch,command)` permite editar un plan abierto y
  cambiarlo de estado. No devuelve un activo a previsto ni reabre un cerrado.
  No mueve su inicio después de un acto ya documentado. Para cerrar o cancelar
  primero se completan o cancelan expresamente sus tareas pendientes.
  Tampoco mueve su inicio después de la fecha prevista de una tarea del plan.
- `health.scheduleTask(planId,input,command)` crea una tarea finita a partir
  de un plan abierto, fijando animal y origen del plan. La fecha prevista no
  puede preceder al comienzo del plan. Cada llamada crea una tarea identificada,
  sin series infinitas ni ejecución al cerrar la aplicación.
- Toda tarea con `source` (alta, edición, importación o restauración) conserva el
  animal de su registro de origen (`task.animalMismatch`, también si se quita el
  animal) y, si procede de un plan, no puede preceder a su inicio
  (`task.beforeOrigin`). Así nunca queda una tarea clínica imposible de completar.

Las instrucciones de dosis, vía y frecuencia son texto proporcionado por el
usuario o profesional. El servicio las conserva; no calcula dosis, recomienda
tratamientos ni ejecuta administraciones por fecha.

## Pruebas y alcance

`node tests/unit/health.cjs`: nueve pruebas con contexto simulado y validador
real. Cubre vencimientos sin administración automática, finalización clínica
con gasto/evento único e idempotencia, esterilización coordinada, rechazo
atómico por importes o relaciones erróneas, factura compartida sin duplicar,
fechas futuras/tipos incompatibles, transiciones generales, planes con tareas
finitas y filtros/alertas sin modificar datos. Estas pruebas verifican conjuntos
de cambios y reglas; persistencia, lease y rollback de IndexedDB se comprueban
en las suites de integración reales por separado. No se declara aquí una
interfaz sanitaria completa ni una verificación clínica profesional.
