(function () {
  'use strict';
  window.RescueManager.locales.en = Object.freeze({
    'app.name': 'Rescue Manager',
    'app.development': 'In development — do not enter real data yet.',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.close': 'Close',
    'common.loading': 'Loading…', 'common.saving': 'Saving…',
    'common.saved': 'Saved', 'common.readOnly': 'Read only',
    'errors.storageUnavailable': 'Local storage is unavailable. Your changes have not been saved. Check browser settings and keep your external backup.',
    'errors.quota': 'There is not enough browser storage. Your changes have not been saved. Keep the current data and check available space.',
    'errors.aborted': 'The operation was cancelled. No changes were saved.',
    'errors.futureVersion': 'These data require a newer compatible version. They have not been changed.',
    'errors.duplicate': 'A record with this identifier already exists. Review the conflict before continuing.',
    'errors.leaseLost': 'Another tab has write control. Reload the current data before editing.',
    'errors.revisionConflict': 'The data changed after you opened them. Reload and review your changes.',
    'errors.datasetChanged': 'The active dataset changed. Reload before continuing.',
    'errors.unexpected': 'The operation could not be completed. Your changes have not been confirmed. Review the local diagnostic.',
    'errors.missingTranslation': 'This text is not available in the selected language.',
    'records.count': { one: '{count} record', other: '{count} records' }
  });
}());
