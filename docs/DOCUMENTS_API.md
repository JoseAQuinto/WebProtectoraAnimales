# Documentos, fotografías y pesos — API de servicios

Contrato de fase 4, versión de aplicación `0.2.0-dev`, esquema 1. Los servicios
se cargan como scripts clásicos después de `context.js`, utilidades y dominio;
`documents.js` precede a `photos.js`. Las escrituras usan `context.execute`:
snapshot consistente, lease, dataset activo, revisión optimista, idempotencia y
confirmación en `transaction.complete`. No acceden al DOM.

## Comandos y resultado

Cada escritura admite `command = { operationId?, expectedRevision? }` como último
argumento. `expectedRevision` es la revisión global capturada al abrir el
formulario; el guardado conserva además las revisiones de registros. El recibo
es `{ operationId, activeRevision, duplicate, result }`.

Un reintento conserva el mismo `operationId` y datos. Reutilizarlo con otros
datos produce conflicto. La identidad de un archivo incluye nombre, MIME,
tamaño, SHA-256 y dimensiones, nunca un Blob serializado ni una URL temporal.

## Documentos (`RescueManager.services.documents`)

| Método | Entrada y comportamiento |
|---|---|
| `createEmbedded(metadata, file, command?)` | Incorpora un archivo seleccionado y devuelve `result: { id, assetId }`. |
| `createExternal(metadata, command?)` | Guarda descripción externa, sin bytes; devuelve `{ id }`. |
| `update(id, patch, command?)` | Edita título/tipo/fecha/notas; en externos permite editar su descripción/hash. No cambia modo ni recurso. |
| `link(documentId, relation, command?)` | Añade o reactiva un vínculo, devuelve `{ id: documentId }`. |
| `unlink(linkId, command?)` | Marca el vínculo en papelera, devuelve `{ id: documentId, linkId }`. |
| `archive/unarchive/trash/restore(id, command?)` | Cambia estado del documento conservando archivos, relaciones e historia. |
| `list(tables, filters?)` | Consulta pura de documentos ordenados por fecha descendente, creación e ID. |
| `download(id)` | Lee el documento activo y devuelve `{ blob, fileName, mime, byteLength, sha256, width, height, type, id }` tras verificar sus bytes. No inicia una descarga ni abre contenido. |
| `compareExternal(id, file)` | Reselección opcional: devuelve `{ sha256, expectedSha256, matches }`; `matches` es `null` cuando no hay hash registrado. No guarda nada. |

Metadatos de incorporación: `{ title, typeId, date, notes?, links? }`.
Externos añaden `{ externalFileName, externalLocation, externalFileType?,
originalSha256? }`. `typeId` debe nombrar un catálogo `document_type` activo;
mantener una referencia a un tipo después desactivado es válido. No se borra su
historia. `date` es `YYYY-MM-DD` no futura. Validaciones de longitud y formato
proceden del esquema común.

`links` es una lista opcional, máximo 1000, de
`{ entityType: 'animal'|'contact'|'adoption'|'veterinary_record', entityId }`.
Se valida tipo, existencia, dataset y estado antes de guardar. No permite
duplicados ni contactos fusionados como nuevas relaciones. Incorporación,
documento, vínculos, actividad y eventos se confirman juntos. Desvincular conserva
la fila; volver a vincular reactiva el mismo ID para respetar su índice único.

Los enlaces a animales, adopciones o registros veterinarios crean un evento
`document` por animal y operación, con referencia al documento. Desvincular no
borra el hecho histórico de que se añadió. Archivo y papelera del documento no
envían sus vínculos ni recursos a papelera; restaurar recupera la misma relación.
Los documentos archivados o en papelera deben restaurarse antes de editarlos.

Filtros de `list`: `search`, `typeId`, `mode`, `entityType` + `entityId`,
`includeArchived`, `trash`. `search` normaliza título, notas y nombre externo;
los textos originales se conservan.

