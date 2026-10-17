# Pruebas de navegador en el equipo de continuación

Revisión de relevo: **2026-10-16**. No se ha ampliado funcionalidad del producto.
La revisión de fuentes confirma que deben usarse las evidencias `validator-fix`
para negocio; las primeras `business-final` son históricas y anteriores al
último endurecimiento de `validators.js` y `dataset-validator.js`.

Fecha: 2026-10-15. Alias del equipo: `windows-wip`. Sistema observado por los
ejecutores: Windows 11 Home, Windows NT 10.0.26300, x64. Los JSON anteriores
de Windows 11 Pro 10.0.26200 pertenecen al otro equipo y se conservan.

## Binarios y herramientas

- Chrome instalado: `155.0.8059.79`, versión obtenida mediante
  `Browser.getVersion`, no mediante el User-Agent reducido.
- Edge instalado: `155.0.4283.45`, obtenido mediante `Browser.getVersion`.
  En este equipo el ejecutable está dentro de `EdgeCore`, no en la ruta
  habitual `Edge/Application`. Se selecciona mediante CLI o variable de entorno.
- Firefox estable oficial extraído: `158.0`, build `20261007201254`.
  No se utiliza Developer Edition para sustituir la prueba estable ni se
  instala Firefox en el sistema. Herramienta y perfiles están ignorados por Git.
- El instalador de Firefox se descargó de
  [Mozilla](https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US),
  con redirección oficial a la distribución `158.0/win64/en-US`. SHA-256 del
  instalador descargado:
  `450ab1c772e02f0c9ef02f489b153d86c45bd9311b202d10dc233f3c0206f8d1`.
  La firma Authenticode del ejecutable extraído resultó válida, de Mozilla
  Corporation. Esta descarga es una herramienta de desarrollo; no forma parte
  del producto.

Node y Python pueden ser instalaciones del desarrollador o los runtimes que
devuelve `load_workspace_dependencies`. Playwright se localiza por
`PLAYWRIGHT_PATH` o por la ruta relativa al directorio personal del runtime de
Codex. Ninguna dependencia de pruebas entra en la distribución del comprador.

## Evidencia final de esta ronda

Las seis ejecuciones finales conservaron los mismos hashes de fuentes al
principio y al final; también coinciden con las fuentes al cerrar esta ronda.
Todos los cierres fueron normales, sin terminación forzada ni procesos
descendientes pendientes.

| Navegador | Coordinador | Repositorios, backup y recuperación |
|---|---|---|
| Chrome 155.0.8059.79 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-chrome-final.json) | [11 internas + 6 externas correctas](../tests/results/business-2026-10-15-windows-wip-chrome-validator-fix.json) |
| Edge 155.0.4283.45 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-edge-final.json) | [11 internas + 6 externas correctas](../tests/results/business-2026-10-15-windows-wip-edge-validator-fix.json) |
| Firefox estable 158.0 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-firefox-final.json) | [11 internas + 7 externas correctas](../tests/results/business-2026-10-15-windows-wip-firefox-validator-fix.json) |

La suite de negocio comprueba inicialización explícita, idempotencia, rechazo
de revisión obsoleta y relación rota, documento con Blob, copia autocontenida
y validación, rechazo de archivos truncados/corruptos/futuros, cancelación
durante preparación, activación validada conservando el conjunto anterior,
rechazo de activación insegura, recibos de copia actual verificada y migración
física 1 a 2. La persistencia compara el digest de todos los datos y bytes
binarios tras cerrar y abrir el navegador con el mismo perfil. El informe
completo enumera cada caso y su evidencia.

Estas pruebas corresponden al núcleo de desarrollo `0.2.0-dev`, versión
física `2`, esquema `1` y formato de backup `1`. No acreditan formularios,
flujos de negocio de los módulos ni la aceptación comercial completa.

## Ejecutores portables

Las órdenes se ejecutan desde la raíz del repositorio. Los nombres de salida
deben ser nuevos para conservar evidencia de cada intento. `--machine` es un
alias voluntario; no requiere publicar el nombre real del equipo.

```powershell
node tests/e2e/storage.cjs --browser chrome --machine windows-wip --output storage-core-FECHA-EQUIPO-chrome.json
node tests/e2e/storage.cjs --browser edge --executable RUTA_AL_BINARIO_EDGE --machine windows-wip --output storage-core-FECHA-EQUIPO-edge.json
python tests/e2e/firefox_storage.py --firefox RUTA_AL_BINARIO_FIREFOX --machine windows-wip --output storage-core-FECHA-EQUIPO-firefox.json
```

`storage.cjs` conserva las comprobaciones de la transacción del coordinador,
lease entre pestañas, activación y rechazo de versión futura. Utiliza la base
sintética `animal-rescue-manager-test-integration`.

