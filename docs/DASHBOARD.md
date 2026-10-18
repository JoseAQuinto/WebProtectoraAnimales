# Panel operativo — 2026-10-18

Versiones persistidas sin cambios (`0.2.0-dev`/DB 2/schema 1/backup 1).
`services/dashboard.js` calcula consultas puras; `modules/dashboard.js` muestra
17 tarjetas, estado de copias y tres gráficos locales con alternativa tabular.

## Criterios

- Bajo cuidado: animales no enviados a papelera con episodio abierto. Refugio,
  acogida, disponibilidad y reserva son subconjuntos solapados, advertidos en UI.
- Mes actual, del primer día hasta hoy en la zona de organización: episodios
  iniciados (incluidas devoluciones), adopciones realizadas y movimientos
  económicos válidos. Archivo/devolución no borra hechos de adopción. Anulados
  no cuentan en ingresos/gastos/balance; donaciones materiales no crean ingreso.
- Citas: tareas veterinarias abiertas entre hoy y siete días después, inclusivos.
  Vacunas y medicación/planes pendientes cuentan todas sus fechas. Tareas
  vencidas/hoy/próximas se derivan de fecha civil, sin completar automáticamente.
  Completadas, canceladas, archivadas y en papelera no generan alertas abiertas.
- Bajo mínimos: artículo activo con suma de movimientos estrictamente inferior
  al mínimo. Igual al mínimo no se cuenta. Cantidades acumuladas usan BigInt y
  no se muestra un saldo fuera de enteros seguros.
- Último recibo generado y última copia verificada se distinguen; el recordatorio
  configurable existente permanece separado y no confirma guardado en disco.

Cada tarjeta abre exactamente sus registros coincidentes (20 por página),
incluyendo listas de episodios/adopciones, sin convertir hechos en un número
de animales diferente. Desde allí se abren fichas de animales y detalles reales
de tarea, finanzas, inventario y adopción. Se reutilizan flujos existentes;
tras guardar se cierra el detalle antiguo y se recalcula el panel.

Gráficos: entradas/adopciones y finanzas de los últimos doce meses hasta hoy,
con cifras exactas en tablas; especies actuales bajo cuidado, primeros seis
grupos numerados y tabla completa. Sin animación, recursos remotos ni imágenes
de documentos/fotografías. La captura de repositorios todavía contiene todos
los registros y referencias Blob: esta UI no resuelve la limitación O(N).

## Aceptación

Chrome y Edge **10/10 por motor**, `dashboard-ui-2026-10-18-{chrome,edge}-first.json`.
Fixture real sintética: devolución, acogida, reserva, adopción archivada,
ubicación externa, cita a siete/ocho días, vacuna/medicación/tarea vencida,
donación, gasto veterinario, ingreso anulado, stock bajo/igual mínimo y TXT.
Se verifican los 17 valores y sus 17 listas exactas, todos los orígenes y cierre
al navegar, completar una tarea desde su alerta con una única revisión/efecto,
distinción de descarga solicitada, tres gráficos sin NaN, EN/ES y 360/768/1440.
Dos cierres completos por motor y reapertura conservan revisión/recuentos/digest
de todas las tablas y hashes reales de Blob. 90 fuentes cargadas intactas;
cero errores de página/consola y cero HTTP de la página.

175 pruebas Node y 712 estáticas correctas. Cuatro pruebas nuevas cubren
censo por episodio/solapamientos, hechos devueltos/archivados, límites temporales
de tareas, dinero/anulados, mínimos estrictos, gráficos, pureza y saldos inseguros.
No acredita cuota real agotada, volumen máximo ni dispositivos físicos.