`files.prepareDocument(file)` se ejecuta antes de preparar la escritura: hasta
8 MiB, PDF/JPEG/PNG/WebP/TXT UTF-8, MIME declarado, extensión y contenido
identificable coherentes. Las imágenes se decodifican con la utilidad común.
Se guardan Blob y SHA-256. `download` vuelve a verificar esquema, tamaño, MIME,
firma, dimensiones, hash y decodificación cuando sea imagen. La vista usa una
descarga con nombre del archivo, nunca `iframe`, `object`, HTML ni PDF activo.

Los externos no se abren por su ruta descriptiva y `download` devuelve
`ExternalReferenceError`. El backup incluye su descripción y hash, no su
contenido. La interfaz debe mostrar: **«Este archivo está fuera de la aplicación.
Su contenido no se incluye en la copia de seguridad; conserva también el archivo
original»**. `compareExternal` limita la selección a 128 MiB para no leer
archivos arbitrariamente grandes en memoria; no verifica ni ejecuta su formato.
Para archivos mayores puede conservarse una referencia sin hash.

## Fotografías (`RescueManager.services.photos`)

| Método | Resultado |
|---|---|
| `set(animalId, file, command?)` | `{ animalId, photoAssetId, thumbnailAssetId }`. |
| `remove(animalId, command?)` | `{ animalId }`; quita referencias del animal y conserva recursos. |
| `read(assetId)` | Recurso con Blob de imagen verificado y metadatos, apto para crear URL temporal. |
| `setOrganizationLogo(file, command?)` | `{ logoAssetId }`; usa imagen optimizada, sin guardar original. |

`images.prepare(file)` realiza lectura, decodificación, orientación y nueva
codificación fuera de transacciones: entrada JPEG/PNG/WebP de hasta 15 MiB y
40 MP, imagen de lado máximo 1600, miniatura de máximo 320 y cada salida como
máximo 1 MiB. Foto, miniatura enlazada por `derivedFromAssetId`, referencias del
animal y actividad se guardan en una única transacción. Los animales archivados
o en papelera se restauran antes de cambiar su foto. No se exige estar bajo
cuidado para corregir la fotografía de una ficha histórica.

La vista crea URL de objeto únicamente de `read`, y la revoca al salir o cambiar
de imagen. El servicio no crea URL temporales. Sustituir/quitar foto o logo no
borra recursos antiguos: pueden seguir referenciados y el requisito prohíbe
eliminar archivos automáticamente para recuperar espacio. Una futura eliminación
permanente deberá analizar todas sus dependencias y pedir confirmación.

El helper compartido `services.assetFiles` reúne `identity`, `budget`, `asset`,
`validateAsset` y `readAsset`. No escribe por sí mismo. El presupuesto contabiliza
todos los recursos guardados (incluidos archivados, papelera y sustituidos),
máximo **64 MiB por dataset**. Se comprueba sobre el snapshot antes del commit,
y lo vuelve a comprobar el validador relacional antes de mutar. Este límite no
garantiza que el navegador conceda esa cuota. No se purgan recursos para encajar.

## Pesos (`RescueManager.services.weights`)

`record({ animalId, date, grams, notes? }, command?)`,
`update(id, { date?, grams?, notes? }, command?)`, `trash(id, command?)` y
`restore(id, command?)` devuelven `{ id }`. `grams` es un entero seguro positivo,
la fecha es real y no futura; no permite reasignar una medición a otro animal.
Animal archivado o en papelera requiere restauración para registrar/corregir.

`list(tables, animalId, { trash? })` devuelve mediciones válidas más recientes
primero. `latest(tables, animalId)` devuelve la primera o `null`. Desempata por
`date` descendente, `createdAt` descendente e ID descendente; el ID solo ofrece
un resultado determinista cuando coinciden ambas fechas. No se guarda un peso
actual independiente en el animal. Archivar o enviar una medición a papelera
la excluye del peso derivado; restaurar la vuelve a considerar.

## Verificación y límites

