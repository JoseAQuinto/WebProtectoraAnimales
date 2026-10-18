(function () {
  'use strict';
  window.RescueManager.locales.es = Object.freeze({
    'app.name': 'Rescue Manager',
    'app.development': 'En desarrollo: todavía no introduzcas datos reales.',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.close': 'Cerrar',
    'common.loading': 'Cargando…', 'common.saving': 'Guardando…',
    'common.saved': 'Guardado', 'common.readOnly': 'Solo lectura',
    'errors.storageUnavailable': 'El almacenamiento local no está disponible. Los cambios no se han guardado. Revisa la configuración del navegador y conserva tu copia externa.',
    'errors.quota': 'No hay suficiente espacio en el navegador. Los cambios no se han guardado. Conserva los datos actuales y revisa el espacio disponible.',
    'errors.aborted': 'La operación se ha cancelado. No se han guardado cambios.',
    'errors.futureVersion': 'Estos datos necesitan una versión compatible más reciente. No se han modificado.',
    'errors.duplicate': 'Ya existe un registro con este identificador. Revisa el conflicto antes de continuar.',
    'errors.leaseLost': 'Otra pestaña tiene el control de escritura. Recarga los datos actuales antes de editar.',
    'errors.revisionConflict': 'Los datos han cambiado desde que los abriste. Recarga y revisa tus cambios.',
    'errors.datasetChanged': 'El conjunto de datos activo ha cambiado. Recarga antes de continuar.',
    'errors.unexpected': 'La operación no se ha completado. Los cambios no están confirmados. Revisa el diagnóstico local.',
    'errors.missingTranslation': 'Este texto no está disponible en el idioma seleccionado.',
    'records.count': { one: '{count} registro', other: '{count} registros' }
  });
}());
(function(root){
  'use strict';
  const labels={back:'Volver a animales',help:'Los animales, sus cuidados y su historial completo en un mismo lugar.',new:'Registrar un animal',edit:'Editar ficha',open:'Abrir',notFound:'Este animal no está disponible.',emptySection:'No hay registros que mostrar.',photo:'Fotografía',noPhoto:'Sin fotografía',photoError:'No se ha podido verificar la fotografía.',setPhoto:'Añadir o sustituir fotografía',photoHelp:'JPEG, PNG o WebP. Hasta 15 MiB y 40 megapíxeles. Se guardarán una fotografía reducida y su miniatura.',removePhoto:'Retirar fotografía',removePhotoConfirm:'¿Retirar la fotografía actual? Los archivos guardados se conservan en el historial y las copias.',code:'Código',name:'Nombre',species:'Especie',breed:'Raza',sex:'Sexo',birthDate:'Fecha de nacimiento',birthPrecision:'Precisión del nacimiento',microchip:'Microchip',size:'Tamaño',color:'Color',sterilization:'Esterilización',location:'Ubicación',shelter:'Ubicación del refugio',externalLocation:'Descripción de la ubicación externa',lastWeight:'Último peso',weights:'Historial de peso',weight:'Peso',grams:'Gramos',addWeight:'Registrar peso',editWeight:'Editar peso',date:'Fecha',title:'Título',type:'Tipo',state:'Estado',status:'Estado de cuidado',changeLocation:'Trasladar animal',reason:'Motivo',fosterEndReason:'Motivo de cierre de acogida (si procede)',availability:'Disponibilidad para adopción',setAvailability:'Cambiar disponibilidad',exit:'Registrar salida o fallecimiento',reenter:'Registrar nueva entrada',archive:'Archivar',trash:'Enviar a papelera',restore:'Restaurar ficha',description:'Descripción',character:'Carácter',behavior:'Comportamiento',specialNeeds:'Necesidades especiales',notes:'Notas',actions:'Acciones',recordHelp:'Las fichas archivadas y en papelera conservan su historial. Finaliza el cuidado actual y resuelve las tareas pendientes antes de archivar.',sections:'Secciones de la ficha animal',carePlans:'Planes de cuidados',tasks:'Tareas',contact:'Contacto',start:'Inicio',end:'Fin',adoptions:'Adopciones',return:'Fecha de devolución',amount:'Importe',event:'Suceso',search:'Buscar nombre, código, microchip o notas',mode:'Visibilidad de fichas',active:'Fichas actuales',all:'Todas las fichas',sort:'Ordenar por',createdAt:'Fecha de creación',previous:'Anterior',next:'Siguiente',page:'Página {page} de {pages} · {count} animales'};
  const enums={tab:{info:'Información',health:'Salud y tareas',foster:'Acogidas',adoption:'Adopción',expenses:'Movimientos económicos',documents:'Documentos',history:'Historial'},status:{under_care:'Bajo cuidado',adopted:'Adoptado',deceased:'Fallecido',other_exit:'Otra salida'},availability:{available:'Disponible',unavailable:'No disponible',reserved:'Reservado'},location:{shelter:'Refugio',foster:'Familia de acogida',temporary_external:'Ubicación externa temporal'},sex:{male:'Macho',female:'Hembra',unknown:'Sin especificar'},precision:{exact:'Exacta',estimated:'Estimada',unknown:'Sin especificar'},sterilization:{yes:'Sí',no:'No',unknown:'Sin especificar'},plan:{planned:'Previsto',active:'Activo',completed:'Completado',cancelled:'Cancelado'},task:{pending:'Pendiente',in_progress:'En curso',completed:'Completada',cancelled:'Cancelada'},application:{pending:'Pendiente',under_review:'En revisión',approved:'Aprobada',rejected:'Rechazada',completed:'Completada',cancelled:'Cancelada'},finance:{posted:'Registrado',voided:'Anulado'},vet:{vaccination:'Vacunación',deworming:'Desparasitación',checkup:'Revisión',sterilization:'Esterilización',surgery:'Cirugía',test:'Prueba',diagnosis:'Diagnóstico',disease:'Enfermedad',allergy:'Alergia',medication_administration:'Administración de medicación',other:'Otro'},event:{entry:'Entrada',return:'Devolución',checkup:'Revisión',vaccination:'Vacunación',deworming:'Desparasitación',treatment:'Tratamiento',sterilization:'Esterilización',foster_start:'Inicio de acogida',foster_end:'Fin de acogida',application:'Solicitud de adopción',reservation:'Reserva',adoption:'Adopción',transfer:'Traslado',deceased:'Fallecimiento',document:'Documento'}};
  const additions=Object.fromEntries(Object.entries(labels).map(([key,value])=>['a.'+key,value]));for(const[kind,values]of Object.entries(enums))for(const[key,value]of Object.entries(values))additions['a.'+kind+'.'+key]=value;
  root.locales.es=Object.freeze({...root.locales.es,...additions,'nav.animals':'Animales','nav.contacts':'Contactos','nav.fosters':'Acogidas','nav.volunteers':'Voluntarios','errors.possibleDuplicate':'Revisa las posibles coincidencias y confirma expresamente antes de guardar.','errors.mergeConflict':'Revisa los campos en conflicto y los perfiles existentes antes de fusionar.','errors.invalidState':'Esta acción no está disponible en el estado actual. Recarga y revisa los registros relacionados.','errors.fileOrValue':'Revisa el archivo o valor seleccionado. Los cambios no se han guardado.','errors.businessRule':'Revisa el cuidado actual del animal, los registros relacionados, las fechas y las tareas pendientes antes de continuar.','errors.assetBudget':'El conjunto superaría el límite de 64 MiB de archivos incorporados. Los archivos archivados y en papelera también cuentan.','errors.assetIntegrity':'El archivo no ha superado las comprobaciones de integridad. No se ha abierto.'});
}(window.RescueManager));
(function () {
  'use strict';
  const root = window.RescueManager;
  root.locales.es = Object.freeze({ ...root.locales.es,
    'nav.dashboard':'Resumen','nav.backup':'Copias de seguridad','nav.settings':'Configuración','nav.help':'Ayuda',
    'ui.language':'Idioma','ui.offline':'Sin conexión · privado','ui.menu':'Abrir menú','ui.skip':'Ir al contenido',
    'ui.development':'Versión en desarrollo. Utiliza datos de prueba mientras se completan los módulos y las comprobaciones de aceptación.',
    'ui.noOrganization':'No hay datos de una organización accesibles aquí','ui.noOrganizationHelp':'Puedes estar utilizando otro navegador, perfil o carpeta. Crea una organización con datos de prueba o restaura una copia para continuar.',
    'ui.createOrganization':'Crear una organización','ui.restore':'Restaurar una copia','ui.unknown':'Sin especificar','ui.unsaved':'¿Descartar los cambios sin guardar?',
    'ui.welcome':'Tu protectora, de un vistazo','ui.overviewHelp':'Las cifras proceden de los registros actuales. La ubicación y la disponibilidad para adopción pueden solaparse.',
    'ui.underCare':'Animales bajo cuidado','ui.foster':'En acogida','ui.available':'Disponibles para adopción','ui.contacts':'Contactos','ui.pendingTasks':'Tareas pendientes','ui.assets':'Archivos incorporados',
    'ui.nextSteps':'La protección de datos está disponible','ui.nextStepsHelp':'Crea y verifica una copia externa antes de trasladar datos a otro ordenador. Los módulos de gestión se conectan en las siguientes fases del desarrollo.',
    'ui.readOnly':'Esta pestaña está en modo lectura. Otra pestaña puede tener el control de escritura.','ui.readOnlyReload':'Si acabas de recargar o reabrir la página, el control vuelve automáticamente cuando caduca la sesión anterior (unos 15 segundos).','ui.takeControl':'Tomar el control de escritura','ui.takeControlConfirm':'¿Dar el control de escritura a esta pestaña? Las demás pasarán a modo lectura.',
    'ui.backupTitle':'Tus datos, recuperables','ui.backupHelp':'Conserva copias externas. Los ajustes del navegador, otro perfil o una limpieza del almacenamiento pueden impedir acceder a tus datos.',
    'ui.createBackup':'Crear copia de seguridad','ui.createBackupHelp':'Incluye registros, historial y archivos incorporados. Los archivos externos referenciados deben conservarse por separado.',
    'ui.generateDownload':'Generar y descargar','ui.verifyBackup':'Verificar una copia descargada','ui.verifyHelp':'Vuelve a seleccionar el JSON descargado para comprobar su estructura, hashes y relaciones.',
    'ui.selectVerify':'Seleccionar copia para verificar','ui.selectRestore':'Seleccionar copia para restaurar','ui.restoreHelp':'Revisa primero el resumen. La restauración prepara un conjunto separado y conserva los datos anteriores para recuperación local.',
    'ui.backupGenerated':'Se ha generado la copia y solicitado su descarga. Selecciona el archivo descargado para verificarlo; el navegador no puede confirmar que se haya guardado en disco.',
    'ui.backupVerified':'La copia seleccionada ha superado las comprobaciones de integridad y relaciones.','ui.beforeRestore':'Antes de sustituir los datos existentes, crea y verifica una copia de su revisión actual.',
    'ui.restoreSummary':'Revisar la sustitución','ui.organization':'Organización','ui.backupDate':'Fecha de la copia','ui.files':'Archivos incorporados','ui.externalFiles':'Referencias a archivos externos','ui.module':'Módulo','ui.records':'Registros',
    'ui.confirmReplacement':'He revisado el resumen y quiero sustituir los datos accesibles.','ui.applyRestore':'Sustituir por esta copia','ui.preparing':'Preparando {completed} de {total} registros…','ui.restored':'La copia se ha restaurado y comprobado. El conjunto anterior se conserva para recuperación local.',
    'ui.lastBackup':'Copias recientes','ui.noBackups':'No hay recibos de copias generadas para este conjunto.','ui.generated':'Generada','ui.requested':'Descarga solicitada','ui.verified':'Verificada al seleccionar el archivo',
    'ui.settingsHelp':'La configuración de la organización no modifica el significado de los importes ni las fechas existentes.','ui.editSettings':'Editar organización','ui.saved':'Cambios guardados.',
    'ui.helpTitle':'Trabajar sin conexión con seguridad','ui.where':'Dónde se guardan mis datos','ui.whereText':'Los registros y archivos incorporados se guardan en el perfil de este navegador, no junto a index.html. Otro navegador, perfil o carpeta puede mostrar otro almacenamiento. Copiar la carpeta de la aplicación no traslada los registros. Para trasladarlos, utiliza una copia verificada y su restauración.',
    'ui.copies':'Copias externas y actualizaciones','ui.copiesText':'Crea una copia, selecciona el archivo descargado para verificarlo y consérvalo fuera del almacenamiento del navegador. Antes de actualizar, guarda la versión anterior y una copia verificada. Después, comprueba los registros y restaura la copia si ha cambiado la ubicación del almacenamiento. Las ventanas privadas pueden no conservar datos.',
    'ui.privacy':'Privacidad local','ui.privacyText':'La aplicación no envía datos. Esta versión no incorpora inicio de sesión ni cifrado en reposo. Las copias JSON no tienen contraseña y contienen datos personales cuando tus registros los incluyen. Protege el equipo y los archivos exportados. Las extensiones, la sincronización del sistema y las carpetas personales dependen de tu entorno.',
    'ui.external':'Documentos externos','ui.externalText':'Una referencia externa conserva una descripción y, opcionalmente, un hash. El contenido queda fuera de la aplicación y no se incluye en la copia de seguridad. Conserva también el archivo original.',
    'ui.limits':'Límites actuales del desarrollo','ui.limitsText':'Los servicios de gestión y las comprobaciones de aceptación siguen en desarrollo. La apertura local de escritorio se ha probado en Chrome, Edge y Firefox. Una ventana estrecha no acredita compatibilidad real con móviles o tabletas. La licencia comercial está pendiente de revisión.',
    'ui.print':'Imprimir esta página','ui.busy':'Procesando…','ui.closeSummary':'Cerrar resumen',
    'field.name':'Nombre','field.language':'Idioma','field.currencyCode':'Moneda','field.dateFormat':'Visualización de fechas','field.timeZone':'Zona horaria','field.phone':'Teléfono','field.email':'Email','field.address':'Dirección',
    'format.iso':'Año-mes-día','format.day_first':'Día/mes/año','format.month_first':'Mes/día/año',
    'errors.validation':'Revisa los campos y los registros relacionados. La operación no se ha guardado.','errors.invalidBackup':'Esta copia es inválida o está dañada. Los datos actuales no se han sustituido.','errors.verifyFirst':'Crea y verifica una copia de los datos actuales antes de sustituirlos.','errors.confirmRestore':'Revisa el resumen y confirma la sustitución.','errors.immutable':'No se pueden reinterpretar los importes ni las unidades existentes. Utiliza una corrección vinculada.','errors.blocked':'Cierra las demás pestañas de esta aplicación e inténtalo de nuevo.'
  });
  const tables = { organizationSettings:'Organización',catalogOptions:'Opciones de catálogo',locations:'Ubicaciones',animals:'Animales',stayEpisodes:'Episodios',weightMeasurements:'Pesos',contacts:'Contactos',fosterProfiles:'Familias de acogida',fosterStays:'Estancias en acogida',adoptionApplications:'Solicitudes de adopción',reservations:'Reservas',adoptions:'Adopciones',volunteerProfiles:'Voluntarios',volunteerHours:'Horas de voluntariado',veterinaryRecords:'Registros sanitarios',carePlans:'Planes de cuidados',tasks:'Tareas',financialMovements:'Movimientos económicos',donations:'Donaciones',donationLines:'Líneas materiales',inventoryItems:'Artículos de inventario',inventoryMovements:'Movimientos de inventario',assets:'Recursos incorporados',documents:'Documentos',documentLinks:'Vínculos de documentos',animalEvents:'Historial animal',activityLog:'Actividad',importIdentityMap:'Correspondencias de importación' };
  const catalog = { species:{dog:'Perro',cat:'Gato',rabbit:'Conejo',bird:'Ave',other:'Otra'},size:{small:'Pequeño',medium:'Mediano',large:'Grande',giant:'Gigante'},finance_income:{donation:'Donación',membership:'Cuota',adoption:'Adopción',event:'Evento',grant:'Subvención',other:'Otro'},finance_expense:{veterinary:'Veterinario',medication:'Medicamentos',food:'Alimentación',facilities:'Instalaciones',transport:'Transporte',supplies:'Suministros',maintenance:'Mantenimiento',other:'Otro'},inventory_category:{food:'Alimentación',medication:'Medicamentos',hygiene:'Higiene',veterinary:'Productos veterinarios',blankets:'Mantas',carriers:'Transportines',accessories:'Accesorios',other:'Otro'},document_type:{general:'General',medical:'Médico',adoption:'Adopción',invoice:'Factura',identity:'Identidad',other:'Otro'},material_type:{food:'Alimentación',medication:'Medicamentos',equipment:'Equipamiento',other:'Otro'},unit:{item:'Unidad',kg:'Kilogramo',g:'Gramo',litre:'Litro',ml:'Mililitro',pack:'Paquete'},volunteer_function:{walking:'Paseos',cleaning:'Limpieza',transport:'Transporte',feeding:'Alimentación',photography:'Fotografía',social_media:'Redes sociales',events:'Eventos',veterinary_visits:'Visitas veterinarias'},task_type:{veterinary_visit:'Visita veterinaria',vaccination:'Vacuna',medication:'Medicación',interview:'Entrevista',call:'Llamada',transport:'Transporte',purchase:'Compra',cleaning:'Limpieza',adoption_followup:'Seguimiento postadopción',other:'Otra'},care_plan_type:{treatment:'Tratamiento',vaccination:'Vacunación',deworming:'Desparasitación',care:'Cuidados',other:'Otro'} };
  const additions = Object.fromEntries(Object.entries(tables).map(([key,value]) => ['table.'+key,value]));
  for (const [kind, entries] of Object.entries(catalog)) for (const [code,label] of Object.entries(entries)) additions['catalog.'+kind+'.'+code] = label;
  root.locales.es = Object.freeze({ ...root.locales.es, ...additions });
}());

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'nav.contacts':'Contactos','nav.fosters':'Familias de acogida','nav.volunteers':'Voluntariado',
    'p.contacts':'Tu agenda central','p.contactsHelp':'Conserva cada persona u organización en un contacto, con todos sus roles y perfiles.',
    'p.fosters':'Familias de acogida','p.fostersHelp':'La capacidad y la ocupación proceden de los perfiles y las acogidas abiertas. La disponibilidad se aplica a nuevas asignaciones.',
    'p.volunteers':'Voluntariado y horas','p.volunteersHelp':'Los datos personales se conservan en la agenda. Los totales proceden de las actividades del periodo elegido.',
    'p.newContact':'Nuevo contacto','p.editContact':'Editar contacto','p.newFoster':'Nuevo perfil de acogida','p.editFoster':'Editar perfil de acogida',
    'p.newVolunteer':'Nuevo perfil de voluntariado','p.editVolunteer':'Editar perfil de voluntariado','p.open':'Abrir ficha','p.edit':'Editar','p.search':'Buscar por nombre, email o teléfono',
    'p.searchPeople':'Buscar un contacto existente','p.chooseContact':'Elegir un contacto existente','p.chooseHelp':'Primero selecciona a alguien de la agenda. Crea un contacto si todavía no aparece.',
    'p.select':'Usar este contacto','p.back':'Anterior','p.next':'Siguiente','p.page':'Página {page} de {pages} · {count} registros','p.empty':'Todavía no hay registros.',
    'p.noMatches':'No hay registros con estos filtros.','p.clear':'Limpiar filtros','p.all':'Todos','p.role':'Rol','p.roles':'Roles','p.type':'Tipo','p.name':'Nombre',
    'p.type.person':'Persona','p.type.organization':'Organización','p.role.adopter':'Adoptante','p.role.foster':'Familia de acogida','p.role.volunteer':'Voluntario',
    'p.role.donor':'Donante','p.role.veterinarian':'Veterinario','p.role.supplier':'Proveedor','p.role.collaborator':'Colaborador',
    'p.state':'Registros','p.active':'Activos','p.archived':'Archivados','p.trash':'Papelera','p.inactive':'Inactivo','p.allRecords':'Activos y archivados',
    'p.email':'Email','p.address':'Dirección','p.notes':'Observaciones','p.phones':'Teléfonos','p.phone':'Número de teléfono','p.phoneLabel':'Etiqueta del teléfono','p.addPhone':'Añadir teléfono',
    'p.removePhone':'Quitar teléfono','p.noValue':'Sin especificar','p.required':'Los campos con * son obligatorios.','p.roleLocked':'Se conservan los roles utilizados por perfiles. Edita el perfil para cambiar su disponibilidad o estado.',
    'p.duplicates':'Revisa estas posibles coincidencias','p.nameMatch':'Solo coincide el nombre','p.possibleMatch':'Coincide el email o teléfono','p.match.name':'Nombre','p.match.email':'Email','p.match.phone':'Teléfono',
    'p.matchReason':'Datos coincidentes','p.duplicateHelp':'Un nombre por sí solo no demuestra que sea la misma persona. Revisa los datos de contacto antes de decidir.',
    'p.confirmDuplicate':'He revisado las coincidencias y quiero guardar un contacto independiente.','p.confirmDuplicateNeeded':'Revisa los contactos coincidentes y confirma si es un contacto independiente.',
    'p.archive':'Archivar contacto','p.unarchive':'Devolver a contactos activos','p.sendTrash':'Enviar contacto a papelera','p.restore':'Restaurar contacto',
    'p.archiveConfirm':'¿Archivar a {name}? Se conservarán su historial y sus relaciones.','p.unarchiveConfirm':'¿Devolver a {name} a la agenda activa?',
    'p.trashConfirm':'¿Enviar a {name} a la papelera? Podrás restaurar el contacto después.','p.restoreConfirm':'¿Restaurar a {name} desde la papelera?',
    'p.related':'Registros relacionados','p.relatedCount':'{count} registros relacionados','p.relatedHelp':'Este contacto tiene registros relacionados. Archívalo para conservar esas relaciones.',
    'p.merge':'Comparar y fusionar','p.mergeTitle':'Comparar contactos antes de fusionar','p.mergeHelp':'Elige el contacto que se conserva, resuelve cada campo diferente y revisa la unión de roles y teléfonos.',
    'p.keep':'Conservar este contacto','p.mergeOther':'Contacto que se fusiona en él','p.useKeep':'Usar valor conservado','p.useMerge':'Usar valor del otro','p.combineNotes':'Combinar observaciones',
    'p.field':'Campo','p.retained':'Contacto conservado','p.other':'Otro contacto','p.resolution':'Valor que se conserva','p.mergeRoles':'Roles resultantes','p.mergePhones':'Teléfonos resultantes',
    'p.mergeHistory':'Las relaciones operativas pasan al contacto conservado. El historial económico, de donaciones y de inventario conserva la referencia original y se atribuye al contacto conservado.',
    'p.mergeConflict':'Ambos contactos tienen el mismo tipo de perfil. Actualmente no se pueden fusionar; revisa primero sus perfiles de acogida o voluntariado.',
    'p.mergeConfirm':'He revisado la comparación y quiero fusionar estos contactos.','p.applyMerge':'Fusionar contactos','p.confirmNeeded':'Revisa y confirma primero esta acción.',
    'p.fosterProfile':'Perfil de acogida','p.volunteerProfile':'Perfil de voluntariado','p.capacity':'Capacidad total','p.occupancy':'Ocupación actual','p.free':'Plazas libres',
    'p.occupancyValue':'{occupied} ocupadas / {capacity} plazas · {free} libres','p.overCapacity':'Capacidad superada con excepciones registradas','p.species':'Especies admitidas',
    'p.sizes':'Tamaños admitidos','p.availability':'Disponibilidad','p.availability.available':'Disponible','p.availability.unavailable':'No disponible','p.availability.conditional':'Condicionada',
    'p.restrictions':'Condiciones o restricciones','p.currentAnimals':'Animales actuales','p.stayHistory':'Historial de acogidas','p.animal':'Animal','p.start':'Fecha de inicio','p.end':'Fecha de fin',
    'p.openStay':'Acogida abierta','p.reason':'Motivo de finalización','p.exception':'Excepción registrada','p.stayDateHelp':'La fecha de fin es el día del cambio de ubicación; el intervalo incluye el inicio y excluye el final.',
    'p.functions':'Funciones','p.specialties':'Especialidades','p.status':'Estado','p.volunteerAvailability':'Detalles de disponibilidad','p.hours':'Actividad y horas',
    'p.logHours':'Registrar actividad','p.editHours':'Editar actividad','p.activity':'Actividad','p.date':'Fecha','p.durationMinutes':'Duración en minutos',
    'p.minutesHelp':'Introduce minutos enteros entre 1 y 1440 (24 horas).','p.duration':'{hours} h {minutes} min','p.total':'Tiempo total','p.entries':'Actividades registradas',
    'p.period':'Periodo de actividad','p.from':'Desde','p.to':'Hasta','p.periodError':'La fecha final no puede ser anterior a la inicial.','p.periodTotals':'{duration} en {count} actividades registradas',
    'p.trashHours':'Enviar actividad a papelera','p.restoreHours':'Restaurar actividad','p.trashHoursConfirm':'¿Enviar esta actividad a la papelera? Dejará de contar en los totales.',
    'p.restoreHoursConfirm':'¿Restaurar esta actividad y volver a incluirla en los totales?','p.hoursTrashHelp':'Las actividades en papelera no cuentan en los totales.',
    'p.error.state':'El registro actual o su historial relacionado no permite este cambio. Revisa la ficha y sus perfiles antes de intentarlo de nuevo.',
    'p.error.input':'Revisa los valores y registros seleccionados. No se han guardado los cambios.','p.saved':'Cambios guardados.',
    'p.sort':'Ordenar por nombre','p.ascending':'De A a Z','p.descending':'De Z a A','p.contactDetails':'Datos de contacto','p.actions':'Acciones',
    'p.profileExists':'Este contacto ya tiene ese perfil. Abre su ficha para editarlo.','p.availableContacts':'Contactos disponibles',
    'p.durationColumn':'Duración','p.confirmAction':'Confirmar acción'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'af.entry':'Registrar entrada de animal','af.reentry':'Registrar nueva entrada','af.edit':'Editar datos del animal','af.weight':'Registrar peso',
    'af.name':'Nombre','af.species':'Especie','af.size':'Tamaño','af.sex':'Sexo','af.sex.male':'Macho','af.sex.female':'Hembra','af.sex.unknown':'Desconocido',
    'af.more':'Otros datos del animal','af.birth':'Nacimiento y edad','af.birthKind':'Información de nacimiento conocida','af.birthKind.unknown':'Desconocida',
    'af.birthKind.exact':'Fecha de nacimiento exacta','af.birthKind.estimated_date':'Fecha de nacimiento estimada','af.birthKind.estimated_age':'Edad estimada en una fecha de referencia',
    'af.birthDate':'Fecha de nacimiento','af.estimatedAgeMonths':'Edad estimada en meses enteros','af.estimatedAgeReferenceDate':'Fecha de referencia de la edad',
    'af.breed':'Raza','af.color':'Color','af.microchip':'Microchip o identificador','af.sterilization':'Estado de esterilización',
    'af.sterilization.yes':'Sí','af.sterilization.no':'No','af.sterilization.unknown':'Desconocido','af.sterilizationDate':'Fecha de esterilización',
    'af.code':'Código manual opcional','af.codeHelp':'Déjalo vacío para asignar un código automático. El formato A-número está reservado para la secuencia automática. Un código asignado no se puede editar.',
    'af.description':'Descripción','af.character':'Carácter','af.behavior':'Comportamiento','af.specialNeeds':'Necesidades especiales','af.notes':'Observaciones del animal',
    'af.entryDate':'Fecha de entrada','af.entryReason':'Motivo de entrada','af.origin':'Procedencia o ubicación anterior','af.episodeNotes':'Observaciones de la entrada',
    'af.locationKind':'Ubicación inicial','af.location.shelter':'Ubicación de la protectora','af.location.temporary_external':'Ubicación externa temporal',
    'af.locationId':'Ubicación de la protectora','af.externalDescription':'Describe la ubicación externa temporal','af.availability':'Disponibilidad para adopción',
    'af.availability.available':'Disponible','af.availability.unavailable':'No disponible','af.availabilityHelp':'Elige expresamente la disponibilidad para adopción. La ubicación no la determina.',
    'af.grams':'Peso en gramos','af.gramsHelp':'Introduce un número entero positivo de gramos (por ejemplo, 12500 para 12,5 kg). El peso actual se deriva de las mediciones fechadas.',
    'af.date':'Fecha','af.measurementNotes':'Observaciones de la medición','af.archive':'Archivar animal','af.trash':'Enviar animal a papelera','af.restore':'Restaurar animal',
    'af.dispositionConfirm':'He revisado la ficha y quiero aplicar esta acción.','af.archiveHelp':'El animal se retira de las listas operativas; se conservan sus episodios, documentos e historial. Antes hay que resolver el cuidado actual y las tareas pendientes.',
    'af.trashHelp':'Es un borrado lógico reversible. Se conserva el historial relacionado. Antes hay que resolver el cuidado actual y las tareas pendientes.',
    'af.restoreHelp':'Restaura este animal desde el archivo o la papelera. No reabre episodios ni cambia su situación de gestión actual.',
    'af.exit':'Registrar salida o fallecimiento','af.exitMode':'¿Qué ha ocurrido?','af.choose':'Elige una opción','af.exitMode.death':'Fallecimiento',
    'af.exitMode.transfer':'Traslado a otra organización','af.exitMode.other':'Otra salida documentada','af.reason':'Motivo',
    'af.departureDetails':'Salida y registros relacionados','af.fosterEndReason':'Motivo de finalización de la acogida abierta','af.reservationClosureReason':'Motivo de cierre de la reserva activa',
    'af.applicationClosureReason':'Motivo de cierre de las solicitudes abiertas','af.taskDecision':'Decisión para esta tarea pendiente',
    'af.task.keep':'Conservar esta tarea pendiente','af.task.cancel':'Cancelar esta tarea con motivo','af.taskReason':'Motivo de cancelación de la tarea',
    'af.tasksHelp':'Decide para cada tarea pendiente si sigue siendo necesaria. Las tareas conservadas mantienen su estado actual. Las canceladas necesitan un motivo.',
    'af.exitConfirm':'He revisado la fecha, los motivos, los cierres relacionados y cada tarea pendiente, y quiero registrar este hecho.',
    'af.exitHelp':'El hecho cierra conjuntamente el episodio actual y las acogidas, reserva y solicitudes abiertas. Se conserva el historial. Las tareas siguen tus decisiones expresas.',
    'af.entryUnavailable':'Restaura primero el animal. Los adoptados vuelven mediante la devolución de adopción; los fallecidos requieren una corrección histórica.',
    'af.saved':'Cambios guardados.','af.invalidCode':'Elige un código manual fuera del formato reservado A-número o deja el campo vacío.',
    'af.taskReasonRequired':'Introduce un motivo para cada tarea que has decidido cancelar.','af.confirmRequired':'Revisa y confirma primero la acción.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'nav.documents':'Documentos',
    'd.title':'Título','d.type':'Tipo de documento','d.date':'Fecha','d.notes':'Observaciones','d.additional':'Información adicional',
    'd.externalName':'Nombre del archivo externo','d.location':'Dónde se conserva el archivo externo','d.fileType':'Formato o tipo de archivo',
    'd.originalFile':'Seleccionar el original para registrar su hash (opcional)','d.file':'Archivo',
    'd.externalHelp':'Este archivo está fuera de la aplicación. Su contenido no se incluye en la copia de seguridad; conserva también el archivo original.',
    'd.hashHelp':'El archivo se lee para calcular un hash SHA-256. Su contenido no se guarda. Máximo de 128 MiB para comparar el hash.',
    'd.fileHelp':'PDF, JPEG, PNG, WebP o TXT UTF-8, hasta 8 MiB. La aplicación guarda el archivo y lo incluye en las copias. Los documentos se descargan sin incrustar contenido activo.',
    'd.edit':'Editar documento','d.newExternal':'Nueva referencia externa','d.newEmbedded':'Añadir documento incorporado',
    'd.preserve':'Se conservan el archivo, las relaciones y el historial. Puedes restaurar los documentos archivados o enviados a papelera.',
    'd.compare':'Comparar archivo externo seleccionado','d.compareHelp':'Vuelve a seleccionar el archivo original para comparar su hash. No modifica la referencia ni guarda el archivo.',
    'd.noOriginalHash':'Esta referencia no tiene un hash original con el que comparar. El archivo seleccionado no se ha guardado.',
    'd.matches':'El archivo seleccionado coincide con el hash original registrado.','d.differs':'El archivo seleccionado difiere del hash original registrado. Revisa qué archivo original necesitas.',
    'd.links':'Registros vinculados','d.unlink':'Quitar vínculo','d.noLinks':'Este documento no tiene registros vinculados.',
    'd.linkType':'Tipo de registro','d.linkTarget':'Registro que se vinculará','d.link':'Vincular documento','d.linkExisting':'Elegir un documento existente',
    'd.external':'Referencia externa','d.embedded':'Archivo incorporado','d.noNotes':'Sin observaciones','d.download':'Descargar archivo',
    'd.archive':'Archivar documento','d.unarchive':'Devolver documento a registros activos','d.restore':'Restaurar documento','d.trash':'Papelera',
    'd.active':'Activos','d.archived':'Archivados','d.open':'Abrir documento','d.actions':'Acciones','d.mode':'Modo de almacenamiento','d.state':'Registros',
    'd.previous':'Anterior','d.next':'Siguiente','d.empty':'No hay documentos con estos filtros.','d.page':'Página {page} de {pages} · {count} documentos',
    'd.help':'Incorpora archivos pequeños o registra referencias a los que conservas por separado. Los vínculos permiten utilizar el mismo documento en varias fichas.',
    'd.budget':'Archivos incorporados: {used} MiB de {limit} MiB. Sustituir una foto conserva los recursos anteriores; los archivos no se eliminan automáticamente.',
    'd.search':'Buscar por título, observaciones o nombre externo','d.all':'Activos y archivados','d.allModes':'Todos los modos',
    'r.title':'Recuperación local','r.help':'Los conjuntos anteriores permanecen en este perfil del navegador. Antes de recuperar uno, crea y vuelve a seleccionar una copia verificada de la revisión actual. La recuperación valida y prepara un conjunto separado y conserva el actual.',
    'r.recover':'Revisar recuperación','r.unnamed':'Conjunto sin organización','r.retired':'Conjunto anterior','r.staging':'Preparación interrumpida','r.records':'{count} registros · {bytes} bytes incorporados','r.incomplete':'Esta preparación no está activa. Nunca se activa automáticamente. Los datos activos anteriores se conservan.','r.empty':'No hay conjuntos anteriores ni preparaciones interrumpidas disponibles aquí.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'fw.title': 'Estancias en acogida', 'fw.assign': 'Asignar acogida', 'fw.endStay': 'Finalizar acogida',
    'fw.manageProfiles': 'Gestionar perfiles de acogida', 'fw.profile': 'Perfil de acogida existente', 'fw.choose': 'Elige una opción',
    'fw.profileOption': '{name} · {occupied} de {capacity} plazas ocupadas', 'fw.startDate': 'Fecha de inicio', 'fw.endDate': 'Fecha de finalización',
    'fw.notes': 'Notas de la estancia', 'fw.confirmException': 'Confirmo esta acogida como excepción documentada',
    'fw.exceptionReason': 'Motivo de la excepción', 'fw.exceptionHelp': 'Explica por qué se registra esta acogida a pesar de los avisos. Hasta 200 caracteres.',
    'fw.assignHelp': 'Elige una familia de acogida existente y revisa su ocupación y condiciones actuales. Se conserva la disponibilidad para adopción.',
    'fw.noProfiles': 'No hay perfiles de acogida activos vinculados a contactos activos. En Acogidas, selecciona un contacto existente y crea primero su perfil.',
    'fw.chooseProfile': 'Elige un perfil de acogida existente antes de guardar.', 'fw.exceptionRequired': 'Confirma la excepción e indica el motivo. No se han guardado cambios.',
    'fw.exceptionWarning': 'Esta acogida necesita una excepción explícita:', 'fw.warningAvailability': 'Este perfil no figura como disponible actualmente.',
    'fw.warningCapacity': 'El perfil no tiene plazas libres dentro de su capacidad declarada.', 'fw.warningSpecies': 'La especie del animal no figura entre las admitidas.',
    'fw.warningUnknownSize': 'Se desconoce el tamaño del animal y no se puede confirmar la compatibilidad.', 'fw.warningSize': 'El tamaño del animal no figura entre los admitidos.',
    'fw.compatible': 'El perfil está disponible y encaja con la capacidad, especie y tamaño registrados. Revisa también las restricciones escritas.',
    'fw.occupancy': 'Ocupación actual', 'fw.occupancyValue': '{occupied} de {capacity} plazas ocupadas · {free} libres',
    'fw.availability': 'Disponibilidad para nuevas acogidas', 'fw.availability.available': 'Disponible', 'fw.availability.unavailable': 'No disponible', 'fw.availability.conditional': 'Condicional',
    'fw.species': 'Especies admitidas', 'fw.sizes': 'Tamaños admitidos', 'fw.restrictions': 'Restricciones', 'fw.profileNotes': 'Notas del perfil',
    'fw.noneAccepted': 'Ninguno declarado', 'fw.currentAnimals': 'Animales acogidos actualmente', 'fw.noCurrentAnimals': 'No hay animales acogidos actualmente.',
    'fw.noNotes': 'Sin datos registrados', 'fw.ongoing': 'En curso', 'fw.saved': 'Estancia en acogida guardada.',
    'fw.endReason': 'Motivo de finalización', 'fw.destination': 'Destino tras esta acogida', 'fw.destination.shelter': 'Refugio',
    'fw.destination.temporary_external': 'Ubicación externa temporal', 'fw.shelter': 'Ubicación del refugio', 'fw.externalDescription': 'Descripción de la ubicación externa temporal',
    'fw.endSummary': '{animal} está en acogida con {contact} desde el {date}.',
    'fw.endHelp': 'Se conserva el historial de la estancia. Elige el destino real; se mantienen la disponibilidad para adopción y cualquier reserva.',
    'fw.chooseDestination': 'Elige un destino en refugio o una ubicación externa temporal antes de guardar.',
    'fw.intervalHelp': 'Se incluye la fecha de inicio; la fecha de finalización es el día del cambio de ubicación y no se incluye en la duración de la estancia.',
    'fw.inactiveAnimal': 'Asignar y finalizar acogidas está disponible para animales activos bajo cuidado. Las estancias anteriores se conservan visibles.',
    'fw.invalidOpenStays': 'Hay más de una acogida abierta. Revisa la integridad de los datos antes de registrar otra transición.',
    'fw.currentStay': 'Familia de acogida actual', 'fw.history': 'Historial de estancias', 'fw.empty': 'Este animal todavía no tiene estancias en acogida registradas.',
    'fw.contact': 'Contacto de acogida', 'fw.noException': 'Sin excepción'
  });
}(window.RescueManager));

