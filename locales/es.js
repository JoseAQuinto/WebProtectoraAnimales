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
