(function () {
  'use strict';
  const root = window.RescueManager;
  const names = Object.freeze(Object.keys(root.domain.schemas));
  root.storage.schema = Object.freeze({
    tables: names,
    install(db) {
      if (!db.objectStoreNames.contains('backupReceipts')) {
        const receipts = db.createObjectStore('backupReceipts', { keyPath: 'backupId' });
        receipts.createIndex('byDataset', 'datasetId');
      }
      for (const name of names) {
        if (db.objectStoreNames.contains(name)) continue;
        const definition = root.domain.schemas[name];
        const store = db.createObjectStore(name, { keyPath: ['datasetId', 'id'] });
        store.createIndex('byDataset', 'datasetId');
        for (const index of definition.indexes || []) {
          if (index.name === 'byDataset') continue;
          store.createIndex(index.name, index.keyPath, { unique: !!index.unique, multiEntry: !!index.multiEntry });
        }
      }
    }
  });
}());
