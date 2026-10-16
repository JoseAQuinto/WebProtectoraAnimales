# Servicios de ciclo de animales, acogidas y adopciones

Implementación de casos de uso sobre `services.context.execute`. Cargar
`animals.js`, `fosters.js`, `adoptions.js` después de contexto, dominio y
persistencia. Estos servicios preparan cambios; el contexto/repositorio valida
la instantánea final y espera el commit transaccional. No tienen UI ni acceden
directamente a IndexedDB. `services.lifecycle` contiene los auxiliares comunes
de estos tres archivos y no es una API de presentación.

Cada función devuelve la promesa del contexto: `{operationId, revision,
activeRevision, duplicate, result}`. `result` contiene los UUID afectados.
El segundo argumento `command` admite `operationId` y `expectedRevision`
global del formulario. La UI debe conservar ambos mientras reintenta la misma
acción; crear un nuevo operationId en cada pulsación no acredita idempotencia.
Un reintento confirmado devuelve el resultado anterior; cambiar la intención
con el mismo identificador genera conflicto. Ediciones deben enviar la revisión
de su vista previa. Cada fila actualizada incrementa su revisión, y el
repositorio la vuelve a comprobar junto con el conjunto y arrendamiento.

Fechas de hechos son `YYYY-MM-DD`, no futuras según la organización.
Los servicios normales no corrigen historias incompatibles; las rechazan.
Los intervalos de episodio y acogida son `[inicio, fin)`. No existe un proceso
de fondo que finalice acogidas, adopciones, reservas o tareas por alcanzar fechas.

## Animales

```js
await RescueManager.services.animals.registerEntry({
  animal: {name: 'Animal ficticio', speciesId, sizeId},
  date: '2026-10-15', entryReason: 'Rescate', originDescription: '',
  location: {kind: 'shelter', id: locationId}, availability: 'available'
}, {operationId, expectedRevision});
```

| Método | Entrada y comportamiento |
|---|---|
| `registerEntry(input, command)` | Nuevo: `animal` con datos de perfil. Existente: `animalId`, sin `animal`; solo tras otra salida. Comunes: `date`, `entryReason`, `location`, `availability`; opcionales `originDescription`, `notes`. Crea episodio e historial, fija cuidado/ubicación/disponibilidad. Un animal adoptado vuelve por `returnAdoption`; uno fallecido requiere corrección explícita. |
| `update(input, command)` | `animalId`, `patch` de campos de perfil. No cambia situación, ubicación, disponibilidad ni código asignado. Valida opciones nuevas activas. |
| `changeLocation(input, command)` | `animalId`, `date`, `reason`, `location`; `fosterEndReason` si hay acogida abierta. Cierra acogida y cambia ubicación en la misma unidad, conservando disponibilidad. |
| `setAvailability(input, command)` | `animalId`, `availability` available/unavailable. Exige cerrar primero una reserva activa. No genera una reserva. |
| `recordDeath(input, command)` | `animalId`, `date`, `reason`; decisiones de tareas y motivos de cierre cuando existan relaciones abiertas. Cierra episodio/acogida/reserva/solicitudes y conserva historia. Puede registrar muerte posterior a adopción sin inventar otro episodio. |
| `recordExit(input, command)` | `animalId`, `date`, `reason`, `exitReason` transfer/other; mismas decisiones explícitas que fallecimiento. Exige animal bajo cuidado. |

Destino `location`: `{kind:'shelter',id}` activo o
`{kind:'temporary_external',description}`. Una acogida se asigna por su servicio.
Entrada/devolución exigen elegir `availability:'available'|'unavailable'`.
No hay una inferencia de disponibilidad a partir de la ubicación.

Perfiles admiten `code`, `name`, `speciesId`, `breed`, `sex`, `birthDate`,
`birthPrecision`, `estimatedAgeMonths`, `estimatedAgeReferenceDate`, `sizeId`,
`color`, `microchipOriginal`, `sterilizationStatus`, `sterilizationDate`,
`photoAssetId`, `thumbnailAssetId`, `description`, `character`, `behavior`,
`specialNeeds`, `notes`. La actualización no altera el código existente.

Sin código explícito se llama a `h.allocateAnimalCode()`: el contexto conserva
un contador transaccional y deriva mínimos de animales/historial. La creación
registra el código en `activityLog.summaryParameters.code`; restauraciones y
eliminaciones deben conservar esta historia necesaria para no reutilizarlo.
Un código explícito que ya figure en animales o actividad se rechaza también.
Un código manual no puede tener la forma `A-<número>` (sin distinguir mayúsculas):
esa forma pertenece a la secuencia y no puede colisionar ni agotarla.

## Acogidas

