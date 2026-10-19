# Limpieza revisada de conjuntos inactivos — 2026-10-19

Almacenamiento (`#retention`), también desde Configuración. Versiones sin cambios:
app 0.2.0-dev / DB 2 / schema 1 / backup 1. No hay borrado automático ni por plazo.

## Alcance y copias

Lista conjuntos retired/staging con organización, UUID, estado, fecha, recuentos
y tamaño lógico de archivos; páginas de 20. Una preparación puede estar parcial
o validada sin activar. Revisa un único conjunto antes de confirmar su eliminación.
El activo no se ofrece ni se puede eliminar por API. Limpieza nunca activa datos.

Siempre requiere copia completa **actual verificada**. Un retired requiere además
su **propia copia externa verificada**, porque puede contener datos que ya no
existan en el activo. El formulario permite descargar/reseleccionar/verificar
ambas copias, distingue dataset/revisión y exige conservar la externa del retirado
y confirmar el borrado. Una copia actual no sustituye la del retirado.

Al eliminar se retiran exclusivamente filas de ese dataset en todas las tablas,
sus operaciones, recibos, contador de códigos y metadatos. Desaparece la recuperación
local elegida; el archivo externo permanece fuera de la aplicación. El activo
conserva registros/archivos y recibe una sola actividad de mantenimiento, por lo
que cambia su revisión y otra eliminación exige una nueva copia actual.

Cancelar antes de completar aborta toda la transacción: incluso registros ya
encolados para borrar se conservan. No se muestra éxito antes de transaction.complete.
No vacía papelera, no borra registros activos, no elimina recursos sin uso del
activo y no configura retención por tiempo. Esas tareas siguen pendientes.

## Protección e implementación

storage/retention.js usa índices count y cursores. Revisa metadatos/recuentos del
target en una transacción readonly; la lista no construye snapshots completos de
recuperación ni decodifica bytes. Para sumar tamaño recorre metadatos de assets,
con referencias Blob de un registro cada vez. Recovery.list reutiliza esa consulta.
Exportar una copia sí captura el conjunto completo y verifica sus archivos.

services/retention mantiene planes privados y revisiones profundamente congeladas.
preview es puro; apply exige consentimiento y prepara fingerprint/operationId.
La eliminación revalida **dentro de la misma transacción** activo/lease/token/
revisión, versión, todos los metadatos del target, sus recuentos y los recibos
verificados de las revisiones correctas. Si la preparación avanza o cambia el
activo, no borra nada. Una pestaña sin control no puede eliminar. La operación
queda registrada y su replay funciona aunque el target ya no exista.

Backups añade createForDataset para retired y listForDataset para revisar recibos.
La verificación conserva comparación de datos/hashes contra el conjunto local.
El formulario no afirma prueba de conservación externa por solo pedir descarga.
Se limpia la infraestructura únicamente del target; sus relaciones de negocio
son internas al dataset y no se rompen referencias del activo.

## Evidencia real

`retention-ui-2026-10-19-{chrome,edge}-active-revision.json`: **18/18 por motor**,
120 fuentes intactas, file:// offline y dos cierres/reapertura por motor. Preparación
sintética explícita con servicios/contexto y staging/activación reales: 520 contactos,
un TXT compartido por copias, registro antiguo ausente del activo, un retired y
dos staging (uno parcial). Se simulan avance de metadatos del preparador y ausencia
de recibos locales únicamente en la preparación del fixture; no se debilita IDB.

- Inventario/revisión puros y selección activa rechazada.
- Falta de copia actual y copia solo generada no autorizan eliminación.
- Cambio de staging invalida la revisión exacta; datos actuales/target intactos.
- Botón de cancelación ejercitado antes de empezar el borrado con clicks DOM
  síncronos; otra prueba aborta cooperativamente tras el primer cursor.delete
  real. Ambas dejan todos los datos intactos. No se atribuye fallo físico.
- UI borra solo el staging elegido; otro staging y el retired quedan iguales.
- Nuevo backup actual tras mantenimiento, copia propia de retired obligatoria,
  archivo equivocado rechazado y copia correcta descargada/reseleccionada/verificada.
  La copia del retired conserva el contacto que no estaba en el activo.
- Otra pestaña toma control: intento rechazado sin borrado. UI elimina después
  el retired elegido con un commit, conservando bytes/negocio actuales y archivo
  externo. Replay de infraestructura después de desaparecer el target no repite
  actividad ni borrado. Recibos del target retirados, otros conjuntos intactos.
- EN/ES y 360/768/1440 sin desbordar; captura ES estrecha inspeccionada.
- Restauración **explícita posterior** desde la copia externa recupera el dato
  antiguo y los bytes en un nuevo dataset. No se atribuye este cambio del activo
  a la limpieza. Después, escritura concurrente invalida otra revisión de limpieza
  antes de comprobar copias/borrar, y conserva el trabajo nuevo.
- Reapertura: digest/revisiones/archivos y ausencia de targets borrados conservados.
  Sin errores de página/consola ni HTTP de página.

Los primeros intentos conservados corrigieron el contrato de array de la nueva
pantalla y el ejecutor: snapshot de un dataset borrado arroja DatasetChangedError,
no null. Las rondas missing-target/edge-first pasaron 17/17; las finales añaden
revisión activa antigua y el inventario acotado, sin reasignar sus hashes anteriores.

Cinco pruebas Node de planes privados/consentimiento/replay/paginación/errores y
dataset activo: **282 Node / 862 estáticas**. No simulan aceptación del nuevo
borrado IndexedDB: esta corresponde al recorrido real anterior.

## Límites pendientes

Requiere una organización activa y versiones compatibles. No limpia arranques
interrumpidos sin organización activa ni conjuntos de esquema desconocido. Una
preparación que cambia debe revisarse de nuevo; no se promete continuarla tras
decidir descartarla. Los snapshots del negocio activo/exportación y eliminación
atómica a volumen aún necesitan pruebas de memoria/tiempo/cuota física. El tamaño
lógico no garantiza espacio físico liberado inmediatamente por el navegador.

Siguiente: recursos sin referencias del activo (incluidos archivo/papelera y
dependencias entre assets), borrado permanente de negocio con análisis de relaciones,
lecturas acotadas/binarios diferidos, impresión y aceptación integral. No reducir
el alcance original ni presentar esta limpieza como producto comercial terminado.