/* Fragmento de integración: fusionar claves en locales/es.js; no cargar por separado. */
(function(root){
  'use strict';
  root.locales.es=Object.freeze({...root.locales.es,...{
  'aw.applications': 'Solicitudes de adopción', 'aw.help': 'Aprobar, reservar y formalizar una adopción son pasos distintos. Se conservan los registros anteriores y su historia.',
  'aw.new': 'Nueva solicitud', 'aw.contactId': 'Contacto existente', 'aw.contactHelp': 'Selecciona un contacto de la agenda central. Al guardar se añade el rol de adoptante.',
  'aw.noContacts': 'Crea o restaura un contacto activo en la agenda y vuelve para registrar la solicitud.', 'aw.choose': 'Selecciona una opción',
  'aw.applicationDate': 'Fecha de solicitud', 'aw.interviewNotes': 'Entrevista y observaciones', 'aw.notes': 'Notas', 'aw.review': 'Registrar entrevista / revisión',
  'aw.reviewHelp': 'Guarda la entrevista y marca la solicitud en revisión. No aprueba ni reserva al animal.',
  'aw.approve': 'Aprobar solicitud', 'aw.approvalDate': 'Fecha de aprobación', 'aw.approveHelp': 'Aprobar la solicitud no crea una reserva ni formaliza una adopción.',
  'aw.reject': 'Rechazar solicitud', 'aw.cancel': 'Cancelar solicitud', 'aw.date': 'Fecha del cambio', 'aw.reason': 'Motivo',
  'aw.closeApplicationHelp': 'La solicitud quedará cerrada con este motivo. Se conservan entrevista, aprobación y demás historia.',
  'aw.closeApplicationReservedHelp': 'Se cierran juntos la solicitud y su reserva activa. Elige la disponibilidad que tendrá el animal después.',
  'aw.reserve': 'Reservar para este solicitante', 'aw.reservationDate': 'Fecha de reserva', 'aw.expiresOn': 'Válida hasta (opcional)',
  'aw.expiryHelp': 'La reserva sigue siendo válida durante todo el día de vencimiento. Su caducidad se registra expresamente desde el día siguiente; no se cierra automáticamente.',
  'aw.reserveHelp': 'Se crea una reserva activa para este solicitante y el animal pasa a reservado. No formaliza la adopción.',
  'aw.reservation.cancelled': 'Cancelar reserva', 'aw.reservation.expired': 'Registrar caducidad de reserva',
  'aw.closeReservationHelp': 'Se cierra la reserva y se establece la disponibilidad elegida. La solicitud aprobada sigue abierta; no se crea una adopción.',
  'aw.availability': 'Disponibilidad después del cambio', 'aw.availability.available': 'Disponible para adopción', 'aw.availability.unavailable': 'No disponible para adopción',
  'aw.confirmed': 'He revisado y confirmo las consecuencias descritas arriba', 'aw.confirmRequired': 'Revisa las consecuencias y marca la confirmación antes de guardar. No se ha guardado nada.',
  'aw.complete': 'Formalizar adopción', 'aw.adoptionDate': 'Fecha de adopción', 'aw.completeHelp': 'Se crea la adopción, se cierran el episodio actual y la acogida/reserva abiertas, y se cancelan las demás solicitudes abiertas con tus motivos. Revisa cada tarea pendiente y confirma. Los cambios se guardan juntos.',
  'aw.fosterEndReason': 'Motivo para finalizar la acogida abierta', 'aw.reservationClosureReason': 'Motivo para cerrar la reserva activa',
  'aw.otherApplicationsReason': 'Motivo para cancelar las otras solicitudes abiertas', 'aw.otherApplications': 'Otras solicitudes que se cerrarán: {count}',
  'aw.taskDecision': 'Decisión para esta tarea pendiente', 'aw.taskReason': 'Motivo para cancelar esta tarea', 'aw.task.keep': 'Conservar como seguimiento pendiente',
  'aw.task.cancel': 'Cancelar con motivo', 'aw.taskReasonRequired': 'Elige conservar o cancelar cada tarea. Cada cancelación necesita su propio motivo. No se ha guardado nada.',
  'aw.feeSection': 'Ingreso de adopción opcional', 'aw.recordFee': 'Registrar una cuota de adopción como ingreso en la misma operación', 'aw.categoryId': 'Categoría de ingreso',
  'aw.concept': 'Concepto del ingreso', 'aw.amount': 'Importe', 'aw.decimalSeparator': 'Separador decimal', 'aw.decimalDot': 'Punto (p. ej., 12.50)', 'aw.decimalComma': 'Coma (p. ej., 12,50)',
  'aw.feeHelp': 'Moneda de la organización: {currency}. Hasta {precision} decimales, sin separadores de miles. Deja desmarcada la cuota para no crear ningún movimiento económico.',
  'aw.positiveFee': 'La cuota de adopción debe ser positiva. No se ha guardado nada.', 'aw.invalidFee': 'Introduce un importe positivo con el separador elegido y los decimales de la moneda, sin separadores de miles. No se ha guardado nada.',
  'aw.return': 'Registrar devolución', 'aw.returnDate': 'Fecha de devolución', 'aw.returnReason': 'Motivo de devolución',
  'aw.returnHelp': 'Se conserva la adopción, se registra su fecha y motivo de devolución, se crea un nuevo episodio y el animal vuelve a cuidado con la ubicación y disponibilidad elegidas. No se reabren solicitudes ni reservas cerradas.',
  'aw.locationKind': 'Ubicación actual tras la devolución', 'aw.location.shelter': 'Protectora', 'aw.location.temporary_external': 'Ubicación externa temporal',
  'aw.locationId': 'Ubicación de la protectora', 'aw.externalDescription': 'Describe la ubicación externa temporal', 'aw.saved': 'El cambio del proceso de adopción se ha guardado.',
  'aw.empty': 'No hay registros para mostrar.', 'aw.notSpecified': 'Sin especificar', 'aw.restoreFirst': 'Restaura este animal antes de registrar un nuevo cambio del proceso.',
  'aw.filter': 'Estado de la solicitud', 'aw.allStates': 'Todos los estados', 'aw.previous': 'Anterior', 'aw.next': 'Siguiente', 'aw.page': 'Página {page} de {pages} · {count} solicitudes',
  'aw.details': 'Entrevista, notas y datos del cierre', 'aw.closureReason': 'Motivo de cierre', 'aw.otherReservation': 'Cierra la reserva del otro solicitante antes de formalizar esta adopción.',
  'aw.contactUnavailable': 'El contacto está archivado o en la papelera. Restáuralo antes de aprobar, reservar o formalizar la adopción.',
  'aw.reservations': 'Reservas', 'aw.status': 'Estado', 'aw.closedOn': 'Fecha de cierre', 'aw.reservationStatus.active': 'Activa',
  'aw.reservationStatus.cancelled': 'Cancelada', 'aw.reservationStatus.expired': 'Caducada', 'aw.reservationStatus.fulfilled': 'Formalizada en adopción',
  'aw.adoptions': 'Adopciones realizadas y devoluciones', 'aw.historyHelp': 'Cada adopción es un hecho histórico. Una devolución crea un episodio nuevo y no borra la adopción anterior.',
  'aw.recordedFee': 'Movimiento económico relacionado', 'aw.documents': 'Documentos vinculados a esta adopción'
  }});
}(window.RescueManager));

