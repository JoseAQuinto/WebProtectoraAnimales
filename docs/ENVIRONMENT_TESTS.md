# Pruebas de navegador en el equipo de continuación

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
| Chrome 155.0.8059.79 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-chrome-final.json) | [11 internas + 6 externas correctas](../tests/results/business-2026-10-15-windows-wip-chrome-final.json) |
| Edge 155.0.4283.45 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-edge-final.json) | [11 internas + 6 externas correctas](../tests/results/business-2026-10-15-windows-wip-edge-final.json) |
| Firefox estable 158.0 | [9 internas + 7 externas correctas](../tests/results/storage-core-2026-10-15-windows-wip-firefox-final.json) | [11 internas + 7 externas correctas](../tests/results/business-2026-10-15-windows-wip-firefox-final.json) |

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
