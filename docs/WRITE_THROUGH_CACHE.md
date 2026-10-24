# Caché de lectura con escritura directa — 2026-10-24

App 0.2.0-dev / DB 2 / schema 1 / backup 1, sin cambios de formato. Amplía
READ_CACHE.md: hasta ahora, cada escritura cambiaba los anclajes y la lectura
siguiente volvía a leer las 28 tablas (O(N), ~0,3 s a 20k registros y ~1 s a 60k).

## Contrato

`writeCoordinator.mutate` construye explícitamente los registros `active` y `dataset`
que escribe y los adjunta al resultado como propiedad **no enumerable** `written`
(junto a la conexión nativa usada); no entran en el registro de operaciones ni en
los recibos. `repositories.commit`, **después** de `transaction.complete` y solo si
la operación no es un replay, publica en la caché activa el estado completo que acaba
de validar (`validateDataset` sobre captura + cambios), congelado, con esos anclajes
exactos y la secuencia de códigos resultante.

Por qué es equivalente a leer: `mutate` exige dentro de la misma transacción que la
revisión global sea la de la captura (cualquier otra escritura soportada la cambia)
y escribe exactamente las filas del cambio. La lectura siguiente sigue abriendo una
transacción real y comparando puntero/revisión, metadatos completos, secuencia y
conexión; si algo difiere (otra pestaña, retención, restauración, otra conexión),
lee todas las tablas como antes. Un fallo, rechazo, pérdida de lease o aborto no
publica nada porque `mutate` no se resuelve. Las rutas que no usan `commit`
(retención, papelera, archivos, importaciones por staging, restauración) no publican
y fuerzan lectura completa por cambio de anclajes.

## Evidencia

`write-through-ui-2026-10-24-{chrome,edge}-final.json`, **10/10 por motor**,
file:// offline. `IDBIndex.prototype.getAll` se envuelve solo para **contar**
lecturas `byDataset` (devuelve el resultado nativo). Tras cada tipo de escritura
(alta/edición de contacto, alta de animal con secuencia, foto, documento
incorporado, peso, gasto, salida, papelera y restauración) la lectura siguiente
hace **0 lecturas de filas de negocio**, está congelada y su digest canónico (con
SHA-256 de cada Blob) es idéntico al de una lectura fresca. Rechazos (validación,
formulario antiguo) y replay no cambian el estado; pérdida de lease falla sin
publicar; una escritura en otra pestaña obliga a lectura fría que la incluye; al
recuperar el control vuelve la escritura directa; la reapertura reconstruye desde
IndexedDB con el mismo digest.

Medición con 20 105 registros: escritura 212 ms; lectura siguiente 0–1 ms frente a
323–394 ms de una lectura fresca. Intentos conservados `chrome-first` y `chrome-second`:
la aserción de reapertura esperaba lecturas contadas después del arranque, que ya
había leído antes de instalar el contador; el contenido era idéntico.

Regresión completa con este runtime: `regression-2026-10-24-write-through-{chrome,edge}.json`
**70 rondas (35 suites por motor), 974 comprobaciones, 0 fallos**.

## Límites

Sigue siendo O(N) la validación completa en cada escritura (~0,7 s a 50k) y la
primera lectura tras abrir o tras cambios de otra pestaña. No hay paginación desde
índices ni validación incremental. La caché retiene una captura en memoria; no hay
medición de memoria con perfilador.
