# Evidencia de regresión — 2026-10-21

Windows, navegadores instalados en perfiles propios, `file://` offline, sin
relajar seguridad de origen. Cada informe conserva sus fuentes, versión del
navegador, cierres y límites. Ningún intento fallido se borra o convierte en aprobado.
App 0.2.0-dev / DB 2 / schema 1 / backup 1.

## Orden y fuentes

| Bloque | Evidencia | Alcance |
|---|---|---|
| Validación sin doble inspección | `regression-2026-10-21-single-inspection.json` | 66 rondas / 918 comprobaciones correctas, fuentes anteriores a plurales/caché |
| Plurales EN/ES | `regression-2026-10-21-storage-plurals-{chrome,edge}.json` | 3 suites / 57 comprobaciones por motor, fuentes posteriores a la anterior |
| Caché antes de protección de 120 s | `regression-2026-10-21-read-cache-final-edge.json` | 34 suites / 477 comprobaciones correctas; no acredita la política posterior de actividad |
| Caché y protección de medios, Chrome | `regression-2026-10-21-protected-lease-chrome.json` | 34 suites / 474 comprobaciones ejecutadas, 33 suites correctas; demo falló al confirmar cierre y no llegó a sus tres pasos finales |
| Caché y protección de medios, Edge | `regression-2026-10-21-protected-lease-edge.json` | 7 suites / 60 comprobaciones ejecutadas; conserva fallos de cierre/esperas bajo carga |
| Repetición de Edge con cierre nativo completo | `regression-2026-10-21-native-close-final-edge.json` | 5 suites / 80 comprobaciones correctas: workspace, archivos, papelera, conjuntos y diagnóstico |

Los últimos cinco recorridos, junto a read-cache (17) e integral (9) correctos
del intento Edge anterior, cubren esas siete suites en cadena: 106 comprobaciones
aprobadas, con sus fuentes propias. No equivalen a otra regresión completa desde
cero. Los primeros intentos `native-close-{chrome,edge}` permanecen fallidos:
la observación nativa ya confirmaba salida, pero faltaba reconocerla en el estado
de la raíz y liberar sus handles cuando Node aún no recibía el callback de exit.
ENVIRONMENT_TESTS.md explica la corrección sin descartar procesos vivos/desconocidos.

## Corrección posterior de copias grandes

La generación/verificación y restauración de copias no participaban aún en la
actividad protegida. El escenario mixto completo detectó el fallo; se corrigió
únicamente `js/services/backup.js`. El resto del runtime de la base anterior
permanece igual. Las rondas funcionales siguientes usan las 131 fuentes posteriores
a ese cambio; la prueba de distribución conserva además su manifiesto del paquete:

- `regression-2026-10-21-protected-backup-chrome.json`: demo, read-cache, integral,
  importación de contactos, conjuntos y ZIP extraído: **6 suites / 80 comprobaciones,
  todas correctas**.
- `regression-2026-10-21-protected-backup-edge.json`: read-cache, integral,
  importación de contactos, conjuntos y ZIP extraído: **5 suites / 65 comprobaciones,
  todas correctas**.
- `mixed-volume-ui-2026-10-21-edge-protected-backup.json`: 20/20 desde cero al
  objetivo completo de 2k animales / 5k contactos / 50k relacionados.
- `mixed-recovery-ui-2026-10-21-chrome-protected-backup.json`: 8/8 nuevos sobre el
  fixture fallido, con comparación de los datos previos con su copia física,
  nueva generación/descarga/verificación/restauración, recuperación y reapertura.

La prueba de caché amplía el caso de pérdida de escritor: crear/verificar una
copia desde la pestaña de lectura funciona sin alterar registros ni propietario/token
del escritor real. Conserva también abortos nativos de lectura, revisión antigua,
replay, colisión y bytes tras restauración. La demo actual repite el recorrido
que no había completado su cierre en la base; no se modifica su informe anterior.

**310 pruebas Node / 917 comprobaciones estáticas**, correctas con la corrección.
No se declara que las 34 suites se hayan repetido completas después del último
cambio; se distingue la base y la regresión dirigida de la actividad de copias.

## Volumen y límites

VOLUME.md distingue las rondas versión 1 (File en memoria) de la versión 2 con
copia realmente descargada y seleccionada. MIXED_VOLUME.md contiene recuentos,
tiempos y hashes del grafo mixto, así como el fallo original conservado.

Las pruebas simultáneas produjeron mediciones bajo carga y esperas agotadas;
las posteriores de volumen mixto y regresión dirigida se ejecutaron en serie.
No comparar ambos grupos como resultados controlados entre motores. No hay
medición de memoria con perfilador, cuota física agotada, lector de pantalla,
dispositivo físico, Firefox actual ni aceptación comercial.

Para reproducir, usar `tests/e2e/regression.cjs --list` y los comandos de
ENVIRONMENT_TESTS.md, con etiquetas nuevas. En otro PC ejecutar el escenario
mixto completo; el perfil ignorado del padre no es una dependencia portable.
