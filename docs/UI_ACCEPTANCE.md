# Aceptación de pantallas de contactos y animales

Fecha: 2026-10-17. Equipo `windows-wip`, Windows 11 Home 10.0.26300.
Versiones del producto: `appVersion 0.2.0-dev`, `dbVersion 2`,
`schemaVersion 1`, `backupFormatVersion 1`.

## Recorrido funcional con formularios reales

El ejecutor `tests/e2e/workspace-ui.cjs` abre el `index.html` del repositorio
por `file://`, en un perfil sintético exclusivo. El contexto está offline
antes de navegar. No utiliza servidor ni opciones para relajar el origen.
Node y Playwright son herramientas de desarrollo externas al producto.

| Navegador y versión obtenida mediante CDP | Resultado | Evidencia |
|---|---|---|
| Chrome 155.0.8059.80 | 13/13 correctas | [Chrome: selector corregido](../tests/results/workspace-ui-2026-10-17-windows-wip-chrome-selector-fix.json) |
| Edge 155.0.4283.45 | 13/13 correctas | [Edge: selector corregido, binario instalado](../tests/results/workspace-ui-2026-10-17-windows-wip-edge-selector-fix-installed.json) |

Se ejercitan los controles visibles para crear organización, contacto y
perfiles sobre la misma persona; impedir un duplicado sin confirmación;
registrar horas; registrar un animal y su peso; seleccionar una fotografía
real, optimizarla y mostrarla; rechazar un documento inválido sin perder
campos ni escribir datos; incorporar y descargar TXT con los mismos bytes;
vincular/desvincular documentos; registrar una referencia externa; generar,
descargar, volver a seleccionar y verificar una copia; restaurar registros
y recursos en otro dataset conservando su digest.

Después se cierran todos los procesos propios del navegador y se vuelve
a abrir el mismo perfil. Se comparan dataset, revisión global, todos los
registros y el hash calculado de los bytes reales de cada recurso. Ambos
cierres de cada motor finalizaron mediante `Browser.close`, con salida 0,
sin terminación forzada, sin error de inspección y sin identidades propias
restantes. No se cierran perfiles personales. No hubo errores de página,
errores de consola ni peticiones HTTP originadas por las páginas.

Cada informe conserva los hashes de 55 archivos cargados por el runtime.
Las fuentes permanecieron iguales durante esas rondas. Los cambios posteriores
no modifican retrospectivamente esas huellas. Esta evidencia corresponde a los
formularios de fase 4 y perfiles; no acredita los módulos añadidos después.

## Corrección del ejecutor y revisión visual

Las rondas del 16 de octubre con sufijo `final-2` se conservan: ocho pasos de
negocio aprobados y fallo global por un selector ambiguo de Documents, que
coincidía con h1 y h2. El selector ahora exige encabezado de nivel 1. Las dos
rondas del 17 completan también anchos, idioma, cierre y reapertura.

La revisión visual de las capturas a 360 px detectó controles de filtros
recortados y tablas demasiado comprimidas, aunque la medición de ancho de
la página no detectaba desbordamiento global. Ese resultado funcional no
equivale a aprobación visual. Se corrigió el CSS compartido de filtros y el
ancho mínimo de tablas dentro de su contenedor con desplazamiento delimitado.

El ejecutor se amplió con `--mode viewport --resume-profile` para revisar
solo ese riesgo, conservando la organización sintética ya creada. Exige una
ruta absoluta existente, resuelta mediante `realpath`, bajo la carpeta `.tmp`
del repositorio y con patrón exacto `workspace-ui-MOTOR-TIMESTAMP/profile`.
Este modo no ejecuta operaciones de negocio; compara registros, revisión y
bytes antes/después. Comprueba anchos 360, 768, 1024 y 1440 px, incluidos los
límites reales de los controles de filtros, y vuelve a comprobar fuentes y
cierre propio. Rechaza sobrescribir un JSON de evidencia existente.

| Revisión visual específica | Resultado | Evidencia |
|---|---|---|
| Chrome 155.0.8059.80 | 5/5 correctas | [Chrome: filtros y tablas corregidos](../tests/results/workspace-ui-2026-10-17-windows-wip-chrome-visual-fix.json) |
| Edge 155.0.4283.45 | 5/5 correctas | [Edge: filtros y tablas corregidos](../tests/results/workspace-ui-2026-10-17-windows-wip-edge-visual-fix.json) |

Cada ronda verifica veinte combinaciones de módulo/ancho, conserva los mismos
registros, revisión y bytes, mantiene sus 55 fuentes intactas y cierra su
árbol propio sin forzar ni dejar procesos. La revisión de capturas nuevas de
documentos y ficha animal confirma filtros de una columna a 360 px y tablas
legibles con desplazamiento limitado a la tabla. Los recorridos funcionales
ya aprobados no se repitieron por este cambio de CSS.

Las capturas y perfiles permanecen bajo `.tmp`, ignorada por Git; sus rutas
y hashes constan en los informes. Son herramientas locales de comprobación,
no archivos necesarios para ejecutar la aplicación desde otro equipo.

## Intento de entorno preservado

[El primer intento Edge del 17 de octubre](../tests/results/workspace-ui-2026-10-17-windows-wip-edge-selector-fix.json)
falló antes de lanzar el navegador porque no existe el ejecutable de la ruta
por defecto. No es una prueba de compatibilidad aprobada. La ronda correcta
selecciona explícitamente el Edge instalado en `EdgeCore`; `--executable`
permite indicar la ruta disponible en cada equipo, sin descargar un instalador.

## Repetir desde otro equipo

Usar nombres nuevos para cada informe. Ejemplo de recorrido completo:

```powershell
node tests/e2e/workspace-ui.cjs --browser chrome --machine NUEVO-PC --output workspace-ui-FECHA-chrome.json
node tests/e2e/workspace-ui.cjs --browser edge --executable RUTA_EDGE --machine NUEVO-PC --output workspace-ui-FECHA-edge.json
```

Para un cambio visual concreto, utilizar únicamente uno de los perfiles
sintéticos creados por ese ejecutor en el mismo repositorio:

```powershell
node tests/e2e/workspace-ui.cjs --browser chrome --mode viewport --resume-profile RUTA_ABSOLUTA_PERFIL_SINTETICO --machine NUEVO-PC --output workspace-ui-visual-FECHA-chrome.json
```

## Límites

Los anchos de viewport no acreditan dispositivos físicos ni apertura local
en Android, iOS o iPadOS. No hay aceptación integral de teclado, lector de
pantalla, ampliación o impresión en esta ronda. Firefox actual permanece
aplazado por la decisión previa de no descargar un instalador sin indicación.
No se observa tráfico interno del navegador. Los datos son ficticios y el
producto sigue incompleto; esta evidencia no autoriza uso comercial ni datos
personales reales. Ver [RECOVERY_EVIDENCE.md](RECOVERY_EVIDENCE.md) para las
pruebas separadas de cancelación, fallos inyectados y cierre abrupto.
