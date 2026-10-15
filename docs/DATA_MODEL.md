# Contrato propuesto del modelo de datos

Estado: diseño previo para `schemaVersion = 1`; fase 0 de escritorio superada. No es un esquema implementado ni validado por pruebas. Debe convertirse en validadores y fixtures antes de construir formularios. Los límites elegidos aquí concretan campos que el requisito deja abiertos; cualquier cambio posterior exige actualizar este contrato, validadores, importadores y backup.

## Tipos y convenciones

| Notación | Tipo, límites y validación |
|---|---|
| `UUID` | Cadena UUID v4; estable; generada mediante API criptográfica, nunca `Math.random()` |
| `Date` | Fecha real de calendario `YYYY-MM-DD`, sin hora ni conversión UTC |
| `Instant` | Fecha/hora ISO 8601 UTC con `Z` |
| `Name` | Texto recortado, 1–120 caracteres |
| `Title` | Texto recortado, 1–200 caracteres |
| `Notes` | Texto hasta 20.000 caracteres; por defecto `""` |
| `Short` | Texto hasta 200 caracteres; por defecto `""` |
| `Email` | Texto hasta 254; validación razonable sin exigir dominio comprobado online |
| `Phone` | Texto hasta 50, conserva formato original y ceros; permite formato internacional |
| `Money` | Entero seguro positivo, unidades menores de moneda; valor nulo no equivale a cero |
| `Quantity` | Entero seguro escalado por `10 ** quantityPrecision`; nunca acumulación de coma flotante |
| `Ref(T)` | UUID existente en tabla T y en el mismo `datasetId` |
| `Option(kind)` | Ref a opción activa del catálogo correspondiente para usos nuevos; se conserva una referencia histórica a una opción desactivada |
| `OriginRef` | `{type, id}`; tipo de una lista permitida, UUID existente y mismo conjunto |
| `Enum(...)` | Código estable en inglés; etiquetas traducidas fuera de los datos |

En las tablas, `?` significa anulable con valor inicial `null`; campos obligatorios sin valor inicial requieren entrada o generación explícita. Arrays no anulables nacen como `[]`, no aceptan duplicados y tienen límites expresos. Un valor desconocido se guarda como `null` o código `unknown`, según el campo; no como texto vacío, cero ni fecha inventada.

Los textos del usuario se preservan como texto, nunca HTML ejecutable. Se rechazan valores `undefined`, números no finitos, enteros inseguros, campos desconocidos fuera del contrato y claves peligrosas de importación. Normalizaciones de búsqueda se regeneran, conservando el original.

## Campos comunes de negocio

Todas las tablas de negocio descritas más abajo usan clave primaria `[datasetId, id]` y estos campos salvo excepción explícita:

| Campo | Tipo | Obligatorio / inicial | Regla |
|---|---|---|---|
| `id` | UUID | Sí, generado | Inmutable dentro del ciclo de vida |
| `datasetId` | UUID | Sí, conjunto destino | Todas las referencias locales comparten este valor |
| `createdAt` | Instant | Sí, instante de creación | Se conserva al restaurar |
| `updatedAt` | Instant | Sí, inicialmente `createdAt` | Actualización confirmada; no fecha de negocio |
| `revision` | Entero seguro ≥ 1 | Sí, `1` | Se incrementa por modificación; comprobar revisión esperada |
| `archivedAt` | Instant? | No, `null` | Archivo funcional, solo donde tenga sentido |
| `deletedAt` | Instant? | No, `null` | Papelera; no sustituye anulaciones económicas |
| `origin` | Enum(real, demo, import) | Sí, `real` | Procedencia explícita |
| `originBatchId` | UUID? | No, `null` | Obligatorio para demo/import; conserva trazabilidad del lote |

Finanzas e inventario no admiten papelera como modificación de saldo: usan anulación/compensación. Historial y actividad no se editan arbitrariamente; se enlazan correcciones. `revision` no es `schemaVersion`.

## 1. Organización (`organizationSettings`)

