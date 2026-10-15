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
    'ui.readOnly':'Esta pestaña está en modo lectura. Otra pestaña puede tener el control de escritura.','ui.takeControl':'Tomar el control de escritura','ui.takeControlConfirm':'¿Dar el control de escritura a esta pestaña? Las demás pasarán a modo lectura.',
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