(function(root){
  'use strict';
  const labels={title:'Título',dueDate:'Fecha prevista',typeId:'Tipo de tarea',priority:'Prioridad',animalId:'Animal',contactId:'Contacto',responsibleVolunteerId:'Voluntario responsable',dueLocalTime:'Hora local (opcional)',timeZone:'Zona horaria',description:'Descripción',notes:'Notas',status:'Estado',date:'Fecha de realización o cancelación',reason:'Motivo de cancelación',confirmed:'Confirmo esta acción y su fecha.',confirmRequired:'Revisa y confirma la acción antes de continuar.',more:'Más detalles',new:'Nueva tarea',edit:'Editar tarea',complete:'Marcar como realizada',cancelTask:'Cancelar tarea',clinical:'Registrar acto sanitario realizado',needsAnimal:'Selecciona un animal en la tarea antes de registrar el acto sanitario realizado.',timeHelp:'Si indicas hora sin zona horaria, se utiliza la de la organización. Las fechas de calendario no cambian.',noAutomatic:'El vencimiento no realiza actos ni administra medicación. No hay avisos garantizados con la aplicación cerrada.',help:'Las listas, la agenda y el calendario consultan las mismas tareas. Completa o cancela cada tarea expresamente.',open:'Abrir tarea',empty:'No hay tareas con estos filtros.',actions:'Acciones',page:'Página {page} de {pages} · {count} tareas',search:'Buscar título, descripción o notas',openTasks:'Tareas abiertas',all:'Todas',list:'Lista y agenda',calendar:'Calendario',calendarHelp:'Utiliza los mismos filtros de la lista. Desplaza horizontalmente en pantallas estrechas o cambia a la lista. Se muestran hasta tres tareas por día; abre todas para ver el resto.',previousMonth:'Mes anterior',nextMonth:'Mes siguiente',month:'Mes',from:'Desde la fecha',to:'Hasta la fecha',mode:'Vista',today:'Hoy',moreTasks:'Abrir las {count} tareas'};
  const values={priority:{low:'Baja',medium:'Media',high:'Alta',urgent:'Urgente'},urgency:{overdue:'Vencida',today:'Hoy',next_week:'Próximos siete días',later:'Más adelante',closed:'Cerrada'},day:{mon:'Lun',tue:'Mar',wed:'Mié',thu:'Jue',fri:'Vie',sat:'Sáb',sun:'Dom'}};
  const additions=Object.fromEntries(Object.entries(labels).map(([key,value])=>['q.'+key,value]));for(const[kind,entries]of Object.entries(values))for(const[key,value]of Object.entries(entries))additions['q.'+kind+'.'+key]=value;
  root.locales.es=Object.freeze({...root.locales.es,...additions,'q.inactive':'Inactivo','q.reviewAssignedVolunteer':'El voluntario asignado ya no está activo. Selecciona otro o quita expresamente la asignación antes de guardar.','nav.tasks':'Tareas y calendario'});
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'hw.title': 'Salud y cuidados', 'hw.record': 'Registrar acto sanitario realizado', 'hw.newPlan': 'Crear plan de cuidados', 'hw.editPlan': 'Editar plan de cuidados',
    'hw.help': 'Los actos realizados, las instrucciones de cuidados y las tareas previstas utilizan el mismo historial del animal. Alcanzar una fecha prevista no registra el acto como realizado.',
    'hw.activeAnimalRequired': 'Restaura la ficha del animal como activa antes de añadir actos sanitarios o planes de cuidados.',
    'hw.type': 'Tipo de acto realizado', 'hw.date': 'Fecha de realización', 'hw.recordTitle': 'Título o motivo', 'hw.description': 'Descripción', 'hw.results': 'Resultados', 'hw.notes': 'Notas',
    'hw.more': 'Profesional, plan relacionado y detalles adicionales', 'hw.veterinarianContactId': 'Contacto veterinario existente', 'hw.clinicContactId': 'Organización clínica existente',
    'hw.carePlanId': 'Plan de cuidados abierto relacionado', 'hw.nextReviewTaskId': 'Tarea de próxima revisión existente',
    'hw.nextTaskHelp': 'Selecciona una tarea ya prevista para este animal. Aquí no se crea una nueva cita.',
    'hw.taskOption': '{title} · {date}', 'hw.conditionState': 'Estado de enfermedad o alergia', 'hw.condition.unknown': 'Desconocido / sin registrar',
    'hw.condition.active': 'Activa', 'hw.condition.resolved': 'Resuelta', 'hw.resolvedOn': 'Fecha de resolución, si se conoce',
    'hw.expenses': 'Gasto relacionado', 'hw.expenseMode': 'Acción sobre el gasto', 'hw.expenseMode.none': 'Sin gasto relacionado',
    'hw.expenseMode.new': 'Crear un único gasto nuevo', 'hw.expenseMode.existing': 'Vincular un gasto existente',
    'hw.expenseMovementId': 'Gasto contabilizado existente de este animal', 'hw.choose': 'Elige una opción', 'hw.expenseOption': '{date} · {concept} · {amount}',
    'hw.existingExpenseHelp': 'Selecciona la factura ya registrada de este animal. Vincularla a otro acto no crea ni suma otro gasto.',
    'hw.expenseCategoryId': 'Categoría del gasto', 'hw.expenseConcept': 'Concepto del gasto', 'hw.expenseAmount': 'Importe del gasto',
    'hw.decimalSeparator': 'Separador decimal para este importe', 'hw.separator.dot': 'Punto (.)', 'hw.separator.comma': 'Coma (,)',
    'hw.expenseContactId': 'Contacto existente del gasto', 'hw.expenseNotes': 'Notas del gasto',
    'hw.amountHelp': 'Los gastos nuevos usan {currency}, con hasta {precision} decimales y sin separadores de miles. La fecha del gasto será la fecha de realización.',
    'hw.completePlan': 'Completar el plan de cuidados seleccionado tras este acto',
    'hw.completePlanHelp': 'Cierra el plan expresamente. Antes hay que completar o cancelar por separado las otras tareas pendientes.',
    'hw.performedConfirmed': 'Confirmo que este acto previsto se realizó en la fecha indicada',
    'hw.performedHelp': 'El registro sanitario y la finalización de esta tarea se guardan juntos.', 'hw.performTask': 'Confirmar tarea sanitaria realizada',
    'hw.performTaskHelp': 'Documenta el acto realizado. Guardar confirma esta tarea prevista como completada; no crea una segunda tarea.',
    'hw.recordHelp': 'Introduce un acto que ya se haya realizado. Este formulario no programa ni recomienda tratamientos.',
    'hw.confirmPerformed': 'Confirma la realización del acto antes de completar la tarea.',
    'hw.pendingPlanTasks': 'Resuelve las otras tareas pendientes antes de completar este plan. No se han guardado cambios.',
    'hw.amountRequired': 'Introduce el importe del gasto nuevo.', 'hw.expenseRequired': 'Elige el gasto existente que se vinculará.',
    'hw.planSelected': 'Plan seleccionado: {name}', 'hw.pendingPlanHelp': 'El plan no puede cerrarse mientras estas tareas estén pendientes. Completa o cancela cada una expresamente:',
    'hw.canCompletePlan': 'No hay otras tareas pendientes que impidan completar expresamente este plan.',
    'hw.name': 'Nombre del plan', 'hw.typeId': 'Tipo de plan', 'hw.startDate': 'Fecha de inicio del plan', 'hw.plannedEndDate': 'Fecha de fin prevista, si se conoce',
    'hw.status': 'Estado del plan', 'hw.medication': 'Medicamento, si procede', 'hw.instructions': 'Instrucciones aportadas por el profesional',
    'hw.doseInstructions': 'Instrucciones de dosis', 'hw.routeInstructions': 'Instrucciones de vía', 'hw.frequencyInstructions': 'Instrucciones de frecuencia',
    'hw.instructionsHelp': 'Registra instrucciones aportadas por el usuario o profesional veterinario. La aplicación no calcula dosis, recomienda tratamientos ni administra nada automáticamente.',
    'hw.closeConfirmed': 'Confirmo el cierre o cancelación de este plan', 'hw.confirmClose': 'Confirma el cierre o cancelación del plan.',
    'hw.saved': 'Información sanitaria guardada.', 'hw.unknown': 'Sin registrar', 'hw.empty': 'Todavía no se han registrado actos sanitarios realizados.',
    'hw.linkedExpense': '{concept} · {amount} · {status}', 'hw.noExpense': 'Sin gasto vinculado', 'hw.linkedTasks': 'Tareas relacionadas',
    'hw.activeConditions': 'Enfermedades y alergias registradas como activas', 'hw.performedHistory': 'Historial sanitario realizado', 'hw.actions': 'Acciones',
    'hw.openRecord': 'Abrir registro sanitario', 'hw.sharedInvoiceHelp': 'Una factura puede vincularse a varios actos. Estas filas no deben sumarse como gastos independientes; los totales económicos cuentan cada movimiento una vez.',
    'hw.plans': 'Planes de cuidados', 'hw.emptyPlans': 'Todavía no hay planes de cuidados registrados.', 'hw.pendingCount': '{count} tareas pendientes del plan',
    'hw.scheduleTask': 'Programar una tarea del plan', 'hw.tasks': 'Tareas y calendario'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'f.amountInvalid':'Introduce el importe con el separador elegido y los decimales de la moneda, sin separadores de miles.',
    'nav.finance': 'Finanzas', 'f.create': 'Registrar ingreso o gasto', 'f.correct': 'Corregir mediante sustituto', 'f.void': 'Anular movimiento',
    'f.date': 'Fecha del movimiento', 'f.direction': 'Dirección', 'f.direction.income': 'Ingreso', 'f.direction.expense': 'Gasto', 'f.categoryId': 'Categoría',
    'f.concept': 'Concepto', 'f.amount': 'Importe', 'f.decimalSeparator': 'Separador decimal', 'f.separator.dot': 'Punto (.)', 'f.separator.comma': 'Coma (,)',
    'f.animalId': 'Animal existente', 'f.contactId': 'Contacto existente', 'f.notes': 'Notas', 'f.reason': 'Motivo de corrección o anulación',
    'f.correctionDate': 'Fecha de corrección', 'f.voidDate': 'Fecha de anulación', 'f.confirmed': 'Confirmo el cambio y sus efectos en los registros vinculados',
    'f.choose': 'Elige una opción', 'f.inactive': 'Inactivo: revisa la selección',
    'f.amountHelp': 'Moneda de trabajo: {currency}. Introduce hasta {precision} decimales con el separador elegido, sin separadores de miles. El importe debe ser positivo.',
    'f.manualHelp': 'Esto crea un movimiento económico. No crea una donación, acto sanitario, adopción ni movimiento de existencias. Registra esos hechos desde su propio módulo.',
    'f.correctionHelp': 'El original se anula y se conserva. Se crea un sustituto de la misma dirección y se reasignan juntos los registros vinculados. Revisa categorías o contactos inactivos antes de guardar.',
    'f.originalSummary': 'Original: {concept} · {amount}', 'f.amountPositive': 'Introduce un importe mayor que cero.',
    'f.confirmRequired': 'Confirma la corrección o anulación antes de guardar.',
    'f.voidHelp': 'Anular conserva este movimiento y lo excluye de los totales. También anula una donación económica vinculada. Se conservan actos sanitarios, adopciones y movimientos físicos de inventario; no se devuelven existencias automáticamente.',
    'f.saved': 'Operación económica guardada.', 'f.source': 'Origen', 'f.source.manual': 'Registro económico manual', 'f.source.donation': 'Donación',
    'f.source.veterinary_record': 'Acto sanitario realizado', 'f.source.adoption': 'Adopción', 'f.source.inventory_movement': 'Movimiento de inventario',
    'f.sourceDescription': '{type}: {description}', 'f.status': 'Estado', 'f.original': 'Ver original corregido: {concept} · {amount}',
    'f.replacement': 'Ver sustituto: {concept} · {amount}', 'f.relatedRecords': 'Registros de negocio vinculados',
    'f.relatedHelp': 'Estas referencias comparten este movimiento económico. Abrirlo o corregirlo no repite la operación de negocio original.',
    'f.from': 'Desde, incluido', 'f.to': 'Hasta, incluido', 'f.search': 'Buscar concepto, notas, contacto, animal o categoría',
    'f.all': 'Todos', 'f.periodError': 'La fecha final debe ser igual o posterior a la inicial.',
    'f.total.income': 'Ingresos filtrados', 'f.total.expense': 'Gastos filtrados', 'f.total.balance': 'Saldo filtrado',
    'f.totalsHelp': 'Los totales incluyen todos los movimientos coincidentes de todas las páginas y excluyen anulados. Los filtros de dirección, categoría, contacto y animal también afectan al saldo. Al mostrar solo anulados, los totales son cero.',
    'f.empty': 'No hay movimientos con estos filtros.', 'f.open': 'Abrir movimiento', 'f.actions': 'Acciones', 'f.page': 'Página {page} de {pages} · {count} movimientos',
    'f.help': 'Ingresos y gastos en la moneda de la organización. Las correcciones conservan el registro original. Este registro no ofrece contabilidad fiscal ni certificación de donativos.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'nav.donations': 'Donaciones',
    'dn.help': 'Registra donaciones económicas y materiales. Una donación económica crea exactamente un ingreso; una material puede añadir existencias sin contar como dinero.',
    'dn.newMonetary': 'Registrar donación económica', 'dn.newMaterial': 'Registrar donación material', 'dn.void': 'Anular donación',
    'dn.date': 'Fecha de la donación', 'dn.donorContactId': 'Contacto donante existente', 'dn.categoryId': 'Categoría de ingreso', 'dn.concept': 'Concepto del ingreso',
    'dn.amount': 'Importe', 'dn.decimalSeparator': 'Separador decimal', 'dn.separator.dot': 'Punto (.)', 'dn.separator.comma': 'Coma (,)',
    'dn.notes': 'Notas', 'dn.reason': 'Motivo de anulación', 'dn.voidDate': 'Fecha de anulación', 'dn.confirmed': 'Confirmo la anulación y sus efectos en los registros vinculados',
    'dn.confirmRequired': 'Confirma la anulación antes de guardar.',
    'dn.type': 'Tipo', 'dn.type.monetary': 'Económica', 'dn.type.material': 'Material',
    'dn.status': 'Estado', 'dn.status.recorded': 'Registrada', 'dn.status.voided': 'Anulada',
    'dn.donor': 'Donante', 'dn.summary': 'Descripción', 'dn.value': 'Importe o valor',
    'dn.income': 'Ingreso relacionado', 'dn.lines': 'Líneas de materiales', 'dn.noLines': 'No hay líneas de materiales registradas.',
    'dn.lineCount': '{count} líneas', 'dn.materialTypeId': 'Tipo de material', 'dn.description': 'Descripción', 'dn.quantity': 'Cantidad',
    'dn.quantityPrecision': 'Decimales', 'dn.unitId': 'Unidad', 'dn.inventoryItemId': 'Incorporar a artículo de inventario (opcional)',
    'dn.estimatedValueMinor': 'Valor estimado (opcional)', 'dn.estimatedValue': 'Valor estimado (no es ingreso): {value}', 'dn.estimatedNone': 'Sin valor estimado',
    'dn.amountHelp': 'Moneda de trabajo: {currency}. Introduce hasta {precision} decimales con el separador elegido, sin separadores de miles. El importe debe ser positivo.',
    'dn.monetaryHelp': 'Esto crea la donación y exactamente un ingreso en el mismo guardado. El importe sale de ese ingreso; no hay una segunda cifra editable.',
    'dn.materialHelp': 'Registra una o más líneas. Seleccionar un artículo de inventario crea un movimiento de existencias por línea; el valor estimado nunca cuenta como ingreso monetario.',
    'dn.quantityHelp': 'Cantidad entera o decimal con los decimales de la línea y el separador elegido.',
    'dn.estimatedHelp': 'Opcional, en la moneda de trabajo. Es informativo y nunca se suma a los ingresos.',
    'dn.addLine': 'Añadir línea', 'dn.removeLine': 'Quitar', 'dn.lineRequired': 'Una donación material necesita al menos una línea.', 'dn.lineInvalid': 'Revisa cada línea: tipo de material, descripción, cantidad positiva y unidad.',
    'dn.voidHelp': 'Anular conserva la donación. Una económica anula también su ingreso; una material crea un ajuste compensatorio de existencias por cada línea incorporada. Se conservan los registros originales.',
    'dn.search': 'Buscar notas, concepto o donante', 'dn.from': 'Desde, incluido', 'dn.to': 'Hasta, incluido', 'dn.all': 'Todos', 'dn.periodError': 'La fecha final debe ser igual o posterior a la inicial.',
    'dn.empty': 'No hay donaciones con estos filtros.', 'dn.open': 'Abrir donación', 'dn.actions': 'Acciones', 'dn.page': 'Página {page} de {pages} · {count} donaciones',
    'dn.saved': 'Donación guardada.', 'dn.linkedIncome': '{concept} · {amount} · {status}', 'dn.linkedItem': 'Artículo de inventario', 'dn.stockMovement': 'Movimiento de existencias', 'dn.noStock': 'No incorporada al inventario',
    'dn.choose': 'Elige una opción', 'dn.inactive': 'Inactivo: revisa la selección', 'dn.openContact': 'Abrir contacto',
    'nav.inventory': 'Inventario',
    'iv.help': 'Artículos, movimientos de existencias y niveles mínimos. Las existencias derivan de los movimientos registrados; las correcciones usan movimientos compensatorios y conservan el rastro.',
    'iv.newItem': 'Nuevo artículo', 'iv.archive': 'Archivar artículo', 'iv.recordMovement': 'Registrar movimiento',
    'iv.name': 'Nombre del artículo', 'iv.categoryId': 'Categoría', 'iv.unitId': 'Unidad', 'iv.quantityPrecision': 'Decimales (0–3)',
    'iv.minimumStockScaled': 'Existencias mínimas', 'iv.supplierContactId': 'Contacto proveedor existente', 'iv.notes': 'Notas',
    'iv.stock': 'Existencias disponibles', 'iv.minimum': 'Mínimo', 'iv.status': 'Estado', 'iv.status.active': 'Activo', 'iv.status.archived': 'Archivado',
    'iv.belowMinimum': 'Bajo mínimos', 'iv.atMinimum': 'En el mínimo', 'iv.ok': 'Sobre el mínimo', 'iv.category': 'Categoría', 'iv.unit': 'Unidad',
    'iv.search': 'Buscar por nombre o notas', 'iv.filterStatus': 'Estado', 'iv.level': 'Nivel de existencias', 'iv.all': 'Todos', 'iv.open': 'Abrir artículo', 'iv.actions': 'Acciones',
    'iv.page': 'Página {page} de {pages} · {count} artículos', 'iv.empty': 'No hay artículos con estos filtros.',
    'iv.movements': 'Movimientos de existencias', 'iv.movementType': 'Tipo de movimiento', 'iv.movementType.opening_balance': 'Saldo inicial', 'iv.movementType.purchase': 'Compra',
    'iv.movementType.donation': 'Donación', 'iv.movementType.consumption': 'Consumo', 'iv.movementType.return': 'Devolución', 'iv.movementType.adjustment': 'Ajuste',
    'iv.date': 'Fecha del movimiento', 'iv.quantity': 'Cantidad', 'iv.direction': 'Dirección', 'iv.direction.in': 'Entrada (+ existencias)', 'iv.direction.out': 'Salida (− existencias)',
    'iv.reason': 'Motivo', 'iv.contactId': 'Contacto existente', 'iv.expenseMovementId': 'Gasto vinculado (solo compra)', 'iv.movementNotes': 'Notas',
    'iv.decimalSeparator': 'Separador decimal', 'iv.separator.dot': 'Punto (.)', 'iv.separator.comma': 'Coma (,)',
    'iv.quantityHelp': 'Este artículo usa {precision} decimales. Introduce la cantidad con el separador elegido. Compras y saldos iniciales suman; el consumo resta.',
    'iv.moveHelp': 'Una compra puede vincular un gasto confirmado existente; aquí no se crea otro gasto. Las donaciones se registran en el módulo de Donaciones. Las existencias nunca pueden quedar negativas.',
    'iv.compensate': 'Compensar con un ajuste', 'iv.compensateReason': 'Motivo', 'iv.compensateDate': 'Fecha del ajuste',
    'iv.compensateHelp': 'Crea el movimiento exactamente opuesto como ajuste, enlazado al original. Sirve para corregir un movimiento erróneo conservando el rastro.',
    'iv.compensateConfirm': 'He revisado el movimiento y quiero registrar su compensación.', 'iv.confirmRequired': 'Confirma la compensación antes de guardar.',
    'iv.archiveConfirm': '¿Archivar {name}? Se conservan los movimientos y el historial; no se podrán añadir nuevos movimientos ordinarios a un artículo archivado.',
    'iv.confirmed': 'He revisado el artículo y quiero archivarlo.', 'iv.choose': 'Elige una opción',
    'iv.saved': 'Inventario guardado.', 'iv.quantityPositive': 'Introduce una cantidad mayor que cero.', 'iv.signRequired': 'Elige una dirección de entrada o salida para este movimiento.',
    'iv.expenseOnlyPurchase': 'Un gasto solo puede vincularse a una compra.', 'iv.supplier': 'Proveedor', 'iv.movementDate': 'Fecha', 'iv.delta': 'Variación',
    'iv.compensated': 'Compensado', 'iv.donationSource': 'De donación material', 'iv.item': 'Artículo', 'iv.stockSummary': 'Resumen de existencias',
    'iv.minimumHelp': 'Las existencias mínimas usan la unidad y los decimales del artículo. Introduce 0 para no tener mínimo.',
    'iv.precisionHelp': 'Los artículos enteros usan 0 decimales; las cantidades con fracciones usan hasta 3.',
    'iv.unitHelp': 'Las unidades y categorías deben ser opciones activas.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.es = Object.freeze({ ...root.locales.es,
    'nav.reports': 'Informes',
    'rp.help': 'Las cifras derivan de los registros actuales y del periodo elegido. Ubicación y disponibilidad de adopción pueden solaparse; los valores del censo actual no son excluyentes entre sí.',
    'rp.from': 'Desde, incluido', 'rp.to': 'Hasta, incluido', 'rp.periodError': 'La fecha final debe ser igual o posterior a la inicial.',
    'rp.census.title': 'Situación actual', 'rp.underCare': 'Animales bajo cuidado', 'rp.inShelter': 'En la protectora', 'rp.inFoster': 'En acogida', 'rp.available': 'Disponibles', 'rp.reserved': 'Reservados',
    'rp.finances.title': 'Finanzas y donaciones del periodo', 'rp.income': 'Ingresos', 'rp.expense': 'Gastos', 'rp.balance': 'Saldo', 'rp.veterinaryExpenses': 'Gastos veterinarios', 'rp.monetaryDonations': 'Donaciones económicas', 'rp.materialDonations': 'Donaciones materiales',
    'rp.entriesAdoptions.title': 'Entradas y adopciones por mes', 'rp.entriesAdoptionsHelp': 'Las entradas cuentan episodios iniciados en el periodo, incluidas las devoluciones. Las adopciones cuentan adopciones realizadas; una devolución posterior no borra el hecho.',
    'rp.entries': 'Entradas', 'rp.adoptions': 'Adopciones',
    'rp.incomeExpense.title': 'Ingresos y gastos por mes',
    'rp.distribution.title': 'Distribución actual', 'rp.dimension': 'Grupo', 'rp.records': 'Registros', 'rp.species': 'Por especie', 'rp.sex': 'Por sexo', 'rp.age': 'Por tramo de edad', 'rp.availability': 'Por disponibilidad de adopción', 'rp.situation': 'Por situación de cuidado',
    'rp.age.under_1': 'Menos de 1 año', 'rp.age.1_to_3': 'De 1 a 3 años', 'rp.age.4_to_7': 'De 4 a 7 años', 'rp.age.8_plus': '8 años o más', 'rp.age.unknown': 'Desconocida',
    'rp.timeToAdoption.title': 'Tiempo hasta la adopción', 'rp.averageDays': 'Media de {days} días en {cases} episodios cerrados', 'rp.noCases': 'Aún no hay episodios cerrados por adopción.',
    'rp.costs.title': 'Costes por animal', 'rp.costsByAnimal': 'Gastos vinculados a un animal', 'rp.animal': 'Animal', 'rp.total': 'Total', 'rp.generalExpenses': 'Gastos generales sin animal', 'rp.costsHelp': 'Los gastos generales se muestran aparte y no se reparten entre animales mediante una fórmula oculta.',
    'rp.empty': 'No hay registros.', 'rp.value': 'Valor'
  });
}(window.RescueManager));

