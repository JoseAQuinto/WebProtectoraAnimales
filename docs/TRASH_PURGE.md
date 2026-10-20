# Papelera: eliminación definitiva revisada — 2026-10-20

Almacenamiento (`#retention`) añade la tarjeta «Papelera: eliminación definitiva».
Cumple el punto 30 de REQUIREMENTS.es.md: mostrar el elemento, las relaciones
afectadas y las consecuencias, exigir confirmación, facilitar copia previa e
impedir referencias rotas. Nada se vacía automáticamente ni por plazo; restaurar
desde la papelera sigue haciéndose en cada módulo. Versiones sin cambios: app
0.2.0-dev / DB 2 / schema 1 / backup 1.

## Raíces y cierre

`js/domain/trash-closure.js` es puro y se ejecuta en la revisión, en Node y dentro
de la transacción. Raíces: filas con `deletedAt` de tablas que admiten papelera,
salvo vínculos documentales y assets (hoy: animales, contactos, documentos,
mediciones, horas de voluntariado; cualquier otra tabla con papelera futura usa
la política base). Se elimina **una raíz por operación**.

Referencias entrantes con el mismo recorrido genérico de uuid que los archivos
(`assetReferences.visitRecord`). Una fila que apunta al cierre se incorpora solo
si su tabla pertenece a la política de la raíz:

- Base (todas): `activityLog`, `importIdentityMap`, `documentLinks`.
- Documentos: base + `animalEvents` (hechos documentales y sus cadenas).
- Animales: base + eventos, episodios, mediciones, acogidas, solicitudes, reservas,
  adopciones, registros sanitarios, planes y tareas **del propio animal**.

Cualquier otra referencia bloquea: finanzas (incluidos `source` de cuotas o gastos
sanitarios), donaciones, inventario, otros contactos/animales/perfiles/documentos
y configuración. También bloquean un animal bajo cuidado, tareas abiertas en el
cierre, hechos de otro animal y cualquier fallo de `validateDataset` del resultado.
Así el historial económico nunca se borra por la papelera. Los archivos que usan
las filas eliminadas se incluyen solo si después nada más los utiliza (grupos
completos foto/miniatura). Se informa de los registros que se conservan y pierden
la relación (p. ej. el animal de un documento eliminado), sin contar catálogos,
ubicaciones ni la organización.

La actividad anterior dirigida a filas eliminadas se elimina con ellas (su
`target` dejaría de existir); se añade una única actividad `delete` con código
`trash.purge`, tabla, id de la raíz y número de filas. Los recibos de importación
de esas filas desaparecen: una reimportación crearía registros nuevos.

## Servicio, transacción e interfaz

`services/trash-purge.js`: `list` paginado (20) con etiquetas de texto plano,
`preview` de solo lectura congelado con plan privado (operationId, huella de las
firmas exactas de todas las filas y fecha civil), `apply` con confirmación de
borrado y de copia externa conservada; un informe bloqueado nunca llega a storage
y repetir un informe aplicado devuelve su recibo.

`storage/trash-purge.js` comprueba en la misma transacción readwrite activo,
lease/token, replay, revisión global y dataRevision, recibo verificado de copia
actual, relee todo el conjunto, recalcula el cierre (no bloqueado y con firmas
idénticas a las revisadas) y solo entonces borra, registra la actividad, incrementa
revisiones y guarda la operación. Cancelar aborta incluso tras `delete` reales.

La UI muestra raíz (tipo, nombre, detalle, UUID, fecha de papelera), aviso de
consecuencias, bloqueos agrupados con explicación, filas que se eliminan por tabla,
archivos y tamaño, relaciones conservadas que se pierden, copia actual con
descarga/reselección (componente compartido `components/backup-proof.js`, también
usado por archivos sin uso), progreso y cancelación. Un bloqueo deshabilita
guardar y no ofrece copia.

## Evidencia

Node: `tests/unit/trash-purge.cjs`, 6 pruebas: cierre de animal cerrado con
historial/pesos/actividad y dataset válido sin tocar otro animal; bloqueos por
finanzas, cuidado, fuera de papelera e inexistente; documento con vínculo, evento
y archivo conservando el animal; contacto y medición mínimos; servicio de solo
lectura, consentimiento, replay y bloqueo antes de storage.

Navegador real `file://`, perfil propio offline y sin mocks de negocio:
`trash-purge-ui-2026-10-20-{chrome,edge}-final-2.json` (fuentes finales; ver
recuento en el JSON). Fixture con servicios reales: animal cerrado con foto y
peso, animal bloqueado por un gasto, contacto, documento vinculado a un animal
que se conserva y medición de ese animal.

- Lista de cinco raíces; revisión bloqueada explica finanzas, sin copia ni guardar.
- Revisión eliminable muestra cierre, consecuencias y relaciones; EN/ES a
  360/768/1440 sin desbordar; ninguna revisión escribe.
- Confirmación y copia verificada obligatorias; sondas directas con cierre alterado
  y raíz bloqueada rechazadas a revisión actual.
- Escritura concurrente, pérdida de lease, cancelación visible y cancelación tras
  `delete` real: todo intacto.
- La UI elimina exactamente el cierre revisado del animal (filas, foto/miniatura,
  actividad previa) en un commit con una actividad; dataset válido; replay sin
  efecto; otra eliminación exige copia nueva; documento eliminado con su archivo
  conservando el animal; contacto con solo su actividad.
- Restauración explícita desde la copia externa recupera animal, bytes, documento
  y contacto; reapertura con digest idéntico, sin errores ni HTTP.

Intentos conservados: `chrome-first` (variable del fixture que ocultaba
`document`), `chrome-second` 19/19 y `{chrome,edge}-final` 19/19 con relaciones
conservadas que aún contaban catálogos/ubicaciones; tras corregirlo y actualizar la
guía, `final-2` acredita las fuentes vigentes. Regresiones en la misma fecha:
`asset-retention-ui-2026-10-20-*-shared-proof-regression`,
`retention-ui-2026-10-20-*-trash-section-regression` y `help-ui-2026-10-20-trash-*`.

## Límites

Una raíz por operación; no hay vaciado masivo. Revisión y transacción leen el
conjunto completo (O(N)) sin pruebas de volumen/memoria/cuota física. Solo cubre
registros en papelera: los archivados no se ofrecen. Perfiles de acogida o
voluntariado, ubicaciones y catálogos no tienen papelera propia en la UI. No
sustituye la aceptación integral ni comercial.
