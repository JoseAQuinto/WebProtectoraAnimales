# Revisión y aceptación del 2026-10-18

## Estado recibido y preservado

Rama `main`. El commit local `18e79a9` contenía las pantallas de donaciones e
inventario. Había cambios sin commit en index/bootstrap/diccionarios y tres
archivos de informes (servicio, módulo y pruebas). No se descartaron cambios,
no se modificaron secretos y no se reescribió historial de Git.

La revisión encontró y corrigió:

- Gráficos que esperaban `value/label` pero recibían `month/count/amountMinor`;
  provocaban geometría inválida y excepciones. Formateadores que intentaban
  leer propiedades de un importe/recuento ya numérico.
- Periodos inválidos calculados antes de mostrar su error; totales por periodo
  sumados sin comprobar el límite seguro, aunque cada mes sí lo comprobara.
- Edades estimadas que no avanzaban desde su referencia y promedio de adopción
  que ignoraba el periodo y no exigía episodio realmente cerrado por adopción.
- Errores de donación con marcadores de traducción sin resolver; notas materiales
  de una sola línea; búsqueda que omitía descripciones materiales; suma estimada
  sin control de desbordamiento. Se conservan cero estimado y notas multilínea.
- Límite visible de 1000 líneas materiales y señalización de cantidad inválida.

Se conservan los contratos de negocio, servicios de donaciones/inventario y
formatos persistidos. Las mejoras de informes y exportación están documentadas
en REPORTS_API.md. Las pruebas anteriores válidas siguen siendo evidencia de
sus fuentes; no se les atribuyen los cambios posteriores.

## Pruebas reales por file:// offline

Ejecutor: `tests/e2e/resources-reports-ui.cjs`. Preparación sintética declarada
mediante servicios reales (organización, contacto, animal con adopción devuelta,
una factura veterinaria). Donaciones, inventario e informes se ejercitan mediante
controles visibles, sin mocks ni acceso IndexedDB desde la UI.

| Navegador | Resultado | Evidencia |
|---|---|---|
| Chrome 155.0.8059.80 | 12/12 | [Chrome](../tests/results/resources-reports-ui-2026-10-18-chrome-selector-fix.json) |
| Edge 155.0.4283.62 | 12/12 | [Edge](../tests/results/resources-reports-ui-2026-10-18-edge-first.json) |

Incluyen alta de artículo, saldo inicial, rechazo de consumo sin existencias,
compensación, compra con factura existente sin duplicarla, donación económica
con un ingreso y anulación coordinada, dos líneas materiales con/sin stock,
rechazo de cero y de anulación que haría stock negativo, compensación y
anulación válidas, archivo, informes numéricos/gráficos, CSV/JSON descargados,
periodo inválido, EN/ES, anchos 360/768/1440 y cierre/reapertura con digest,
revisiones y recuentos idénticos. Dos cierres por motor y 69 fuentes intactas;
sin errores de página, consola ni solicitudes HTTP de las páginas.

El [primer intento Chrome](../tests/results/resources-reports-ui-2026-10-18-chrome-first.json)
falló por un selector relativo del ejecutor al localizar una compensación.
Se conserva como fallido; no fue un defecto de producción ni se cuenta como
aceptación. Todos los procesos propios se cerraron en finally.

Pruebas Node: 133 subpruebas correctas, incluidas 14 de informes y 2 de CSV.
Estática: 607 comprobaciones. La protección CSV y sus límites se basan en la
documentación de Papa Parse y OWASP citada en REPORTS_API.md. No se promete
seguridad universal al reabrir/guardar con hojas de cálculo.

## Reproducir

```powershell
node tests/e2e/resources-reports-ui.cjs --browser chrome --machine MI-PC --output resources-reports-FECHA-chrome.json
node tests/e2e/resources-reports-ui.cjs --browser edge --executable RUTA_EDGE --machine MI-PC --output resources-reports-FECHA-edge.json
```

Los nombres no se sobrescriben. Herramientas y perfiles/capturas de `.tmp`
son de desarrollo y no se distribuyen. Los viewports no acreditan dispositivos
físicos; Firefox actual, cuota física agotada, accesibilidad, rendimiento a
volumen y todas las opciones de formulario siguen requiriendo su aceptación.
Esta ronda no implementa importación ni exportaciones completas por módulo.
Versiones: appVersion 0.2.0-dev, dbVersion 2, schemaVersion 1, backupFormatVersion 1.