Una fila por conjunto. El idioma antes de crear organización pertenece al estado temporal de inicio.

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `name` | Name | Sí | Nombre visible |
| `logoAssetId` | Ref(assets)? | No | Recurso tipo `logo`, nunca URL remota |
| `phone` | Phone? | No | Cadena, no número |
| `email` | Email? | No | Validación compartida |
| `address` | Texto ≤ 2000? | No | Dirección libre |
| `language` | Enum(en, es) | Sí, `en` | Cambio sin alterar datos de negocio |
| `currencyCode` | Código permitido | Sí, elegido en alta | EUR/USD/GBP/CAD/AUD/MXN/JPY/KWD; sin cambio reinterpretativo tras movimientos |
| `dateFormat` | Enum(iso, day_first, month_first) | Sí, según elección visible | Solo visualización |
| `timeZone` | Cadena IANA ≤ 100 | Sí, sugerida y confirmable | Validación mediante capacidades disponibles; no zona inventada |
| `displayPreferences` | Objeto cerrado | Sí, `{animalView:"table",pageSize:25}` | Vista `table/cards`; tamaño 10/25/50/100 |
| `printDetails` | Notes | No, `""` | Datos de organización adicionales |
| `printFooter` | Texto ≤ 2000 | No, `""` | Pie impreso |
| `backupReminderDays` | Entero 1–365 | Sí, `7` | Recordatorio solo con aplicación abierta |
| `backupReminderWrites` | Entero 1–100000 | Sí, `100` | Contador de operaciones confirmadas |
| `backupRemindersEnabled` | Booleano | Sí, `true` | Configurable |

Las unidades menores de moneda pertenecen a configuración estática versionada: JPY 0, EUR/USD/GBP/CAD/AUD/MXN 2 y KWD 3. No se importan como preferencia arbitraria que cambie valores existentes.

## 2. Catálogos (`catalogOptions`) y ubicaciones (`locations`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| catalog `kind` | Enum(species, size, finance_income, finance_expense, inventory_category, document_type, material_type, unit, volunteer_function, task_type, care_plan_type) | Sí | Tipos permitidos por esquema |
| catalog `code` | Cadena 1–80 | Sí | Única por conjunto/kind; código estable, no etiqueta |
| catalog `labelKey` | Cadena ≤ 120? | Para opciones incorporadas | Clave local de traducción |
| catalog `customLabel` | Name? | Para personalizadas | Exactamente una fuente de etiqueta; texto del usuario no se traduce |
| catalog `isSystem` | Booleano | Sí, `false` | Opciones base con código estable |
| catalog `active` | Booleano | Sí, `true` | Desactivar no rompe referencias anteriores |
| catalog `sortOrder` | Entero 0–100000 | Sí, `0` | Orden secundario por etiqueta |
| location `name` | Name | Sí | Nombre de refugio, sala o zona |
| location `type` | Enum(shelter, room, area, other) | Sí, `shelter` | No confundir con familia de acogida |
| location `parentLocationId` | Ref(locations)? | No | Sin ciclos ni autorreferencia |
| location `active` | Booleano | Sí, `true` | Histórico conservado |
| location `notes` | Notes | No, `""` | |

Catálogos base y sus códigos/etiquetas se incorporarán como datos locales versionados. Los códigos no cambian al cambiar idioma. Las ubicaciones desactivadas no se ofrecen para asignaciones nuevas.

## 3. Animales (`animals`)

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `code` | Cadena 1–40 | Sí, secuencia `A-000001` | Único por conjunto, asignación transaccional |
| `name` | Name | Sí | |
| `speciesId` | Option(species) | Sí | |
| `breed` | Texto ≤ 120? | No | No inventar raza |
| `sex` | Enum(male, female, unknown) | Sí, `unknown` | |
| `birthDate` | Date? | No | No posterior a hoy de la organización |
| `birthPrecision` | Enum(exact, estimated, unknown) | Sí, `unknown` | Ver combinación exclusiva más abajo |
| `estimatedAgeMonths` | Entero 0–12000? | No | Límite técnico amplio de captura, no longevidad veterinaria por especie |
| `estimatedAgeReferenceDate` | Date? | No | Necesaria con edad estimada sin fecha fiable; no futura |
| `sizeId` | Option(size)? | No | |
| `color` | Texto ≤ 120? | No | |
| `microchipOriginal` | Cadena 1–100? | No | Conserva ceros, letras y formatos internacionales |
| `microchipNormalized` | Cadena 1–100? | Derivado | Búsqueda/duplicados; no restricción universal de 15 dígitos |
| `sterilizationStatus` | Enum(yes, no, unknown) | Sí, `unknown` | |
| `sterilizationDate` | Date? | No | Solo con estado `yes`; no futura |
| `photoAssetId` | Ref(assets)? | No | Tipo foto optimizada |
| `thumbnailAssetId` | Ref(assets)? | No | Tipo miniatura; coherente con foto |
| `description`, `character`, `behavior` | Notes cada uno | No, `""` | Campos distintos |
| `specialNeeds`, `notes` | Notes cada uno | No, `""` | |
| `managementStatus` | Enum(under_care, adopted, deceased, other_exit) | Sí, fijado por servicio de entrada | Consistente con episodio abierto |
| `deceasedOn` | Date? | Solo fallecido | Fecha del hecho; permite conservar adopción anterior aunque no exista episodio abierto |
| `adoptionAvailability` | Enum(unavailable, available, reserved) | Sí, elegido en entrada | Solo disponible/reservado bajo cuidado |
| `locationKind` | Enum(shelter, foster, temporary_external)? | Entrada requiere valor | Fuera de cuidado `null` |
| `locationId` | Ref(locations)? | Según tipo | Obligatorio en refugio, nulo en acogida |
| `externalLocationDescription` | Texto 1–2000? | Según tipo | Obligatorio en ubicación externa temporal |

