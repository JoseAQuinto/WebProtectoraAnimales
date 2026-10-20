# Auditoría automática de accesibilidad — 2026-10-20

Ejecutor `tests/e2e/a11y-ui.cjs`: file:// offline, perfil propio, demo ficticia
cargada con su servicio tras copia verificada, sin mocks. Recorre en ES y EN las
21 rutas del menú, las 7 pestañas de la ficha del animal, la vista previa de la
ficha imprimible y los diálogos que abren los botones de cabecera (18 diálogos
en la ronda final, listados en `dialogScopes`), además de la pantalla inicial vacía.

Reglas comprobadas en el documento o el diálogo superior abierto:

- Nombre accesible de controles de formulario, botones, enlaces y `role=button`.
- `alt` en imágenes; `id` duplicados; `aria-labelledby`/`label for` rotos.
- Un único `h1` visible por pantalla y sin saltos de nivel de encabezado.
- Tablas con encabezados y `scope` en encabezados de fila; diálogos con nombre.
- `lang` del documento igual al idioma activo; landmarks `main` y `nav`.
- Contraste de texto ≥ 4,5:1 (3:1 en texto grande) sobre fondos sólidos.
- Sin `tabindex` positivos; el primer Tab llega al enlace de salto y lleva el foco
  al contenido principal.

Primera ronda (`a11y-ui-2026-10-20-chrome-first.json`): 6 saltos h1→h3 en las
pestañas de la ficha del animal (EN/ES). Corrección: cada panel de pestaña tiene
un `h2` (clase `sr-only`) con el nombre de la pestaña. `chrome-second`: 0
incidencias, 18 diálogos. Ronda final: `a11y-ui-2026-10-20-{chrome,edge}-final.json`.
Tras la navegación agrupada y el diagnóstico: `a11y-ui-2026-10-20-{chrome,edge}-nav-diagnostics.json`
11/11, 0 incidencias. Los UUID solo se muestran en las herramientas de mantenimiento
de Almacenamiento (permitido por el requisito 32 como diagnóstico).
Regresiones de las suites que recorren pestañas del animal tras el `h2`:
`*-2026-10-20-{chrome,edge}-tab-heading.json`.

## Límites

Es una auditoría basada en reglas, no una revisión con lector de pantalla, control
por voz ni experto humano. No calcula contraste sobre degradados/imágenes ni en
estados hover/focus, y solo cubre diálogos de cabecera y los nombrados. No
acredita WCAG completo ni accesibilidad integral; sigue pendiente la revisión
manual con tecnologías de apoyo y dispositivos físicos.
