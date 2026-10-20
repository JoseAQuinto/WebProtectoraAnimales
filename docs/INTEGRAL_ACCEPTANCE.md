# Prueba integral: todos los módulos, copia y restauración en otro perfil — 2026-10-20

Ejecutor `tests/e2e/integral-ui.cjs`, file:// offline y sin mocks. Perfil A: copia
verificada del conjunto vacío, demo ficticia cargada con su servicio y operaciones
reales añadidas (foto, documento incorporado con texto internacional y saltos de
línea, referencia externa, corrección económica enlazada, contacto archivado con
teléfono y notas multilínea, contacto en papelera). Se exige que animales,
contactos, acogidas, adopciones, salud, tareas, finanzas, donaciones, inventario,
documentos, archivos, horas de voluntariado e historial tengan datos.

Copia completa generada, descargada, reseleccionada y verificada **desde la UI**;
cierre propio del perfil A. Perfil B **distinto y vacío**: restauración desde la UI
con resumen y confirmación. Comparación exacta:

- Digest canónico de todas las tablas sin `datasetId` y con hash de cada archivo:
  idéntico; la restauración no añade filas de negocio (0 actividades nuevas).
- Todos los informes del servicio y el panel completo, calculados sobre las mismas
  filas: idénticos (normalizando solo `datasetId` y el orden de claves).
- Resumen financiero igual a la suma independiente de movimientos contabilizados
  (19 840 ingresos / 1 400 gastos en la ronda Chrome).
- Reapertura del perfil B con el mismo digest; sin errores ni HTTP.

Evidencia final: `integral-ui-2026-10-20-chrome-fifth.json` y
`integral-ui-2026-10-20-edge-first.json`, **9/9 por motor**. Intentos conservados
`chrome-first` a `chrome-fourth`: el ejecutor comparaba el panel sobre filas
distintas (actividad), con `datasetId` y con orden de claves; ninguno mostró una
diferencia de datos, informes ni bytes.

Hallazgo documentado: los registros restaurados tienen las mismas propiedades y
valores, pero con claves en orden alfabético (lector de copias). No afecta a datos,
validación ni exportaciones canónicas.

## Límites

Mismo equipo y motor en A y B; no acredita otro ordenador, sistema o navegador de
la matriz, ni volumen máximo (ver VOLUME.md). Los informes impresos no se comparan.
