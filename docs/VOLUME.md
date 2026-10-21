# Volumen, latencia y memoria — 2026-10-20

Medición real del diseño actual (cada operación captura y valida el conjunto
completo: O(N)). Ejecutor `tests/e2e/volume-ui.cjs`, file:// offline, perfil
propio, sin mocks: contactos sintéticos en commits de 1000 filas por la ruta real
de contexto/repositorios, después cuatro TXT de 8 MiB, copia completa con
verificación y reapertura. Solo se afirma corrección funcional; los tiempos son
evidencia de este equipo (Windows 11, `windows-wip`), no límites garantizados.

Evidencia: `volume-ui-2026-10-20-{chrome,edge}-50k.json`, **17/17 por motor**.
`volume-ui-2026-10-20-chrome-smoke.json` (2000 filas) falló solo por un umbral
del ejecutor (archivos de 8 MiB − 2 bytes) y se conserva.

| Registros | Instantánea | Validación | Una escritura | Lista contactos |
|---:|---:|---:|---:|---:|
| ~70 | 2–3 ms | 3 ms | 11–15 ms | 14 ms |
| 5 074 | ~97 ms | ~70 ms | ~220 ms | 82–94 ms |
| 10 076 | ~185 ms | 119–129 ms | ~450 ms | 164–209 ms |
| 20 078 | 425 ms | 269–299 ms | ~910 ms | 304–395 ms |
| 50 080 | 882–999 ms | ~770 ms | 2,5–2,7 s | 0,9–1,0 s |
| 50 094 + 32 MiB | 832–882 ms | 763–823 ms | 2,9–4,4 s | 0,95–1,5 s |

Copia completa con 50 096 registros y 32 MiB: JSON de 69,4 MB (por debajo del
límite de 128 MiB), generación 9,9–12,9 s y verificación de la copia
reseleccionada 5,6 s. Primera instantánea tras reabrir: 0,7–0,9 s; revisión y
recuento idénticos. Sin errores de página/consola ni HTTP.

`performance.memory` de Chromium devuelve valores cuantizados (10 000 000) sin la
opción de memoria precisa: **no acredita consumo de memoria**. Falta medir memoria
con perfilador y dispositivos de gama baja.

## Lectura

El coste crece linealmente. Cada escritura hace dos instantáneas completas
(`context.execute` y `repositories.commit`) y una validación completa, por eso
cuesta ≈ 2 × instantánea + validación. Hasta ~10 000 registros la escritura queda
por debajo de 0,5 s en este equipo; a 50 000 supera 2,5 s. El límite estructural
de 200 000 registros del validador no está acreditado en rendimiento.

## Optimización aplicada: una instantánea por escritura

Precondición cumplida: el arnés Node congela profundamente los datos que recibe
cada `build` y las **294 pruebas** pasan, sin mutaciones en sitio. En producción
`context.execute` congela su captura y `repositories.commit` la reutiliza si es del
mismo conjunto y revisión (copiando solo los arrays de tablas tocadas); en otro caso
vuelve a leer. Una mutación accidental no cubierta falla la operación en vez de
validar un estado distinto, y `mutate` sigue comprobando revisión, lease e
idempotencia dentro de la transacción.

`volume-ui-2026-10-20-chrome-50k-reused-capture.json`, 17/17 (escritura única):

| Registros | Antes | Después |
|---:|---:|---:|
| 5 074 | ~220 ms | 218 ms |
| 10 076 | ~450 ms | 291 ms |
| 20 078 | ~910 ms | 661 ms |
| 50 080 | 2,5–2,7 s | 1,98 s |

La validación completa (~0,7 s a 50k) y la instantánea inicial siguen siendo O(N).
Regresión de todas las suites de módulos con este cambio:
`*-2026-10-20-{chrome,edge}-reused-capture.json`: **63 rondas (31 Chrome + 32 Edge),
889 comprobaciones, 0 fallos**.

## Siguiente

Validación incremental por tablas afectadas, listas por índices/cursor y binarios
diferidos; medir memoria con perfilador y dispositivos de gama baja.

## Una sola inspección estructural — 2026-10-21

VALIDATION_PERFORMANCE.md explica la eliminación del segundo recorrido de
descriptores por registro y la compilación de campos del esquema inmutable.
Todas las comprobaciones de campos y relaciones siguen ejecutándose. No se
declara implementada validación incremental por tablas ni lecturas acotadas.

`volume-ui-2026-10-21-{chrome,edge}-single-inspection.json`, **17/17 por motor**:

| Registros | Validación Chrome / Edge | Escritura Chrome / Edge |
|---:|---:|---:|
| 5 074 | 109 / 61 ms | 222 / 194 ms |
| 10 076 | 102 / 102 ms | 277 / 306 ms |
| 20 078 | 220 / 202 ms | 563 / 623 ms |
| 50 080 | 612 / 542 ms | 1 473 / 1 319 ms |
| 50 094 + 32 MiB | 595 / 661 ms | 1 757 / 1 406 ms |

La muestra anterior de captura reutilizada en Chrome registraba 1,98 s por
escritura a 50k; esta registra 1,47 s (aproximadamente un 26 % menos). Se conserva
la evidencia previa. Son muestras de este equipo, sin control estadístico de
carga: Edge coincidió parcialmente con la regresión de Chrome. No son una
promesa de capacidad ni de latencia para otro ordenador.

Copia de 69 448 171 bytes: generación de 9,16 / 10,71 s y verificación de
5,44 / 6,81 s. Los 50 096 registros y su revisión persisten tras cierre y
reapertura propios; archivos y copias se comprobaron por el recorrido real.
La memoria vuelve a estar cuantizada: sigue sin ser una medición de consumo.
La instantánea y la validación relacional todavía crecen con todo el dataset.
