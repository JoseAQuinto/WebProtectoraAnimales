# Mediciones: papelera y restauración — 2026-10-18

La ficha Información del animal usa `modules/weights.js` para mediciones con
20 filas por página, edición y vista explícita de papelera. Enviar/restaurar
exige confirmar la medición concreta (animal/fecha/gramos). Se utilizan los
servicios existentes con revisión/lease/idempotencia; no cambia el formato.
La medición no se elimina físicamente y restaurar conserva su UUID y notas.
El último peso se deriva de las válidas por fecha/registro/UUID; no existe un
campo independiente que pueda discrepar. Animales archivados/en papelera
conservan la consulta con acciones de escritura deshabilitadas.

Chrome/Edge **9/9 por motor**, file:// offline, en
`weights-history-ui-2026-10-18-{chrome,edge}-first.json`.
Fixture: 23 mediciones. UI: páginas, alta única con doble guardado, gramos cero
rechazados sin escritura, edición/notas con salto, confirmación obligatoria,
papelera con recálculo al peso anterior y restauración con el mismo UUID.
Archivo del animal preparado explícitamente por servicios para comprobar
consulta sin modificación, EN/ES, 360/768/1440 y cierre/reapertura.
88 fuentes intactas, dos cierres propios por motor; revisión/digest/recuentos
conservados y cero errores de página/consola o HTTP de página.
Pruebas Node de dominio/servicio ya cubrían ese ciclo y empates; no se duplican
tests que solo imiten botones. 171 Node y 702 estáticas correctas.

No hay eliminación permanente de mediciones ni aceptación de dispositivos
físicos en este bloque. El resto de correcciones de hechos continúa pendiente.
