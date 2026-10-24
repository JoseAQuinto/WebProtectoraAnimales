# Memoria del heap JavaScript — 2026-10-24

Sustituye la limitación de VOLUME.md («`performance.memory` cuantizado no acredita
memoria»). Ejecutor `tests/e2e/memory-ui.cjs`: file:// offline, perfil propio,
servicios reales; antes de cada medida fuerza dos recolecciones
(`HeapProfiler.collectGarbage`) y lee `JSHeapUsedSize` exacto con
`Performance.getMetrics` del protocolo de Chromium. No modifica el runtime.

Evidencia: `memory-ui-2026-10-24-{chrome,edge}-final.json`, **10/10 por motor**,
valores prácticamente idénticos en ambos (intentos `*-first` 9/9 sin la comprobación
de ciclos, conservados).

| Estado | Heap JS usado |
|---|---:|
| Aplicación vacía | 1,5 MiB |
| Organización (72 filas de configuración) | 1,8 MiB |
| 10 072 registros, captura en caché, lista de contactos | 4,5 MiB |
| 50 072 registros, captura en caché | 18,1 MiB |
| 50 072 tras limpiar la caché y renderizar otra pantalla | 25,7 MiB |
| 50 084 + cuatro TXT de 8 MiB | 25,1 MiB |
| Con un Blob de copia completa (69,4 MB) retenido | 44,6 MiB |
| Tres ciclos más de crear + verificar copia | 44,6 MiB (sin crecimiento) |

## Lectura

Una captura de ~50k registros ocupa del orden de 16 MiB de heap. Pueden coexistir
como máximo dos capturas completas: la de la caché activa y la que conserva la
última pantalla renderizada mientras no se vuelve a pintar (por ejemplo, tras una
lectura fresca de una copia o tras limpiar la caché). Es un máximo acotado, no una
acumulación: crear y verificar copias repetidamente no aumenta el heap. Los bytes de
los archivos y del JSON de la copia viven en Blobs del navegador, fuera del heap JS.

## Límites

No incluye memoria nativa del renderer, Blobs, IndexedDB ni el proceso del navegador;
no acredita dispositivos de gama baja ni móviles. La medida es tras GC forzado, no el
pico durante la codificación de una copia.