La familia actual se deriva de la única estancia abierta; no se duplica un `currentFosterId`. El peso se deriva de la última medición válida. Primer ingreso e ingreso actual se derivan de episodios. Edad, saldo, ocupación y existencias no se almacenan como totales independientes.

Nacimiento: `exact` requiere `birthDate` y prohíbe los campos de edad alternativa; `estimated` permite una fecha estimada o la pareja edad/fecha de referencia, nunca ambas; `unknown` exige esos tres campos nulos. No se persiste una edad calculada.

## 4. Episodios (`stayEpisodes`) y 5. pesos (`weightMeasurements`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| episode `animalId` | Ref(animals) | Sí | |
| episode `entryDate` | Date | Sí | No futura para un hecho realizado |
| episode `originDescription` | Texto ≤ 2000 | No, `""` | Procedencia |
| episode `entryReason` | Title | Sí | Motivo documentado |
| episode `entryType` | Enum(first_entry, return, other) | Sí | Primera entrada solo una; devolución vinculada |
| episode `exitDate` | Date? | No | ≥ entrada; salida excluida en intervalos |
| episode `exitReason` | Enum(adoption, deceased, transfer, other)? | No | Junto con fecha; motivo detallado en notas |
| episode `adoptionId` | Ref(adoptions)? | Según salida | Adopción que cierra este episodio |
| episode `returnedFromAdoptionId` | Ref(adoptions)? | Según entrada | Adopción anterior que origina devolución |
| episode `notes` | Notes | No, `""` | Solo un episodio abierto por animal |
| weight `animalId` | Ref(animals) | Sí | |
| weight `date` | Date | Sí | Fecha de medición, no futura |
| weight `grams` | Entero seguro > 0 | Sí | Entrada convertida sin pérdida desde unidad visual |
| weight `notes` | Notes | No, `""` | Si coinciden fechas, orden por `createdAt` e id para resultado determinista |

## 6. Contactos (`contacts`)

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `type` | Enum(person, organization) | Sí, `person` | |
| `name` | Name | Sí | |
| `phones` | Array ≤ 10 de `{label, original, normalized}` | Sí, `[]` | Etiqueta ≤ 40; original Phone; normalizado derivado |
| `email` | Email? | No | |
| `emailNormalized` | Cadena ≤ 254? | Derivado | Comparación sin cambiar el original |
| `address` | Texto ≤ 2000? | No | |
| `roles` | Array único de Enum(adopter, foster, volunteer, donor, veterinarian, supplier, collaborator) | Sí, `[]` | Máximo siete en versión 1 |
| `notes` | Notes | No, `""` | |
| `mergedIntoContactId` | Ref(contacts)? | No | Solo servicio de fusión; sin ciclos |

Un email/teléfono compartido es posible: se advierte un duplicado, no se impone unicidad global ni fusión automática. Los perfiles no repiten teléfono, email ni dirección.

## 7. Perfiles de acogida (`fosterProfiles`) y 8. estancias (`fosterStays`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| profile `contactId` | Ref(contacts) | Sí | Único perfil por contacto; rol `foster` |
| profile `totalCapacity` | Entero 0–10000 | Sí | Cero permite registrar indisponibilidad; capacidad distinta de ocupación |
| profile `acceptedSpeciesIds` | Array único ≤ 100 Option(species) | Sí | Vacío no significa aceptar todo; informar sin configurar |
| profile `acceptedSizeIds` | Array único ≤ 100 Option(size) | Sí | Mismo criterio explícito |
| profile `availability` | Enum(available, unavailable, conditional) | Sí, `unavailable` | No deducir de ocupación |
| profile `restrictions`, `notes` | Notes cada uno | No, `""` | |
| stay `animalId` | Ref(animals) | Sí | Bajo cuidado |
| stay `episodeId` | Ref(stayEpisodes) | Sí | Episodio del mismo animal, vigente durante estancia |
| stay `fosterProfileId` | Ref(fosterProfiles) | Sí | |
| stay `startDate` | Date | Sí | ≥ entrada de episodio |
| stay `endDate` | Date? | No | ≥ inicio; no posterior a salida del episodio |
| stay `endReason` | Title? | No | Obligatorio con fecha de finalización |
| stay `exceptionReason` | Title? | No | Necesario si se confirma excepción de capacidad/incompatibilidad |
| stay `notes` | Notes | No, `""` | Solo una estancia abierta por animal; evitar solapamientos incompatibles |

