(function () {
  'use strict';
  const root = window.RescueManager;
  root.config = Object.freeze({ ...root.config,
    dbName: 'animal-rescue-manager-test-integration', integrationTestStores: true });
}());
