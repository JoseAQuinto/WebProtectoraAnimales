# Núcleo en construcción

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