(function(root){'use strict';root.locales.es=Object.freeze({...root.locales.es,
'rp.month':'Mes','rp.year':'Año','rp.annual':'Evolución anual','rp.currentHelp':'Registros actuales a {date}; cambiar el periodo no reconstruye un censo pasado.',
'rp.materialHelp':'{count} líneas materiales; valor estimado {value}. Este valor no es un ingreso económico.',
'rp.adoptionTimeHelp':'Adopciones del periodo vinculadas a episodios cerrados por adopción. Días redondeados al entero más cercano. Una devolución conserva el caso original; se excluyen animales aún no adoptados.',
'rp.ageHelp':'Tramos administrativos en años cumplidos, no clasificaciones veterinarias. Las edades estimadas avanzan desde su fecha de referencia; las desconocidas siguen como desconocidas.',
'rp.chartHelp':'Gráfico: últimos doce meses del periodo. La tabla y las descargas contienen todo el periodo seleccionado. Verde: primera serie; ámbar: segunda serie.',
'rp.rangeError':'No se ha podido calcular el informe. Selecciona fechas válidas con un máximo de 100 años y comprueba que los totales económicos caben en enteros seguros.',
'rp.page':'Página {page} de {pages} · {count} filas','rp.downloadCsv':'Descargar tabla CSV','rp.separator':'Separador CSV','rp.comma':'Coma','rp.semicolon':'Punto y coma','rp.excel':'Incluir BOM UTF-8 para hojas de cálculo',
'rp.json':'Descargar informe JSON','rp.meanDays':'Media de días','rp.exportHelp':'Las descargas contienen todas las filas de cada informe del periodo elegido. Los importes usan punto decimal sin separador de miles. El CSV protege texto potencialmente ejecutable; una hoja de cálculo puede alterar protecciones o tipos al guardar. JSON conserva los valores del informe. Estas descargas no incluyen archivos ni son una copia completa. La impresión abarca las páginas de tablas visibles.'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,'dn.amountInvalid':'Introduce un importe positivo con el separador elegido y los decimales de la moneda.','dn.totalOverflow':'El valor estimado total supera el límite de enteros seguros.'});}(window.RescueManager));

