# Aceptación de interfaz de salud y tareas

Fecha: 2026-10-17. Windows 11 Home, `10.0.26300`.
Ejecutor: `tests/e2e/health-ui.cjs`. Apertura real de `index.html` por
`file://`, contexto offline, perfil sintético independiente por ejecución,
sin servidor ni modificaciones de seguridad del origen.

## Evidencia aprobada

| Motor instalado | Informe | Resultado |
|---|---|---|
| Chrome `155.0.8059.80` | `tests/results/health-ui-2026-10-17-windows-wip-chrome-1.json` | 12/12, pasado |
| Edge `155.0.4283.45` | `tests/results/health-ui-2026-10-17-windows-wip-edge-2.json` | 12/12, pasado |

Cada motor registra dos aperturas y dos cierres completos del árbol de
procesos propio, sin procesos restantes. Recuentos, revisión y digest de
negocio son idénticos antes/después de cerrar completamente y reabrir el
mismo perfil. Termina con 5 tareas, 1 plan completado, 2 actos sanitarios y
1 movimiento económico de 1.250 unidades menores. Cero errores de página,
cero errores de consola y cero peticiones HTTP(S) observadas desde la página.
La observación de peticiones no cubre tráfico interno del navegador.

Los informes contienen las 63 huellas de entrada/scripts/estilos cargados.
Edge contrasta además las huellas al terminar. Chrome1 tiene auditoría
suplementaria independiente en
`health-ui-2026-10-17-windows-wip-chrome-1-source-audit.json`: vuelve a
calcular las 63 huellas y confirma ausencia de diferencias. No reescribe el
informe original ni representa una segunda ejecución funcional. Cambios de
runtime posteriores necesitan su propia evidencia.

## Casos cubiertos

1. Organización creada con formulario. Animal, contacto y perfil voluntario
   ficticios preparados mediante servicios reales, expresamente identificados
   como preparación de prueba; esa preparación no acredita sus formularios.
2. Alta de tarea general con hora y zona; edición real que quita hora y deja
   `dueLocalTime`/`timeZone` ambos `null`, conservando descripción.
3. Completar otra tarea general con fecha y confirmación; cancelar con fecha,
   motivo y confirmación. Las fechas/motivo quedan persistidos.
4. Calendario y lista comparten las mismas tareas; cambiar de vista no escribe.
   Introducir mes `10000-01` se rechaza sin excepción ni cambios de negocio.
5. Un responsable asignado pasa a inactivo mediante servicio de preparación.
   El editor conserva su selección; guardar otro campo se rechaza sin cambios
   ni pérdida de campos. Solo retirarlo expresamente permite guardar la edición.
6. Crear y editar un plan con medicamento e instrucciones de dosis, vía y
   frecuencia ficticios escritos por el usuario. Ningún cálculo clínico.
7. Programar un único acto desde el botón del plan. El formulario fija animal
   y origen del plan, y no crea registro realizado por alcanzar una fecha.
8. Completar la tarea clínica abre el acto del tipo correcto. Sin confirmar
   realización no hay escrituras. Al confirmar (dos activaciones inmediatas
   del botón), se guardan una sola tarea completada, acto, gasto y evento,
   además del cierre del plan seleccionado expresamente.
9. Segundo acto seleccionando el gasto existente del mismo animal. Ambos
   registros comparten la factura y sigue existiendo un solo gasto.
10. Vista de salud a 1.440 y 360 píxeles, sin desbordamiento de toda la página
    ni escrituras al cambiar tamaño. Son viewports, no dispositivos físicos.
11. Cierre completo de los procesos propios del navegador de prueba.
12. Reapertura y comparación de revisión/recuentos/digest; errores y red;
    contraste de fuentes en el ejecutor actual.

Capturas de las rondas aprobadas, ignoradas por Git pero con huellas en JSON:

- Chrome: `.tmp/health-ui-chrome-1792226269207/clinical-complete.png`,
  `health-desktop.png`, `health-narrow.png`.
- Edge: `.tmp/health-ui-edge-1792226349448/clinical-complete.png`,
  `health-desktop.png`, `health-narrow.png`.

La captura estrecha Chrome se inspeccionó visualmente: secciones y acciones
mantienen su orden vertical, tablas contenidas y sin claves de traducción
visibles. La inspección no equivale a una auditoría completa de accesibilidad.

## Intentos conservados y correcciones del ejecutor

- `...edge-1.json`: fallo previo a lanzar por no existir la ruta por defecto
  `Microsoft/Edge/Application/msedge.exe`. Se utilizó después el EdgeCore
  realmente instalado, indicado en el informe aprobado. No se descargó otro
  navegador ni se convierte ese intento en aprobación.
- `...chrome-2.json`: ronda iniciada para añadir contraste final de fuentes,
  detenida en el caso 3 por defecto del **ejecutor**: identificaba tareas por
  posición `[0]`/`[1]`, pero la lectura usa UUID y no asegura orden de creación.
  El ejecutor actual identifica por título e ID. Se conserva el fallo 2/3 y
  su cierre sin procesos restantes. No se repitieron casos ya aprobados para
  corregir este supuesto de orden; Chrome1 aprobado se complementó con la
  auditoría de fuentes independiente. La modificación del lookup tiene sintaxis
  comprobada y queda pendiente de ejecutarse en una siguiente ronda necesaria.

No se encontraron defectos nuevos de producción durante esta suite. Las
regresiones revisadas antes de ejecutarla (precisión de moneda, hora/zona,
referencias inactivas y mes inválido) ya estaban corregidas en sus fuentes.

## Repetir cuando un cambio de runtime lo requiera

```powershell
node tests/e2e/health-ui.cjs --browser chrome --machine NOMBRE_EQUIPO --output health-ui-FECHA-EQUIPO-chrome.json
node tests/e2e/health-ui.cjs --browser edge --executable RUTA_REAL_EDGE --machine NOMBRE_EQUIPO --output health-ui-FECHA-EQUIPO-edge.json
```

Elegir nombres nuevos; el ejecutor no sobrescribe evidencia existente. No
declara Firefox, equipos móviles ni otras plataformas probadas. Quedan fuera
de este bloque enfermedad/alergia resuelta, esterilización, todos los estados
de cierre de planes, correcciones históricas, volumen, impresión y aceptación
completa de teclado/tecnología de apoyo. Backup y restauración de estas entidades
usan el núcleo ya existente; aquí se comprueba persistencia real tras cierre,
sin repetir esa suite independiente. El producto sigue incompleto.
