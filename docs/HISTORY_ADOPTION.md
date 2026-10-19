# Corregir fecha de formalización — 2026-10-19

Amplía los bloques HISTORY_CORRECTIONS.md y HISTORY_LINKED_FACTS.md. Versiones
sin cambios: app 0.2.0-dev / DB 2 / schema 1 / backup 1.

## Revisión y efectos

Desde el evento vigente de adopción, la revisión cambia obligatoriamente fecha
de la adopción y salida de su episodio. No altera animal actual, solicitud,
adoptante, devolución posterior, cuota, documentos ni motivos originales.
La fecha está limitada por entrada/aprobación/nacimiento y devolución/muerte/hoy.

La revisión enumera individualmente:

- Acogidas cerradas del mismo episodio, con familia y fecha de cierre.
- Reservas completadas de la misma solicitud, con fecha de cierre.
- Tareas del animal canceladas el día de la adopción anterior. Son **candidatas
  por coincidencia de fecha**, no una atribución automática de causa. El aviso
  explica esta diferencia; una cancelación independiente puede conservarse.

Cada elemento exige elegir **conservar fecha** o **usar fecha nueva**, sin
selección por defecto. Un cierre conservado debe caber en el episodio corregido;
uno desplazado no puede quedar antes de su inicio. No se desplazan otras fechas
por inferencia. Los estados/motivos de cierre y tareas mantenidas no cambian.
Un cierre sin evento vigente inequívoco o archivado/en papelera solo puede
conservar su fecha en esta revisión. El desplazamiento se rechaza también por API.

Si existe cuota, otro consentimiento exige conservar expresamente su fecha e
importe. Se muestra la fecha económica real. No crea, devuelve, anula ni corrige
dinero; esa operación corresponde al flujo de Finanzas.

## Integridad

`history-adoption.js` revisa snapshot y decisiones completas/únicas por UUID.
Expone inspect/correct; `historyCorrections.correctAdoption` es la entrada común.
Fecha/motivo/confirmación siguen las reglas anteriores; relatedDecisions lista
exactamente las claves de revisión con acción keep/move. Una revisión antigua
o incompleta no escribe y el formulario conserva sus campos y decisiones.

`history-events.js` centraliza la sustitución recíproca de eventos, compartida
por los tres bloques. Conserva fecha/instante/fuente/parámetros anteriores.
Si se mueven cierres de acogida/reserva, sus eventos también tienen sustitutos.
Para tareas canceladas, la actividad enlaza tarea y eventos anterior/nuevo de
adopción; el evento anterior conserva su fecha de cancelación original, igual
por definición a la fecha que hizo candidata esa tarea. Se registra actividad
principal con número de fechas desplazadas, sin copiar datos personales.

Adopción, episodio, cierres elegidos, tareas, versiones y actividad se confirman
en una única transacción con validación global, lease, dataset, revisión e
idempotencia. Una fecha posterior puede conservar explícitamente cierres
anteriores. Una segunda corrección no descarta la cadena ni repite cuota/retorno.

## Evidencia

`history-adoption-ui-2026-10-19-{chrome,edge}-optional-notes.json`: **17/17 por
motor**, 113 fuentes intactas por file:// offline y dos cierres/reapertura por
motor. Datos sintéticos por servicios reales, sin mocks de negocio.

Comprueba cuatro decisiones sin valores implícitos, cuota obligatoria, cierre
conservado incompatible, API incompleta, formulario antiguo/contacto concurrente,
rollback real con dos sustitutos hijos ya encolados y fallo inyectado antes del
sustituto principal. Al confirmar, coordina tres fechas elegidas, conserva una
tarea independiente del mismo día, no duplica ingreso ni altera devolución.
Repite el intento y después corrige otra vez conservando cierres anteriores;
verifica también una corrección clínica tras extraer el motor de eventos común.

EN/ES, tres anchos, revisión estrecha sin desbordamiento, copia descargada/
reseleccionada/verificada/restaurada, cadenas/revisiones/digest y hashes reales
de TXT al reabrir. Sin errores ni HTTP de página. No acredita dispositivo físico.
La captura ES estrecha inicial detectó una nota opcional renderizada como texto
null; se filtran nodos ausentes y las rondas finales comprueban su ausencia.

Intentos previos conservados: idioma inicial del fixture no fijado, listener de
confirmación pendiente tras cerrar un formulario limpio, y desbordamiento real
del selector a 360 px. El listener ahora se instala solo si el formulario está
modificado; las dos rondas interrumpidas por Node no se cuentan como aceptación.
La inspección posterior de perfiles propios no encontró raíces activas. El
lanzador permite limpiar un prefijo explícito de perfiles de QA, verificando las
identidades; nunca se usa para cerrar navegadores del usuario.

La ronda controls-width pasó negocio y persistencia, pero motivó el ajuste de
nota opcional tras revisión visual. No se reasignan sus hashes a fuentes nuevas.
Las opciones de fecha usan texto corto y controles acotados dentro del diálogo.

Siete pruebas Node adicionales: decisiones, motivos, factura, cadenas/replay,
devolución, límites, tareas independientes y cierre sin evento. **256 Node /
827 estáticas**. UI no accede a IndexedDB; el contexto Node es simulado y la
aceptación de persistencia corresponde a los recorridos reales anteriores.

## Pendientes

Solicitudes/reservas se ampliaron después en HISTORY_WORKFLOW.md. Traslados,
salidas y fallecimiento aún necesitan comandos propios coordinados. No existe editor libre de tipos,
contenido o reversión de estados históricos. Volumen de revisiones numerosas,
cuota física, limpieza, impresión/accesibilidad y aceptación comercial siguen
pendientes; las decisiones del formulario actual se muestran en una lista sin
paginación y todavía no acreditan rendimiento con miles de dependencias.
