# Configuración, catálogos y copias — 2026-10-18

Versiones: app `0.2.0-dev`, DB `2`, schema `1`, backup `1` (sin cambios).

## Funciones

Configuración conserva el editor de datos de organización e incorpora:

- Preferencias de lista de animales: tabla/tarjetas y 10/25/50/100 por página.
  Se aplican realmente a esa lista; las demás listas mantienen su paginación.
- Datos y pie de impresión guardados como texto, visibles solo en medio print.
  No se ejecuta HTML ni se introduce un pie fijo que tape filas.
- Recordatorios habilitables por días de calendario y operaciones de escritura.
  `backupReminders.evaluate(snapshot,receipts,epoch)` es una consulta pura.
  Solo una copia verificada de este dataset/revisión no futura sirve de ancla;
  generar o solicitar descarga no la sustituye. Se cuenta desde su generación,
  se comparan umbrales inclusivos y el periodo usa la zona de la organización.
  Sin copia verificada se avisa inicialmente. Consulta visible al navegar y
  cada 60 s mientras la aplicación está abierta/visible; no hay tarea externa.
- Alta, reemplazo y retirada de logotipo con decodificación/reducción/hash ya
  existentes. La cabecera muestra bytes validados mediante URL Blob temporal.
  Cambiar de vista revoca URLs. Retirar elimina la referencia y conserva los
  recursos anteriores; no es limpieza permanente.
- Catálogos de los 11 tipos, opciones personalizadas, orden y disponibilidad.
  Código/tipo/etiqueta traducida del sistema son inmutables. Nuevas opciones
  tienen código estable interno y texto personalizado; nunca se renumeran.
- Ubicaciones refugio/sala/zona/otra, superior opcional y notas. Se rechazan
  ciclos y nuevos padres inactivos. Una superior ya usada puede conservarse.
- Listas de mantenimiento paginadas de 20; inactivos por opción explícita.
  No hay borrado de opciones ni ubicaciones. Referencias previas permanecen.

`services/configuration.js`: `createOption`, `updateOption`, `createLocation`,
`updateLocation`. Todos usan `context.execute` con lease/revisión/idempotencia
y actividad en la misma transacción. Parámetros en listas permitidas.
`settings.update` ahora limita campos públicos y registra actividad; los IDs
del logotipo solo cambian mediante su servicio. Cambiar moneda con movimientos
existentes se rechaza por el validador, conservando importes y campos de formulario.
`animals.update` permite conservar especie/tamaño inactivos sin reasignarlos a
otro animal; las altas y nuevas selecciones siguen exigiendo opciones activas.

## Verificación

Ejecutor `tests/e2e/settings-configuration-ui.cjs`. **13/13 por motor**:

- Chrome: `settings-configuration-ui-2026-10-18-chrome-generated-reminder.json`.
- Edge: `settings-configuration-ui-2026-10-18-edge-first.json`.

Preparación explícita con servicios reales: organización, 12 animales e ingreso
EUR. Las operaciones siguientes usan UI real: preferencias/tarjetas/páginas,
opción y ubicación propias, ciclo rechazado sin escrituras, uso por animal,
desactivación conservando edición, moneda rechazada, logo inválido/válido/
reemplazo/retirada/reincorporación y 3 recursos retenidos.
Descarga real de backup, comprobación de recordatorio aún visible, reselección
y verificación del JSON con esos bytes; el aviso se apaga y vuelve exactamente
tras dos escrituras. Textos de impresión y ocultación de navegación comprobados
en emulación print. EN/ES y anchos 360/768/1440 sin desbordamiento global.
Dos cierres propios por motor y reapertura con revisión/recuentos/digest de
todas las tablas y hashes reales de Blob iguales. 78 fuentes cargadas intactas;
sin errores de página/consola ni solicitudes HTTP de la página.

Rondas conservadas: `chrome-first` confundió nombre con ubicación superior;
`chrome-row-selector` confundió enlace de menú con retorno de ficha.
`chrome-nav-selector` pasó 13/13; la ronda posterior amplía expresamente el
intervalo entre descargar y verificar. Ninguna ronda fallida se cuenta como pasada.

Última ronda conjunta: **151 pruebas Node y 652 estáticas correctas**.
Pruebas nuevas: catálogo estable/sistema protegido/idempotencia, referencias
inactivas, padres/ciclos, atomicidad/revisión, ajustes/moneda, retirada de logo
con conservación y recordatorios por dataset/revisión/zona/umbrales.

## Límites

Impresión emulada no equivale a aceptar páginas PDF/papel definitivas. Los
recordatorios no crean una copia automática ni garantizan un archivo en disco.
No hay limpieza automática de archivos retenidos. Falta volumen/cuota real,
accesibilidad integral y plataformas físicas. Solo datos sintéticos.