`tests/unit/documents.cjs` reutiliza `support/service-harness.cjs` y el validador
real. Cubre archivos TXT, metadatos, identidad/hash, enlaces, rollback de cambios,
idempotencia, revisiones, estados, presupuesto, foto/miniatura atómicas y pesos.
El contexto simulado no verifica IndexedDB ni fallos de cuota reales. Las fotos
preparadas se inyectan explícitamente: Node no acredita decodificación, canvas,
orientación ni descargas. Esa aceptación exige recorridos reales por `file://`.

El 2026-10-16 se ejecutó `tests/integration/media.html` por `file://`, offline,
en Windows 11 Home 10.0.26300: **10 casos internos y 6 externos correctos** en
Chrome **155.0.8059.80** y Edge **155.0.4283.45**. Las suites crean un PNG real
de 1800×700 mediante canvas, lo decodifican y recodifican a foto/miniatura,
prueban logo, reemplazo conservador, TXT/PDF, externos y comparación de hash,
links, peso, errores sin cambios parciales y backup/restauración. Verifican el
digest de registros y bytes tras cerrar completamente el navegador y abrir el
mismo perfil. No observaron peticiones externas ni errores de ejecución; las
huellas de fuentes coincidieron al terminar cada ejecución.

Evidencia: [Chrome](../tests/results/media-2026-10-16-windows-wip-chrome-second.json)
y [Edge](../tests/results/media-2026-10-16-windows-wip-edge-second.json).
Los primeros intentos se conservan como diagnóstico: Chrome no arrancó dentro
del entorno restringido (Crashpad); la ejecución autorizada con el navegador
instalado sí pasó. Edge no estaba en la ruta estándar del ejecutor y se utilizó
`--executable` con su instalación EdgeCore local. Ningún fallo inicial procedía
de la aplicación.

La prueba de presupuesto en navegador inyecta temporalmente el límite permitido
igual a los bytes ya usados para probar rechazo antes de escribir; lo restablece
a 64 MiB. **No acredita agotar cuota real del navegador**, ni el rendimiento
con 64 MiB de archivos. La prueba no verifica la orientación EXIF de todas las
cámaras, dispositivos físicos ni PDF viewer; el PDF se mantiene como descarga
de bytes y no se ejecuta. Firefox con estas fuentes sigue pendiente.

### Aceptación parcial de formularios de fase 4

`tests/e2e/workspace-ui.cjs` se ejecutó contra `index.html` real offline en
Chrome y Edge. Las últimas rondas
`workspace-ui-2026-10-16-windows-wip-{chrome,edge}-final-2.json` confirman **8
recorridos de negocio correctos por motor**: organización, contacto y duplicado
sin confirmar, perfiles compartidos y horas, entrada de animal y peso,
foto seleccionada/optimizada/visualizada, archivo inválido con campos conservados
y ninguna escritura, TXT con descarga de bytes y vínculos, referencia externa,
y copia descargada/reseleccionada/restaurada con registros y bytes idénticos.

**El resultado global de ambas rondas es fallido.** El noveno caso recorre
anchos 360/768/1440 de los módulos y cambia a inglés, pero su selector de título
`getByRole('heading', { name: 'Documents', exact: true })` encuentra el `h1` y el
`h2` y Playwright lo rechaza por ambiguo. La siguiente sesión debe limitar ese
selector a `level: 1` y repetir la suite. Debido al fallo, la aceptación final de
idioma, runtime, comparación de fuentes y cierre/reapertura de esta suite UI no
se da por aprobada. Los procesos de prueba se cerraron en `finally`.
La persistencia completa de los servicios multimedia sí está acreditada por
la suite `media.html` anterior. Las capturas de interfaz sintética se conservan
en `.tmp` y sus rutas/huellas figuran en los JSON; no son recursos del producto.

Los datos, archivos, relaciones, estados y actividad ya están contemplados por
el esquema y backup generales; esta implementación no cambia sus versiones.
La lectura de recursos usa actualmente `context.snapshot`, que captura todos
los registros y referencias Blob; sigue pendiente optimizar carga diferida a
escala. No se declara una capacidad de memoria/dispositivo sin mediciones.
