# Contrato de backup v1

Implementado el codec puro en `js/services/backup-codec.js`: generación,
lectura y verificación sin acceso a IndexedDB ni efectos de negocio. Snapshot,
preparación y activación se coordinan en servicios de persistencia separados.
El JSON del diagnóstico es un informe y no cumple este formato.

## Contenedor v1

Objeto con `format: "animal-rescue-manager-backup"`, `backupFormatVersion: 1`,
`content` e `integrity`. El contenido incluye `appVersion`, `schemaVersion`,
`backupId` (UUID v4), `createdAt` (ISO UTC), `sourceDatasetId` (UUID),
`dataRevision` (entero no negativo), `manifest`, `tables` y `assets`.

`manifest` declara `recordCounts` por tabla, `embeddedAssetCount`,
`embeddedAssetBytes` y `externalReferenceCount`. Son declaraciones que deben
compararse con datos reales al validar; no se confía en ellas para asignar memoria.

`tables` contiene las 27 tablas no binarias de negocio, incluyendo configuración,
catálogos, ubicaciones, archivos funcionales, papelera, historia y actividad.
No contiene locks, cachés, URL de objetos, sesiones, diagnósticos ni estado de UI.
`assets` contiene metadatos de cada recurso y `base64` de sus bytes, en lugar
del Blob de IndexedDB. El manifiesto incluye `recordCounts.assets` junto con
los recuentos de las otras tablas. Las tablas vacías se escriben como arrays;
no se omiten. No se vuelve a ejecutar ningún servicio de negocio
al deserializar: se restauran los hechos ya relacionados.

`integrity` declara `algorithm: "SHA-256"`,
`canonicalization: "arsm-canonical-json-v1"` y `contentHash` hexadecimal minúscula
de 64 caracteres. El hash cubre exclusivamente los bytes UTF-8 canónicos de
`content`, sin el contenedor `integrity`.

## Canonicalización arsm-canonical-json-v1

1. Solo JSON: `null`, booleanos, cadenas Unicode válidas, números finitos y
   seguros dentro del esquema, arrays y objetos sin claves peligrosas.
2. Rechazar `undefined`, funciones, símbolos, BigInt, ciclos, números no
   finitos y sustitutos Unicode aislados. Normalizar `-0` a `0`.
3. Claves de objetos ordenadas por comparación ordinal UTF-16 (orden de
   `Array.prototype.sort()` sin comparador). No aplicar normalización Unicode
   al texto del usuario. Escapado de cadenas según JSON.stringify.
4. Antes de serializar, ordenar tablas/recursos por `id` ascendente ordinal;
   los arrays con orden semántico conservan su orden. No ordenar todos los
   arrays indiscriminadamente. Los conjuntos de códigos se normalizan en el
   esquema correspondiente antes del snapshot.
5. Sin espacios ni saltos entre tokens. Números con representación JSON estándar.
   Codificar UTF-8 sin BOM. Base64 estándar con relleno y sin saltos de línea.
6. Límites iniciales: 128 MiB de archivo, 64 MiB de bytes binarios reales,
   200.000 registros totales incluyendo recursos, 100.000 por tabla, profundidad máxima 40 y
   límites de campos/esquemas. El dominio limita estructuras de entidades
   a profundidad 20. Se deben medir memoria y equipos modestos antes de
   comercializar; estos límites no garantizan cuota ni memoria disponible.

El lector rechaza claves duplicadas incluso si están escapadas y claves
`__proto__`, `constructor` y `prototype` a cualquier profundidad. Base64 debe
usar alfabeto estándar, longitud múltiplo de cuatro, relleno correcto y bits
de relleno cero; no se admite URL-safe, espacios ni saltos. El escaneo es lineal
para evitar crecimiento de pila por expresiones regulares en archivos grandes.

