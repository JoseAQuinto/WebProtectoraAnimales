# Núcleo en construcción

**Nota de continuidad 0.2.0-dev:** este texto conserva el avance inicial.
La entrada actual ya carga núcleo, dominio y copias; el estado vigente se
describe en PROJECT_STATUS.md, DOMAIN_API.md y PERSISTENCE_API.md. SHA-256,
backup y restauración están implementados; matriz actual en ENVIRONMENT_TESTS.md.

Estado: avance de fase 1, sin interfaz de negocio habilitada. Estos módulos
no se cargan todavía desde la entrada del producto. Las pruebas de desarrollo
los cargan como scripts clásicos locales, en orden explícito.

## Inicialización

`js/namespace.js` crea el único global `window.RescueManager`, con áreas de
responsabilidad. Rechaza inicialización duplicada. `js/config.js` distingue
appVersion, dbVersion, schemaVersion y backupFormatVersion y fija los límites
de seguridad iniciales del documento. No garantiza capacidad real sin mediciones.
La versión de esquema 1 está reservada para el contrato diseñado, todavía
pendiente de validadores completos. Ninguna organización real debe utilizarla.

Las pruebas de almacenamiento deben sustituir la configuración antes de abrir
IndexedDB y utilizar exclusivamente nombres `animal-rescue-manager-test-*`.
No deben borrar ni abrir la base de producción para limpiar fixtures.

## Traducciones y errores

Orden: namespace → config → locales/en.js → locales/es.js → core/i18n.js.
`core.i18n.t(key, parameters)` interpola valores y selecciona plurales mediante
Intl.PluralRules. `setLanguage` valida el diccionario y avisa a suscriptores;
no modifica datos ni recarga la página. Las claves ausentes muestran un texto
comprensible y generan un aviso de desarrollo. Las claves heredadas no se usan
como traducciones. La paridad de claves existentes está probada; **esto no
equivale a traducción completa de módulos que todavía no existen**.

`core.errors.AppError` transporta un código y detalles mínimos. `messageKey`
convierte fallos de almacenamiento en claves legibles. No captura un error
para tratar un guardado fallido como éxito. La futura UI debe conservar el
formulario y mostrar el fallo en contexto.

## JSON canónico

`utils.canonicalJson.stringify(value)` ordena claves ordinalmente, conserva
orden de arrays y texto Unicode, normaliza -0 y produce JSON sin espacios.
Rechaza claves peligrosas, Unicode inválido, ciclos, accesores, arrays dispersos
o decorados, valores no JSON, números no finitos, enteros inseguros y profundidad
superior a 40. Los accesores se rechazan sin ejecutarlos.

El constructor del futuro backup debe ordenar registros por ID antes de
canonicalizar. Esta utilidad **no calcula hashes**, no valida entidades ni
constituye un backup. El lector de backup y SHA-256 con alternativa local
verificada pertenecen a la fase 2, aún pendiente.

## Pruebas

- `node tests/unit/core.cjs`: paridad, plurales, cambio de idioma, suscripción,
  claves heredadas/ausentes, mapeo de errores, canonicalización determinista y
  rechazo de entradas corruptas o ejecutables.
- `node tests/unit/utils.cjs`: contratos y casos límite de utilidades; ver
  `CORE_API.md` una vez implementadas.
- `node tests/static-checks.cjs`: sintaxis de scripts clásicos y recursos locales.

Los resultados de Node no sustituyen las pruebas reales de IndexedDB por
`file://`. La aplicación final requerirá su propia matriz de aceptación.

## Persistencia inicial implementada

`storage.database.open/close` abre un nombre estable sin crear organizaciones
automáticamente y rechaza versiones incompatibles sin borrar registros.
`storage.transactions.run(stores, mode, work)` resuelve solo al confirmar la
transacción y rechaza callbacks asíncronos: las esperas externas se preparan antes.
Es una primitiva interna; los servicios de negocio deberán usar el coordinador.

`storage.writeCoordinator` ofrece inicialización explícita, adquisición/liberación
de lease, consulta activa, `mutate` y activación de conjunto. `mutate` recibe
datasetId/owner/expectedRevision/operationId/fingerprint/stores y un callback
síncrono con acceso limitado al conjunto. Comprueba control, vigencia, conjunto
y revisión dentro de la transacción; registra idempotencia junto con los cambios.
Los IDs de conjunto, operación y registro exigen UUID v4. Los registros deberán
pasar esquemas y validación relacional antes de llegar a este nivel.

La revisión de `meta.active` es global y monotónica entre activaciones. La
`dataRevision` de cada dataset cuenta cambios propios: no son intercambiables.
La primitiva de activación cambia el puntero y retira el escritor anterior de
forma atómica. Todavía no valida contenido de negocio, no importa archivos ni
implementa restauración. Se prueba con conjuntos sintéticos independientes.

`tests/integration/index.html` carga el núcleo con configuración exclusiva de
prueba. `node tests/e2e/storage.cjs` añade dos pestañas, caducidad del lease,
activación y versión futura; usa Chrome instalado y el lanzador exportado de
`chromium.cjs`. Evidencia: `tests/results/storage-core.json`, 9 casos internos
y 6 de navegador correctos, sin peticiones HTTP de página ni errores de script.
La ampliación de este núcleo a Edge/Firefox queda pendiente; la sonda inicial
de viabilidad de ambos navegadores ya pasó.
