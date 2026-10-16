(function () {
  'use strict';
  const root = window.RescueManager;
  root.config = Object.freeze({ ...root.config, dbName: 'animal-rescue-manager-test-profiles' });
  root.testObservations = { runtimeErrors: [], connectionViolations: [] };
  window.addEventListener('error', event => root.testObservations.runtimeErrors.push({ message: event.message, file: event.filename, line: event.lineno }));
  window.addEventListener('unhandledrejection', event => root.testObservations.runtimeErrors.push({ message: String(event.reason) }));
  window.addEventListener('securitypolicyviolation', event => root.testObservations.connectionViolations.push({ directive: event.violatedDirective, blocked: event.blockedURI }));
}());
