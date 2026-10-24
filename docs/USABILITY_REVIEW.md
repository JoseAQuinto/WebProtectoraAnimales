# Revisión de usabilidad y lenguaje — 2026-10-24

Objetivo: que el personal y el voluntariado de una protectora, sin formación
informática, entiendan cada pantalla sin explicaciones externas. Sin cambios en
reglas de negocio, servicios, esquemas, formatos persistidos ni las cuatro versiones.

## Componentes compartidos (`js/components/ui.js`)

- `ui.choices`: desplegable con casillas para filtros de selección múltiple.
  Resume lo elegido («Perro, Gato» / «3 seleccionados»), «Quitar selección» y
  «Aceptar»; se cierra con Escape o al pulsar fuera. Sustituye a `<select multiple>`.
- `ui.form`:
  - Los campos `multiselect` se muestran como un grupo de casillas visibles.
  - Las casillas sueltas aparecen a la izquierda de su texto.
  - Nota «Los campos marcados con * son obligatorios» cuando hay alguno.
  - Los desplegables obligatorios sin valor muestran «Elige una opción».
  - Validación con mensajes propios bajo cada campo (obligatorio, email,
    mínimo/máximo, entero…); se suprime el globo del navegador y se enfoca el
    primer campo erróneo. Las restricciones nativas siguen activas.
  - Los errores del servicio con `details` marcan el campo y añaden «Revisa: …».
  - `options.submitLabel` / `options.cancelLabel` para botones con nombre de la
    acción («Marcar como hecha», «Volver»).
  - Botones Guardar/Cancelar fijos al pie de formularios largos.
- Tablas: un `MutationObserver` añade `data-label` con el título de columna; en
  pantallas ≤ 640 px cada fila se muestra como tarjeta, sin desplazamiento lateral.
- Paginación (`.pager`): si solo hay una página se ocultan Anterior/Siguiente y
  el texto «Página 1 de 1».

## Pantallas

- Animales: filtros principales visibles (Especie, Situación, Disponibilidad,
  Ubicación), resto en «Más filtros y orden»; recuento «N animales encontrados»;
  nombre enlazado en la tabla; estado vacío con acción si aún no hay animales.
  Corregido: la opción «Papelera» del filtro mostraba «Enviar a papelera».
- Resumen: tarjetas agrupadas (Animales, Tareas y calendario, Dinero e
  inventario), tareas atrasadas y artículos bajo mínimos resaltados, tablas de
  datos plegadas bajo «Ver los datos en una tabla», meses legibles y gráfico de
  especies con nombres en lugar de números.
- Tareas y Documentos: eliminado el título duplicado de la página.
- Completar/cancelar tarea: sin casilla de confirmación redundante; el botón
  dice la acción. Las confirmaciones de acciones destructivas o con efectos
  encadenados (anular, archivar, unir contactos, salidas, adopciones) se mantienen.
- Desplegables de animales: «Nombre (código)» ordenados por nombre.
- Finanzas: categorías del filtro identificadas «Ingreso: …» / «Gasto: …».
- Voluntariado: estado «Activo/Inactivo» (antes «Activos»).
- Configuración: botón «Editar» (antes «Editar ficha»); paginación de listas de
  opciones, pesos, adopciones, exportaciones y resumen ya no habla de «animales».
- Fechas: documentos, gastos del animal, copias y recuperación muestran fechas
  legibles según el formato de la organización (`utils.dates.display`).
- Navegación: herramientas de datos (exportar/importar) junto a Informes;
  «Ajustes y ayuda» queda con Copias, Configuración, Papelera y espacio, Datos
  de ejemplo y Ayuda. Nombres cotidianos («Buscar», «Adopciones», «Importar
  desde Excel (CSV)», «Papelera y espacio», «Datos de ejemplo»).

## Lenguaje

`locales/es.js`: ~700 textos reescritos en lenguaje cotidiano (sin OR/AND,
hash, UUID, MiB, «episodio», «conjunto», «transacción», «escrituras»…), con
mensajes de error que dicen qué ha pasado y qué hacer. Los nombres de columna y
códigos de las plantillas CSV/JSON se mantienen porque deben coincidir con los
archivos. `locales/en.js` recibe las claves nuevas y los textos cuyo significado
cambió; el resto del inglés no se ha revisado con la misma profundidad.

## Pruebas

- `tests/e2e/animal-filters-ui.cjs` maneja los nuevos desplegables.
- `tests/e2e/adoption-register-ui.cjs` y `tests/e2e/ui.cjs` usan los títulos nuevos.
- `dashboard-ui`, `health-ui`, `workflows-ui`, `workspace-ui`, `settings-configuration-ui`,
  `nav-diagnostics-ui`, `animal-import-ui`, `contact-import-ui`, `module-exports-ui`
  adaptadas a los nuevos nombres, botones y casillas.
- Chrome: regresión completa 35 suites / 487 comprobaciones sin fallos.

## Pendiente / recomendado

Ver la sección final de PROJECT_STATUS (2026-10-24, usabilidad).
