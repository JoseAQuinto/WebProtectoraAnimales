# Iconos SVG locales — 2026-10-24

Requisito 31: «Iconos SVG locales y coherentes». Antes la interfaz usaba glifos
Unicode (`⌂` en la marca y `◇` sin foto). `js/components/icons.js` define 23 iconos
propios de trazo sobre una rejilla de 24×24 (`currentColor`, trazo 1,8, extremos
redondeados): uno por cada ruta de la navegación, la marca y el marcador de foto.

- Se construyen con `createElementNS` y datos de trazado constantes: sin `innerHTML`,
  sin archivos remotos ni SVG aportado por el usuario; compatibles con la CSP actual.
- Son decorativos (`aria-hidden="true"`, `focusable="false"`) junto al texto visible
  de cada enlace; el marcador sin foto conserva su nombre accesible (`role="img"`).
- No se imprimen en la navegación (`@media print`).

`tests/static-checks.cjs` excluye de su búsqueda de URL solo el identificador de
espacio de nombres `http://www.w3.org/2000/svg`, que se pasa a `createElementNS` y
nunca se solicita; cualquier otra URL sigue rechazándose.

## Evidencia

`a11y-ui-2026-10-24-chrome-icons-first.json` 11/11 (0 incidencias) y
`nav-diagnostics-ui-2026-10-24-chrome-icons-first.json` 10/10, con capturas a
360/768/1440. Regresión completa: `regression-2026-10-24-icons-{chrome,edge}.json`
**70 rondas, 974 comprobaciones, 0 fallos**.

## Límites

Iconos solo en navegación, marca y foto ausente; las acciones de las pantallas
siguen siendo botones con texto. No hay revisión de diseño por una persona.