| Método | Entrada y comportamiento |
|---|---|
| `fosters.assign(input, command)` | `animalId`, `fosterProfileId`, `startDate`, `notes?`. Comprueba episodio, ninguna otra acogida abierta, rol de contacto, disponibilidad, capacidad y especies/tamaños. Ante excepción requiere `confirmException:true` y `exceptionReason` persistido. Conserva disponibilidad de adopción. |
| `fosters.end(input, command)` | `fosterStayId`, `endDate`, `endReason`, `location`. Cierra estancia y fija el destino, conservando disponibilidad y reserva si existe. |

No se permite superar la prohibición de dos acogidas abiertas, ni siquiera
mediante una excepción. La ocupación deriva de estancias abiertas.

## Solicitudes, reservas y adopciones

| Método | Entrada y comportamiento |
|---|---|
| `adoptions.createApplication(input, command)` | `animalId`, `contactId`, `applicationDate`, `interviewNotes?`, `notes?`. Crea pendiente; une rol adopter al contacto existente cuando falta. |
| `adoptions.review(input, command)` | `applicationId`, `interviewNotes?`. Pending/under_review → under_review. |
| `adoptions.approve(input, command)` | `applicationId`, `approvalDate`. Pending/under_review → approved. No crea reserva ni adopción. |
| `adoptions.reject/cancel(input, command)` | `applicationId`, `date`, `reason`. Si su reserva sigue activa, exige `reservationClosureReason` y `availability` posterior; cierra ambas relaciones juntas. Conserva aprobación histórica. |
| `adoptions.reserve(input, command)` | `applicationId`, `reservationDate`, `expiresOn?`. Exige solicitud aprobada y ningún animal reservado por otra acción; crea reserva y cambia disponibilidad. |
| `adoptions.closeReservation(input, command)` | `reservationId`, `status` cancelled/expired, `date`, `reason`, `availability`. `expiresOn` es inclusivo: expired solo desde el día siguiente. No completa solicitud ni adopta. |
| `adoptions.complete(input, command)` | `applicationId`, `adoptionDate`, `notes?`, decisiones de tareas y cierres. Adopción, episodio, acogida, reserva, solicitudes, animal, historial y posible ingreso se preparan juntos. Una reserva de otro solicitante exige cancelarla primero. |
| `adoptions.returnAdoption(input, command)` | `adoptionId`, `returnDate`, `reason`, `location`, `availability`. Conserva adopción, fija devolución, crea episodio return y vuelve a cuidado. No reabre el episodio anterior ni solicitudes cerradas. |

Un ingreso opcional en `complete` se declara mediante
`fee:{categoryId,concept,amountMinor}`. Usa moneda de organización, un único
UUID, referencia bidireccional de adopción y `originKey` único. No guarda un
segundo importe en adopción. No se genera un ingreso cuando falta `fee`.

## Decisiones explícitas en una salida

En adopción/fallecimiento/otra salida, las tareas pendientes del animal se
enumeran con una política completa:

```js
taskDecisions: {
  keep: [followUpTaskId],
  cancel: [{id: taskNoLongerNeededId, reason: 'Motivo elegido por la organización'}]
}
```

Cada tarea pending/in_progress debe figurar exactamente una vez. Una tarea
nueva, duplicada, ya completada o sin decisión hace fallar toda la operación.
No se cambian tareas conservadas ni se crean seguimientos implícitos.
Si no existen tareas pendientes, puede omitirse la política.

En adopción: `fosterEndReason` si hay acogida, `reservationClosureReason` si hay
reserva y `otherApplicationsReason` si hay otras solicitudes abiertas.
En fallecimiento/otra salida: `reservationClosureReason` y
`applicationClosureReason` cuando corresponda; el motivo general sirve también
de fin de acogida, salvo `fosterEndReason` explícito. Estos son datos que la UI
debe presentar antes de confirmar; el servicio no inventa motivos ni presume
que se informó al usuario por recibir una llamada.

## Pruebas y alcance real

`node --test tests/unit/lifecycle.cjs` ejecuta diez recorridos sobre un contexto
de pruebas que prepara copias, comprueba revisiones/idempotencia, aplica cambios
en candidato y ejecuta el validador del conjunto antes de sustituirlo. Incluye
fallo simulado tras dos escrituras, sin mutar la instantánea original.

Esto acredita preparación coherente de cambios y reglas de servicio. No
acredita por sí solo el motor IndexedDB ni la matriz file://; esas comprobaciones
se ejecutan aparte sobre el contexto/repositorio reales. No hay formularios
para estos casos todavía ni un módulo de correcciones históricas o eliminación
permanente. No se declara completa la fase de gestión por tener estos servicios.
