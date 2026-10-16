# Persistencia implementada en 0.2.0-dev

La base estable es `animal-rescue-manager`; DB 2, esquema 1, backup 1.
Scripts: dominio → storage/schema → database → transactions →
write-coordinator → repositories → dataset-manager. Ver APIs de servicios
en los documentos DOMAIN/LIFECYCLE/RESOURCES/HEALTH_API.

## Vocabulario definitivo

Se conservan los nombres del núcleo probado: `meta` (puntero `active`, lease
`writer`, esquema y contadores), `datasets`, `operations`, `backupReceipts`.
Los estados técnicos son `staging`, `active`, `retired`. Equivalen a preparación,
activo y recuperación del diseño; no se crean almacenes duplicados `appMeta`
o `writeLease`. Todos los almacenes de negocio usan `[datasetId,id]`.

## Lecturas y escrituras

- `repositories.snapshot(datasetId?)` captura metadatos, filas y referencias
  Blob en una única transacción; devuelve `globalRevision` y `dataRevision`
  distintos. Codificación/hash ocurre después de completar la transacción.
- `get(table,id,datasetId)` y `list(table,{datasetId,index,prefix,offset,limit})`
  permiten lecturas acotadas mediante índices circunscritos al conjunto.
- `commit(options,changes,result)` valida la vista posterior fuera de la
  transacción. Cada cambio contiene table/record/expectedRevision (`null`
  para alta). El guard transaccional revalida conjunto activo, revisión global,
  propietario, token, vigencia y revisiones de registros antes de escribir.
- El lease tiene token de generación. `acquire` conserva la interfaz booleana;
  `readLease` devuelve el token, `renew` lo exige, `takeControl` requiere revisión
  vigente. Solo la sonda de infraestructura admite su contrato antiguo de prueba.
- Duración: `config.leaseMs` (15 s) y renovación cada `config.leaseRenewMs` (5 s)
  mientras la pestaña es visible, o mientras ejecuta una operación larga aunque
  esté oculta. `context.retry()` reclama el control solo si el lease anterior ha
  caducado; una pestaña viva que renueva nunca lo pierde así. Tras recargar, el
  documento anterior deja su lease vigente (en Chrome no se confirma ninguna
  escritura IndexedDB iniciada en `pagehide`, medido el 2026-10-16), por lo que la
  página nueva queda en lectura como máximo un periodo y lo recupera sola.
  `status().blockedUntil` indica cuándo caduca el lease ajeno.
- `context.execute(type,intent,build,command)` prepara un fingerprint SHA-256,
  comprueba replay, obtiene snapshot, construye cambios, valida y confirma.
  La UI solo usa servicios. Conserva operationId al reintentar la misma intención.
- Código animal: contador en meta avanzado en la misma transacción. Tras
  restauración se deriva un mínimo de códigos actuales y activityLog (también
  exportado); no borrar el historial que impide reutilizar códigos anteriores.
  El formato `A-<dígitos>` está reservado a la secuencia automática; el validador
  rechaza `A-` con 16 o más dígitos (`animal.codeSequence`) en restauraciones e
  importaciones para que el siguiente código siga siendo un entero seguro.
- El constructor de `context.execute` recibe también `h.datasetId`.
- `settings.create(input,command)`: sin conjunto activo, prepara y activa uno
  nuevo; con un conjunto activo completamente vacío (copia vacía restaurada),
  escribe organización, catálogos y ubicación inicial en ese conjunto mediante
  `context.execute` (lease, revisión e idempotencia). Con datos, se rechaza.

## Restauración y recuperación

`datasetManager.prepare(source,options)` rebasa datasetId conservando UUID y
metadatos de negocio. Escribe por lotes con guard, compara lo almacenado y
verifica hashes, registra digest y revisión de preparación. `activate` exige
ese sello y revisión sin cambios y sustituye el puntero atómicamente. Un staging
sin validar nunca se activa al arrancar. `discardStaging` solo elimina una
preparación identificada, nunca el activo ni recuperación.

`services.backup` distingue create/requested/verify. Reemplazar datos requiere
confirmación y recibo verificado de la revisión actual. `recover(datasetId,command)`
aplica el mismo protocolo a un conjunto retirado; su interfaz sigue pendiente.
No se borran automáticamente conjuntos retirados ni archivos para recuperar cuota.

## Límites pendientes de optimización

Las escrituras actuales capturan y validan el dataset completo. Favorece la
comprobación central de invariantes, pero es O(N) y todavía debe optimizarse y
medirse en navegador con el volumen objetivo antes de distribuir. La UI inicial
también usa snapshot; lecturas de dashboard/listas deben pasar a consultas
acotadas y carga diferida de recursos. El ensayo de volumen del dominio en Node
no demuestra rendimiento, memoria ni interacción del producto en dispositivos.

Pendiente aceptación de cuota agotada, terminación real durante cada etapa de
preparación, fallos inyectados en commit y recuperación local visible. Cancelación
cooperativa y reapertura después de activar sí forman parte de la suite actual.
