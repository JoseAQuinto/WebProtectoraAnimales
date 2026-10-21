# Lectura activa reconstruible y lotes — 2026-10-21

App 0.2.0-dev / DB 2 / schema 1 / backup 1, sin cambios de formato.

## Contrato de lectura

La captura activa por defecto conserva como máximo un conjunto en memoria,
profundamente inmutable. Cada lectura sigue abriendo una transacción real de
IndexedDB y consulta puntero/revisión global, metadatos completos del dataset y
secuencia animal. Solo reutiliza la captura si coinciden todos los anclajes y
la identidad de la conexión nativa. Cambiar conjunto, revisión, metadatos o
conexión obliga a leer de nuevo las tablas. Los Blob conservan referencias
nativas inmutables; sus bytes no se convierten en Base64 para esta caché.

No es una alternativa de persistencia: si falla o se aborta la lectura de
IndexedDB, se rechaza la operación aunque haya datos en memoria. Una lectura
abortada nunca publica su candidato. La congelación ocurre fuera de la
transacción, después de `transaction.complete`. No se guarda la caché en disco
ni se exporta; al reabrir debe reconstruirse desde IndexedDB.

- `services.context.snapshot({fresh:true})` fuerza una captura nueva del activo.
- `storage.repositories.snapshot(datasetId)` siempre lee ese conjunto completo,
  sin reutilizar la caché activa. Conserva el contrato previo de lectura explícita.
- `storage.repositories.clearReadCache()` libera únicamente la captura de memoria.
- Crear una copia completa usa obligatoriamente una captura fresca. Verificar
  correspondencia de copia/conjunto también lee el dataset explícitamente.

La invalidación por revisiones es el contrato de todas las escrituras soportadas.
Un cambio externo manual en IndexedDB sin actualizar esos anclajes no es una
escritura soportada. La prueba incluye uno, identificado como fixture, para
demostrar que una copia fresca sí captura los bytes y registros realmente guardados.

## Escrituras y renovación

El repositorio aplica cambios mediante posiciones por UUID construidas una vez
por tabla afectada; evita buscar desde el principio por cada fila de un lote.
Solo calcula hechos documentales cuando cambia alguna fecha documental y no
recorre movimientos de inventario si no se intenta reinterpretar unidad/precisión.
Todas las validaciones completas de campos, relaciones e historia siguen activas.

Los comandos exponen estado transitorio `context.busy`. `withActivity` incluye
los preparativos de documentos, fotos y logo, anteriores a la escritura. Renueva
un lease propio aún válido a 120 s mientras existe actividad; el latido considera
también ese estado. Al terminar la última actividad vuelve a 15 s. No toma el
control de otra pestaña ni resucita un lease vencido. El guardado sigue verificando
propietario, token, vigencia, conjunto y revisión dentro de la transacción. Una
pérdida real de control rechaza el guardado. El contador se limpia también al fallar.
Un cierre abrupto durante actividad puede dejar hasta dos minutos de espera antes
de la recuperación automática; la guía y el aviso de lectura explican este caso.

Una renovación fallida al volver al estado inactivo quita el control local y
registra diagnóstico `lease-idle`; no convierte una escritura ya confirmada en
un falso fallo ni sustituye el error original de preparación. Cinco pruebas Node
del contexto cubren limpieza, concurrencia y preparación anidada; su coordinador
es simulado y no sustituye las pruebas nativas. `withActivity` no agrupa varios
comandos en una transacción ni promete atomicidad entre ellos.

El escenario mixto completo detectó después que las copias largas aún no usaban
esa actividad. `backup.create`, `createForDataset` y `verify` protegen ahora al
escritor existente; una pestaña ya de lectura puede seguir creando/verificando
sin tomar control. `restore` y `recover` incluyen preparación y activación bajo
actividad, conservando todos los guardas transaccionales. MIXED_VOLUME.md conserva
el fallo y la continuación nativa con registros y bytes comprobados.

La primera ronda de volumen con caché (`volume-ui-2026-10-21-chrome-read-cache.json`)
se conserva fallida: pérdida de lease durante crecimiento hacia 50k bajo carga.
Después se sacó la congelación de la transacción, se indexó la aplicación del
lote y se reforzó la renovación. No se presenta ese intento como aceptado ni
se atribuye su causa exacta a una pestaña oculta sin evidencia.
También se conserva `volume-ui-2026-10-21-chrome-cache-disk.json`, con pérdida
de lease durante archivos separados bajo la política de 15 s. La ronda posterior
`volume-ui-2026-10-21-chrome-native-disk.json` pasa 17/17 con la política actual,
copia de 69 MB realmente guardada/reseleccionada y reapertura intacta.

## Pruebas y alcance

`read-cache-ui` observa llamadas nativas de IndexedDB sin sustituir resultados:
una lectura fría consulta las 28 tablas y la repetida no lee filas de negocio.
Prueba inmutabilidad, lectura fresca/explícita, escritura local/otra pestaña,
revisión antigua, pérdida de control, cambio de metadatos/secuencia y conexión.
Aborta una transacción en la lectura de metadatos y otra tras la última petición
real de tablas: ninguna devuelve un éxito de caché ni publica lecturas abortadas.
Incluye lote de 1.000 cambios con edición/altas, replay y colisión sin guardado
parcial, copia fresca, restauración y cierre/reapertura con hashes de bytes.

La operación larga dura 16,5 s, supera el lease inicial y verifica avance de la
vigencia con el mismo propietario/token y limpieza del contador tras un fallo.
Las rondas `read-cache-ui-2026-10-21-{chrome,edge}-active-command.json` pasan
17/17; ambos navegadores informaron `visibilityState: visible` pese a otra pestaña
al frente. Acreditan la operación larga visible, **no** las políticas reales de
pestañas ocultas de todos los navegadores. Sigue pendiente esa aceptación física.
La ronda posterior `read-cache-ui-2026-10-21-chrome-protected-lease.json` pasa
17/17 con la política de 120 s y retorno a 15 s; también se verifica en Edge en
`read-cache-ui-2026-10-21-protected-lease-edge.json`. Sus propios hashes delimitan
la versión acreditada; no se reasignan a los informes anteriores.

Las observaciones de estado de las suites E2E usan `{fresh:true}` para que la
caché no pueda disimular un error de persistencia. La propia prueba de caché
utiliza lecturas normales solo cuando verifica explícitamente identidad/reutilización.
La interfaz y los comandos de producción siguen recorriendo su ruta normal.

No es todavía paginación desde índices ni validación incremental por tablas.
La lectura inicial, el refresco tras una escritura y la validación completa siguen
siendo O(N). La retención de una captura puede aumentar memoria; `performance.memory`
cuantizado no acredita consumo ni capacidad. Volumen y tiempos: VOLUME.md.