## 9. Solicitudes (`adoptionApplications`), 10. reservas (`reservations`), 11. adopciones (`adoptions`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| application `animalId` | Ref(animals) | Sí | |
| application `contactId` | Ref(contacts) | Sí | |
| application `applicationDate` | Date | Sí | |
| application `status` | Enum(pending, under_review, approved, rejected, completed, cancelled) | Sí, `pending` | Transiciones por servicio |
| application `interviewNotes`, `notes` | Notes cada uno | No, `""` | |
| application `approvalDate` | Date? | No | Obligatoria al aprobar; ≥ solicitud |
| application `closureReason` | Title? | No | Obligatoria al rechazar/cancelar |
| reservation `animalId` | Ref(animals) | Sí | Coincide con solicitud |
| reservation `applicationId` | Ref(adoptionApplications) | Sí | Solicitud aprobada como política inicial explícita |
| reservation `reservationDate` | Date | Sí | ≥ solicitud/aprobación |
| reservation `expiresOn` | Date? | No | ≥ reserva; expiración efectiva revisada al abrir/usar la app |
| reservation `status` | Enum(active, fulfilled, cancelled, expired) | Sí, `active` | Una activa por animal |
| reservation `closedOn` | Date? | No | Obligatoria salvo activa; ≥ reserva |
| reservation `closureReason` | Title? | No | Obligatoria salvo activa |
| adoption `animalId` | Ref(animals) | Sí | |
| adoption `applicationId` | Ref(adoptionApplications) | Sí | Solicitud aprobada; una adopción por solicitud |
| adoption `adopterContactId` | Ref(contacts) | Sí | Coincide con interesado de solicitud salvo resolución explícita previa |
| adoption `episodeId` | Ref(stayEpisodes) | Sí | Se cierra con esta adopción; una adopción por episodio |
| adoption `adoptionDate` | Date | Sí | ≥ entrada/aprobación, no futura |
| adoption `returnDate` | Date? | No | ≥ adopción; junto con motivo y episodio de devolución |
| adoption `returnReason` | Title? | No | Obligatorio al devolver |
| adoption `financialMovementId` | Ref(financialMovements)? | No | Ingreso del mismo animal, moneda y origen válido |
| adoption `notes` | Notes | No, `""` | Devolver no destruye registro |

Aprobar no crea reserva ni adopción. Tener una reserva no es requisito universal para formalizar. Los cambios múltiples se confirman en una única transacción. No se permiten dos adopciones vigentes incompatibles; una devolución abre nuevo episodio, no reabre el antiguo.

## 12. Voluntariado (`volunteerProfiles`) y 13. horas (`volunteerHours`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| profile `contactId` | Ref(contacts) | Sí | Único perfil por contacto; rol `volunteer` |
| profile `availability` | Notes | No, `""` | Instrucciones libres, sin motor laboral |
| profile `functionIds` | Array único ≤ 100 Option(volunteer_function) | Sí, `[]` | Funciones base descritas en requisitos |
| profile `specialties` | Notes | No, `""` | |
| profile `status` | Enum(active, inactive) | Sí, `active` | |
| profile `notes` | Notes | No, `""` | |
| hours `volunteerProfileId` | Ref(volunteerProfiles) | Sí | |
| hours `date` | Date | Sí | Fecha realizada, no futura |
| hours `activity` | Title | Sí | |
| hours `durationMinutes` | Entero 1–1440 | Sí | Máximo un día por fila; dividir actividades de varios días |
| hours `notes` | Notes | No, `""` | Totales calculados |

