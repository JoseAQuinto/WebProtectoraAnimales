# Interfaz de tareas, agenda y calendario

`js/modules/tasks.js` expone `render(ctx, animal?)`, `editor(ctx, options)`,
`detail(ctx, task)` y `clinical(tables, task)`. La navegación global utiliza
`#tasks`; la ficha sanitaria reutiliza el mismo panel filtrado por animal.
Se carga `utils/calendar.js`, `tasks.js` y los formularios de salud antes de
`bootstrap.js`. No hay almacén de eventos de calendario paralelo.

## Operaciones reales

- Alta/edición de título, fecha prevista, tipo y prioridad. Animal/contacto/
  responsable opcionales; las tareas clínicas exigen animal. Hora local y zona
  opcionales. Al quitar la hora también se quita la zona, sin reinterpretar
  la fecha de calendario. El servicio completa la zona de la organización.
- Se conserva la selección actual aunque un contacto esté archivado o un
  responsable pase a inactivo. Este último permanece visible con advertencia;
  para guardar se debe sustituir o quitar expresamente su asignación, según
  la autoridad del servicio. No se desasignan relaciones por perder una opción.
- Tareas con origen conservan su animal. Un plan programa una tarea finita
  mediante `health.scheduleTask`, que fija origen y animal desde el plan.
- Completar o cancelar requiere fecha y confirmación; cancelar exige motivo.
  Las clínicas y todas las originadas por un plan abren el formulario sanitario,
  que confirma el acto realizado y completa la misma fila atómicamente.
- Lista/agenda con búsqueda retardada, filtros y paginación de veinte filas.
  El calendario aplica los mismos filtros y consulta las mismas filas, sin
  cambiar estados por vencimiento. Muestra tres entradas por día y permite
  abrir el resto. Navegación por mes y acceso a detalles/acciones reales.
- `utils/calendar.js` calcula días y cuadrículas gregorianas con cadenas de
  calendario, sin convertirlas a UTC. Semana desde el lunes; los límites de
  años 0001–9999 y meses inválidos se rechazan. Hay pruebas de saltos de mes,
  siglos bisiestos, límites y días de cambio horario.

Cada formulario captura revisión al abrir y `ui.form` conserva un ID de
operación estable al reintentar. Los datos y confirmaciones se conservan si
el servicio rechaza una revisión antigua o una validación. La UI no escribe
IndexedDB directamente ni calcula dosis ni administra medicación por fecha.
No hay avisos garantizados con la aplicación cerrada.

## Aceptación y límites

La verificación real de este bloque se registra en los informes específicos
de flujos y salud del 2026-10-17. No atribuirle las rondas anteriores de la UI
inicial. Pruebas Node de calendario y diccionarios son apoyo de desarrollo;
no sustituyen navegador real por file://.

Las consultas siguen utilizando la captura completa del dataset. La
paginación de la lista es en memoria; el rendimiento de volúmenes grandes,
impresión final, accesibilidad integral y plataformas físicas siguen pendientes.
El calendario permite desplazamiento horizontal delimitado y una lista
alternativa en pantallas estrechas. Un viewport no acredita un móvil físico.
