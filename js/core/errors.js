(function () {
  'use strict';
  class AppError extends Error {
    constructor(code, details = null, cause = null) {
      super(code, cause ? { cause } : undefined);
      this.name = 'AppError'; this.code = code; this.details = details;
    }
  }
  const codes = Object.freeze({
    SecurityError: 'errors.storageUnavailable', UnknownError: 'errors.storageUnavailable',
    QuotaExceededError: 'errors.quota', AbortError: 'errors.aborted',
    VersionError: 'errors.futureVersion', ConstraintError: 'errors.duplicate',
    LeaseLostError: 'errors.leaseLost', RevisionConflictError: 'errors.revisionConflict',
    DatasetChangedError: 'errors.datasetChanged', IdempotencyConflictError: 'errors.duplicate'
  });
  window.RescueManager.core.errors = Object.freeze({ AppError,
    messageKey(error) { return codes[error?.name] || (error instanceof AppError ? error.code : 'errors.unexpected'); }
  });
}());