## 14. Salud (`veterinaryRecords`) y 15. cuidados (`carePlans`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| record `animalId` | Ref(animals) | Sí | |
| record `type` | Enum(vaccination, deworming, checkup, sterilization, surgery, test, diagnosis, disease, allergy, medication_administration, other) | Sí | |
| record `date` | Date | Sí | Acto realizado, no futura |
| record `title` | Title | Sí | |
| record `description`, `results`, `notes` | Notes cada uno | No, `""` | |
| record `veterinarianContactId` | Ref(contacts)? | No | Rol veterinario; persona u organización según contexto |
| record `clinicContactId` | Ref(contacts)? | No | Organización |
| record `nextReviewTaskId` | Ref(tasks)? | No | Próxima revisión se programa en tarea única; fecha mostrada desde ella |
| record `carePlanId` | Ref(carePlans)? | No | Mismo animal |
| record `sourceTaskId` | Ref(tasks)? | No | Mismo animal; clave de origen evita doble acto |
| record `expenseMovementId` | Ref(financialMovements)? | No | Gasto único y coherente con animal |
| record `conditionActive` | Booleano? | Solo enfermedad/alergia | Desconocido permitido; no aplica a otros tipos |
| record `resolvedOn` | Date? | No | ≥ fecha del registro; requiere `conditionActive=false` |
| plan `animalId` | Ref(animals) | Sí | |
| plan `typeId` | Option(care_plan_type) | Sí | |
| plan `name` | Name | Sí | |
| plan `startDate` | Date | Sí | |
| plan `plannedEndDate` | Date? | No | ≥ inicio |
| plan `status` | Enum(planned, active, completed, cancelled) | Sí, `planned` | No cambiar automáticamente por el paso del tiempo |
| plan `medication` | Texto ≤ 200? | No | Instrucción humana |
| plan `doseInstructions`, `routeInstructions`, `frequencyInstructions` | Texto ≤ 2000? cada uno | No | Texto sin cálculo ni recomendación clínica |
| plan `veterinarianContactId` | Ref(contacts)? | No | |
| plan `notes` | Notes | No, `""` | Actos pendientes: tareas relacionadas, no array duplicado |

Los documentos se relacionan con salud mediante `documentLinks`. La pestaña Gastos consulta los movimientos; no guarda otro importe. Registrar esterilización y actualizar el animal es una operación conjunta.

## 16. Tareas (`tasks`)

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `title` | Title | Sí | |
| `description`, `notes` | Notes cada uno | No, `""` | |
| `dueDate` | Date | Sí | Puede ser futura |
| `dueLocalTime` | Cadena `HH:mm`? | No | Hora local explícita; no convertir fecha sola en instante |
| `timeZone` | Cadena IANA ≤ 100? | Con hora | Copia de zona configurada al programar, evita reinterpretar tareas si cambia organización |
| `priority` | Enum(low, medium, high, urgent) | Sí, `medium` | |
| `status` | Enum(pending, in_progress, completed, cancelled) | Sí, `pending` | |
| `animalId` | Ref(animals)? | No | |
| `contactId` | Ref(contacts)? | No | |
| `responsibleVolunteerId` | Ref(volunteerProfiles)? | No | |
| `typeId` | Option(task_type) | Sí | |
| `source` | OriginRef? | No | Tipos permitidos: care_plan, veterinary_record, adoption, adoption_application, animal, inventory_item |
| `originKey` | Cadena 1–200? | Si generada | Única por conjunto para efecto identificado |
| `completedOn` | Date? | No | Obligatoria solo completada; hecho no futuro |
| `cancelledOn` | Date? | No | Obligatoria al cancelar |
| `cancellationReason` | Title? | No | Obligatoria al cancelar |

Lista, agenda y calendario consultan estas mismas filas. No se crean eventos de calendario separados. Horas ambiguas por cambio estacional deben mostrarse como hora local, sin prometer alarma del sistema ni ejecución al cerrar.

## 17. Movimientos económicos (`financialMovements`)

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `direction` | Enum(income, expense) | Sí | El signo del balance depende de dirección |
| `date` | Date | Sí | Fecha realizada; registros previstos son tareas |
| `categoryId` | Option(finance_income/finance_expense) | Sí | Catálogo coherente con dirección |
| `concept` | Title | Sí | |
| `amountMinor` | Money | Sí | > 0 y entero seguro; decimales de moneda respetados |
| `currencyCode` | Código configurado | Sí | Igual a moneda de organización; no conversión |
| `animalId` | Ref(animals)? | No | |
| `contactId` | Ref(contacts)? | No | |
| `source` | OriginRef? | No | Tipos permitidos: donation, veterinary_record, adoption, inventory_movement |
| `originKey` | Cadena 1–200? | Si generado | Única por conjunto; no usar cadena vacía en índice único |
| `status` | Enum(posted, voided) | Sí, `posted` | Los anulados no computan |
| `voidReason` | Title? | No | Obligatorio al anular |
| `voidedOn` | Date? | No | Obligatorio al anular |
| `correctsMovementId` | Ref(financialMovements)? | No | Nuevo que sustituye a original; sin ciclos |
| `replacementMovementId` | Ref(financialMovements)? | No | Original anulado apunta al sustituto |
| `notes` | Notes | No, `""` | Sin borrado que altere historia |

