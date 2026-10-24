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

En el entorno de comandos de esta sesión, Firefox 158.0 y 158.0.1 se cierran al
arrancar en modo headless (aparece `crashreporter.exe`) antes de abrir su agente
remoto; con Chromium no ocurre. Fuera de ese entorno no se cuelga, pero la ejecución
sin sandbox necesita una autorización que esta sesión no tiene. **No hay evidencia
Firefox de las fuentes actuales**; las evidencias Firefox del 2026-10-15 corresponden
a fuentes antiguas. Comando previsto, desde un terminal normal del equipo:

```powershell
node tests/e2e/regression.cjs --browser firefox --label 2026-10-24-firefox-158.0.1 --machine windows-wip
```
