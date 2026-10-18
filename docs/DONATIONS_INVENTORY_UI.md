# Interfaz de donaciones e inventario

`modules.donations.render(ctx)` devuelve un array para la ruta `#donations` y
`modules.inventory.render(ctx)` para `#inventory`. Usan snapshot/revisión,
refresh/notify y canWrite del contexto habitual. Se cargan después de UI y de
los servicios de finanzas/inventario/donaciones/contactos, y antes de bootstrap.
Traducciones `dn.*` y `iv.*` centralizadas en ambos diccionarios, con paridad
verificada por `core.cjs`.

## Donaciones

- Lista de 20 donaciones por página, búsqueda con retraso de 180 ms, filtros de
  tipo, estado y fechas inclusivas. Columnas: fecha, tipo, donante, descripción,
  importe o valor estimado, estado y acciones.
- Alta económica: fecha civil no futura, donante existente opcional, categoría de
  ingreso activa, concepto, importe positivo con separador decimal explícito y
  notas. `donations.createMonetary` crea la donación y exactamente un ingreso en
  el mismo guardado; no hay segunda cifra editable.
- Alta material: fecha, donante opcional, notas y de 1 a 1000 líneas. Cada línea
  tiene tipo de material, descripción, cantidad con precisión 0–3, unidad,
  artículo de inventario opcional y valor estimado opcional. Seleccionar un
  artículo incorpora la línea con un único movimiento de existencias; el valor
  estimado se conserva separado y nunca se suma a ingresos.
- Anulación con fecha, motivo y confirmación. `donations.void` anula una
  económica junto a su ingreso o compensa cada línea material incorporada; se
  conservan donación, líneas y movimientos originales.
- La ficha muestra tipo/estado, fecha, donante (enlace al contacto), notas y
  motivo; para económicas el ingreso vinculado, y para materiales la tabla de
  líneas con artículo y valor estimado. No repite operaciones de otros módulos.

## Inventario

- Lista de 20 artículos por página, búsqueda con retraso, filtros de estado y
  categoría. Columnas: nombre, categoría, existencias + unidad, mínimo, estado
  y nivel (bajo mínimos / en el mínimo / sobre el mínimo). Las existencias
  derivan de `inventory.stock`; no hay un total mutable guardado.
- Alta de artículo: nombre, categoría y unidad activas, precisión 0–3, mínimo
  escalado con separador decimal y notas; proveedor opcional.
- Movimiento: tipo (saldo inicial, compra, consumo, devolución o ajuste), fecha,
  cantidad positiva, dirección explícita para devolución/ajuste, motivo, contacto
  opcional, gasto opcional solo en compra (debe existir y estar contabilizado) y
  notas. Compra/saldo inicial suman, consumo resta; `inventory.move` no admite
  tipo donación (se crea desde Donaciones) ni stock negativo histórico.
- Compensación con fecha, motivo y confirmación: `inventory.compensate` crea el
  ajuste opuesto enlazado. Archivo con confirmación: `inventory.archive` conserva
  movimientos e impide nuevos movimientos ordinarios al artículo.
- La ficha muestra resumen de existencias, campos, proveedor (enlace al contacto)
  y la tabla de movimientos con fuente de donación y compensación visible.

## Verificación y aceptación pendiente

Sintaxis, paridad EN/ES y 117 subpruebas Node (incluidas las 10 de
`resources.cjs`) correctas. **No se han ejecutado navegadores**: la aceptación
real por `file://` queda pendiente:

1. Alta económica con un único ingreso; alta material con varias líneas, con y
   sin artículo, y valor estimado sin sumar a ingresos.
2. Rechazos sin escrituras: importe/cantidad cero o mal formada, categoría o
   unidad inactiva, fecha futura, línea sin tipo/descripción/cantidad.
3. Anulación de económica (anula ingreso) y de material (compensación por línea
   incorporada, sin stock negativo). Corrección monetaria mediante Finanzas.
4. Inventario: saldo inicial/compra suman, consumo resta, devolución/ajuste
   exigen dirección, gasto solo en compra, compensación única y archivo.
5. Doble pulsación, revisión antigua y campos conservados; persistencia y
   backup/restauración de donaciones, líneas, artículos y movimientos.
6. Teclado/foco, EN/ES, ampliación y anchos de pantalla. No equiparar un viewport
   con un dispositivo físico ni esta comprobación con aceptación comercial.