## 18. Donaciones (`donations`) y 19. líneas materiales (`donationLines`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| donation `donorContactId` | Ref(contacts)? | No | Anónimas permitidas |
| donation `date` | Date | Sí | |
| donation `type` | Enum(monetary, material) | Sí | |
| donation `financialMovementId` | Ref(financialMovements)? | Solo monetaria | Un ingreso por donación; fecha/contacto coherentes |
| donation `status` | Enum(recorded, voided) | Sí, `recorded` | Estado añadido para coordinar anulación de relacionados |
| donation `voidReason` | Title? | No | Obligatorio al anular; efectos compensatorios explícitos |
| donation `notes` | Notes | No, `""` | No otro importe editable |
| line `donationId` | Ref(donations) | Sí | Donación material |
| line `materialTypeId` | Option(material_type) | Sí | |
| line `description` | Title | Sí | |
| line `quantityScaled` | Quantity > 0 | Sí | Escala explicitada |
| line `quantityPrecision` | Entero 0–6 | Sí, `0` | Igual a artículo si existe |
| line `unitId` | Option(unit) | Sí | Igual a artículo al incorporar stock |
| line `inventoryItemId` | Ref(inventoryItems)? | No | |
| line `inventoryMovementId` | Ref(inventoryMovements)? | No | Movimiento único por línea; artículo coherente |
| line `estimatedValueMinor` | Entero seguro ≥ 0? | No | Moneda de organización; nunca balance monetario |

La agrupación CSV de líneas usa identificador externo de donación documentado en el futuro contrato de importación. Una donación material exige al menos una línea; una monetaria no puede tener líneas materiales.

## 20. Artículos (`inventoryItems`) y 21. movimientos (`inventoryMovements`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| item `name` | Name | Sí | |
| item `categoryId` | Option(inventory_category) | Sí | |
| item `unitId` | Option(unit) | Sí | No cambiar unidad reinterpretando movimientos existentes |
| item `quantityPrecision` | Entero 0–6 | Sí, `0` | No cambiar escala reinterpretando historia |
| item `minimumStockScaled` | Quantity ≥ 0 | Sí, `0` | Escala del artículo |
| item `supplierContactId` | Ref(contacts)? | No | Rol proveedor |
| item `status` | Enum(active, archived) | Sí, `active` | Coherente con `archivedAt` |
| item `notes` | Notes | No, `""` | Stock derivado, no editable |
| movement `itemId` | Ref(inventoryItems) | Sí | |
| movement `date` | Date | Sí | |
| movement `type` | Enum(opening_balance, purchase, donation, consumption, return, adjustment) | Sí | |
| movement `deltaScaled` | Quantity con signo ≠ 0 | Sí | Misma escala que artículo; resultado no negativo |
| movement `reason` | Title | Sí | Ajustes y compensaciones siempre justificados |
| movement `contactId` | Ref(contacts)? | No | |
| movement `donationLineId` | Ref(donationLines)? | No | Vincula línea inequívoca |
| movement `expenseMovementId` | Ref(financialMovements)? | No | Gasto de compra único, no lo duplica |
| movement `originKey` | Cadena 1–200? | Si generado | Única por conjunto |
| movement `compensatesMovementId` | Ref(inventoryMovements)? | No | Compensación rastreable; original conservado |
| movement `notes` | Notes | No, `""` | No editar cifra total |

Compras/donaciones/saldo inicial suman; consumos restan; devolución/ajuste explicitan signo y motivo. Se valida el stock acumulado por fecha cuando una inserción o corrección histórica podría producir intervalos negativos. Los movimientos compensatorios siguen sumando: no se anula el original y se suma además su compensación, lo que restaría dos veces.

## 22. Recursos (`assets`)

| Campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| `type` | Enum(photo, thumbnail, logo, embedded_document) | Sí | |
| `originalName` | Texto 1–255 | Sí | Solo etiqueta; no ruta ejecutable |
| `mime` | Código MIME permitido | Sí | Validado contra bytes/decodificación |
| `byteLength` | Entero seguro > 0 | Sí, derivado | Igual a tamaño real Blob |
| `sha256` | Hex SHA-256 de 64 caracteres | Sí, calculado | Igual a bytes almacenados |
| `blob` | Blob | Sí | No Base64 permanente en IndexedDB |
| `width`, `height` | Entero positivo? cada uno | Solo imágenes | Límites de decodificación/transformación |
| `derivedFromAssetId` | Ref(assets)? | No | Miniatura ligada a foto optimizada; sin ciclos |

