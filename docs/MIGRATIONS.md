# Contrato propuesto de migraciones

Estado: la migración física **1→2** está implementada de forma aditiva en
`js/storage/database.js`: incorpora almacenes/índices sin reescribir registros
existentes. Comprueba el esquema lógico antes de modificar la base; una versión
lógica futura aborta la actualización conservando incluso la versión física.
Ambos casos se prueban en `tests/integration/business.js` bajo `file://` en los
tres navegadores; evidencia en `ENVIRONMENT_TESTS.md`.

Versiones actuales: app `1.0.0`, DB `2`, esquema `1`, backup `1`. No existen
versiones de esquema de negocio anteriores publicadas: solo se admite esquema
1/formato 1. Las transformaciones lógicas futuras siguen el contrato siguiente;
no se declara un migrador de versiones antiguas que aún no existen.

Este contrato desarrolla el requisito 13 y debe mantenerse coherente con
[ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md) y
[BACKUP_FORMAT.md](BACKUP_FORMAT.md). Antes de incorporar una migración se deben
añadir sus transformaciones, validadores, fixtures y resultados reales.

## Versiones independientes

| Valor | Qué identifica | Regla de evolución |
|---|---|---|
| `appVersion` | Archivos y funcionalidades del producto | No determina por sí solo compatibilidad de datos |
| `dbVersion` | Almacenes e índices físicos de IndexedDB | Entero creciente; cambia mediante `onupgradeneeded` |
| `schemaVersion` | Significado y validación del conjunto de negocio | Entero creciente; transformación explícita por paso |
| `backupFormatVersion` | Contenedor, integridad y representación del backup | Adaptador de lectura explícito por formato soportado |

`revision` de entidad y `dataRevision` del conjunto detectan cambios de datos;
no son versiones de esquema. Cambiar la versión de aplicación nunca renombra
`animal-rescue-manager` ni abre deliberadamente una base vacía para evitar migrar.

La primera implementación fijará sus números reales. Por ahora, el modelo y el
backup proponen versión 1 sin acreditar un formato productivo publicado.

## Registro y compatibilidad

Las migraciones se incorporarán en scripts clásicos locales bajo
`js/storage/migrations/`, numeradas y cargadas en orden explícito. Cada paso
declarará identificador estable, versión origen/destino consecutivas, propósito,
dependencias físicas, transformador, validador y fixtures de entrada/salida.
La ruta completa debe existir: `1 → 2 → 3`, sin saltos implícitos ni selección
basada únicamente en `appVersion`.

El registro de compatibilidad enumerará por publicación:

- `dbVersion` que puede abrir y actualizar, con su ruta física.
- `schemaVersion` que puede leer, migrar y conservar para recuperación.
- Versiones de contenedor de backup admitidas y adaptación correspondiente.
- Versiones de origen sin soporte, con mensaje de recuperación aplicable.

Encontrar datos futuros, una ruta ausente o metadatos incoherentes bloquea las
modificaciones y presenta un diagnóstico. No interpretar parcialmente tablas
desconocidas, borrar campos para hacerlos encajar ni intentar degradar el esquema.

## Comprobación previa y copia externa

Antes de transformar información existente:

1. Inspeccionar versiones y metadatos sin actualizar la base. Abrir una base ya
   existente sin solicitar una versión superior permite la lectura previa;
   no ejecutar una actualización física antes de conocer su compatibilidad.
2. Comprobar íntegra la ruta de migración y las capacidades necesarias. Si falla,
   cerrar conexiones y explicar qué versión compatible se necesita.
3. Mostrar versiones de origen/destino, cambios concretos, módulos afectados,
   espacio adicional necesario y puntos en los que es posible cancelar.
4. Facilitar la creación y verificación mediante nueva selección de una copia
   externa del conjunto actual. Una descarga solicitada no prueba que se guardó.
5. Solicitar confirmación de la actualización, adquirir control exclusivo y
   capturar `sourceDatasetId`, `sourceDataRevision` y token de escritura.