(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'nav.search':'Buscador global','gs.query':'Buscar animales y contactos','gs.start':'Introduce un nombre, código de animal, microchip, teléfono o email.',
 'gs.help':'Los nombres se comparan sin distinguir acentos ni mayúsculas. Teléfonos y microchips se comparan como texto normalizado y conservan sus valores originales. Cada resultado abre su ficha.',
 'gs.count':'{count} resultados','gs.empty':'No hay registros coincidentes.','gs.includeInactive':'Incluir registros archivados y papelera',
 'hi.source':'Registro de origen','hi.openSource':'Abrir registro de origen','hi.missing':'El registro de origen no está disponible en este conjunto de datos.',
 'hi.sourceCurrent':'Este es el registro de origen actual. El historial conserva cada transición registrada; su fecha y estado pueden diferir de los del registro actual.',
 'hi.type':'Tipo de evento','hi.factDate':'Fecha del hecho','hi.recorded':'Registrado el','hi.corrected':'Corregido o anulado',
 'hi.includeCorrected':'Incluir versiones corregidas y anuladas','hi.page':'Página {page} de {pages} · {count} eventos',
 'hi.help':'Los hechos se ordenan por su fecha de calendario y después por el instante de registro. Las horas usan la zona horaria de la organización. Abre el origen para consultar sus detalles. Las versiones sustituidas o anuladas se ocultan inicialmente.',
 'hi.entry.first_entry':'Primera entrada','hi.entry.return':'Devolución','hi.entry.other':'Otra entrada',
 'hi.exit.adoption':'Adopción','hi.exit.deceased':'Fallecimiento','hi.exit.transfer':'Traslado','hi.exit.other':'Otra salida'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'nav.adoptions':'Registro de adopciones','ag.help':'Consulta solicitudes, reservas y adopciones realizadas de todos los animales. Abre un registro para utilizar su flujo de trabajo existente.',
 'ag.search':'Nombre/código de animal o nombre/email de contacto','ag.animal':'Animal','ag.open':'Abrir registro','ag.continue':'Continuar',
 'ag.chooseAnimal':'Elige un animal actualmente bajo cuidado para iniciar una solicitud.','ag.noAnimals':'No hay animales activos bajo cuidado. Registra primero una entrada.',
 'ag.visibility':'Visibilidad de registros','ag.visibility.active':'Registros activos','ag.visibility.all':'Incluir registros archivados','ag.visibility.trash':'Papelera',
 'ag.adoption.active':'Sin devolución','ag.adoption.returned':'Con devolución',
 'ag.periodHelp.application':'El periodo inclusivo filtra las fechas de solicitud. Cada fila muestra el estado actual de la solicitud.',
 'ag.periodHelp.reservation':'El periodo inclusivo filtra las fechas de reserva. La caducidad es inclusiva; superar esa fecha no cierra una reserva silenciosamente.',
 'ag.periodHelp.adoption':'El periodo inclusivo filtra las fechas de adopción realizada. Las adopciones devueltas permanecen en el registro y se pueden filtrar por separado.'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'common.yes':'Sí','common.no':'No','st.preferences':'Visualización, impresión y copias','st.preferencesHelp':'Las preferencias de animales se aplican a su lista. Los datos y el pie de impresión aparecen al imprimir. Los recordatorios se comprueban mientras la aplicación está abierta y no crean copias.',
 'st.animalView':'Vista de la lista de animales','st.pageSize':'Animales por página','st.view.table':'Tabla','st.view.cards':'Tarjetas','st.printDetails':'Datos de la organización para impresión','st.printFooter':'Pie de impresión',
 'st.remindersEnabled':'Activar recordatorios de copias','st.reminderDays':'Días desde la última copia verificada','st.reminderWrites':'Escrituras desde la última copia verificada',
 'st.backupReminder':'Recordatorio de copia','st.backupDue':'Verifica una nueva copia externa: {days} días y {writes} escrituras desde la última copia verificada.',
 'st.noVerifiedBackup':'Todavía no hay una copia externa verificada de este conjunto. Genera una copia, descárgala y selecciona el archivo guardado para verificarlo.',
 'st.reminderHelp':'Copia generada, descarga solicitada y copia verificada son estados distintos. Este recordatorio no confirma que un archivo esté guardado en disco.',
 'st.reminderError':'No se pudo comprobar el recordatorio. Revisa tus copias.',
 'st.logo':'Logotipo de la organización','st.logoAlt':'Logotipo de {name}','st.setLogo':'Elegir logotipo','st.removeLogo':'Retirar logotipo','st.removeLogoConfirm':'Retirar la referencia al logotipo mostrado; los bytes se conservan para recuperación.',
 'st.currencyHelp':'Un conjunto utiliza una moneda. Los movimientos económicos existentes impiden cambiarla; los importes nunca se convierten silenciosamente.',
 'st.catalogs':'Catálogos','st.catalogHelp':'Los códigos y etiquetas traducidas del sistema son estables. Las etiquetas personalizadas conservan tu texto. Desactiva opciones para impedir su selección en altas; las referencias históricas se conservan.',
 'st.locations':'Ubicaciones','st.locationHelp':'Refugios, salas y zonas pueden tener una ubicación superior. Desactivarlas conserva las referencias de animales e históricas. Se rechazan ciclos de ubicaciones superiores.',
 'st.kind':'Catálogo','st.customLabel':'Etiqueta','st.sortOrder':'Orden de visualización','st.active':'Activa para nuevos registros','st.includeInactive':'Incluir opciones y ubicaciones inactivas',
 'st.origin':'Origen','st.system':'Sistema','st.custom':'Personalizada','st.systemHelp':'Los códigos y etiquetas del sistema están protegidos. Puedes cambiar su orden y disponibilidad.',
 'st.newOption':'Añadir opción personalizada','st.editOption':'Editar opción de catálogo','st.newLocation':'Añadir ubicación','st.editLocation':'Editar ubicación','st.empty':'No hay registros en esta vista.',
 'st.locationName':'Nombre de ubicación','st.locationType':'Tipo de ubicación','st.parent':'Ubicación superior','st.location.shelter':'Refugio','st.location.room':'Sala','st.location.area':'Zona','st.location.other':'Otra',
 'st.kind.species':'Especies','st.kind.size':'Tamaños de animales','st.kind.finance_income':'Categorías de ingreso','st.kind.finance_expense':'Categorías de gasto','st.kind.inventory_category':'Categorías de inventario','st.kind.document_type':'Tipos de documento',
 'st.kind.material_type':'Tipos de material','st.kind.unit':'Unidades','st.kind.volunteer_function':'Funciones de voluntariado','st.kind.task_type':'Tipos de tarea','st.kind.care_plan_type':'Tipos de plan de cuidados'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'nav.exports':'Exportaciones por módulo','ex.module':'Módulo','ex.scope':'Alcance de exportación','ex.scope.filtered':'Resultados de estos filtros de exportación','ex.scope.all':'Todos los registros del módulo, incluidos archivo y papelera',
 'ex.help':'Elige módulo y alcance. Los filtros de esta página se aplican a la descarga con independencia de otras pantallas. La vista previa y la descarga abarcan todas las coincidencias, más allá de la página actual.',
 'ex.search':'Nombre, código, concepto o notas','ex.download':'Descargar exportación del módulo','ex.format':'Formato de archivo','ex.confirm':'He revisado el módulo, el alcance y la cantidad de registros.',
 'ex.review':'{module} · {scope} · {count} registros · revisión de captura {revision}.','ex.selected':'{count} registros seleccionados · {scope}',
 'ex.filesHelp':'No es una copia completa y no contiene bytes de archivos incorporados. El JSON incluye registros vinculados y metadatos de recursos que pueden contener datos personales. Para trasladar toda la organización utiliza una copia completa.',
 'ex.csvHelp':'CSV usa UTF-8, BOM opcional, coma/punto y coma, fechas ISO e importes decimales exactos con punto y sin agrupación. Identificadores y códigos conservan texto en la medida que permite CSV; las hojas de cálculo pueden cambiar tipos y protecciones de fórmulas al guardar. JSON conserva tipos y valores originales. Las líneas materiales comparten el ID de donación; los valores estimados no son ingresos.',
 'ex.filterError':'Elige fechas válidas con el final igual o posterior al inicio.','ex.empty':'Sin coincidencias. Una exportación vacía contiene encabezados o una lista de registros vacía.',
 'ex.module.animals':'Animales','ex.module.contacts':'Contactos','ex.module.applications':'Solicitudes de adopción','ex.module.adoptions':'Adopciones realizadas','ex.module.expenses':'Gastos','ex.module.income':'Ingresos','ex.module.volunteers':'Perfiles de voluntariado','ex.module.volunteer_hours':'Horas de voluntariado','ex.module.donations':'Donaciones',
 'ex.date.animals':'El periodo filtra la fecha de entrada más reciente registrada. Es una lista actual, no un censo histórico reconstruido.',
 'ex.date.applications':'El periodo filtra las fechas de solicitud.','ex.date.adoptions':'El periodo filtra las fechas de adopción; una devolución conserva la fecha original.',
 'ex.date.expenses':'El periodo filtra fechas de gasto. Los movimientos anulados se incluyen salvo que filtres su estado.','ex.date.income':'El periodo filtra fechas de ingreso. Los movimientos anulados se incluyen salvo que filtres su estado.',
 'ex.date.volunteer_hours':'El periodo filtra fechas de actividad; las duraciones son minutos enteros.','ex.date.donations':'El periodo filtra fechas de donación. CSV material tiene una fila por línea; las donaciones económicas tienen una fila.',
 'ex.status.under_care':'Bajo cuidado','ex.status.adopted':'Adoptado','ex.status.deceased':'Fallecido','ex.status.other_exit':'Otra salida','ex.status.pending':'Pendiente','ex.status.under_review':'En revisión','ex.status.approved':'Aprobada','ex.status.rejected':'Rechazada','ex.status.completed':'Completada','ex.status.cancelled':'Cancelada','ex.status.active':'Activo / sin devolución','ex.status.returned':'Con devolución','ex.status.inactive':'Inactivo','ex.status.posted':'Contabilizado','ex.status.voided':'Anulado','ex.status.recorded':'Registrada'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,...{"ex.column.activity":"Actividad","ex.column.address":"Dirección","ex.column.adoption_date":"Fecha de adopción","ex.column.age_reference_date":"Fecha de referencia de edad","ex.column.amount_decimal":"Importe con punto decimal","ex.column.amount_minor":"Importe en unidades menores","ex.column.animal_code":"Código de animal","ex.column.animal_id":"ID de animal","ex.column.animal_name":"Nombre de animal","ex.column.application_date":"Fecha de solicitud","ex.column.approval_date":"Fecha de aprobación","ex.column.archived_at":"Archivado el","ex.column.availability":"Disponibilidad","ex.column.birth_date":"Fecha de nacimiento","ex.column.birth_precision":"Código de precisión de nacimiento","ex.column.breed":"Raza","ex.column.category":"Categoría","ex.column.closure_reason":"Motivo de cierre","ex.column.code":"Código de animal","ex.column.concept":"Concepto","ex.column.contact_id":"ID de contacto original","ex.column.contact_name":"Nombre actual de contacto","ex.column.contact_type":"Código de tipo de contacto","ex.column.corrects_movement_id":"ID de movimiento corregido","ex.column.currency":"Código de moneda","ex.column.date":"Fecha","ex.column.deleted_at":"En papelera el","ex.column.description":"Descripción","ex.column.donation_type":"Código de tipo de donación","ex.column.duration_minutes":"Duración en minutos","ex.column.email":"Email","ex.column.entry_date":"Fecha de última entrada","ex.column.episode_id":"ID de episodio","ex.column.estimated_age_months":"Edad estimada en meses","ex.column.estimated_value_decimal":"Valor estimado con punto decimal","ex.column.estimated_value_minor":"Valor estimado en unidades menores","ex.column.financial_movement_id":"ID de movimiento económico","ex.column.functions":"Funciones de voluntariado","ex.column.id":"ID de registro","ex.column.interview_notes":"Notas de entrevista","ex.column.inventory_item_id":"ID de artículo","ex.column.inventory_movement_id":"ID de movimiento de inventario","ex.column.line_id":"ID de línea de donación","ex.column.location":"Ubicación actual","ex.column.management_status":"Código de situación","ex.column.material_type":"Tipo de material","ex.column.merged_into_contact_id":"ID de contacto sobreviviente","ex.column.microchip":"Microchip original","ex.column.name":"Nombre","ex.column.notes":"Notas","ex.column.phones":"Teléfonos en JSON","ex.column.quantity_decimal":"Cantidad con punto decimal","ex.column.quantity_precision":"Decimales de cantidad","ex.column.quantity_scaled":"Cantidad entera escalada","ex.column.replacement_movement_id":"ID de movimiento sustituto","ex.column.return_date":"Fecha de devolución","ex.column.return_reason":"Motivo de devolución","ex.column.roles":"Códigos de rol separados por |","ex.column.sex":"Código de sexo","ex.column.specialties":"Especialidades","ex.column.species":"Especie","ex.column.status":"Código de estado","ex.column.unit":"Unidad","ex.column.void_reason":"Motivo de anulación","ex.column.volunteer_profile_id":"ID de perfil voluntario"}});}(window.RescueManager));