El ejecutor reutilizable espera `RescueManager.integration.ready`, exige un
informe no vacío con `passed=true`, y obtiene `integration.snapshot()`.
La página con `?peer=1` debe abrir la base sin volver a ejecutar los cambios.
El snapshot debe contener las tablas y bytes binarios, o un digest que vuelva
a calcularse sobre todos esos datos. La suite de negocio utiliza la segunda
opción: el digest incluye el hash real recalculado de cada Blob.

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/business.html --machine windows-wip --output business-FECHA-EQUIPO-chrome.json
node tests/e2e/suite.cjs --browser edge --executable RUTA_AL_BINARIO_EDGE --page tests/integration/business.html --machine windows-wip --output business-FECHA-EQUIPO-edge.json
python tests/e2e/firefox_suite.py --firefox RUTA_AL_BINARIO_FIREFOX --page tests/integration/business.html --machine windows-wip --output business-FECHA-EQUIPO-firefox.json
```

Cada ejecución de la suite crea un perfil aislado, abre el HTML directamente
con el navegador offline, ejecuta la suite, captura el digest, cierra el
navegador y lo vuelve a iniciar con el mismo perfil. Compara el snapshot
posterior y comprueba otra vez el cierre. En Windows se inspeccionan los
procesos descendientes por PID y fecha de creación; los JSON indican si fue
necesaria terminación forzada y si quedó algún proceso.

Los ejecutores guardan hashes de los scripts locales y de la entrada HTML.
Si cambian durante la ejecución, el resultado falla aunque los casos
funcionales hayan pasado. Así una edición concurrente no se presenta como
evidencia del mismo código al principio y al final.

Para repetir la sonda de viabilidad sin reemplazar sus resultados originales:

```powershell
node tests/e2e/chromium.cjs chrome edge --output-prefix viability-FECHA-EQUIPO
python tests/e2e/firefox_viability.py --firefox RUTA_AL_BINARIO_FIREFOX --output viability-FECHA-EQUIPO-firefox.json
```

La sonda Chromium admite `RM_CHROME_BINARY` y `RM_EDGE_BINARY`. El uso de
variables o de `--executable` evita fijar rutas personales en el código.

## Intentos y límites observados

Los primeros intentos de Chrome y Edge dentro del sandbox del ejecutor no
pudieron iniciar Crashpad o conectar al puerto local de depuración (`EACCES`).
Sus JSON con sufijo `sandbox-attempt` se conservan como fallos de entorno.
Las pruebas posteriores se ejecutaron con autorización para herramientas
locales de desarrollo, manteniendo intactas las políticas del navegador.

El primer intento Firefox de la suite de negocio agotó la espera de
`WebDriver:Navigate` antes de obtener el informe. El ejecutor reutilizable usa
`pageLoadStrategy=none` y espera explícitamente la promesa de la suite; la
segunda ejecución completó los casos y la persistencia. Esta opción afecta
solo a la espera de WebDriver, sin alterar origen, CSP o almacenamiento.

Chrome y Edge capturan errores de página, errores de consola y peticiones
HTTP/HTTPS iniciadas por la página. Firefox utiliza listeners tempranos de
`error`, `unhandledrejection` y `securitypolicyviolation`, además de las
entradas de recursos de Performance. Esta observación de Firefox no equivale
a una traza completa de toda la red del navegador. Los mensajes internos del
navegador se conservan en sus logs locales y no se atribuyen a la aplicación.

Todo se prueba mediante `file://`, sin servidor y sin modificar protecciones
de origen. El modo headless de escritorio no acredita un teléfono o tablet
real ni completa la aceptación comercial del producto. La matriz final y sus
pendientes siguen documentados en `COMPATIBILITY.md`.

## Recorrido integrado de servicios y UI revisados el 2026-10-16

Chrome se actualizó a **155.0.8059.80**; no se reetiquetan con esa versión
las pruebas históricas del día 15. Sistema Windows 11 Home 10.0.26300.

- [Lifecycle real: 11 casos internos y 6 externos correctos](../tests/results/lifecycle-2026-10-16-windows-wip-chrome-review.json).
  Crea organización/catálogos/contacto/perfil, asigna código animal, registra
  acogida, solicitud, aprobación, reserva, adopción e ingreso, devolución,
  donaciones, stock, acto sanitario con tarea/gasto, TXT con vínculo y backup
  verificado. Conserva digest de registros/bytes tras cierre completo y reapertura.
- [UI inicial: 11 comprobaciones correctas](../tests/results/ui-2026-10-16-windows-wip-chrome-review.json).
  Inglés inicial/español, Escape/foco, cambios sin guardar, alta y recarga,
  segunda pestaña, copia descargada y reseleccionada, restauración real,
  anchos 360/768/1024/1440 sin overflow y menús con estado accesible coherente.
  Capturas finales de [1440 px](../tests/results/ui-2026-10-16-windows-wip-chrome-review-1440.png)
  y [360 px](../tests/results/ui-2026-10-16-windows-wip-chrome-review-360.png).
