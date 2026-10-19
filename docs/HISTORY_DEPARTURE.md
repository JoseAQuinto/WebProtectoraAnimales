# Fechas de traslado, salida y fallecimiento — 2026-10-19

Amplía los cuatro documentos HISTORY_* anteriores. Versiones sin cambios:
app 0.2.0-dev / DB 2 / schema 1 / backup 1. Corrige calendario, no revierte estados.

## Origen y revisión

- Otra salida: actualiza exitDate de su episodio histórico, sin cambiar situación
  actual, ubicación ni una reentrada posterior. No puede cruzar esa reentrada.
- Fallecimiento: actualiza deceasedOn y la salida del episodio cerrado por ese
  fallecimiento, si existe. Un fallecimiento posterior a adopción no crea episodio
  operativo ni cambia adopción/cuota. El animal sigue marcado fallecido.
- Traslado de ubicación: corrige fecha del evento, sin volver a trasladar al animal
  ni sustituir su ubicación actual. Solo ofrece cierres de acogida enlazados a
  la misma operación original; no modifica los de otros traslados.

Un evento transfer con fuente animal puede representar traslado o salida. Se
resuelve mediante su actividad original, recorriendo correcciones, no por una
coincidencia de fechas. Una fuente ambigua, episodio no inequívoco, actividad
ausente o datos archivados/en papelera no se corrigen por inferencia. Muerte exige
fecha/estado actuales coherentes y un único evento vigente. Sus límites incluyen
nacimiento, episodios y adopciones; traslado respeta episodio y hechos vecinos.

Se revisa cada cierre relacionado con conservar/mover explícito, sin valores por
defecto. Las acogidas pertenecen al episodio; reservas canceladas y solicitudes
cerradas se enlazan por su operación original. Las tareas canceladas el mismo día
son candidatas, no una atribución de causa; se puede conservar una independiente.
Las fechas seleccionadas respetan inicio/aprobación y salida corregida.

Las solicitudes automáticas tienen eventos de cierre desde HISTORY_WORKFLOW.md.
Ahora se incluyen también en las revisiones de formalización de adopción. Mover
su fecha crea sustituto del evento, conservando registro/estado/motivo actuales.
No se sobrescribe un evento original mediante un supuesto campo de perfil.

## Implementación

history-departure.js inspecciona el origen y enumera dependencias. La API común es
historyCorrections.correctDeparture({eventId,date,reason,confirmed:true,
relatedDecisions:[{key,action}]},command). Reutiliza el coordinador de decisiones
de history-adoption y el motor history-events para versiones originales/hijas.

El motor encuentra la raíz de una cadena y sus cierres automáticos declarados
por un operationId UUID. Los metadatos anteriores/fechas/instantes permanecen.
Todas las filas fuente, sustitutos y actividad se confirman en una transacción,
con validación global, lease/dataset/revisión/idempotencia. Una revisión antigua
no elimina campos ni trabajo concurrente. El evento nuevo no ejecuta otra salida,
fallecimiento, cancelación, entrada, factura ni tarea.

## Evidencia

`history-departure-ui-2026-10-19-{chrome,edge}-first.json`: **18/18 por motor**,
115 fuentes intactas, file:// offline y perfiles propios. Fixture sintético por
servicios reales de cuatro animales: muerte con acogida/reserva/solicitud/tarea,
otra salida/reentrada, dos traslados y muerte después de adopción/cuota.

Verifica cinco decisiones independientes sin valores implícitos, cierre mantenido
incompatible, rollback real inyectado después de encolar tres sustitutos hijos y
antes del principal, muerte/episodio coordinados y tarea independiente conservada,
replay único, salida sin cambiar cuidado/reentrada, límite de entrada posterior,
traslado que conserva destino actual, muerte posterior sin otro episodio/cuota y
formalización que también corrige su solicitud competidora con evento propio.

Formulario antiguo de traslado conserva fecha/contacto concurrente. EN/ES y anchos
360/768/1440 sin desbordar; captura ES estrecha inspeccionada. Copia completa
descargada/reseleccionada/verificada/restaurada y dos cierres/reapertura por motor:
digest/revisiones/cadenas y hashes reales de TXT conservados. Sin errores ni HTTP
de página. Fallo transaccional inyectado no equivale a fallo físico de disco.

Seis pruebas Node nuevas de salida/muerte/traslado, más otra de solicitud automática
en corrección de adopción. **271 Node / 837 estáticas**. El contexto Node simulado
se distingue de los recorridos IndexedDB reales. No acredita cuota/dispositivo físico.

## Límites vigentes

No es edición libre de tipos, motivos originales, contenido ni reversión de estados.
Las fuentes históricas ambiguas/mal enlazadas conservan sus datos y necesitan
revisión expresa; no se inventan fechas o causalidades. Falta revisar la coherencia
de la fecha documental con sus eventos al editar metadatos; la fecha de registro
de un vínculo no se debe confundir con la fecha del documento. No presentar estos
bloques como aceptación integral del historial o del producto.

Siguiente: retención/limpieza controlada y recursos sin uso, rendimiento y binarios
diferidos, impresión final, accesibilidad/plataformas y revisión comercial.
