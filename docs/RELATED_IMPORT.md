# CSV de voluntariado y solicitudes — 2026-10-18

Versiones `0.2.0-dev` / DB `2` / schema `1` / backup `1`, sin cambios.
Fase 10 parcial: quedan movimientos, donaciones y JSON por módulos.

## Uso

`#imports` añade **Perfiles de voluntariado** y **Solicitudes de adopción**,
con plantillas estables, mapeo, informe por fila/campo, decisiones, subconjunto
expreso y aplicación guardada solo al completar. Comparte parser/lotes con
contactos/animales, sin ejecutar varias escrituras independientes por fila.

Las relaciones aceptan `contact_id` o `contact_external_id`; solicitudes aceptan
también `animal_id`, `animal_code`, `animal_external_id`. Identificadores externos
se resuelven por la fuente elegida y los mapas existentes. Los valores aportados
juntos deben coincidir. Los contactos fusionados resuelven su superviviente;
el destino debe cumplir las reglas del flujo. Los nombres no resuelven relaciones.
Una lista de referencias con búsqueda y páginas de 20 facilita copiar UUID y
códigos activos. No crea personas ni animales implícitos.

Cada registro admite `id` y `external_id`. UUID exacto, identidad recordada,
contacto de un perfil existente o animal/contacto/fecha de solicitud coincidentes
requieren una decisión. Crear / actualizar / vincular / omitir son explícitos.
No se actualiza dos veces el mismo destino ni se reasigna un mapa externo a otro
registro silenciosamente. El archivo repetido se identifica por hash.

### Voluntariado

Campos: `external_id,id,contact_id,contact_external_id,availability,function_ids,
function_codes,specialties,status,notes`. UUID/códigos de funciones separados
por `|`; si se aportan ambos deben indicar las mismas opciones. Códigos de
estado `active` / `inactive`; omitido en alta usa el valor inicial del esquema.
Alta añade rol `volunteer` al contacto en el mismo guardado. Actualizar conserva
campos sin mapear y el contacto fijo. No asigna funciones retiradas nuevas,
pero conserva las ya utilizadas al editar otros campos. Papelera/archivo impiden
edición. No importa horas en este bloque; ya se registran por su UI existente.

### Solicitudes

Campos: `external_id,id,animal_id,animal_code,animal_external_id,contact_id,
contact_external_id,application_date,status,review_date,approval_date,
closure_date,closure_reason,interview_notes,notes`.

Alta exige animal bajo cuidado, contacto activo y fecha. Estado inicial `pending`.
`under_review` requiere `review_date`; `approved` requiere `approval_date`;
`rejected` / `cancelled` requieren `closure_date` y `closure_reason`.
Se pueden documentar revisión y aprobación anteriores al cierre aportando
sus fechas. Cada transición genera su hecho fechado y log sin claves repetidas.
Se valida orden de solicitud/revisión/aprobación/cierre y fechas futuras.
El cierre normal también impide fecha anterior a una aprobación ya registrada.

El usuario elige ISO, DMY o MDY para las fechas con barras; ISO se acepta siempre.
Actualizar permite notas y una transición válida desde el estado actual; UUID,
animal, contacto y fecha de solicitud no se reescriben. Aprobar no reserva ni adopta.
`completed` nuevo o cierre de solicitud con reserva activa requieren el flujo
coordinado existente: el CSV no omite sus decisiones ni reconstruye esos efectos.

## Integridad

`import-workspace.js` prepara cada fila en un espacio privado. Solo incorpora
su conjunto de cambios si todos sus pasos y mapas son válidos. Si falla una
aprobación no queda solicitud pendiente, rol ni evento huérfano en el subconjunto.
Los pasos reutilizan constructores de los servicios de voluntariado/adopciones.
Los cambios al mismo registro dentro del lote se consolidan: un alta termina
en revisión 1 y un registro existente avanza una sola revisión. Así varias
solicitudes del mismo contacto no duplican roles ni producen revisiones ilegales.

El servicio común conserva planes privados, revisión/dataset/lease/idempotencia,
validación completa y confirmaciones de columnas/subconjuntos. Hasta 1.000
registros resultantes: una transacción; por encima, copia actual verificada,
dataset separado y activación atómica. También cuentan roles, eventos, logs y
mapas. El conjunto retirado y los bytes originales permanecen disponibles.
Cancelación cooperativa antes de activar; no borra activo ni staging automáticamente.

## Evidencia

Chrome/Edge **16/16 por motor**: informes
`related-import-ui-2026-10-18-{chrome,edge}-first.json`.
96 fuentes intactas, `file://` offline real, sin mocks ni errores de página/consola
o HTTP de página. Fixture explícita por servicios/contexto: cuatro contactos,
dos animales, dos mapas recordados y un TXT. No se presenta esa preparación
como un formulario completado por el usuario.

UI real: dos perfiles con roles únicos, fallo de referencia sin artefactos,
actualización parcial, repetición/identidades; cuatro solicitudes con estados,
revisión/aprobación/rechazo y ocho eventos, rol de adoptante, fila `completed`
rechazada sin cambios parciales, transición sobre solicitud existente y rechazo
de cambio de fecha. Revisión concurrente conserva datos y formulario.

**334 solicitudes** por UI con más de 1.000 cambios resultantes: bloqueo sin
copia, descarga/reselección/verificación, cancelación de preparación real mediante
callback explícito del servicio (no se atribuye al botón), activación única,
338 solicitudes finales y rol consolidado en una revisión. Conjunto anterior
retirado, bytes y cambio concurrente conservados. EN/ES, anchos emulados
360/768/1440 y dos cierres propios por motor. Reapertura compara revisión,
recuentos, digest y hashes de los bytes reales.

Node: **194 pruebas correctas**, diez nuevas sobre estas importaciones; estática
**742** y diff sin errores. No acredita cuota física, accesibilidad completa,
dispositivos reales o Firefox actual. El producto sigue siendo de desarrollo
y el alcance original permanece pendiente en lo no implementado.
