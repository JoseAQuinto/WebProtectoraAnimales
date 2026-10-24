# Firefox estable actual — 2026-10-24

Autorización expresa del usuario el 2026-10-24 para descargar Firefox estable desde
mozilla.org y probar la versión actual. Sustituye el aplazamiento anterior.

## Herramienta descargada (no forma parte del producto)

- Versión vigente según `product-details.mozilla.org`: **158.0.1** (publicada el
  2026-10-23), build `20261019185856`.
- Origen: `download.mozilla.org` → `download-installer.cdn.mozilla.net/pub/firefox/
  releases/158.0.1/win64/en-US/Firefox Setup 158.0.1.exe`, 94 890 968 bytes,
  SHA-256 `3259a2f8508e58cf2e383b6c99bfc64d6ddc86d1407b7c2f86f660af955b5d10`.
- Firma Authenticode válida de Mozilla Corporation (instalador y `firefox.exe`).
- Extraído sin instalar con `/ExtractDir` en `.tools/firefox-158.0.1/` (ignorado
  por Git). No se modificó el sistema.

## Ejecutores

`tests/e2e/chromium.cjs` admite `--browser firefox`: lanza el Firefox oficial con el
canal WebDriver BiDi de Playwright 1.62 (`channel: 'moz-firefox'`, perfil persistente
propio, `--no-remote`, sin conexión) y comprueba al cerrar que ningún proceso sigue
usando el perfil. La ruta por defecto es la de `.tools`; se puede cambiar con
`--executable` o `RM_FIREFOX_BINARY`. Todos los ejecutores `*-ui.cjs` y
`regression.cjs` aceptan `firefox`. Las suites que usan funciones exclusivas de
Chromium (sesiones CDP de `memory-ui`, `page.pdf` de `animal-print-ui`, selección
nativa por `DOM.setFileInputFiles` en copias muy grandes) fallarán en Firefox por la
herramienta, no por la aplicación, y deben adaptarse o documentarse por separado.

## Estado: aún no ejecutado

**Omitido por decisión del usuario el 2026-10-24** («si no es crucial para la app
podemos omitirlo»). No hay evidencia Firefox de las fuentes actuales; las del
2026-10-15 (almacenamiento, copias, recuperación con Marionette) son de fuentes
antiguas y solo históricas. El requisito de matriz con Firefox estable sigue vigente
para la aceptación final: no se declara cumplido.

Diagnóstico conservado (`tests/e2e/firefox-bidi-probe.cjs`, cinco formas de arranque
con perfiles propios y cierre solo de sus procesos):

- `regression-2026-10-24-firefox-158.0.1-firefox.json` (terminal normal del usuario):
  las 35 suites fallan al lanzar; Firefox termina con código 1 tras un error
  `nsIWindowsRegKey.create`. Igual dentro del sandbox de comandos de la sesión.
- `firefox-bidi-probe-2026-10-24T10-32-50-694Z.json` (cmd elevado): el agente BiDi arranca
  y Playwright conecta, pero Firefox no puede crear procesos de pestaña ni de socket
  (`SpawnTarget` 0x80070005, acceso denegado de su sandbox de contenido).
- `firefox-bidi-probe-2026-10-24T10-34-05-493Z.json` (usuario normal, sin sandbox de
  comandos): sale con código 1. Mover ejecutable y perfil fuera de OneDrive tampoco
  abrió el agente remoto; esa copia temporal se borró.

La causa es el entorno de Windows de este equipo para Firefox automatizado, no la
aplicación. No se debilitó el sandbox de Firefox ni ningún permiso del sistema.

Para la aceptación final: comprobación manual de 5–10 minutos en un Firefox estable
instalado normalmente (abrir index.html, crear organización/animal/contacto/documento,
generar y verificar copia, cerrar y reabrir), o en otro PC:

```powershell
node tests/e2e/firefox-bidi-probe.cjs
node tests/e2e/regression.cjs --browser firefox --label FECHA-firefox --machine OTRO-PC
```
