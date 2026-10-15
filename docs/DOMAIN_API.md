# Dominio ejecutable, esquema 1

`js/domain/enums.js`, `schemas.js`, `validators.js` y `dataset-validator.js`
son scripts clásicos IIFE. Cargar después de `namespace.js` y de las
utilidades `ids`, `dates`, `strings` y `canonical-json`, en ese orden relativo.
No acceden al DOM, IndexedDB ni red. El único espacio global es
`window.RescueManager`.

## Contrato de validación

```js
const errors = RescueManager.domain.validateRecord('contacts', record, {
  datasetId, today: '2026-10-15'
});
const errors = RescueManager.domain.validateDataset(tables, {
  datasetId, today: '2026-10-15', throwOnError: false, allowEmpty: false
});
```

Ambas funciones son síncronas, no mutan datos ni aplican valores iniciales,
y devuelven un array: `[]` significa válido. Cada error contiene
`{table, id, path, code, message}`; `id` puede ser nulo cuando no es seguro
leerlo o el error afecta al conjunto. `message` es un código estable,
igual a `code`, para traducción posterior; no es texto listo para UI.
Con `throwOnError:true` lanzan `domain.ValidationError`, cuyo `details`
es el mismo array. Un `options.today` inválido es un error de programación
(`TypeError`), no un dato inválido del usuario.

Se devuelven como máximo 1000 entradas. La última usa
`code:'validation.moreErrors'` si se alcanza el límite y se omiten errores
adicionales. Esto permite informar sobre archivos hostiles sin expandir una
lista de millones de errores ni desbordar la pila de JavaScript.

`tables` es directamente el mapa `nombreDeTabla: [registros]`, sin wrapper.
Una tabla omitida equivale a vacía; una tabla desconocida se rechaza.
Se exige exactamente una organización y un único dataset entre registros.
`datasetId`, cuando se facilita, exige que todos los registros lo utilicen.
`allowEmpty:true` permite exclusivamente el conjunto completamente vacío;
no permite datos de negocio huérfanos sin organización.

La fecha actual del conjunto se obtiene en la zona de su organización,
salvo `today` explícito. Para un registro aislado se usa `options.timeZone`
o UTC durante el arranque. Los servicios deben pasar su fecha de organización.
`options.now` para validadores es un timestamp numérico para pruebas de reloj.
Una zona organizativa inválida sigue generando su error de campo aunque se
use UTC para continuar la comprobación del resto.

## Creación de registros

```js
const row = RescueManager.domain.createRecord('contacts', {
  name: 'Contacto de ejemplo', roles: ['donor'],
  phones: [{label: 'Móvil', original: '+34 600 000 001'}]
}, {datasetId, today: '2026-10-15', now: '2026-10-15T12:00:00.000Z'});
```

La fábrica clona los datos, aplica los `default` del esquema y `null` a
opcionales anulables, genera UUID criptográfico y campos comunes, y valida
estructura/reglas locales lanzando `ValidationError` si falla. No valida
relaciones ni concede autorización para guardar. Conserva el texto original;
recalcula solo email/teléfonos/microchip normalizados. No recorta nombres
silenciosamente. Opciones: `datasetId`, `id`, `origin`, `originBatchId`,
`today` y `now` (instante ISO para esta fábrica). Los originales con valores
comunes pueden utilizarse para reconstrucción; no incrementa revisión por sí
misma. Los repositorios deben preservar metadatos e incrementar revisión en
ediciones, dentro del protocolo de escritura.

## Metadatos y tablas

`domain.schemas` está congelado recursivamente. Cada entrada tiene `fields`,
`keyPath:['datasetId','id']`, `indexes`, `allowArchive` y `allowTrash`.
Cada campo especifica `type`, `required`, y, cuando procede, `nullable`,
`default`, `min`, `max`, `minLength`, `maxLength`, `values`, `fields`,
`items`, `maxItems`, `unique`, `nonFuture`, `trimmed` y
`ref:{table,kind?}`. Un objeto `originRef:true` se resuelve por `type/id`
mediante `domain.entityTables`. El esquema distingue obligatorio de valor
inicial: tener default no hace que un campo obligatorio pueda faltar en un
registro persistido. Los opcionales de texto con default pueden omitirse.

Los índices tienen `{name,keyPath,unique,sparse}`. Todos incluyen dataset.
Los opcionales usan `null`, no cadena vacía; una clave compuesta de IndexedDB
con `null` no entra en el índice. Máximos de una relación operativa abierta
y solapamientos se validan en dominio: no existen marcadores extra en filas.

Las 28 tablas, también disponibles en `domain.tableNames`, son:

| Grupo | Tablas |
|---|---|
| Organización | organizationSettings, catalogOptions, locations |
| Animales | animals, stayEpisodes, weightMeasurements |
| Personas | contacts, fosterProfiles, fosterStays, volunteerProfiles, volunteerHours |
| Adopción | adoptionApplications, reservations, adoptions |
| Salud y agenda | veterinaryRecords, carePlans, tasks |
| Economía y stock | financialMovements, donations, donationLines, inventoryItems, inventoryMovements |
| Recursos | assets, documents, documentLinks |
| Historia | animalEvents, activityLog, importIdentityMap |

