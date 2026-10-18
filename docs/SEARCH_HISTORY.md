# Buscador global e historial — 2026-10-18

Versiones sin cambios: app `0.2.0-dev`, DB `2`, schema `1`, backup `1`.

## Implementación

`#search` está disponible en la navegación general. `services/search.js`
consulta la captura de tablas ya validada; no escribe ni accede a IndexedDB.
Agrupa animales y contactos, ordena por nombre/UUID y devuelve total y página
independiente (20 inicialmente, límite API 100). Espera de entrada 180 ms.
Nombres ignoran acentos/mayúsculas; códigos son texto. Microchips eliminan
espacios/guiones sin convertir a número. Teléfonos usan el normalizador común
de prefijos `00`/`+` y puntuación. Email compara sin distinguir mayúsculas.
Conserva y muestra valores originales; no ejecuta texto de consultas.
Archivo y papelera se incluyen solo por opción explícita. Contactos fusionados
no repiten la ficha sobreviviente. Cada resultado abre la ficha exacta.

La pestaña Historial del animal ya usa `modules/animal-history.js`:

- Filtros de tipo y periodo inclusivo por fecha del hecho, con error de orden.
- Fecha del hecho separada del instante de registro en zona de organización.
- Transiciones de solicitud/reserva tomadas de cada evento persistido; no
  sustituye el estado anterior por el estado actual del origen.
- Páginas de 20, orden descendente por hecho/registro y UUID para desempatar.
- Cada evento abre su origen por tipo/UUID: episodio, acogida, solicitud,
  reserva, adopción, animal, acto sanitario o documento. La ficha genérica
  advierte que sus valores corresponden al origen actual.
- Actos sanitarios abren su detalle clínico existente; adopciones incluyen
  documentos; contactos relacionados abren su ficha. Documentos incorporados
  usan descarga validada; referencias externas muestran ubicación como texto
  y explican que no incluyen bytes.
- Versiones sustituidas/anuladas se ocultan inicialmente y se pueden incluir
  con una marca. Esto no implementa edición/corrección de hechos: faltan los
  comandos coordinados de corrección, su UI y aceptación específica.

## Verificación real

Ejecutor: `tests/e2e/search-history-ui.cjs`. Datos sintéticos preparados por
servicios reales: 23 animales, contactos activo/archivado/papelera, solicitud
revisada/aprobada/reservada/adoptada/devuelta, 22 actos y referencia externa.
Después solo lectura desde UI: se compara revisión, recuentos y digest de
todas las tablas antes/después y después de cerrar/reabrir.

10/10 comprobaciones por motor, bajo `file://`, offline:

- Chrome: `search-history-ui-2026-10-18-chrome-detail-selector.json`.
- Edge: `search-history-ui-2026-10-18-edge-first.json`.

72 fuentes cargadas con SHA-256 iguales al inicio/final y dos cierres propios
por motor. Sin errores de página/consola ni solicitudes HTTP de la página.
Se verifican normalizaciones/originales, enlaces exactos, paginación, archivo/
papelera, transiciones históricas, origen clínico/documento, periodo inválido,
EN/ES, anchos 360/768/1440 y persistencia con lease de lectura tras reapertura.

Intentos anteriores conservados: `chrome-first` no pudo iniciar el navegador
en sandbox (crashpad); `chrome-unsandboxed` omitía un motivo obligatorio en
la preparación; `chrome-fixture-fix` usaba un selector de teléfono sin su
etiqueta; `chrome-selector-fix` no distinguía el título del acto del encabezado
Documentos. Son fallos de entorno/ejecutor, no aceptación aprobada.

137 subpruebas Node y 622 comprobaciones estáticas correctas. Las cuatro
pruebas nuevas de búsqueda cubren normalización, inmutabilidad, visibilidad,
fusionados, límites/páginas y consultas vacías/puntuación. El contrato de
diccionarios incluye las claves nuevas en ambos idiomas.

## Límites

No hay datos reales ni plataformas nuevas acreditadas. Anchos emulados no
son dispositivos físicos. La búsqueda recorre la captura completa en memoria:
no resuelve O(N). No se inyectan correcciones artificiales en el recorrido de
navegador; faltan comandos de corrección y pruebas de ese ciclo. Las descargas
incorporadas ya tienen aceptación en los recorridos de documentos; este
recorrido verifica la consulta de una referencia externa desde el historial.