(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'nav.imports':'Importar contactos','im.help':'Importa CSV de contactos de hasta 10 MiB y 10.000 filas de datos. Lee, mapea, valida y revisa antes de aplicar. Los valores se conservan como texto. Para trasladar toda la organización utiliza una copia completa.',
 'im.file':'Archivo CSV de contactos','im.encoding':'Codificación de texto','im.auto':'Detectar automáticamente','im.template':'Descargar plantilla CSV de contactos','im.source':'Etiqueta de la fuente','im.remember':'Recordar identificadores externos de esta fuente',
 'im.sourceHelp':'Utiliza una etiqueta estable sin espacios iniciales/finales si recuerdas valores external_id. Un archivo posterior podrá proponer vincular o actualizar el contacto asociado. Un nombre solo no crea asociaciones automáticas.',
 'im.reading':'Leyendo CSV…','im.validating':'Validando la vista previa…','im.progress':'Preparando {completed} de {total} registros…','im.activating':'Activando el conjunto validado…',
 'im.validate':'Validar / revalidar','im.revalidate':'Vuelve a validar tras cambiar el mapeo o la fuente.','im.reset':'Limpiar esta pantalla de importación','im.cancelPreview':'Cancelar validación previa','im.cancelPreparation':'Cancelar preparación','im.cancelled':'Vista previa cancelada; no se han modificado datos de negocio.',
 'im.fileInfo':'{count} filas de datos · SHA-256 {hash}','im.mappingHelp':'Mapea cada campo de destino como máximo una vez. Las altas requieren name; type omitido usa person. Al actualizar, los campos sin mapear se conservan y las celdas vacías mapeadas vacían campos opcionales. Phones admite un teléfono como texto o una lista JSON de objetos label/original. Los códigos de rol se separan con |.',
 'im.column':'Columna de origen','im.destination':'Campo de destino','im.sample':'Primera muestra no vacía','im.mapColumn':'Mapear columna {column}','im.unmapped':'No importar esta columna',
 'im.preview':'Vista previa validada','im.row':'Fila CSV','im.issues':'Errores y posibles duplicados','im.action':'Resultado previsto','im.decision':'Decisión explícita','im.decisionRow':'Decisión para la fila {row}','im.targetRow':'Contacto de destino para la fila {row}',
 'im.action.undecided':'Requiere decisión','im.action.create':'Crear un contacto separado','im.action.update':'Actualizar el contacto seleccionado','im.action.link':'Vincular sin modificar el contacto','im.action.skip':'Omitir fila','im.action.error':'Fila inválida',
 'im.nameWarning':'Un nombre igual solo es una advertencia; no se fusiona automáticamente.','im.match.uuid':'Mismo UUID','im.match.external_id':'Identificador externo recordado','im.match.email':'Mismo email','im.match.phone':'Mismo teléfono','im.match.name':'Mismo nombre normalizado',
 'im.summary':'Crear {create} · actualizar {update} · vincular {link} · omitir {skip} · errores {error} · sin resolver {conflict}.',
 'im.apply':'Aplicar importación revisada','im.confirm':'Confirmo este alcance exacto de altas, actualizaciones y vínculos.','im.confirmSubset':'Importar solo las filas válidas y resueltas mostradas; excluir omitidas, inválidas y conflictos sin resolver.','im.ignoreUnknown':'He revisado las columnas sin mapear y confirmo que se omitirán sus valores.',
 'im.unknown':'{count} celdas con contenido en columnas sin mapear: {columns}. Debes confirmar su omisión antes de aplicar.',
 'im.atomicHelp':'Los lotes pequeños confirmados se guardan en una sola transacción. La vista previa no guarda registros. Los roles y campos existentes solo cambian al mapear sus columnas y elegir una actualización explícita.',
 'im.largeHelp':'Más de 1.000 registros resultantes: verifica antes una copia completa actual. Se prepara y valida otro conjunto y se activa atómicamente. Cancelar o fallar antes de activar conserva el actual. El conjunto anterior permanece para recuperación.',
 'im.stale':'El conjunto cambió después de la vista previa. Vuelve a validar antes de importar.','im.datasetError':'El conjunto combinado tiene errores de validación. Descarga el informe y corrige el origen o las decisiones antes de aplicar.','im.repeated':'El hash de este archivo ya consta en una importación. Revisa cada alta y las coincidencias externas; no se volverá a aplicar silenciosamente.',
 'im.report':'Descargar informe de validación','im.result':'Resultado de importación','im.applied':'Importación completada: {create} altas, {update} actualizaciones y {link} vínculos. {skip} omitidas; se excluyeron {error} filas inválidas y {conflict} conflictos sin resolver.',
 'im.field.external_id':'Identificador externo','im.field.id':'UUID de contacto','im.field.type':'Tipo de contacto (person / organization)','im.field.name':'Nombre','im.field.phones':'Teléfonos','im.field.email':'Email','im.field.address':'Dirección','im.field.roles':'Códigos de rol','im.field.notes':'Notas',
 'im.error.email':'Introduce un email válido.','im.error.phone':'Introduce un teléfono válido como texto.','im.error.enum':'Utiliza un código de tipo o rol admitido.','im.error.duplicate':'Elimina valores repetidos de este campo.','im.error.list':'La lista tiene demasiados elementos.','im.error.text':'Revisa texto obligatorio, longitud y espacios iniciales/finales.','im.error.required':'Este campo es obligatorio.','im.error.columns':'La fila tiene distinta cantidad de columnas que el encabezado.','im.error.length':'Una celda supera 20.000 caracteres.','im.error.phones':'Usa un teléfono o una lista JSON de hasta diez objetos label/original.','im.error.uuid':'Utiliza un UUID válido o déjalo vacío para un alta.','im.error.external':'Los identificadores externos admiten hasta 200 caracteres.','im.error.invalid':'Revisa valores y destino. No se puede crear dos veces un UUID, actualizar contactos fusionados/en papelera ni reasignar un identificador externo silenciosamente.'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'aq.help':'Elige una o varias opciones de cada lista: las del mismo filtro se combinan con OR y los filtros distintos con AND. Una lista sin selección incluye todos sus valores. En escritorio utiliza la tecla modificadora para seleccionar varias opciones.',
 'aq.advanced':'Más filtros y orden','aq.place':'Refugio, sala o zona actual','aq.family':'Familia de acogida','aq.adopter':'Contacto adoptante','aq.pastFosters':'Incluir estancias finalizadas al filtrar por familia',
 'aq.entryFrom':'Última entrada desde','aq.entryTo':'Última entrada hasta','aq.adoptionFrom':'Adopción desde','aq.adoptionTo':'Adopción hasta',
 'aq.periodHelp':'La entrada es la del episodio más reciente, incluida una devolución. Adoptante y periodo deben coincidir en la misma adopción realizada; una devolución posterior conserva ese hecho histórico. La familia usa estancias abiertas salvo que incluyas las finalizadas.',
 'aq.periodError':'Revisa ambos periodos: fechas válidas y cada final igual o posterior a su inicio.','aq.active':'{count} valores de filtro seleccionados','aq.remove':'Quitar filtro {label}','aq.noMatches':'Ningún animal coincide con estos filtros. Límpialos para revisar la lista.'
});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,'wt.help':'El peso actual se deriva de mediciones válidas ordenadas por fecha, registro e ID. La papelera conserva registros y permite restaurarlos; no hay un total de peso actual editable por separado.','wt.trash':'Enviar medición a papelera','wt.restore':'Restaurar medición','wt.showTrash':'Mostrar mediciones en papelera','wt.trashConfirm':'Enviar solo esta medición a papelera y recalcular el último peso válido.','wt.restoreConfirm':'Restaurar esta medición en el historial válido.','wt.empty':'No hay mediciones en esta vista.'});}(window.RescueManager));
(function(r){r.locales.es=Object.freeze({...r.locales.es,
 'db.criteria':'Mes: {from}–{to}. Tareas próximas: hasta {through}, inclusive.','db.overlap':'Las tarjetas de cuidado, ubicación y disponibilidad se solapan y no se deben sumar. Las entradas cuentan episodios (incluidas devoluciones); las adopciones, hechos realizados. Las finanzas excluyen anulados. Cada tarjeta abre sus registros coincidentes.',
 'db.care':'Animales bajo cuidado','db.shelter':'En la protectora','db.foster':'En acogida','db.available':'Disponibles bajo cuidado','db.reserved':'Reservados bajo cuidado','db.entries':'Entradas del mes (episodios)','db.adoptions':'Adopciones del mes','db.veterinary':'Citas veterinarias de hoy y próximos 7 días','db.vaccines':'Vacunas pendientes, todas las fechas','db.careTasks':'Tareas de medicación y cuidados pendientes, todas las fechas','db.overdue':'Tareas vencidas','db.today':'Tareas para hoy','db.upcoming':'Tareas de próximos 7 días','db.income':'Ingresos del mes','db.expense':'Gastos del mes','db.balance':'Balance del mes','db.lowStock':'Artículos bajo mínimos',
 'db.openList':'Abrir registros coincidentes','db.openRecord':'Abrir registro de origen','db.details':'Detalles','db.empty':'No hay registros coincidentes.','db.lastVerified':'Última copia verificada: {date}. Es distinta del recibo generado más reciente.',
 'db.chartHelp':'Estos gráficos abarcan los últimos doce meses hasta la fecha de referencia. Las tablas muestran cantidades e importes exactos. Verde: primera serie; ocre: segunda serie.',
 'db.group':'Grupo del gráfico','db.speciesHelp':'Animales actualmente bajo cuidado por especie. El gráfico muestra los seis primeros grupos, numerados como en la tabla completa.'
});}(window.RescueManager));