El validador compara recuentos, tamaños reales y SHA-256 por recurso; comprueba
IDs duplicados, referencias en el mismo conjunto y todas las invariantes.
Un hash detecta daño o alteración; no acredita autoría ni firma digital.
Cada documento incorporado admite hasta 8 MiB. Fotos, miniaturas y logos
optimizados admiten hasta 1 MiB; lado máximo 1600 px, o 320 para miniatura.
Se verifican extensión, MIME, firma y dimensiones. Se admite JPEG, PNG, WebP,
PDF con cabecera/cierre identificables y TXT UTF-8 válido sin controles binarios.
HTML/SVG identificados y otros formatos se rechazan. La aplicación carga
`utils/images.js` y exige decodificación real de imágenes en navegador; Node
comprueba firma/dimensiones sin simular un decodificador. PDF se ofrece para
descarga y no se incrusta ni ejecuta: una firma no certifica contenido inocuo.

## Snapshot, generación y verificación

Leer el conjunto activo, su revisión y todos los registros/Blob en una
transacción consistente. Codificación, hashing y selección de archivos ocurren
fuera de una transacción activa. El validador del lector también comprueba
el archivo generado antes de ofrecerlo. SHA-256 usa Web Crypto o distribución
local verificada de js-sha256 1.0.0. Nunca simular un hash o usar un checksum débil.

`services.backupCodec.encode({datasetId,dataRevision,tables})` devuelve de forma
asíncrona `{container,text,blob,summary}`. El snapshot interno conserva los
recursos en `tables.assets` con `blob`; el codec los traslada a `content.assets`
con `base64`. Tablas ausentes del snapshot interno se normalizan a vacías;
las del JSON serializado son obligatorias. Se permite un conjunto totalmente
vacío sin organización. Cada archivo generado pasa por el mismo lector.

`services.backupCodec.decode(fileOrText)` devuelve un snapshot validado
`{datasetId,dataRevision,tables,backup,summary}`, con recursos reconstruidos como
Blob en `tables.assets`. `backup` incluye backupId, createdAt, appVersion y
schemaVersion. El resumen incluye organización, versiones, fecha, recuentos,
bytes y referencias externas. No realiza escrituras ni reproduce operaciones.
Se utiliza `domain.validateDataset(tables,{datasetId,allowEmpty:true,throwOnError:true})`
para exigir los mismos esquemas y relaciones que las operaciones de negocio.

La UI distingue generado, descarga solicitada y verificado mediante nueva
selección del archivo. Las referencias externas se incluyen como metadatos y
se cuentan; sus bytes no se incluyen. La descarga no confirma escritura en disco.

## Restauración

Validar sin tocar el conjunto activo. Rechazar versiones futuras, claves
peligrosas, tablas desconocidas y corrupción. Las versiones antiguas solo
se admiten mediante migraciones explícitas con fixtures probados. El lector
actual solo admite contenedor 1/esquema 1: no existe backup de negocio publicado
anterior. Se rechazan 0 y otras combinaciones sin inventar una migración.

Mostrar resumen, facilitar una copia verificada de los datos actuales y
solicitar confirmación. Preparar un nuevo `datasetId`, conservando UUID y
hechos, validar y activar con cambio de puntero en una transacción corta que
comprueba revisión y lease. Conservar el conjunto previo para recuperación.
Fallo, cuota insuficiente, cancelación o cierre antes de activación dejan
intacto el conjunto actual. Al arrancar, un staging incompleto nunca se activa.

La recuperación local no sustituye una copia externa. Los archivos no están
cifrados y no llevan contraseña; la ayuda debe explicarlo.

## Evidencia del codec

`node tests/unit/backup.cjs`: 144 comprobaciones de SHA-256 nativo/alternativo,
namespace único, Base64 canónico/grande/límites, firmas, Blob, texto Unicode y
saltos, archivo/papelera, referencia externa e igualdad de hechos tras ida/vuelta.
Rechaza truncado, hashes/binarios/tamaños/recuentos alterados, versiones futuras,
claves duplicadas/peligrosas, tablas/campos desconocidos y relaciones corruptas.
Estas pruebas puras no acreditan la activación atómica ni persistencia: sus
pruebas de integración y navegador se documentan aparte.
