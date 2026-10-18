# Exportaciones por módulo — 2026-10-18

Versiones de aplicación/DB/schema/backup sin cambios (`0.2.0-dev`/`2`/`1`/`1`).

## Uso y alcance

`#exports` cubre animales, contactos, solicitudes, adopciones, gastos, ingresos,
perfiles de voluntariado, horas y donaciones. Hay dos alcances explícitos:
todos los registros del módulo (incluidos archivo/papelera) o los resultados
de los filtros de esta pantalla. No hereda silenciosamente filtros de otras
pantallas. Filtros por texto/estado/periodo/animal/contacto/visibilidad cuando
corresponden. Distintos filtros combinan AND. Previsualiza 20 por página;
la descarga abarca todas las páginas y exige revisar módulo/alcance/cantidad.
La captura y revisión del diálogo identifican exactamente los datos exportados.
Puede exportarse en lectura, sin lease de escritura.

CSV: UTF-8, BOM opcional, coma/punto y coma, encabezados legibles EN/ES,
fechas ISO, dinero decimal con punto y sin agrupación junto al entero de
unidades menores y moneda. Cantidades materiales llevan entero escalado,
precisión y decimal. Minutos de voluntariado son enteros. Teléfonos se
conservan en una celda JSON estructurada; roles usan códigos separados por `|`.
Una donación material tiene una fila por línea con el mismo ID de donación;
la económica tiene una fila. Estimaciones cero y desconocidas se distinguen.
Los encabezados de exportación son legibles; las plantillas de importación
con campos estables todavía deben añadirse al asistente de importación.

Se utiliza `utils.tabular`/Papa Parse ya incluido: comillas, separadores,
saltos de línea y protección de prefijos ejecutables y controles. CSV no
garantiza que Excel conserve ceros iniciales, tipos ni protecciones al volver
a guardar. JSON conserva los valores/tipos originales. Los nombres de archivo
contienen módulo, alcance y fecha, sin nombres personales.

## JSON v1 de módulo

Contenedor `format: rescue-manager-module-export`, `formatVersion: 1`, módulo,
app/schemaVersion, instante ISO, dataset/revisiones de origen, alcance/filtros,
nombre/moneda/zona de organización, `records` y `references` por tabla.
`includesFiles: false`, `notBackup: true`, `assetPolicy: metadata-only`.
No se codifican bytes Blob. No se acepta como copia completa.

Política `selected-related-and-forward-v1`:

- Animales: episodios, pesos, acogidas, solicitudes, reservas, adopciones,
  actos/planes, tareas/eventos y enlaces de documentos del animal/adopción/acto.
- Contactos: perfiles de acogida/voluntariado, horas y enlaces de documentos.
- Solicitudes: reservas/adopciones relacionadas. Adopciones: sus documentos.
- Voluntarios: horas relacionadas. Donaciones: todas sus líneas.
- En todos los casos, cierre recursivo de referencias declaradas en esquemas,
  incluyendo fuentes y enlaces de documentos. Se evitan ciclos/repeticiones.
  Se conservan IDs de contactos fusionados y su cadena; CSV muestra el nombre
  sobreviviente junto al ID original, sin reescribir la referencia histórica.
- Recursos referenciados incluyen metadatos/hash y no Blob. No es una copia
  íntegra de todo el historial inverso de cada persona/recurso ni de la app.

`export-definitions.js` define proyecciones/columnas; `exports.js` selecciona,
proyecta y construye referencias; `modules/exports.js` gestiona filtros/diálogo.
Son consultas puras de una captura; no acceden a IndexedDB ni generan efectos
financieros/stock/eventos. Límites: 100.000 filas CSV, 100.000 registros con
dependencias JSON y archivo final de 128 MiB. No equivalen al límite de entrada
CSV (10 MiB/10.000 filas) pendiente de implementar en el asistente.

## Verificación

Chrome/Edge **10/10 por motor**, `file://` offline:

- `module-exports-ui-2026-10-18-chrome-empty-line-parser.json`.
- `module-exports-ui-2026-10-18-edge-first.json`.

Preparación por servicios reales con datos sintéticos de los nueve módulos:
23 animales, contactos activo/archivado/papelera, adopción devuelta, acto con
gasto/documento TXT, voluntario/horas, donación económica/material de dos líneas
y stock. Descargas reales de 9 JSON y 9 CSV con hashes registrados. Se comprueban
ceros iniciales, importes/cantidades/minutos, referencias sin bytes, estimación
cero, ID común de líneas, comillas/Unicode/saltos, protección de fórmula,
filtros/subconjuntos/vacíos, BOM/separadores y ausencia de descarga sin revisión.
La descarga de animales contiene las 23 filas aunque la página muestre 20.
EN/ES y 360/768/1440 sin desbordamiento global; dos cierres propios y reapertura
con revisión/recuentos/digest de tablas y hashes reales de Blob idénticos.
81 fuentes cargadas intactas, cero errores de página/consola y cero peticiones
HTTP de la página. Las descargas son consultas: no modifican negocio.

Intentos fallidos conservados: `chrome-first` no limpiaba la búsqueda animal
antes de probar contactos; `chrome-filter-setup` interpretaba el CRLF tras un
encabezado sin datos como fila. El parser de prueba ahora omite líneas vacías,
conservando saltos dentro de campos entrecomillados. No se cuentan como pasada.

157 pruebas Node y 667 estáticas correctas. Seis pruebas nuevas cubren las nueve
proyecciones y contenedores, precisión/agrupación, cierre de referencias, ausencia
de bytes, inmutabilidad, alcances/filtros, contactos fusionados y todos los labels.

## Pendiente

Asistente de importación y plantillas estables, decisiones de duplicados y
relaciones, correspondencias externas y lotes grandes. La exportación no los
simula. Faltan volumen de navegador, reapertura en hojas de cálculo concretas
y aceptación de plataformas físicas. La captura sigue teniendo coste O(N).
