# Servicios de finanzas, donaciones e inventario

`finance.js`, `inventory.js` y `donations.js` preparan cambios mediante
`services.context.execute`. La validación de dominio y el commit coordinado
se ejecutan antes de confirmar éxito. Las vistas no escriben directamente.
Cargar finanzas e inventario antes de donaciones.

Todas las operaciones de escritura admiten al final `command` con `operationId`
estable para repetir la misma intención sin duplicar efectos y `expectedRevision`
de la vista previa/formulario para detectar cambios desde su apertura. El
resultado es el recibo del contexto, cuyo `result` contiene IDs de entidades.
Una intención distinta con la misma operación se rechaza. Los cambios relacionados
se entregan en un único conjunto; los servicios no abren transacciones anidadas.

## Finanzas

- `finance.create(input, command)`: dirección, fecha ISO, categoría, concepto,
  importe entero `amountMinor`, animal/contacto opcionales y notas. La moneda
  se toma de la organización; una moneda explícita distinta se rechaza.
- `finance.void(id, {reason, date?}, command)`: conserva el movimiento, registra
  estado anulado, fecha y motivo. Si es ingreso de una donación monetaria, anula
  también esa donación. Un anulado no se puede anular de nuevo.
- `finance.correct(id, patch, {reason, date?}, command)`: anula el original,
  crea un sustituto de la misma dirección y enlaza ambos. Reasigna referencias
  de donación, salud, adopción e inventario al sustituto en el mismo commit.
  Una corrección de ingreso de donación actualiza fecha/contacto de esa donación
  para mantener su correspondencia. No se reutiliza una clave de origen única.
- `finance.totals(records, {from?, to?, animalId?})`: cálculo puro inclusivo
  por fechas; devuelve `incomeMinor`, `expenseMinor` y `balanceMinor`. Excluye
  anulados y comprueba sumas seguras con acumulación entera exacta.

Entradas manuales no admiten IDs ni metadatos técnicos inyectados. Categorías
nuevas deben estar activas y corresponder a la dirección. No se cambian signos
ni monedas como preferencia visual. Los archivos y hechos clínicos no se borran
al anular un gasto; sus referencias permiten mostrar su estado real.

`finance.buildMovement(data,h,input,{source,originKey}?)` es una primitiva interna
para servicios que crean un hecho y su gasto/ingreso juntos. Solo prepara y
valida el registro; el servicio llamante lo incluye en su propio conjunto.

## Donaciones

- `donations.createMonetary({date,donorContactId?,categoryId,concept,amountMinor,notes?}, command)`:
  crea una donación y exactamente un ingreso relacionado. Devuelve sus dos IDs.
- `donations.createMaterial({date,donorContactId?,notes?,lines}, command)`: admite
  1–1000 líneas. Cada línea incluye `materialTypeId`, `description`,
  `quantityScaled`, `quantityPrecision`, `unitId`, `inventoryItemId?` y
  `estimatedValueMinor?`. Si hay artículo, crea un único movimiento de stock
  por línea y conserva los enlaces mutuos. Si no lo hay, conserva el detalle
  sin inventar una entrada de almacén. El valor estimado no es ingreso monetario.
- `donations.void(id,{reason,date?},command)`: monetaria anula su ingreso;
  material crea un movimiento compensatorio por cada línea incorporada.
  La fecha debe estar entre la donación original y hoy. Si devolver los bienes
  produciría stock negativo, se rechaza toda la operación y la donación continúa
  registrada. No se borra la donación, sus líneas ni sus movimientos originales.

La corrección monetaria se realiza con `finance.correct` sobre el ingreso
relacionado. No existe una segunda cifra editable independiente en donaciones.

## Inventario

- `inventory.createItem(input,command)`: nombre, categoría, unidad, precisión
  entera 0–3, mínimo escalado, proveedor opcional y notas. Las categorías y
  unidades nuevas deben estar activas. No se guarda un total mutable de stock.
- `inventory.move({itemId,date,type,deltaScaled,reason,contactId?,expenseMovementId?,notes?},command)`:
  saldo inicial/compra suman, consumo resta y ajuste/devolución explicitan signo.
  Las donaciones se crean mediante el servicio de donaciones. El gasto opcional
  debe existir, ser gasto confirmado y acompañar una compra; no crea otro gasto.
- `inventory.compensate(id,{reason,date?},command)`: crea el opuesto exacto como
  ajuste, enlazado al movimiento original. Solo una compensación por movimiento.
  Para líneas de donación se utiliza `donations.void` y se conservan sus relaciones.
- `inventory.archive(id,command)`: archiva el artículo manteniendo movimientos.
  No permite añadir nuevos movimientos ordinarios a un artículo archivado.
- `inventory.stock(tables,itemId)`: cálculo puro exacto desde movimientos;
  devuelve cantidad escalada, precisión, unidad, mínimo y estados `belowMinimum`
  y `atMinimum`, que son distintos.

El dominio comprueba stock acumulado por fecha, instante de creación e ID,
incluidas inserciones históricas; no basta con que el saldo final sea positivo.
No se modifica una cantidad original para corregirla. La compensación física
de existencias y la anulación de su factura son hechos explícitos distintos.

`inventory.buildMovement(data,h,input,sourceFields?)` prepara una línea interna
para casos de uso coordinados. La validación final comprueba correspondencias,
unidades, escalas, origen único y que no haya stock histórico negativo.

## Pruebas y alcance

`node tests/unit/resources.cjs`: 10 pruebas de servicios con contexto simulado
y validador real de todas las tablas. Cubre idempotencia, ingresos únicos,
correcciones/reasignaciones, anulaciones coordinadas, stock por línea, rechazo
atómico por stock insuficiente, negativos históricos, escalas, compensaciones,
archivo, moneda, enteros y datos técnicos inyectados. No simula aprobación de
IndexedDB: commit/rollback, lease, cuota y pestañas requieren las pruebas de
integración reales de los repositorios y del contexto.
