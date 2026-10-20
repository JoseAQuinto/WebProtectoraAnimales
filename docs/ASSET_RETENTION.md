# Archivos incorporados sin referencias — 2026-10-20

Almacenamiento (`#retention`) añade una tarjeta para revisar y eliminar, de forma
explícita, archivos incorporados del **conjunto activo** que ya no utiliza nada:
fotografías/miniaturas sustituidas o retiradas y logotipos reemplazados o quitados.
Versiones sin cambios: app 0.2.0-dev / DB 2 / schema 1 / backup 1. No hay borrado
automático ni por plazo, y sustituir una foto sigue conservando la anterior.

## Análisis de referencias

`js/domain/asset-references.js` es puro y se usa igual en la revisión, en Node y
dentro de la transacción de borrado. No mantiene una lista manual: recorre todos
los campos `uuid` de todas las tablas del esquema (refs declaradas, objetos
`originRef`, ids dinámicos como `importIdentityMap.entityId` y parámetros como
`previousId/nextId`), salvo `id`/`datasetId` del propio registro. Cualquier valor
que coincida con un asset lo protege. Así, un campo nuevo del esquema protege
archivos sin tocar este módulo.

Motivos de conservación mostrados: registros actuales; solo registros archivados
o en papelera (incluido el propio documento en papelera); historial o vínculos de
importación (`animalEvents`, `activityLog`, `importIdentityMap` o uuid sin ref);
y dependencia de un derivado conservado. Las relaciones `derivedFromAssetId` se
cierran por punto fijo: un padre sin referencias se conserva si su miniatura u
otro derivado sigue en uso. Los candidatos se agrupan por componentes conectados
(foto + miniatura) y solo se seleccionan grupos completos, de modo que nunca queda
un derivado apuntando a un padre borrado. Las referencias externas de documentos
no tienen bytes en la aplicación y no aparecen.

Los archivos usados por registros archivados o en papelera **no** se ofrecen: su
liberación depende del borrado definitivo de negocio, que sigue pendiente.

## Revisión, copia y eliminación

`services/asset-retention.js`: `preview` es de solo lectura, congela el informe y
guarda el plan privado (operationId, fecha civil de la organización). `read`
permite descargar o previsualizar un candidato con el lector validado de assets,
rechazando archivos fuera del informe o con bytes distintos. `apply` exige grupos
completos del informe, confirmación de borrado y confirmación de conservar una
copia externa; la huella incluye dataset, revisión y firmas exactas de los assets.
Repetir el mismo informe aplicado devuelve el recibo; otra selección se rechaza.

`storage/asset-retention.js` comprueba **en la misma transacción readwrite**:
activo, lease/token, replay por operationId/fingerprint, revisión global y
dataRevision, recibo de copia actual **verificada** de esa dataRevision, lectura
completa del dataset activo, nuevo análisis (cada id sigue sin referencias, con la
misma firma y grupo completo) y `validateDataset` del resultado con su actividad.
Solo entonces borra los assets, añade una actividad `delete` con
`retention.deleteAssets`, incrementa revisiones y registra la operación. Cancelar
aborta la transacción incluso tras peticiones `delete` ya emitidas. El éxito se
muestra solo tras `transaction.complete`.

La UI muestra totales frente al límite de 64 MiB, motivos de conservación, grupos
con nombre/tipo/MIME/tamaño/dimensiones/fecha/UUID, descarga y vista previa (URL
de objeto liberada al cerrar), seleccionar todo/nada, copia actual con descarga y
reselección, progreso y botón de cancelación. Cada eliminación cambia la revisión:
otra necesita una copia nueva.

## Evidencia

Node: `tests/unit/asset-retention.cjs`, 6 pruebas (grupos de fotos/logo, motivos
actual/archivo/papelera, historia/importación/parámetros/dependencias, validez al
borrar grupos completos frente a padre suelto, consentimiento, selección, replay
y lectura). Usan el arnés de servicios; no acreditan IndexedDB.

Navegador real `file://`, perfil propio offline, sin mocks de negocio:
`asset-retention-ui-2026-10-20-{chrome,edge}-final-2.json`, **19/19 por motor**,
124 fuentes intactas, dos cierres propios normales y reapertura con digest
idéntico, sin errores de página/consola ni HTTP. Fixture con servicios reales:
foto sustituida, logo sustituido, documento vigente y documento en papelera.

- 8 archivos, 3 sin uso en 2 grupos; 4 actuales y 1 en papelera conservados.
- Revisión, descarga de inspección (hash igual al guardado) y vista previa sin
  escrituras; EN/ES a 360/768/1440 sin desbordar página ni diálogo.
- Sin selección, sin copia verificada o con copia de otra revisión: rechazo sin
  escrituras; la copia se descarga y verifica desde el propio diálogo.
- Sondas directas a la primitiva (identificadas como tales): archivo en uso,
  archivo de documento en papelera y grupo parcial rechazados a revisión actual.
- Escritura concurrente invalida la revisión abierta y se conserva; pérdida de
  lease rechaza el borrado; cancelación visible antes de empezar y cancelación
  cooperativa tras un `delete` real revierten todo.
- La UI elimina solo el grupo elegido (doble clic, un commit, una actividad) y
  conserva los bytes del resto; replay no repite; la copia previa contiene los
  bytes eliminados. Otra eliminación exige copia nueva; luego se retira el logo
  antiguo y la revisión queda vacía, también tras reabrir.

Intentos conservados: `chrome-first` (nombres de imagen cambiados por la
preparación), `chrome-second/third` (espera de descarga sin agrupar y filtro de
grupo mal anclado en el ejecutor), `chrome-fourth` 19/19 y `chrome-final`/
`edge-final` 19/19 con la presentación anterior (tabla de motivos con
desplazamiento y tamaños «0.00 MiB»). Se corrigió la presentación y las rondas
`final-2` acreditan las fuentes actuales; no se reasignan hashes.

Regresión de conjuntos inactivos tras añadir la tarjeta:
`retention-ui-2026-10-20-{chrome,edge}-asset-section-regression.json`, 18/18.

## Límites

La revisión y la transacción leen el dataset completo (O(N)); faltan pruebas de
tiempo/memoria a volumen y de cuota física. El tamaño liberado es lógico: el
navegador puede no devolver espacio físico de inmediato. No hay retención
automática ni borrado de archivos usados por registros archivados/en papelera,
historial o importación. No sustituye la aceptación integral ni comercial.