Los almacenes operativos (`meta`, `datasets`, `operations`, leases, secuencias,
recibos y diagnóstico) tienen su contrato de infraestructura aparte.

## Integridad comprobada

- Tipos, obligatoriedad, campos desconocidos, longitudes, enums, enteros seguros,
  UUID v4, fechas reales, futuros de hechos, pares de estado y normalizaciones.
- Claves peligrosas en cualquier nivel, accesores sin ejecutarlos, símbolos,
  prototipos ajenos, ciclos, arrays dispersos/decorados, Unicode corrupto y
  valores que JSON no puede conservar.
- Referencias estáticas/dinámicas del mismo conjunto y tipo de catálogo;
  unicidad de códigos/chips/orígenes/perfiles/vínculos y ciclos de relaciones.
- Episodios y acogidas en intervalos `[inicio, fin)`, límites de episodio,
  relación entre ubicación, disponibilidad, reserva y cuidado actual;
  aprobación/adopción/devolución con vínculos en ambos sentidos.
- Rol de perfiles, veterinarios y proveedores, organización como clínica,
  excepciones actuales de acogida con motivo persistido.
- Salud/tarea completada en misma fecha y animal, gasto compartido coherente,
  esterilización, moneda/categoría, anulaciones/correcciones, donación e ingreso,
  donación material/stock, unidad/escala y compensación de material anulado.
- Stock acumulado por fecha, después por instante real de creación e id; todos
  los saldos intermedios deben ser no negativos y seguros. Dinero se suma por
  dirección con `BigInt` para detectar desbordamiento sin pérdida de precisión.
- Metadatos de Blob, extensión/MIME, tamaños, dimensiones declaradas,
  relaciones foto/miniatura y documentos, y presupuesto de 64 MiB por conjunto.

Se incluyen archivados y papelera en referencias, unicidades e historia.
Finanzas/stock/donaciones no admiten papelera para alterar sus efectos.
Un email o teléfono compartido no impone unicidad de contactos.

`animalEvents.parameters` y `activityLog.summaryParameters` usan un vocabulario
cerrado v1: `code`, `reason`, `previousId`, `nextId`, `count`, `field`, todos
opcionales y con límites de esquema. Máximo 2000 caracteres serializados.
No almacenan frases traducidas ni copias de fichas. Todo cambio del vocabulario
requiere actualizar contrato y consumidores; no se admiten claves arbitrarias.

## Límites y responsabilidades adicionales

Este es un validador estructural y de consistencia de una instantánea, no el
ejecutor de transiciones ni una auditoría de su historia de edición. No prueba
que el usuario confirmase una excepción, la política de tareas o la eliminación,
ni que se respetase una revisión previa, un arrendamiento o una transacción.
Esos controles pertenecen a servicios/repositorios. Un validador de instantánea
no puede detectar la eliminación de una historia que ya no está en el archivo.

Las opciones/ubicaciones desactivadas siguen siendo referencias históricas
válidas. El servicio comprueba que una asignación nueva usa opciones activas.
Disponibilidad/capacidad/especies de familia se comprueban para acogidas abiertas;
no se inventa una reconstrucción de preferencias anteriores que no se conservaron.
Las relaciones de fuentes genéricas comprueban existencia; los vínculos del
caso de uso y la producción de todos los eventos exigidos corresponden al servicio.

La validación síncrona **no lee bytes ni verifica SHA-256, firma de formato,
UTF-8 real o decodificación de imágenes**. Los metadatos declarados no prueban
el contenido. El preparador de recursos y el codec de backup deben realizar
esas comprobaciones asíncronas fuera de transacciones antes de aceptar archivos.
El límite JSON de 128 MiB y versión/integridad del contenedor pertenecen al codec.

Límites defensivos del validador: 200.000 registros totales, 200.000 elementos
por array del contenedor, 16 millones de nodos en la instantánea, 500.000 por
registro, profundidad 20 y texto máximo 20.000 antes de límites específicos.
No son promesas de capacidad o tiempo de respuesta. La comprobación actual es
síncrona; la UI debe identificar su fase y el rendimiento real de dispositivos
queda pendiente de medición. Las pruebas Node incluyen el escenario de 2000
animales, 5000 contactos y 50.000 filas relacionadas; no acreditan rendimiento
de navegadores o móviles.

## Pruebas

`node --test tests/unit/domain.cjs` comprueba un conjunto positivo de todas las
entidades, fábrica/pureza, corrupción, fechas/zonas, relaciones, duplicados,
episodios, adopción/devolución, salud, finanzas, stock, recursos y volumen.
Los datos y archivos son sintéticos. La evidencia de integración real se
registra aparte; esta prueba no acredita formularios de negocio terminados.
