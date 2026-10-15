(function () {
  'use strict';
  const root = window.RescueManager;
  const storage = root.storage;
  let connection = null;
  let opening = null;

  storage.error = function (name, message) {
    const error = new Error(message);
    error.name = name;
    return error;
  };

  // Physical migration 1 -> 2 is additive. Business data is never rewritten here.
  function requestOpen() {
    const config = root.config;
    if (!config.dbName || !Number.isSafeInteger(config.dbVersion) || config.dbVersion < 1) {
      return Promise.reject(storage.error('ConfigurationError', 'Invalid database configuration'));
    }
    if (config.integrationTestStores && !config.dbName.startsWith('animal-rescue-manager-test-')) {
      return Promise.reject(storage.error('ConfigurationError', 'Test stores require a dedicated test database name'));
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      let upgradeError;
      let request;
      const timeout = setTimeout(() => fail(storage.error('TimeoutError', 'Database opening timed out')), 8000);
      function fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
      try { request = indexedDB.open(config.dbName, config.dbVersion); }
      catch (error) { fail(error); return; }
      request.onerror = () => fail(upgradeError || request.error);
      request.onblocked = () => fail(storage.error('DatabaseBlockedError', 'Another tab is blocking the database upgrade'));
      request.onupgradeneeded = event => {
        if (settled) { request.transaction.abort(); return; }
        if (event.oldVersion > 1) {
          upgradeError = storage.error('MigrationRequiredError', 'No migration is implemented for this database version');
          request.transaction.abort();
          return;
        }
        const db = request.result;
        const meta = event.oldVersion === 0 ? db.createObjectStore('meta', { keyPath: 'key' }) : request.transaction.objectStore('meta');
        function install() {
          if (!db.objectStoreNames.contains('datasets')) db.createObjectStore('datasets', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('operations')) db.createObjectStore('operations', { keyPath: ['datasetId', 'id'] });
          if (storage.schema) storage.schema.install(db);
          if (config.integrationTestStores) {
            for (const name of ['testRecords', 'testRelated']) {
              if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: ['datasetId', 'id'] });
            }
          }
          meta.put({ key: 'coreSchema', version: config.schemaVersion, createdWith: config.appVersion });
        }
        if (event.oldVersion === 0) install();
        else {
          const check = meta.get('coreSchema');
          check.onsuccess = () => {
            if (!check.result || check.result.version !== config.schemaVersion) {
              upgradeError = storage.error('VersionError', 'The stored schema is not supported');
              request.transaction.abort();
            } else install();
          };
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        let schema;
        let tx;
        try {
          tx = db.transaction('meta', 'readonly');
          tx.objectStore('meta').get('coreSchema').onsuccess = event => { schema = event.target.result; };
        } catch (error) { db.close(); fail(error); return; }
        tx.onabort = () => { db.close(); fail(tx.error || storage.error('AbortError', 'Schema validation aborted')); };
        tx.oncomplete = () => {
          if (settled) { db.close(); return; }
          if (!schema || schema.version !== config.schemaVersion) {
            db.close();
            fail(storage.error('VersionError', 'The stored schema is not supported; existing data was not removed'));
            return;
          }
          if (storage.schema && storage.schema.tables.some(name => !db.objectStoreNames.contains(name))) {
            db.close(); fail(storage.error('MigrationRequiredError', 'Business stores are missing; no records were changed')); return;
          }
          settled = true;
          clearTimeout(timeout);
          connection = db;
          db.onversionchange = () => {
            db.close();
            if (connection === db) { connection = null; opening = null; }
          };
          resolve(db);
        };
      };
    });
  }

  storage.database = Object.freeze({
    open() {
      if (connection) return Promise.resolve(connection);
      if (!opening) opening = requestOpen().catch(error => { opening = null; throw error; });
      return opening;
    },
    async close() {
      const pending = opening;
      if (pending) await pending.catch(() => {});
      if (connection) connection.close();
      connection = null;
      opening = null;
    }
  });
}());
