# Ficha imprimible del animal — 2026-10-20

Requisito 38: estilos de impresión para la ficha del animal con datos de la
organización y opción de incluir datos personales. Informes ya tenía impresión
desde su pantalla (REVIEW_RESOURCES_REPORTS.md). Sin cambios de formato: app
0.2.0-dev / DB 2 / schema 1 / backup 1. No genera PDF propio: el diálogo del
navegador permite imprimir o guardar como PDF.

## Comportamiento

La ficha de cada animal tiene «Imprimir ficha» (`js/modules/animal-print.js`),
disponible también en pestañas de solo lectura porque no escribe nada. Abre una
vista previa con:

- Logotipo validado, nombre y datos de impresión de la organización; pie configurado.
- Código, nombre, situación, disponibilidad y fecha de impresión en la zona de la
  organización; foto validada.
- Identificación (especie, raza, sexo, nacimiento, edad estimada, tamaño, color,
  microchip, esterilización, ubicación, último peso, fallecimiento).
- Descripción, carácter, comportamiento y necesidades especiales; registros
  sanitarios, planes activos con instrucciones humanas (sin calcular dosis),
  pesos recientes, estancias, acogidas, adopciones y documentos vinculados.

**Datos personales** (nombres, teléfonos, correos y direcciones de adoptantes,
familias de acogida y profesionales, incluida la familia como ubicación) y
**notas internas** se excluyen por defecto y solo aparecen al marcar cada casilla;
el pie indica si la ficha contiene datos personales. Todo el texto se inserta con
`textContent`; las URL de objeto se liberan al cerrar.

«Imprimir» construye la ficha fuera del diálogo, activa `html.printing-sheet` y
llama a `window.print()`; con `@media print` solo queda visible esa ficha, con
márgenes `@page` de 14 mm y bloques que evitan cortes. `afterprint` o cerrar el
diálogo retiran la copia y la clase.

## Evidencia

`animal-print-ui-2026-10-20-{chrome,edge}-final-2.json` (**11/11 por motor**, 130 fuentes), file:// offline, perfil
propio y sin mocks de negocio. Fixture con servicios reales: organización con
datos/pie y logotipo, contactos de acogida y clínica con teléfono/correo, animal
con foto, peso, vacuna con clínica, nota interna y acogida.

- La vista previa por defecto contiene ficha, organización, salud y pie, y no
  contiene ningún dato personal ni la nota; foto y logotipo decodificados.
- Las casillas añaden datos personales y notas solo a la vista previa.
- `window.print` se sustituye por un registro de prueba (limitación explícita para
  no bloquear el diálogo en headless); se comprueba ficha lista, medio print que
  oculta aplicación y diálogo, PDF de Chromium (`printToPDF`, A4, 2 páginas en el
  fixture) y limpieza tras `afterprint`; con y sin datos personales.
- Pestaña sin control de escritura: vista previa e impresión disponibles, sin
  escrituras.
- EN/ES a 360/768/1440 sin desbordar; cierre/reapertura sin errores ni HTTP.

`chrome-first` 11/11 se conserva con fuentes anteriores a los márgenes `@page`
y a la frase de la guía; `{chrome,edge}-final` 11/11 precede a la corrección de CSS. Regresiones del mismo día tras añadir el botón: pesos 9/9 y guía 4/4 por motor
(`weights-history-ui-2026-10-20-*-print-button-regression`, `help-ui-2026-10-20-print-*`).
La suite antigua `workspace-ui` (`*-print-button-regression`, 8/9) detectó un defecto
previo del 18-10: la casilla «acogidas anteriores» de filtros de animales se salía
4 px a 360 px (regla `width:100%` de filtros aplicada a casillas). Corregido en
`css/people.css`; `workspace-ui-2026-10-20-*-filter-checkbox-fix` 13/13 y
`animal-filters-ui-2026-10-20-*-filter-checkbox-fix` 10/10 por motor.

## Límites

No se ha probado una impresora física ni papel; el PDF de Chromium no acredita
otros motores. No hay ficha imprimible de contactos ni selección de secciones.
