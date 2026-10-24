# Sistema de diseño — «Cuaderno de refugio»

Rediseño visual del 2026-10-24. Solo cambia la presentación y algunos textos:
servicios, esquemas, formatos de almacenamiento, copias y versiones siguen igual.

## Diagnóstico de partida

La interfaz funcionaba, pero tenía la estética genérica de una plantilla SaaS:

- barra lateral verde oscuro macizo y títulos de grupo en mayúsculas espaciadas;
- 18 tarjetas de métricas idénticas (mismo radio, sombra y botón «Ver»);
- botones de 44 px en todas partes: una tabla de 8 filas ocupaba una pantalla;
- pestañas con forma de pastilla, idénticas a los botones de acción;
- avisos con franja lateral de color apilados al principio de cada pantalla;
- Segoe UI del sistema sin jerarquía tipográfica;
- acciones secundarias con el mismo peso visual que la principal.

## Direcciones valoradas

1. **Cuaderno de refugio** (elegida): editorial sutil con gestión sobria. Papel salvia,
   tinta de bosque, musgo para las acciones y ocre para lo que requiere atención.
   Literata y Atkinson Hyperlegible Next.
2. **Ficha clínica**: IBM Plex Sans/Mono, pizarra y azul petróleo, esquinas rectas.
   Muy eficiente, pero fría y con aspecto de ERP genérico.
3. **Casa de acogida**: Bricolage Grotesque y Figtree, arena y nogal, formas redondeadas.
   Cercana, pero con riesgo de parecer infantil y de gastar más espacio.

Se eligió la 1 porque equilibra cercanía y confianza, y porque su tipografía de
interfaz está diseñada para la máxima legibilidad, algo importante para voluntariado sin
perfil técnico.

## Tokens (css/app.css `:root`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#f2f3ee` | Fondo de la aplicación |
| `--surface` | `#ffffff` | Paneles, tablas, diálogos |
| `--sunken` | `#e8eae3` | Barra lateral, huecos de foto |
| `--line` / `--line-strong` | `#d9dcd2` / `#b9bfb1` | Filetes / bordes de controles |
| `--ink` / `--ink-2` | `#1d2b24` / `#4f5c54` | Texto / texto secundario |
| `--moss` / `--moss-dark` | `#3d6a4f` / `#2c5039` | Acción principal, selección, enlaces |
| `--ochre` / `--ochre-tint` | `#7d5410` / `#f7efdf` | Avisos, retrasos, stock bajo |
| `--danger` | `#a23b2e` | Errores y validación |

Todos los pares texto/fondo superan WCAG AA (auditoría `a11y-ui`, regla de contraste).

## Tipografía

- **Literata** (serif de lectura): títulos h1/h2, nombre de la organización, marca y
  cifras del resumen. Escala 1,25: 30 / 19,2 / 16 px.
- **Atkinson Hyperlegible Next**: toda la interfaz y el texto. Distingue 0/O e l/I
  (cero con barra), útil para códigos, microchips e importes. Cifras tabulares en todo
  el documento para que las columnas numéricas se alineen.
- Archivos WOFF2 locales en `vendor/literata/` y `vendor/atkinson-hyperlegible-next/`
  (subconjuntos latín y latín extendido, licencia OFL 1.1). `css/fonts.css` los declara;
  la CSP añade `font-src 'self'`. Sin la fuente, se usan Segoe UI y Georgia.

## Reglas de composición

- **Planos, sin sombras.** Paneles con filete de 1 px y radio de 8 px; controles con
  radio de 6 px. Solo flotan con sombra los diálogos, los desplegables y el menú móvil.
- **Densidad de trabajo.** Controles de 40 px y botones de tabla de 32 px con ratón;
  en pantallas táctiles (`pointer: coarse`) vuelven a 44/40 px.
- **Una acción principal por zona.** Botón sólido musgo para la acción principal; el
  resto, contorneados. En la ficha del animal, «Editar datos» es la principal.
- **Cifras en franja.** El resumen y los informes agrupan las cifras en un único panel
  dividido por filetes («libro de cuentas») en vez de tarjetas iguales. Las alertas
  (tareas atrasadas, stock bajo) se tiñen de ocre.
- **Pestañas subrayadas** unidas al panel que controlan.
- **Avisos compactos**: fondo teñido y filete, con la acción alineada a la derecha.
- **Tablas densas**: cabecera discreta, nombre del registro en negrita como título de
  fila, botones compactos. En móvil cada fila se convierte en una tarjeta etiquetada.
- **Navegación clara**: barra lateral sobre papel hundido; el elemento activo se marca
  en blanco con una línea musgo. Por debajo de 900 px pasa a menú desplegable.

## Componentes y clases nuevas

- `.dashboard-panels`: rejilla de dos columnas para gráficos y copias del resumen.
- `.status-line` + `.badge`: situación y disponibilidad del animal como etiquetas.
- `.backup-steps`: los tres pasos de copias de seguridad en una fila.
- `.start-steps`: tres pasos de la pantalla de primer uso.
- `.help-contents`: índice de la ayuda en dos columnas.

## Comprobación

Capturas a 1440, 820 y 390 px de las 22 rutas, diálogos y pestañas de animal, sin
desbordamiento horizontal. Auditoría de accesibilidad y suites funcionales de Chrome:
ver `CHANGELOG.md`. La emulación de tamaño no equivale a probar dispositivos reales.
