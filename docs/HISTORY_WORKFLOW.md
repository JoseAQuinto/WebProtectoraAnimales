# Corregir fechas de solicitudes y reservas — 2026-10-19

Complementa HISTORY_CORRECTIONS.md, HISTORY_LINKED_FACTS.md y HISTORY_ADOPTION.md.
Versiones sin cambios: app 0.2.0-dev / DB 2 / schema 1 / backup 1.

## Alcance y límites

- Solicitud pendiente: fecha de alta actualiza applicationDate y evento.
- Aprobación: actualiza approvalDate y evento sin alterar estado actual,
  reservas, adopción, entrevista ni motivo de cierre.
- Revisión/rechazo/cancelación: su fecha histórica vive en el evento; crea
  sustituto sin modificar campos actuales del registro de solicitud.
- Reserva inicial: actualiza reservationDate, conservando estado, vencimiento,
  cierre y disponibilidad. Está entre aprobación y vencimiento/cierre.
- Reserva cerrada: actualiza closedOn y evento sin reabrirla. Un cierre expired
  debe ser posterior al vencimiento inclusivo; fulfilled no supera la adopción.

La secuencia de solicitud se ordena por el registro original de cada transición,
recorriendo sus cadenas. La hora de una corrección posterior no reordena el
proceso anterior. La fecha corregida respeta transiciones vecinas y relaciones.
Nacimiento/muerte/hoy, aprobación, reservas y adopción limitan según la fuente.
No adivina estados ni ejecuta de nuevo acciones por cambiar una fecha.

Fuentes/estados ambiguos o sin correspondencia no ofrecen corrección. Una
solicitud cerrada antigua que carezca de evento propio de cierre no se refecha
inventando su fecha: se conserva y necesita una revisión de historia más amplia.
Los hechos archivados/en papelera requieren restauración como en otros bloques.

## Corrección de la omisión de cierres automáticos

Se detectó que closeApplications cancelaba otras solicitudes al adoptar o salir,
pero no registraba su transición fechada. Ahora recibe la fecha explícita del
hecho y genera un único evento application/cancelled por solicitud, con motivo,
fuente y clave idempotente, dentro de la misma transacción del cierre.
La fecha de cierre no puede preceder la solicitud o su aprobación. Reintentar
la adopción no duplica esos eventos. No se rellenan retrospectivamente fechas
de cierres ya guardados sin evidencia suficiente.

## Persistencia

history-workflow.js calcula origen/orden/límites. La API común es
historyCorrections.correctWorkflow({eventId,date,reason,confirmed:true},command).
Reutiliza history-events para sustitutos, el validador de conjunto y el commit
protegido por dataset/lease/revisión/idempotencia. Los otros nombres de operación
se conservan para que sigan funcionando los reintentos de bloques anteriores.

## Evidencia

`history-workflow-ui-2026-10-19-{chrome,edge}-first.json`: **18/18 por motor**,
114 fuentes intactas, file:// offline, perfiles sintéticos propios. Recorrido
real de solicitud revisada/aprobada/rechazada, reserva caducada, otra solicitud
adoptada con cuota y reserva cumplida, competidora cancelada automáticamente,
devolución y TXT incorporado.

Comprueba alta/revisión/aprobación corregidas, fuente y estado actual separados,
orden después de corregir una revisión, caducidad inclusiva, cumplimiento antes
de adopción, rechazo con motivo original conservado y cierre automático con su
propia fecha/evento. Una edición antigua conserva campos/trabajo concurrente.
AbortError se inyecta al añadir sustituto en una transacción IndexedDB real y
el snapshot de aprobación/evento queda intacto; no es fallo físico del disco.

UI EN/ES y 360/768/1440 sin desbordar (captura ES inspeccionada), copia completa
descargada/reseleccionada/verificada/restaurada y dos cierres/reapertura por motor:
digest/revisiones/códigos de transición/cadenas y hashes reales de TXT iguales.
Sin errores ni HTTP de página. No acredita dispositivos físicos o cuota real.

Ocho pruebas Node cubren fechas de origen y de evento, orden estable, reserva,
aprobación, rechazo, caducidad/cumplimiento, replay/revisión y cierre automático
único; un fixture simula la ausencia histórica de su evento y no permite inventarlo.
Verificación conjunta: **264 Node / 832 estáticas**. Las pruebas Node de contexto
simulado se distinguen de la persistencia de navegador.

Traslados/salidas/fallecimiento se ampliaron después en HISTORY_DEPARTURE.md.
Pendiente reversión de estados
y corrección de contenido no son edición de fecha. Limpieza/retención, volumen,
impresión, accesibilidad/plataformas y aceptación comercial siguen pendientes.
