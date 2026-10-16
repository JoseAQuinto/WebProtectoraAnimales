# Servicio de contactos (`js/services/contacts.js`)

Agenda central de personas y organizaciones (requisitos §8.6, §17 y §30).
Todas las escrituras usan `context.execute`: lease, revisión global,
idempotencia por `operationId` y validación completa del conjunto antes de
confirmar. La interfaz todavía no está conectada; el servicio no se carga en
`index.html` hasta que exista su pantalla.

## Escrituras

- `create(input, {confirmDuplicates}, command)`: campos `type`, `name`,
  `phones` (`[{label, original}]`), `email`, `address`, `roles`, `notes`.
  El dominio guarda el original y calcula `emailNormalized` y
  `phones[].normalized`. Un teléfono que no puede normalizarse se rechaza con
  `InvalidInputError` antes de escribir. Si existe otro contacto con el mismo
  email o teléfono normalizado, falla con `PossibleDuplicateError` salvo
  `confirmDuplicates:true`. Un nombre igual solo es advertencia.
- `update(id, patch, {confirmDuplicates}, command)`: mismos campos y la misma
  comprobación cuando cambian email o teléfonos. No edita contactos en la
  papelera ni fusionados.
- `archive(id)` / `unarchive(id)`: retira o devuelve a los listados operativos
  conservando todas sus relaciones.
- `trash(id)` / `restore(id)`: borrado lógico solo si `references()` está vacío;
  con relaciones se indica archivar. No hay eliminación permanente todavía.
- `merge({keepId, mergeId, resolution, confirmed}, command)`, atómica:
  1. Exige `confirmed:true` (`ConfirmationRequiredError`) y dos contactos
     distintos, disponibles y no fusionados.
  2. Cada campo distinto entre `type`, `name`, `email`, `address` y `notes`
     requiere `resolution[campo]` = `keep` | `merge` (`notes` admite `combine`).
     Teléfonos y roles se unen sin duplicados.
  3. Si ambos tienen perfil de acogida o ambos de voluntariado, falla con
     `MergeConflictError`: hay que dejar uno antes de fusionar.
  4. Reasigna al contacto conservado las relaciones operativas encontradas a
     partir de los esquemas: perfiles, solicitudes y adopciones, registros y
     planes sanitarios, tareas, proveedores, fusiones anteriores, vínculos de
     documentos (sin duplicar un vínculo ya existente) e identidades de
     importación.
  5. Conserva como historia `financialMovements`, `donations` e
     `inventoryMovements`: sus contactos son parte del hecho registrado y los
     movimientos son inmutables. Siguen apuntando al contacto fusionado, que
     permanece con `mergedIntoContactId`.
  6. Registra `activityLog` `merge` con `previousId` y número de reasignaciones.

## Consultas puras (sin escritura)

- `findDuplicates(tables, candidate, {excludeId})`: coincidencias por email
  normalizado, teléfono normalizado y nombre normalizado sin acentos ni
  mayúsculas. `strength` es `possible` (email/teléfono) o `name_only`.
- `references(tables, id)`: todas las filas que nombran al contacto, obtenidas
  de los campos `ref` de los esquemas más vínculos de documentos e identidades.
- `resolve(tables, id)`: sigue `mergedIntoContactId` hasta el contacto vigente;
  informes y vistas deben usarlo para atribuir hechos históricos.
- `list(tables, {search, role, includeArchived, trash})`: excluye fusionados;
  busca por nombre sin acentos, email y dígitos de teléfono; orden por nombre.

## Pruebas

- `tests/unit/contacts.cjs`: normalización, duplicados, teléfonos inválidos,
  idempotencia, archivo/papelera, búsqueda, fusión completa con relaciones
  creadas por servicios reales y conflicto de perfiles (contexto simulado y
  validador real).
- `tests/integration/lifecycle.html`: duplicado bloqueado, fusión sin
  confirmar rechazada sin cambios, fusión real en IndexedDB con 5
  reasignaciones, historia económica intacta, reintento idempotente y backup
  verificado posterior.

Pendiente: interfaz de agenda y comparación, perfiles de acogida/voluntariado
como servicio propio, eliminación permanente con análisis de dependencias.