Se aplican los campos comunes, incluido `createdAt`. Ningún límite de producto promete cuota del navegador. Hash idéntico permite sugerir reutilización, sin eliminar un recurso referenciado. Antes de aceptar se valida presupuesto total y proyección Base64. Las URL de objetos son temporales de interfaz, no campos de negocio.

## 23. Documentos (`documents`) y vínculos (`documentLinks`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| document `title` | Title | Sí | |
| document `typeId` | Option(document_type) | Sí | |
| document `date` | Date | Sí | |
| document `notes` | Notes | No, `""` | |
| document `mode` | Enum(embedded, external_reference) | Sí | |
| document `assetId` | Ref(assets)? | Solo incorporado | Tipo `embedded_document`; obligatorio embedded |
| document `externalFileName` | Texto 1–255? | Solo externo | Obligatorio en referencia |
| document `externalLocation` | Texto 1–2000? | Solo externo | Descripción del usuario; no garantiza reapertura |
| document `externalFileType` | Texto ≤ 120? | Solo externo | Descripción del formato |
| document `originalSha256` | Hex SHA-256? | No | Comparación opcional al reseleccionar externo |
| link `documentId` | Ref(documents) | Sí | |
| link `entityType` | Enum(animal, contact, adoption, veterinary_record) | Sí | Lista cerrada |
| link `entityId` | Ref según entityType | Sí | Mismo conjunto, existencia comprobada |

Unicidad de vínculo `[datasetId, documentId, entityType, entityId]`. Campos de incorporado y externo son mutuamente excluyentes. El contenido externo queda fuera del backup y se indica siempre, sin guardar handles temporales como acceso garantizado.

## 24. Historial (`animalEvents`) y 25. actividad (`activityLog`)

| Tabla / campo | Tipo | Obligatorio / inicial | Validación |
|---|---|---|---|
| event `animalId` | Ref(animals) | Sí | |
| event `type` | Código estable de evento | Sí | Entrada, devolución, salud, acogida, solicitud, reserva, adopción, traslado, fallecimiento y documento |
| event `eventDate` | Date | Sí | Fecha del hecho |
| event `recordedAt` | Instant | Sí, ahora | Fecha de registro distinta del hecho |
| event `source` | OriginRef | Sí | Origen existente; tipos de negocio permitidos |
| event `originKey` | Cadena 1–200 | Sí | Única por conjunto para evitar duplicación |
| event `parameters` | Objeto cerrado según tipo | Sí, `{}` | Datos mínimos hasta 2000 caracteres; no HTML ni copia completa |
| event `correctsEventId` | Ref(animalEvents)? | No | Nueva versión/corrección |
| event `supersededByEventId` | Ref(animalEvents)? | No | No mostrar ambas como hechos válidos |
| event `voidReason` | Title? | No | Anulación explícita conservando origen |
| log `operation` | Código estable de operación | Sí | Create/update/archive/restore/import/state_change/void/merge… |
| log `occurredAt` | Instant | Sí, ahora | |
| log `operationId` | UUID | Sí | Agrupa un caso de uso e idempotencia |
| log `target` | OriginRef? | Según operación | No copia de documento/ficha |
| log `summaryParameters` | Objeto cerrado | Sí, `{}` | Máximo 2000 caracteres; identificadores y códigos mínimos |

El texto del historial se genera por traducciones de código y parámetros, no se almacena una frase en un idioma. Actividad funcional se incluye en backup. No se presenta como auditoría certificada o inalterable.

## Metadatos y tablas auxiliares

Fuera del contenido de negocio de backup salvo la excepción de correspondencias de importación:

| Almacén | Contenido y restricciones |
|---|---|
| `appMeta` | Claves estables de puntero activo, db/schema versión y estado de migraciones; no datos personales |
| `datasets` | UUID, estado preparing/active/recovery/failed, schemaVersion, dataRevision ≥ 0, tiempos, origen de preparación y conjunto anterior; activación mediante puntero único |
| `writeLease` | Propietario de sesión, token de control, caducidad y renovación; adquisición transaccional, no exportado |
| `operations` | Clave `[datasetId, operationId]`, tipo, estado confirmado y referencias resultado mínimas; idempotencia local de operación, no reejecutar al restaurar |
| `sequences` | Contadores por conjunto para códigos humanos; nunca se reutilizan tras borrar; restauración calcula mínimo seguro |
| `backupReceipts` | backupId, revisión, generado/descarga solicitada/verificado, fechas, recuentos; metadatos locales, no prueba de guardado en disco |
| `diagnostics` | Últimos 200 sucesos técnicos limitados, sin contenido completo ni envío automático; no backup de negocio |
| `importIdentityMap` | Clave fuente/tipo/id externo → UUID interno; campos `source` ≤ 120, `entityType` permitido, `externalId` ≤ 200, `entityId` validado, lote y campos comunes; incluido en backup para reutilizar correspondencias |