- Cero errores de página/peticiones externas observadas por ambos ejecutores,
  cierre normal de los procesos propios y huellas de fuentes sin cambios.
  No se afirma ausencia de tráfico interno del navegador.
- En ambos casos se usan perfiles aislados y datos sintéticos. No se abre el
  perfil personal ni se cambia la política de seguridad/origen del navegador.

Comandos usados para esta revisión:

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/lifecycle.html --machine windows-wip --output lifecycle-2026-10-16-windows-wip-chrome-review.json
node tests/e2e/ui.cjs --machine windows-wip-review --output ui-2026-10-16-windows-wip-chrome-review.json
```

El ejecutor UI también conserva el argumento posicional original para el nombre
de JSON. `--machine` evita fijar el alias de este PC en resultados futuros.
Los comandos de portabilidad están en CONTINUE_HERE.md. Node 22.16.0 y
Playwright 1.62.1 son las versiones de herramientas observadas.

## Corrección de R1–R4 verificada el 2026-10-16 (segundo PC)

Windows 11 Pro 10.0.26200, Node 22.19.0, Playwright 1.62.1 instalado en `.tools`
(ignorado). Chrome **155.0.8059.81** y Edge **155.0.4283.45** estables, perfiles
nuevos, `file://`, sin red ni cambios de seguridad. Huellas SHA-256 de las
fuentes comprobadas después de la ejecución: coinciden con los archivos actuales.

| Recorrido | Chrome | Edge |
|---|---|---|
| Negocio/recuperación (incluye R2) | [12 internas + 6 externas](../tests/results/business-2026-10-16-windows-wip-chrome-review-fixes.json) | [12 internas + 6 externas](../tests/results/business-2026-10-16-windows-wip-edge-review-fixes.json) |
| Lifecycle de servicios | [11 internas + 6 externas](../tests/results/lifecycle-2026-10-16-windows-wip-chrome-review-fixes.json) | [11 internas + 6 externas](../tests/results/lifecycle-2026-10-16-windows-wip-edge-review-fixes.json) |
| UI inicial (incluye R4) | [11 comprobaciones](../tests/results/ui-2026-10-16-windows-wip-chrome-r4.json) | [11 comprobaciones](../tests/results/ui-2026-10-16-windows-wip-edge-r4.json) |

- R2: una copia realmente vacía se restaura como conjunto activo vacío; crear
  la organización escribe en ese mismo conjunto. Revisión antigua rechazada,
  reintento con el mismo `operationId` devuelto como duplicado y segunda
  creación rechazada sin alterar el digest.
- R4: tras recargar, la página queda en lectura con explicación y recupera el
  control sola en 14 976 ms (Chrome) y 14 983 ms (Edge), sin "Tomar el control".
  La segunda pestaña sigue en lectura. Medición previa: ninguna escritura
  IndexedDB lanzada en `pagehide` (una sola o lectura+escritura) se confirmó en
  tres recargas de Chrome; por eso no se usa liberación al descargar ni
  `window.name` (lo asignado durante `pagehide` tampoco sobrevive).
- `tests/e2e/ui.cjs` admite ahora `--browser chrome|edge`.

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/business.html --machine NUEVO-PC --output business-FECHA-chrome.json
node tests/e2e/ui.cjs --browser edge --machine NUEVO-PC --output ui-FECHA-edge.json
```

Servicio de contactos (mismo día y equipo): el recorrido lifecycle añade
duplicado bloqueado, fusión sin confirmar rechazada con digest intacto y fusión
real con 5 reasignaciones e historia económica conservada.
[Chrome 12 internas + 6 externas](../tests/results/lifecycle-2026-10-16-windows-wip-chrome-contacts.json),
[Edge 12 internas + 6 externas](../tests/results/lifecycle-2026-10-16-windows-wip-edge-contacts.json).
`suite.cjs` guarda ahora el informe interno también cuando falla una comprobación.

Pendiente: los tres recorridos en Firefox (no instalado en este PC; requiere
descargar el instalador oficial), dispositivos reales y aceptación completa.
Un recorrido correcto no verifica todos los módulos del producto.

## Cierre del checkpoint de pantallas (2026-10-16)

Runtime publicado en `47e6c11`. La ronda workspace-ui final-2 verifica los
recorridos de negocio en Chrome/Edge (contactos/duplicados, perfiles/horas,
animal/peso/foto, documento inválido sin escrituras, TXT/vínculos/externo,
descarga y backup/restauración de bytes). El informe global de UI **no está
aprobado**: el ejecutor encuentra dos encabezados Documents (h1 y h2) en un
selector estricto del siguiente paso. Ajustar ese selector y completar
reapertura/anchos sin repetir rondas opcionales. Consultar el JSON final-2
por motor: no convertir pasos aprobados en aceptación integral. Los defectos
reales encontrados (pestañas y ancho de tablas) se corrigieron antes del runtime
publicado. El helper de cierre de navegadores de pruebas también se corrigió
para reconocer signalCode y liberar CDP tras salida, con identidades verificadas.
