# Servicio de voluntariado (`js/services/volunteers.js`)

Perfiles de voluntariado y horas (requisitos §8.12, §8.13 y §18). El teléfono,
el email y la dirección siguen en el contacto central; el perfil solo añade
datos de voluntariado. No es un sistema de nóminas, fichajes ni RR. HH.
Todas las escrituras usan `context.execute` (lease, revisión, idempotencia y
validación completa). Interfaz pendiente; no se carga aún en `index.html`.

| Método | Entrada y comportamiento |
|---|---|
| `createProfile(input, command)` | `contactId`, `availability`, `functionIds` (catálogo `volunteer_function` activo), `specialties`, `status` (`active`/`inactive`), `notes`. Un perfil por contacto; añade el rol `volunteer` en la misma transacción si faltaba. |
| `updateProfile(id, patch, command)` | Mismos campos salvo `contactId`; un cambio de estado se registra como `state_change`. |
| `logHours(input, command)` | `volunteerProfileId`, `date` (no futura), `activity`, `durationMinutes` (entero 1–1440), `notes`. Se admite para perfiles inactivos: documenta actividad pasada. |
| `editHours(id, patch, command)` | Corrige fecha, actividad, duración o notas de una entrada no eliminada. |
| `trashHours(id)` / `restoreHours(id)` | Borrado lógico reversible; las entradas en papelera no cuentan. |
| `totals(tables, {from, to, volunteerProfileId})` | Suma pura de minutos y entradas válidas, total y por voluntario. No se guarda ningún total en el perfil. |
| `list(tables, {status, functionId, includeArchived})` | Perfiles con su contacto resuelto (sigue fusiones), ordenados por nombre. |

Una fusión de contactos con perfil de voluntariado en ambos lados se rechaza
(`MergeConflictError`); con perfil en uno solo, el perfil pasa al conservado.

Pruebas: `tests/unit/profiles.cjs` (contexto simulado con validador real).
Pendiente: recorrido real IndexedDB de perfiles y horas, relación de horas con
tareas (fase 7), interfaz y exportación CSV/JSON de voluntarios y horas.