6. Revalidar esos valores al empezar la preparación y al activar. Si cambiaron,
   detenerse y actualizar el resumen; nunca usar una validación ya obsoleta.

Si una aplicación no sabe leer la versión encontrada, no debe fabricar una copia
de negocio incompleta. Indicará utilizar una versión compatible para exportarla.
No eliminar datos anteriores para obtener espacio ni presentar almacenamiento
estimado como garantía de que la migración terminará.

## Actualización física de IndexedDB

`onupgradeneeded` modifica estructura mediante la transacción de actualización:
crear almacenes, claves e índices necesarios para el esquema admitido. Un error
aborta esa transacción; su éxito solo se comunica tras finalizar la apertura.
No realizar lectura de archivos, cálculo de hashes, diálogos o esperas externas
durante la transacción.

Las ampliaciones deben conservar los almacenes y campos que necesita el conjunto
activo y su recuperación. No borrar ni reemplazar almacenes con datos de negocio
para preparar el destino. Si un índice único nuevo podría rechazar datos
existentes, comprobar el conflicto y diseñar la transición antes de crearlo;
no corregir duplicados silenciosamente dentro de la actualización física.

Todas las conexiones implementarán `versionchange`: suspender escrituras,
cerrar conexión, informar del cambio y exigir recarga antes de seguir. El proceso
que recibe `blocked` mostrará instrucciones para cerrar otras pestañas/ventanas;
no mostrará actualización completada ni forzará borrado. Una apertura abandonada
por cancelación o espera agotada debe cerrar cualquier conexión obtenida después.

La recuperación de datos no reduce `dbVersion`. Una aplicación antigua puede no
poder abrir una base cuyo esquema físico se amplió; conservar los archivos
anteriores no basta. La versión actual debe disponer del lector de recuperación
previsto o del flujo de restauración de un backup compatible.

## Transformación del conjunto de negocio

Las transformaciones amplias se ejecutarán en otro `datasetId`, manteniendo
intacto el origen. El conjunto destino permanecerá `preparing` durante todos los
pasos. El registro operativo guardará como mínimo identificador de ejecución,
origen y revisión capturada, destino, versiones, paso, estado y tiempos técnicos.
No incluir fichas completas en el diagnóstico.

Cada paso convierte el modelo de origen al siguiente de forma determinista y
valida el resultado antes de continuar. Sus reglas documentarán valores iniciales
permitidos, cambios de unidades, referencias, enumeraciones y normalizaciones.
No inventar fechas, importes, identidades ni datos desconocidos para superar un
validador. Un conflicto sin conversión inequívoca detiene la operación y se informa.

Se conservarán UUID, hechos, fechas, importes, archivos, notas, archivo, papelera,
relaciones e historia salvo la transformación expresamente definida. Cambia el
ámbito `datasetId`; se mantienen referencias al mismo UUID dentro del destino.
Los campos de revisión y tiempos de negocio no se reescriben indiscriminadamente.
Los metadatos nuevos identifican la migración fuera de las fichas originales.

No llamar a servicios que vuelvan a ejecutar efectos de negocio. Migrar una
donación no crea otro ingreso; migrar salud no genera de nuevo tareas o eventos.
Recalcular solo índices auxiliares, secuencias mínimas seguras y cachés derivables
cuya política esté documentada. Los recursos siguen como `Blob` en IndexedDB.

Los lotes se confirman en transacciones cortas. El progreso muestra pasos o
recuentos reales y permite cancelar entre lotes. Un lote reintentado debe ser
idempotente; no se reanudará una preparación interrumpida si no existe una política
explícita y probada. La opción inicial segura es descartarla de forma controlada
y empezar otra, conservando siempre el origen.

## Validación y activación

Antes de activar, el validador completo comprobará esquemas, recuentos por tabla,
unicidades, referencias en el mismo conjunto, invariantes de negocio, secuencias,
totales de dinero/cantidades y tamaños/hashes de todos los recursos. Los cambios
esperados de recuentos o valores deben derivarse de reglas concretas del paso,
con evidencia comparable de origen y destino. No basta con que no haya excepción.