Los registros de lotes demo/import se identificarán por `originBatchId`; un descriptor de lote podrá mantener tipo, fecha y origen sin copiar archivo importado. Su contrato se completa al implementar importación/demostración y debe incorporarse a backup si contiene información de negocio necesaria.

## Relaciones y cardinalidades

| Relación | Cardinalidad y restricción |
|---|---|
| Conjunto → organización | 1:1 al configurar; conjunto vacío aún sin organización permitido |
| Animal → episodios | 1:N; máximo uno abierto |
| Animal → pesos, salud, planes, tareas, eventos | 1:N; referencias opcionales de tareas no cambian cardinalidad |
| Animal → solicitudes, reservas y adopciones | 1:N históricos; máximo una reserva activa |
| Contacto → roles | 1:N valores; sin repetir ficha personal |
| Contacto → perfil acogida / voluntariado | 1:0..1 para cada tipo |
| Perfil acogida → estancias | 1:N; ocupación cuenta abiertas |
| Episodio → acogidas | 1:N secuenciales, sin intervalos incompatibles |
| Solicitud → reservas | 1:0..N históricas; máximo una activa por animal y solicitud |
| Solicitud → adopción | 1:0..1 |
| Episodio → adopción de salida | 1:0..1 |
| Adopción → episodio de devolución | 1:0..1; episodio anterior conservado |
| Plan → tareas / registros sanitarios | 1:N; completar acto relaciona tarea y registro |
| Registro sanitario → gasto | N:0..1; un gasto puede cubrir varios actos solo mediante selección explícita, totales financieros lo cuentan una vez |
| Donación monetaria → ingreso | 1:1; ingreso no reutilizado por otra donación |
| Donación material → líneas | 1:N; cada línea 0..1 movimiento inicial de inventario |
| Artículo → movimientos | 1:N; stock suma enteros con signo |
| Documento → vínculos | 1:N; asociación con varios animales/contactos/adopciones/registros |
| Recurso → referencias de foto/logo/documento | 1:N; eliminación solo tras comprobar todas las referencias |
| Entidad de origen → eventos/movimientos/tareas | Referencias explícitas; clave de origen impide aplicar dos veces un efecto |

Todas las cardinalidades, unicidades y referencias deben comprobarse en servicios e importación/restauración: IndexedDB no aporta claves foráneas. No se enlaza por nombre. Archivo o papelera no autorizan dejar referencias rotas; los informes históricos incluyen hechos válidos de entidades archivadas.

## Índices propuestos

Todos se circunscriben a `datasetId`; las fechas de negocio se ordenan como cadenas ISO. Índices definitivos deben contrastarse con consultas y pruebas.

- Animales: código único; microchip normalizado único cuando existe; situación, especie, disponibilidad y ubicación.
- Contactos: nombre normalizado, email normalizado, teléfonos normalizados mediante valores auxiliares mantenidos coherentemente.
- Episodios: animal/entrada, animal/salida; marcador indexable único para episodio abierto por animal.
- Acogidas: animal/inicio, perfil/inicio; marcador único para estancia abierta por animal.
- Solicitudes: animal/estado, contacto/estado, fecha; reservas: animal/estado y marcador único de activa.
- Adopciones: fecha, animal, solicitud única y episodio único.
- Salud/pesos/planes/eventos: animal/fecha; eventos por clave de origen única.
- Tareas: estado/fecha, animal/fecha, responsable/fecha; clave de origen única cuando existe.
- Finanzas: fecha, dirección/fecha, categoría/fecha, animal/fecha, contacto/fecha; origen único cuando existe.
- Inventario: artículo/fecha y origen único cuando existe; donación línea única para efecto de incorporación.
- Perfiles: contacto único; horas por perfil/fecha. Documentos por fecha y vínculos por destino.

Marcadores de unicidad para abiertos/activos se omiten completamente al cerrar; no se asigna `null` o `""` compartido como valor de un índice único. Las colisiones de código importado exigen resolución; microchip coincidente es conflicto explícito, no fusión automática.

## Política de evolución

Este contrato se revisará tras la viabilidad y antes de fijar `schemaVersion = 1` implementado. Cambios de campos, unidades, referencias o reglas requieren migración/fixture cuando ya existan datos persistidos. Los cuatro números de versión permanecen independientes. Un backup futuro incompatible no se interpreta parcialmente. Restaurar conserva datos de negocio e identificadores y solo cambia ámbito `datasetId` y metadatos propios de la restauración.
