# API del núcleo: utilidades de fase 1

Estado: utilidades implementadas y pruebas de desarrollo separadas de la aceptación del navegador. No representan todavía módulos funcionales ni acreditan la finalización de fase 1.

Scripts clásicos IIFE bajo `window.RescueManager.utils`, con namespace cargado primero. Orden de utilidades: `ids.js`, `dates.js`, **`quantities.js` antes de `money.js`**, `strings.js`. Sin importaciones, acceso a almacenamiento, DOM ni red.

## Identificadores: `utils.ids`

- `uuidV4()` devuelve UUID criptográfico usando `crypto.randomUUID` o `crypto.getRandomValues` con bits de versión/variante. Sin criptografía falla explícitamente.
- `isUuidV4(value)` devuelve booleano sin coerción; acepta hexadecimal en ambas cajas.

## Fechas: `utils.dates`

- `isValid(value)` valida cadena estricta `YYYY-MM-DD`, años 0001–9999 y calendario gregoriano real.
- `compare(first, second)` valida y devuelve -1, 0 o 1.
- `daysBetween(start, end)` cuenta días del intervalo `[start,end)`; rechaza intervalos invertidos. No usa objetos Date ni conversiones de zona para fechas de negocio.
- `ageMonthsOn(birthDate, referenceDate)` devuelve meses completos. Aniversarios de día no existente se ajustan al último día del mes, incluido nacimiento el 29 de febrero.
- `ageOn(birthDate, referenceDate)` devuelve `{years, months, totalMonths}`. Rechaza referencia anterior a nacimiento. Son cálculos de visualización, no campos persistidos.
- `today(timeZone, epochMilliseconds = Date.now())` obtiene la fecha civil del instante técnico en la zona explícita de la organización. Zona inexistente o instante inválido fallan; no toma silenciosamente la zona del equipo.

## Cantidades: `utils.quantities`

- `parse(text, precision, {decimalSeparator:'.', allowNegative:false})` devuelve entero escalado seguro; precisión **0–3**. Acepta cero, recorta espacios exteriores y rechaza separadores de miles, exponentes, signos `+`, decimal vacío, decimales excesivos y valores numéricos en lugar de texto. Un separador decimal coma requiere indicarlo expresamente.
- `split(integer, precision)` devuelve `{negative, whole, fraction}` con fracción exacta de longitud fija.
- `format(integer, precision, {locale:'en', useGrouping:false})` devuelve texto localizado con precisión fija. Nunca divide el entero para redondearlo como número de coma flotante.
- La opción interna `currency` de `format` permite que Dinero use el mismo formateo exacto después de validar el código.

La precisión 0–3 concreta el alcance inicial del núcleo. El diseño original contemplaba hasta 6: deberá ajustarse el contrato de inventario antes de persistir artículos o ampliarse la utilidad y sus pruebas. Las reglas de dominio imponen después importes/pesos positivos, movimientos con signo y stock no negativo. El parser puro no conoce el saldo ni los datos de la organización.

## Dinero: `utils.money`

- `currencies`: mapa inmutable `{EUR:2,USD:2,GBP:2,CAD:2,AUD:2,MXN:2,JPY:0,KWD:3}`.
- `parse(text, currency, options)` usa el parser escalado con unidades menores de moneda. Cero se conserva como cero; los servicios deberán exigir > 0 para registrar movimientos. Negativos solo si se solicita `allowNegative:true` para un uso que los admita.
- `format(amountMinor, currency, {locale:'en', useGrouping:true})` formatea moneda y signo con Intl, insertando los decimales exactos. También sirve para balances negativos y valores próximos a `Number.MAX_SAFE_INTEGER`.

No se detecta el separador automáticamente ni se mezclan monedas. `1,234` con separador decimal punto es error; con coma y moneda de dos decimales también es error por exceso de decimales. Con KWD y coma explícita significa 1234 unidades menores.

## Normalización: `utils.strings`

- `normalizeSearch(text)`: normalización Unicode de búsqueda, elimina marcas diacríticas, minúsculas y espacios repetidos.
- `normalizeEmail(text)`: recorta y convierte a minúsculas; la validación de formato se hace en dominio.
- `normalizePhone(text)`: elimina espacios y separadores visuales, conserva ceros significativos y el prefijo `+`; convierte prefijo internacional explícito `00` en `+`. Conserva extensión como `x007`; no infiere país de números nacionales. Rechaza caracteres ajenos al formato en vez de mezclar dígitos de texto libre.
- `normalizeMicrochip(text)`: normaliza Unicode compatible, elimina espacios/guiones y convierte letras a mayúsculas; conserva ceros y otros símbolos de identificadores alternativos. No exige quince dígitos.

Las funciones devuelven un valor comparativo y nunca alteran el original; el modelo conserva ambos por separado. No aceptan números para teléfonos/microchips. Una coincidencia de normalización es un conflicto o posible duplicado que revisa el usuario, no una fusión automática.

## Pruebas de desarrollo

`node --test tests/unit/utils.cjs` carga los cinco scripts mediante VM y Web Crypto de Node. Cubre bits UUID, ausencia criptográfica, calendario y siglos bisiestos, intervalos, edades, zonas, ocho monedas, precisión 0/2/3, ambigüedades, límites exactos, formato localizado y conservación de identificadores. Estas pruebas no sustituyen una ejecución de la distribución final bajo `file://`.
