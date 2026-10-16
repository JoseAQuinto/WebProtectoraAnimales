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
