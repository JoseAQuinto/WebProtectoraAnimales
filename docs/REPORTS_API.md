# Informes: contrato y criterios

`services.reports` contiene cálculos puros sobre una instantánea coherente;
no lee ni escribe almacenamiento. La pantalla `#reports` usa los mismos
registros que las fichas y conserva la revisión de los datos exportados.

- Censo y distribuciones: situación **actual**, con fecha de referencia de la
  organización, separada del periodo de hechos. Ubicación y disponibilidad
  pueden solaparse. No se reconstruye un censo histórico supuesto.
- Entradas cuentan episodios iniciados; adopciones cuentan hechos realizados.
  Una devolución no elimina la adopción anterior. El promedio usa solo episodios
  cerrados por adopción y casos cuya fecha de adopción está en el periodo;
  muestra casos y días redondeados al entero más cercano.
- Edades administrativas: menos de 1 año, 1–3, 4–7 y 8 o más, más desconocida.
  Una edad estimada avanza en meses desde su referencia; no se inventa una
  referencia ausente ni se interpreta como clasificación veterinaria universal.
- Ingresos/gastos y costes usan movimientos contabilizados, excluyendo anulados.
  Facturas compartidas cuentan una vez. Los gastos generales están separados;
  no se distribuyen entre animales. Donaciones materiales y valor estimado se
  muestran separados del balance económico.
- Periodos inclusivos, fechas civiles sin UTC, máximo explícito de 1200 meses
  (100 años). Un periodo inválido, excesivo o suma fuera del entero seguro
  produce un error visible, sin truncar ni guardar datos. Las sumas monetarias
  usan BigInt antes de convertir a enteros seguros.

## Pantalla y exportación

Los gráficos locales SVG muestran las últimas doce mensualidades del periodo,
con títulos, colores/leyenda y tablas completas como alternativa. Las tablas
paginan a 24 filas. La evolución anual agrupa las mismas mensualidades.
Los estados sin datos no generan cifras de demostración.

Cada tabla permite descargar **todas sus filas**, independientemente de la
página visible: CSV UTF-8, coma o punto y coma, BOM opcional, comillas y CRLF.
Los importes usan punto decimal sin miles y la moneda figura en encabezados.
Se emplea Papa Parse local `unparse` con `escapeFormulae` y una expresión que
incluye controles, espacios iniciales y prefijos peligrosos. Hay pruebas de
Unicode, comillas, saltos, teléfonos con +, identificadores y números seguros.

Fuentes técnicas consultadas el 2026-10-18:
- [Papa Parse: Unparse y escapeFormulae](https://www.papaparse.com/docs)
- [OWASP: CSV Injection](https://community.owasp.org/attacks/CSV_Injection)

Una hoja de cálculo puede transformar tipos o retirar protecciones al guardar;
no se promete sanitización universal ni restauración fiel mediante CSV.

El JSON usa `format: animal-rescue-manager-report`, `reportFormatVersion: 1`,
`criteriaVersion: reports-v1`, periodo, fecha de referencia actual, moneda,
revisión de datos y secciones con filas completas. `includesFiles: false` y
`notBackup: true` distinguen el informe de una copia reconstruible. Los importes
son cadenas decimales exactas; los recuentos conservan su tipo numérico.
La impresión abarca las páginas de tabla visibles, tal como indica la pantalla.

No se modifican appVersion/dbVersion/schemaVersion/backupFormatVersion por
estos cálculos y exportaciones. Rendimiento de la captura O(N), impresión
multipágina completa, formatos de exportación por módulo e importación siguen
siendo bloques diferentes; este informe no los simula.
