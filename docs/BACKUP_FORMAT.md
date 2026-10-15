# Contrato propuesto de backup

Estado: **diseño previo a implementación de fase 2**. No existe todavía un
backup de negocio operativo. El JSON del diagnóstico es un informe y no cumple
este formato.

## Contenedor v1

Objeto con `format: "animal-rescue-manager-backup"`, `backupFormatVersion: 1`,
`content` e `integrity`. El contenido incluye `appVersion`, `schemaVersion`,
`backupId` (UUID v4), `createdAt` (ISO UTC), `sourceDatasetId` (UUID),
`dataRevision` (entero no negativo), `manifest`, `tables` y `assets`.

`manifest` declara `recordCounts` por tabla, `embeddedAssetCount`,
`embeddedAssetBytes` y `externalReferenceCount`. Son declaraciones que deben
compararse con datos reales al validar; no se confía en ellas para asignar memoria.

`tables` contiene todas las entidades de negocio, incluyendo configuración,
catálogos, ubicaciones, archivos funcionales, papelera, historia y actividad.
No contiene locks, cachés, URL de objetos, sesiones, diagnósticos ni estado de UI.
`assets` contiene metadatos de cada recurso y `base64` de sus bytes, en lugar
del Blob de IndexedDB. No se vuelve a ejecutar ningún servicio de negocio
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
   profundidad máxima 40 y límites de campos/esquemas. Cantidades de registros
   y presupuesto de memoria deben fijarse y medirse antes de comercializar.

El validador compara recuentos, tamaños reales y SHA-256 por recurso; comprueba
IDs duplicados, referencias en el mismo conjunto y todas las invariantes.
Un hash detecta daño o alteración; no acredita autoría ni firma digital.

## Snapshot, generación y verificación

Leer el conjunto activo, su revisión y todos los registros/Blob en una
transacción consistente. Codificación, hashing y selección de archivos ocurren
fuera de una transacción activa. El validador del lector también comprueba
el archivo generado antes de ofrecerlo. SHA-256 usa Web Crypto o distribución
local verificada de js-sha256. Nunca simular un hash o usar un checksum débil.

La UI distingue generado, descarga solicitada y verificado mediante nueva
selección del archivo. Las referencias externas se incluyen como metadatos y
se cuentan; sus bytes no se incluyen. La descarga no confirma escritura en disco.

## Restauración

Validar sin tocar el conjunto activo. Rechazar versiones futuras, claves
peligrosas, tablas desconocidas y corrupción. Las versiones antiguas solo
se admiten mediante migraciones explícitas con fixtures probados.

Mostrar resumen, facilitar una copia verificada de los datos actuales y
solicitar confirmación. Preparar un nuevo `datasetId`, conservando UUID y
hechos, validar y activar con cambio de puntero en una transacción corta que
comprueba revisión y lease. Conservar el conjunto previo para recuperación.
Fallo, cuota insuficiente, cancelación o cierre antes de activación dejan
intacto el conjunto actual. Al arrancar, un staging incompleto nunca se activa.

La recuperación local no sustituye una copia externa. Los archivos no están
cifrados y no llevan contraseña; la ayuda debe explicarlo.
