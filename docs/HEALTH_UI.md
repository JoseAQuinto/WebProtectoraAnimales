# Interfaz sanitaria y planes

`health-forms.js` concentra los formularios; `health-workflow.js` presenta la
sección de ficha animal. Cargar ambos después de UI/servicios/personas y antes
de bootstrap. `tasks.js` y el flujo sanitario se referencian solo al utilizar
las acciones, sin dependencia circular durante su carga.

## API de presentación

```js
RescueManager.modules.healthWorkflow.render(ctx, animal); // Node
RescueManager.modules.healthWorkflow.record(ctx, animal, taskOptional); // dialog
RescueManager.modules.healthWorkflow.plan(ctx, animal, existingOptional); // dialog
```

Contexto: instantánea con tablas/revisión global, `refresh`, `notify`, permiso
`canWrite` y `documents({entityType,entityId})`. Las tareas se integran mediante
`modules.tasks.render(ctx,animal)`, `editor(ctx,{animal,plan})` y `detail(ctx,task)`.
Se reutilizan lista/calendario y registros de tareas del módulo central.

## Recorridos y límites

- Registro realizado con tipo, fecha no futura, título, descripción/resultados/
  notas. Veterinario y clínica se seleccionan de contactos existentes: rol
  veterinario y organización, respectivamente. No se crea una agenda paralela.
- Enfermedades/alergias permiten estado desconocido, activo o resuelto. La fecha
  de resolución es opcional y no se inventa. Otros tipos no guardan estos campos.
- Una tarea clínica se completa únicamente mediante `health.record`, con
  confirmación expresa de realización. Vacunación/medicación restringen el tipo
  del acto correspondiente; se mantiene el plan de origen cuando existe.
- Se puede asociar un plan abierto y elegir una próxima tarea ya existente.
  Completar plan es una casilla explícita, disponible cuando no quedan otras
  tareas pendientes. Se muestran los títulos que impiden el cierre. El servicio
  vuelve a comprobarlo junto con el commit; no hay cancelaciones silenciosas.
- Gasto: ninguno, uno nuevo o uno ya contabilizado del mismo animal. El nuevo
  se guarda con el acto en la misma operación, fecha realizada y moneda de la
  organización. El separador decimal es explícito y el parser convierte a
  unidades menores seguras, incluidas monedas de cero/tres decimales.
- Elegir una factura existente no crea un movimiento adicional. Su aparición
  en varias filas clínicas no es un total económico; la interfaz lo explica.
- Planes: alta prevista/activa, edición de planes abiertos, finalización o
  cancelación confirmadas. Se conservan instrucciones humanas de medicamento,
  dosis, vía y frecuencia. Programar crea una única tarea mediante el editor
  central, sin series automáticas.
- La ficha muestra actos, condiciones registradas activas, planes e instrucciones,
  documentos del registro sanitario y tareas/calendario del mismo animal.
  Los registros realizados se consultan; correcciones históricas posteriores
  siguen pendientes del recorrido específico, no se sobrescriben aquí.
- Formularios solo para animales con ficha activa y permiso de escritura.
  Histórico y documentos siguen consultables. Campos/errores/idempotencia,
  revisión capturada al abrir y foco se delegan en `ui.form`.

La aplicación conserva instrucciones introducidas; no calcula dosis ni
recomienda tratamientos o calendarios. Ningún vencimiento administra un acto.

## Verificación

Se comprueban sintaxis y paridad de traducciones/variables. No se ejecutan
navegadores en paralelo a la ronda central de UI. La aceptación real debe incluir:

1. Registrar revisión sin gasto, con gasto nuevo y con la misma factura existente;
   verificar un movimiento, enlaces y totales derivados sin duplicación.
2. Completar tarea clínica con confirmación, tipo correcto y fecha real; comprobar
   tarea/acto/evento/gasto únicos tras doble pulsación y backup/restauración.
3. Crear plan con instrucciones humanas, programar tarea finita, rechazar cierre
   mientras otra tarea esté pendiente y completar plan expresamente al resolverla.
4. Enfermedad/alergia desconocida, activa y resuelta con/sin fecha; ningún estado
   de condición en tipos distintos. Esterilización coherente con animal.
5. Fecha futura, revisión obsoleta, pérdida de lease, cuota/fallo transaccional:
   campos conservados y ningún éxito ni cambio parcial.
6. Importes EUR/JPY/KWD, separador elegido, precisión excedida y cero rechazados.
7. Contactos/clínica y documentos vinculados al mismo registro, navegación por
   teclado, foco, EN/ES y anchos pequeños. Registrar por separado dispositivos
   físicos y navegadores actuales pendientes.

Estas comprobaciones de sintaxis no sustituyen la evidencia `file://` de los
recorridos reales ni acreditan el producto comercial completo.
