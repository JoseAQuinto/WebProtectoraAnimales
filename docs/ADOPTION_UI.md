# Interfaz del proceso de adopción

La sección Adopción de la ficha animal utiliza los servicios existentes de
`adoptions.js`. No consulta ni escribe IndexedDB directamente. La interfaz
no sustituye las validaciones del servicio ni las comprobaciones del commit.

## Integración

Orden de scripts clásicos, después de servicios y `components/ui.js`:

1. `modules/adoption-forms.js`.
2. `modules/adoption-workflow.js`.
3. `modules/animals.js`.

La ficha llama `root.modules.adoptionWorkflow.render(ctx, animal)` y recibe
un nodo. Contexto: `snapshot`, `refresh()`, `notify(text)`, `canWrite` (booleano
o función) y `documents({entityType,entityId})`. Los nombres de contactos se
resuelven mediante `contacts.resolve`; abrirlos utiliza `people.openContact`.
No se muestran UUID como etiquetas.

Los fragmentos temporales `locales/adoption-workflow.en.js` y `.es.js` deben
fusionarse en los dos diccionarios principales y retirarse antes del commit.
Son objetos de integración; no son dependencias del navegador.

## Recorrido disponible

- Solicitudes del animal con filtro de estado y páginas de diez registros;
  entrevista, aprobación, notas y motivo de cierre consultables.
- Alta seleccionando un contacto existente activo de la agenda. Las opciones
  incluyen tipo, email/teléfono y roles para distinguir nombres similares.
  El servicio añade el rol de adoptante en la misma operación.
- Entrevistar/revisar una solicitud pendiente o en revisión. Aprobarla no
  reserva ni adopta. Un contacto archivado/en papelera impide las acciones
  que necesitan un contacto activo; la ficha permite abrirlo para restaurar.
- Rechazar/cancelar con fecha y motivo. Si tiene una reserva activa, presenta
  también motivo del cierre y disponibilidad posterior explícita; ambos
  cierres pertenecen a la misma operación.
- Reserva sobre solicitud aprobada y sin reserva activa previa. Vencimiento
  opcional e inclusivo, confirmado junto con su cambio a reservado. No hay
  proceso automático de caducidad.
- Cancelar la reserva o registrar caducidad desde el día siguiente al
  vencimiento, con fecha, motivo y disponibilidad posterior explícitos.
  Cerrar reserva conserva la solicitud aprobada; no la completa.
- Formalizar sobre solicitud aprobada y contacto activo; si hay reserva de
  otra solicitud, primero hay que cerrarla. La revisión previa exige motivos
  para acogida, reserva y otras solicitudes abiertas según existan. Enumera
  los nombres de las otras solicitudes y **cada** tarea pendiente/en curso:
  conservar o cancelar con motivo individual, sin selección predeterminada.
- Ingreso opcional al formalizar: categoría activa, concepto, importe textual
  y separador decimal elegido. `money.parse` convierte a enteros seguros según
  moneda (0/2/3 decimales), sin coma flotante ni miles. Sin marcar cuota no se
  crea movimiento. Su relación y commit son los del servicio de adopción.
- Devolución desde una adopción vigente cuando el animal está adoptado. Exige
  fecha, motivo, destino protectora/externo y disponibilidad explícitos. Crea
  episodio nuevo conservando adopción, episodio anterior y cierres históricos.
- Reservas y adopciones anteriores siempre consultables; movimiento de cuota
  y su estado real visibles. Documentos vinculados a cada adopción se cargan
  al abrir su panel y usan el módulo de documentos existente.

Los formularios capturan la revisión al abrirse. `ui.form` mantiene el mismo
identificador de operación al reintentar sin cambios, desactiva guardado mientras
espera, conserva campos en error y solicita confirmar el descarte de cambios.
La confirmación de éxito sucede después de resolver el servicio transaccional.
Una revisión obsoleta produce conflicto y requiere cerrar/reabrir tras revisar
el estado; no se actualiza la revisión silenciosamente. Los botones de mutación
respetan lectura; el guardado conserva además la protección del servicio.

## Verificación y límites

Comprobadas sintaxis de ambos módulos, paridad de claves de los fragmentos
EN/ES y restricciones estáticas. La aceptación real de los nuevos formularios
en `file://` se coordina en la ronda de UI; no se deduce de estas comprobaciones
estáticas ni de pruebas de servicio anteriores. Consultar los informes nuevos
de `tests/results` y el estado general antes de declarar un motor aprobado.

Continúan pendientes una vista global de solicitudes/adopciones de todos los
animales, correcciones históricas, exportación/importación y creación de tareas
de seguimiento desde este panel (las tareas existentes sí se revisan al adoptar).
Las notas originales de la solicitud se conservan; el servicio actual ofrece
edición de entrevista, sin editor general de notas o correcciones. Las listas
de solicitudes paginan en memoria; reservas y adopciones históricas del animal
se muestran completas. El núcleo todavía captura el dataset completo O(N).
No se declara terminada la fase ni el producto comercial.
