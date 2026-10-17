# Aceptación de la interfaz financiera

Fecha: 2026-10-17. Ejecutor `tests/e2e/finance-ui.cjs`.
Equipo `windows-wip`, Windows 11 Home 10.0.26300. Versiones del producto:
`appVersion 0.2.0-dev`, `dbVersion 2`, `schemaVersion 1`, `backupFormatVersion 1`.

El ejecutor abre `index.html` por `file://` en un perfil sintético exclusivo
con el contexto offline antes de navegar, sin servidor ni opciones para
relajar el origen. Las herramientas de desarrollo no pertenecen al producto.

## Alcance

La organización EUR, un contacto y un animal se preparan expresamente mediante
los servicios reales. Todas las operaciones financieras se realizan por los
formularios visibles, sin mocks ni acceso directo de la UI a IndexedDB.

Se comprueban precisión excesiva, cero y categoría incompatible al cambiar
dirección sin escrituras y con campos conservados; ingreso de 25,50 EUR y
gasto de 10,25 EUR con dos activaciones inmediatas del botón, enteros exactos
2.550/1.025 y ausencia de duplicados; totales/filtros por dirección, animal,
contacto y fechas inclusivas; anulación con motivo/fecha y exclusión de
totales; corrección que anula y conserva el original y crea un único sustituto
enlazado de 30,75 EUR; formulario con revisión antigua rechazado conservando
campos; idioma EN/ES, moneda sin cambios y límites de controles en anchos
360, 768 y 1440 px. Después cierra completamente el navegador, reabre el mismo
perfil y compara dataset, revisión y digest de todos los registros.

La revisión antigua se provoca mediante una escritura explícita del servicio
de ajustes mientras el formulario permanece abierto. Se etiqueta como
intervención de prueba, sin simular que el usuario la hizo en otra pantalla.
Las dos activaciones son dos llamadas inmediatas al botón real del formulario;
ejercitan el bloqueo al guardar, sin sustituir servicios.

## Resultados

| Motor, versión obtenida mediante CDP | Resultado | Evidencia |
|---|---|---|
| Chrome 155.0.8059.80 | 12/12 correctas | [Chrome: recorrido completo](../tests/results/finance-ui-2026-10-17-windows-wip-chrome-error-selector-fix.json) |
| Edge 155.0.4283.45 | 12/12 correctas | [Edge: recorrido completo](../tests/results/finance-ui-2026-10-17-windows-wip-edge-first.json) |

Se verificaron las ocho comprobaciones funcionales y cuatro de cierre,
persistencia y fuentes. Los **64 archivos de runtime** permanecieron iguales
durante ambas rondas. Dataset, revisión y digest de todos los registros
coinciden tras cerrar completamente y reabrir el mismo perfil. Ambos cierres
por motor finalizaron con salida 0, sin forzar, sin error de inspección y sin
identidades propias restantes. No hubo errores de página/consola ni peticiones
HTTP originadas por la aplicación.

Los filtros quedan contenidos a 360/768/1440 px y los cambios de idioma
conservan EUR y los enteros de negocio. A 360 × 640 px se abre el menú,
se desplaza dentro de su panel hasta Ayuda, se verifica el enlace completamente
visible y se navega a Ayuda y de vuelta a Finanzas. En Chrome el panel mide
640 px, el contenido 799 px y su desplazamiento es 159 px: Ayuda queda entre
495 y 543 px, dentro del viewport. Las capturas estrechas y del menú fueron
revisadas visualmente. La tabla usa desplazamiento horizontal delimitado;
las filas estrechas aún pueden ser altas y requieren posterior pulido de
legibilidad, sin que esta ronda acredite toda la UX móvil.

### Intentos anteriores conservados

[El primer intento Chrome](../tests/results/finance-ui-2026-10-17-windows-wip-chrome-first.json)
falló en la preparación porque faltaba `dateFormat`, obligatorio para la
organización; no ejecutó negocios financieros.
[El segundo](../tests/results/finance-ui-2026-10-17-windows-wip-chrome-fixture-fix.json)
preparó los datos y falló por un selector de errores que coincidía con dos
párrafos, mensaje y nombre de campo. Se corrigió el ejecutor para esperar el
primer mensaje. Ambos informes mantienen su estado fallido. No se modificó
producción para resolver estos fallos del ejecutor. Edge se ejecutó únicamente
después de aprobar Chrome.

## Ejecución

Usar nombres nuevos para preservar cada intento. El ejecutor escribe progreso
tras cada comprobación y solo aprueba una ejecución completa. Los hashes de
fuentes de runtime se capturan y comparan al terminar. El helper común verifica
salida y cero identidades propias restantes; no cierra perfiles personales.

```powershell
node tests/e2e/finance-ui.cjs --browser chrome --machine EQUIPO --output finance-ui-FECHA-chrome.json
node tests/e2e/finance-ui.cjs --browser edge --executable RUTA_EDGE --machine EQUIPO --output finance-ui-FECHA-edge.json
```

## Límites

Solo EUR en esta ronda de UI; JPY/KWD tienen pruebas separadas de utilidades y
servicios y no se anuncian aquí como aceptación de pantalla. No se acredita
cuota física agotada, dispositivos reales, Firefox actual, accesibilidad
integral ni contabilidad fiscal. No cubre donaciones, inventario, exportación
ni todos los enlaces entre módulos. Las capturas y perfiles quedan en `.tmp`,
ignorados por Git; las rutas y hashes de capturas se registran en el JSON.
La traza de peticiones observa la página, no el tráfico interno del navegador.
