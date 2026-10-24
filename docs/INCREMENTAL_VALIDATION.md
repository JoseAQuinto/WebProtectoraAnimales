# Validación incremental por registro — 2026-10-24

App 0.2.0-dev / DB 2 / schema 1 / backup 1, sin cambios de formato. Sigue a
WRITE_THROUGH_CACHE.md y respeta la condición de VALIDATION_PERFORMANCE.md: no se
omite ninguna regla con dependencias entrantes o globales.

## Qué se omite y cuándo

`validateDataset(tables, { trusted })` acepta un `WeakSet` (comprobado por tipo,
independiente del realm) de **objetos-fila congelados** ya validados por el llamante
en el mismo contexto. Para esos mismos objetos se omiten solo la inspección
estructural del registro, sus campos y sus reglas locales. Siempre se ejecutan sobre
**todas** las filas: identificadores duplicados, índices únicos, referencias (incluidas
las dinámicas), ciclos, intervalos, estados de animales, acogidas, adopciones,
finanzas, existencias, binarios e historia. Una copia, una fila no congelada o un
`Set` no cuentan como confianza.

`repositories.commit` solo pasa `trusted` cuando la captura reutilizada es exactamente
la que esta pestaña publicó tras su propia escritura validada (WRITE_THROUGH_CACHE.md),
el día civil de la organización es el mismo de esa validación y el cambio no toca
`organizationSettings` (zona horaria/fecha). Las filas nuevas o editadas son objetos
nuevos y se validan completas. La primera escritura tras abrir, tras cambios de otra
pestaña, restauración, importación por staging o cualquier lectura fría valida todo.

## Evidencia

- Node: `tests/unit/incremental-validation.cjs`, 3 pruebas (solo se omiten reglas
  propias; referencias y duplicados siguen detectándose; copias, filas no congeladas
  y `Set` no se aceptan). **313 Node / 917 estáticas**.
- `write-through-ui-2026-10-24-{chrome,edge}-incremental.json` 10/10: lectura
  siguiente idéntica a una fresca tras todos los tipos de escritura, rechazos y pérdida
  de control; escritura a 20 105 registros 120 ms (Chrome) / 169 ms (Edge).
- `volume-ui-2026-10-24-chrome-incremental.json` 17/17: escritura única 86 ms (5k),
  206 ms (10k), 425 ms (20k), **910 ms a 50 080** registros (antes 1,98 s) y 786 ms con
  32 MiB; copia completa, verificación y reapertura correctas.
- Regresión completa con este runtime: `regression-2026-10-24-incremental-{chrome,edge}.json`
  **70 rondas (35 suites por motor), 974 comprobaciones, 0 fallos**.

## Límites

Las reglas globales y la primera validación tras abrir siguen siendo O(N). Un cambio
del reloj del sistema a otro día civil provoca validación completa (el día forma parte
de la condición). Si una versión futura endurece reglas por registro, la primera
escritura de cada sesión las aplica a todo el conjunto, pero las siguientes de esa
sesión no repiten esa comprobación. No hay paginación desde índices.