La activación es una transacción corta sobre metadatos y coordinación que:

1. Comprueba propietario, token y vigencia del control de escritura.
2. Comprueba que origen y revisión siguen siendo los capturados y que el destino
   completo está validado para la versión objetivo.
3. Cambia el único puntero activo, marca el destino `active` y el anterior
   `recovery`, y registra el resultado de la operación.
4. Devuelve éxito después de `transaction.complete`.

Las demás pestañas deben detectar el cambio y dejar de escribir sobre el origen.
Una escritura siempre revalida conjunto activo y control dentro de su transacción;
BroadcastChannel o un aviso visual no sustituyen esa comprobación.

## Fallos, cancelación y recuperación

| Momento del fallo | Resultado exigido |
|---|---|
| Comprobación previa o copia externa | Origen sin modificaciones; motivo visible |
| Actualización física abortada | Estructura anterior conservada por IndexedDB |
| Cuota, validación o cancelación durante preparación | Origen sigue activo; destino incompleto nunca utilizable |
| Cierre antes de activar | Al reiniciar se usa el origen; preparación pendiente identificable |
| Fallo en la transacción de activación | Puntero y estados anteriores conservados |
| Cierre después de confirmar activación | Destino completo activo; origen disponible para recuperación |

`QuotaExceededError`, `SecurityError`, conflictos, bloqueos y abortos deben
mostrarse como fallo o cancelación; no capturarse para aparentar éxito. Conservar
el conjunto anterior y no eliminar fotos/documentos para completar la operación.

Al iniciar, verificar metadatos y el único conjunto activo. No activar por su
mera existencia una preparación incompleta. Su limpieza requiere identificarla
como destino abandonado y excluir explícitamente activos y conjuntos de recuperación.

La reversión local es una selección explícita del conjunto de recuperación,
validado y legible por la aplicación, con comprobación del control y cambio
atómico de puntero. Si hubo escrituras posteriores en el destino, advertir qué
cambios dejarán de estar activos y facilitar copia externa; no mezclarlos ni
perderlos silenciosamente. No es una degradación de esquema ni un backup externo.

El origen se conserva temporalmente. Antes de distribuir se concretará en la UI
su política de retención y eliminación; el estado actual no autoriza una limpieza
automática por tiempo. No eliminar la única vía local de recuperación para hacer
sitio a otra migración.

## Backups antiguos y pruebas exigidas

El archivo original se conserva sin modificar. Primero validar el contenedor
soportado y su integridad; convertir una copia de trabajo mediante adaptadores y
migraciones secuenciales; después validar y restaurar en un conjunto separado.
Un backup futuro incompatible o una cadena de migración incompleta se rechaza
sin tocar el conjunto activo. La sustitución sigue la confirmación y activación
de [BACKUP_FORMAT.md](BACKUP_FORMAT.md).

Cada origen soportado necesita fixtures completos, vacíos y casos límite, con
UUID, texto internacional, ceros iniciales, fechas, monedas de distinta precisión,
estados históricos, archivo/papelera, relaciones y Blob reales. Mantener un
resultado esperado y comparación de valores e integridad, no solo de recuentos.

Antes de declarar soporte ejecutar y registrar:

- Cada paso individual y toda cadena desde cada versión admitida.
- Ruta ausente, datos/backup futuros, duplicados, relación rota y recurso corrupto.
- Actualización física bloqueada y cierre efectivo de conexiones por `versionchange`.
- Fallo de lote, reintento, cuota, cancelación y pérdidas de control/revisión.
- Cierre real durante preparación y después de activar, seguido de reapertura.
- Lectura/recuperación del origen conservado y rechazo de escrituras de pestañas antiguas.
- Restauración de backup antiguo sin repetir efectos económicos, stock, tareas o eventos.
- Conservación semántica de importes, fechas, relaciones, hashes y contenido binario.

Ejecutar aceptación bajo `file://` en la matriz estable declarada. Las herramientas
de desarrollo no forman parte del paquete del comprador. Estos casos están
**pendientes**: este documento define el contrato y no acredita su ejecución.
