# CSV de donaciones y materiales agrupados — 2026-10-18

Versiones `0.2.0-dev` / DB `2` / schema `1` / backup `1`, sin cambios.
Queda JSON por módulos antes de completar la fase 10. El resto del producto
sigue pendiente de las fases de corrección histórica, demo y aceptación final.

## Formato y agrupación

`#imports` → Donaciones. Misma selección/mapeo/revisión/decisiones y protección
que los otros CSV. Plantilla estable con:

`group_id,external_id,id,type,date,contact_id,contact_external_id,currency,
category_id,category_code,concept,amount,amount_minor,material_type_id,
material_type_code,description,quantity,quantity_scaled,quantity_precision,
unit_id,unit_code,inventory_item_id,estimated_value,estimated_value_minor,
financial_movement_id,inventory_movement_id,status,correction_reason,
correction_date,notes`.

- **Económica** (`monetary`): una fila, fecha, categoría de ingreso UUID/código,
  concepto e importe. Usa el constructor real de donaciones: una donación y
  exactamente un ingreso con backlinks y clave única, guardados juntos.
- **Material** (`material`): mismo `group_id` en todas las líneas de una donación,
  hasta 1.000 por grupo. También se acepta UUID de donación repetido cuando
  cada fila declara `material`. Preferir `group_id` explícito para hojas nuevas.
  Fecha/donante/notas/tipo/UUID/identidad/moneda comunes pueden aparecer una vez;
  valores no vacíos deben coincidir. No reutilizar la clave para otras donaciones.
- Cada línea material exige tipo UUID/código, descripción, cantidad decimal
  o entera escalada, precisión 0–3 y unidad UUID/código. Artículo de inventario
  opcional por UUID; unidad y precisión deben coincidir. No se relaciona por nombre.
- Una línea incorporada crea un único movimiento de stock; otra no incorporada
  solo conserva su detalle. El valor estimado es opcional y separado del dinero:
  **cero se conserva; vacío es desconocido**. Materiales no generan ingresos.
- Fechas con barras y separador decimal se eligen expresamente; mismos límites
  de moneda/enteros/archivo que FINANCE_IMPORT.md. No hay conversión monetaria.

El informe presenta **donaciones/grupos**, no un guardado independiente por línea.
La columna de origen enumera todos los miembros y los errores señalan la fila
CSV exacta. Si una línea falla, ninguna línea/stock/donación de ese grupo entra
en el subconjunto válido. Importarlo exige confirmar el subconjunto de grupos.
Informe descargable con `source_rows`, `target_id` y `result_id`; también puede
descargar errores globales del conjunto con todas las columnas consistentes.

## Identidad y correcciones

Coincidencias de UUID, identidad externa o tipo/fecha/donante/importe o notas
materiales requieren decisión. Se puede crear otra, vincular sin cambios u omitir.
`external_id` identifica la donación completa; si está vacío, `group_id` actúa
como identidad al recordar la fuente. Líneas no crean varias identidades.
Archivo repetido se reconoce por hash; ninguna coincidencia sobrescribe sola.

Actualizar solo admite una donación **económica contabilizada**: motivo, fecha
y consentimiento adicional. Conserva UUID de donación y su origen; anula ingreso
original y crea sustituto enlazado mediante finance.correct, actualizando el
backlink y campos comunes de forma atómica. Notas mapeadas se actualizan también.
La donación avanza una revisión y no se duplica el ingreso válido.

Las correcciones materiales deben usar la anulación/compensación coordinada
existente. No se editan cantidades ni se crea stock huérfano desde CSV. Un nuevo
registro con UUID de ingreso/stock ya incorporado se rechaza: no se reconstruyen
efectos importando sus enlaces como si fueran un alta. Usar backup/JSON para
estructuras históricas con mayor fidelidad; CSV no es copia completa.

## Aplicación y límites

Espacio privado por grupo, validación final y plan privado; revisión/dataset/
lease/idempotencia. Hasta 1.000 registros resultantes, una transacción. Se cuentan
donaciones, líneas, movimientos, mapas y logs; más grandes exigen copia actual
verificada y dataset separado con activación atómica. Antes de activar se puede
cancelar sin tocar activo. Retirado, staging y recursos previos no se borran solos.

Los seis tipos iniciales CSV ya tienen UI y aceptación en su alcance:
contactos, animales/entradas, solicitudes, movimientos, perfiles voluntarios y
donaciones. Eso no declara completa la fidelidad de JSON, todo el historial,
plataformas físicas, rendimiento máximo ni aceptación comercial.

## Evidencia real

Chrome/Edge **16/16 por motor**, informes
`donation-import-ui-2026-10-18-{chrome,edge}-global-report.json`.
98 fuentes intactas, file:// offline real, perfiles sintéticos y ningún mock.
Fixture por servicios: donante, artículo de precisión 2, donación previa de
700 menores y TXT incorporado. UI: plantilla, dos líneas agrupadas (una con
stock/valor estimado cero), grupo con línea errónea excluido entero, enlace a
donación previa, informe con todas las filas, subconjunto y doble envío únicos,
identidades/repetición, corrección monetaria de 1.230→2.050 conservando origen,
rechazo de corrección material/recreación de ingreso y revisión concurrente.

Se comprueba además informe de errores globales por suma monetaria insegura,
descarga y nueve columnas iguales en todas sus filas, sin guardar ese conjunto.
La revisión detectó una fila global con ocho celdas tras añadir `source_rows`;
se corrigió y se añadió este caso real. Rondas iniciales `...-first.json` tienen
15/15 correctas; no incluían aún ese caso. Se conservan como evidencia histórica.

**Una donación con 501 líneas de stock** por UI: más de 1.000 cambios, bloqueo
sin copia actual verificada, descarga/reselección, cancelación del servicio
durante preparación real (callback explícito, no se atribuye al botón) y después
una activación única. Termina con 4 donaciones, 503 líneas, 502 movimientos de
stock, 3 económicos (uno anulado) y stock escalado 626. Cada una de las 501
líneas nuevas tiene exactamente su movimiento; conjunto anterior con stock 125
y sus bytes queda retirado e intacto.

EN/ES, viewports 360/768/1440, cierres propios y reapertura comparando revisiones,
recuentos, digest y hashes reales de Blob. Cero errores de página/consola o HTTP
de página. **211 Node / 752 estáticas**, nueve pruebas nuevas de donaciones.
No acredita cuota física, plataformas físicas, Firefox actual o uso con datos reales.
