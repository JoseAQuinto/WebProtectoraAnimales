# ZIP de distribución verificado — 2026-10-20

Herramienta de desarrollo `tests/release/build-package.cjs` (no forma parte del
paquete y no publica nada). **El ZIP es una compilación de desarrollo bajo el aviso
pendiente de LICENSE.txt; no es un producto comercial ni debe subirse a Etsy.**

```powershell
node tests/release/build-package.cjs .tmp/dist/rescue-manager.zip
```

Contenido: carpeta raíz `rescue-manager/` con `index.html`, todos los scripts y
hojas que carga (más sus `@import`), `vendor/` completo (bytes originales de
terceros y licencias), `LICENSE.txt`, `THIRD_PARTY_NOTICES.txt` y los README de
inicio EN/ES. Excluye pruebas, documentación de desarrollo, evidencias, `.tmp`,
`.tools`, Git y ejecutores. Rutas validadas (sin `..`), orden fijo, fecha fija y
DEFLATE estándar: las mismas fuentes producen los mismos bytes. Los README indican
que `docs/CONTINUE_HERE.md` solo existe en el repositorio.

## Evidencia

`tests/e2e/package-ui.cjs` construye dos veces y compara SHA-256, extrae con
`Expand-Archive` de Windows, compara la lista y cada byte con el manifiesto y con el
repositorio, comprueba exclusiones, avisos y que cada referencia de `index.html`
está empaquetada sin URL remotas. Después abre la **copia extraída** por file://
offline: crea organización y animal con servicios reales, genera, descarga,
reselecciona y verifica una copia desde la UI, cierra y reabre con datos idénticos,
sin errores ni HTTP. Los JSON incluyen el manifiesto completo del ZIP.

Rondas: `package-ui-2026-10-20-chrome-first.json` (paso de rutas a PowerShell
del ejecutor) se conserva; `chrome-second` 8/8 con los README anteriores; la
ronda final por motor es `package-ui-2026-10-20-{chrome,edge}-final.json`.

## Límites

Solo Windows/Expand-Archive y Chrome/Edge. No acredita la matriz completa, macOS,
Linux, móviles ni Firefox actual; no sustituye la aceptación integral, la revisión
de licencia por el titular ni la publicación, que siguen bloqueadas.
