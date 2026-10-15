(function () {
  'use strict';
  const root = window.RescueManager;
  const storage = root.storage;
  const run = (...args) => storage.transactions.run(...args);
  const error = (name, message) => storage.error(name, message);
  const token = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const revision = value => Number.isSafeInteger(value) && value >= 0;
  function requireInput(condition, message) { if (!condition) throw error('InvalidInputError', message); }
  function nextRevision(value) {
    if (!revision(value) || value === Number.MAX_SAFE_INTEGER) throw error('RevisionOverflowError', 'Revision cannot be incremented');
    return value + 1;
  }

  // All guard reads share the same readwrite transaction as the eventual write.
  function guard(tx, api, options, next) {
    requireInput(token(options.owner) && uuid(options.datasetId), 'Owner and dataset are required');
    const meta = tx.objectStore('meta');
    api.request(meta.get('active'), active => {
      if (!active || active.datasetId !== options.datasetId) throw error('DatasetChangedError', 'The active dataset has changed');
      api.request(meta.get('writer'), lease => {
        if (!lease || lease.owner !== options.owner || lease.datasetId !== active.datasetId || lease.expiresAt <= Date.now() ||
            (!root.config.integrationTestStores && lease.token !== options.leaseToken)) {
          throw error('LeaseLostError', 'This tab no longer has write control');
        }
        next(active);
      });
    });
  }

  const coordinator = {
    readActive() {
      return run(['meta'], 'readonly', (tx, api) => api.request(tx.objectStore('meta').get('active'), value => api.setResult(value || null)));
    },
    readLease() {
      return run(['meta'], 'readonly', (tx, api) => api.request(tx.objectStore('meta').get('writer'), value => api.setResult(value || null)));
    },
    replay(options) {
      requireInput(options && uuid(options.operationId) && token(options.fingerprint), 'Operation and intent fingerprint are required');
      return run(['meta','operations'], 'readonly', (tx, api) => guard(tx, api, options, active => {
        api.request(tx.objectStore('operations').get([options.datasetId, options.operationId]), operation => {
          if (operation && operation.fingerprint !== options.fingerprint) throw error('IdempotencyConflictError', 'Operation id was already used for another intent');
          api.setResult(operation ? { operationId: operation.id, revision: operation.revisionAfter, activeRevision: active.revision, duplicate: true, result: operation.result } : null);
        });
      }));
    },
    // Explicit lifecycle calls only; merely opening a database never creates a dataset.
    initializeDataset(datasetId) {
      requireInput(uuid(datasetId), 'Dataset id is required');
      return run(['meta', 'datasets'], 'readwrite', (tx, api) => {
        const meta = tx.objectStore('meta');
        api.request(meta.get('active'), active => {
          if (active) {
            if (active.datasetId !== datasetId) throw error('AlreadyInitializedError', 'An active dataset already exists');
            api.setResult(active); return;
          }
          const now = new Date().toISOString();
          tx.objectStore('datasets').add({ id: datasetId, state: 'active', schemaVersion: root.config.schemaVersion, dataRevision: 0, createdAt: now, updatedAt: now });
          const activeRecord = { key: 'active', datasetId, revision: 0 };
          meta.add(activeRecord);
          api.setResult(activeRecord);
        });
      });
    },
    createStagingDataset(datasetId) {
      requireInput(uuid(datasetId), 'Dataset id is required');
      return run(['datasets'], 'readwrite', tx => {
        const now = new Date().toISOString();
        tx.objectStore('datasets').add({ id: datasetId, state: 'staging', schemaVersion: root.config.schemaVersion, dataRevision: 0, createdAt: now, updatedAt: now });
      });
    },
    acquire(owner, datasetId, ttl = 30000) {
      requireInput(token(owner) && uuid(datasetId) && Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 120000, 'Invalid writer lease');
      return run(['meta'], 'readwrite', (tx, api) => {
        const meta = tx.objectStore('meta');
        api.request(meta.get('active'), active => {
          if (!active || active.datasetId !== datasetId) throw error('DatasetChangedError', 'The active dataset has changed');
          api.request(meta.get('writer'), lease => {
            const now = Date.now();
            const allowed = !lease || lease.expiresAt <= now || (lease.owner === owner && lease.datasetId === datasetId);
            if (allowed) meta.put({ key: 'writer', owner, datasetId,
              token: lease && lease.owner === owner && lease.datasetId === datasetId && lease.expiresAt > now ? lease.token : crypto.randomUUID(), expiresAt: now + ttl });
            api.setResult(allowed);
          });
        });
      });
    },
    takeControl(options, ttl = 30000) {
      requireInput(options && token(options.owner) && uuid(options.datasetId) && revision(options.expectedRevision) && Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 120000, 'Invalid writer takeover');
      return run(['meta'], 'readwrite', (tx, api) => {
        const meta = tx.objectStore('meta');
        api.request(meta.get('active'), active => {
          if (!active || active.datasetId !== options.datasetId) throw error('DatasetChangedError', 'The active dataset has changed');
          if (active.revision !== options.expectedRevision) throw error('RevisionConflictError', 'Data changed before taking control');
          const lease = { key: 'writer', owner: options.owner, datasetId: options.datasetId, token: crypto.randomUUID(), expiresAt: Date.now() + ttl };
          meta.put(lease); api.setResult(lease);
        });
      });
    },
    renew(options, ttl = 30000) {
      requireInput(Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 120000, 'Invalid lease duration');
      return run(['meta'], 'readwrite', (tx, api) => guard(tx, api, options, () => {
        api.request(tx.objectStore('meta').get('writer'), lease => {
          const updated = { ...lease, expiresAt: Date.now() + ttl };
          tx.objectStore('meta').put(updated); api.setResult(updated);
        });
      }));
    },
    release(owner, datasetId) {
      requireInput(token(owner) && uuid(datasetId), 'Owner and dataset are required');
      return run(['meta'], 'readwrite', (tx, api) => {
        const meta = tx.objectStore('meta');
        api.request(meta.get('writer'), lease => {
          const allowed = !!lease && lease.owner === owner && lease.datasetId === datasetId;
          if (allowed) meta.delete('writer');
          api.setResult(allowed);
        });
      });
    },
    // Records must already pass domain validation. Access confines all keys to this dataset.
    // operationId + fingerprint identify the prepared intent; retries return the saved result.
    mutate(options, work) {
      requireInput(options && uuid(options.operationId) && token(options.fingerprint) && revision(options.expectedRevision), 'Operation, intent fingerprint and revision are required');
      requireInput(Array.isArray(options.stores) && options.stores.length && options.stores.every(name => token(name) && !['meta', 'datasets', 'operations'].includes(name)), 'Only business stores may be mutated');
      requireInput(typeof work === 'function', 'Mutation callback is required');
      return run(['meta', 'datasets', 'operations', ...options.stores], 'readwrite', (tx, api) => guard(tx, api, options, active => {
        const log = tx.objectStore('operations');
        api.request(log.get([options.datasetId, options.operationId]), operation => {
          if (operation) {
            if (operation.fingerprint !== options.fingerprint) throw error('IdempotencyConflictError', 'Operation id was already used for a different intent');
            api.setResult({ operationId: operation.id, revision: operation.revisionAfter, activeRevision: active.revision, duplicate: true, result: operation.result });
            return;
          }
          if (active.revision !== options.expectedRevision) throw error('RevisionConflictError', 'Data changed since it was read');
          api.request(tx.objectStore('datasets').get(options.datasetId), dataset => {
            if (!dataset || dataset.state !== 'active' || dataset.schemaVersion !== root.config.schemaVersion) throw error('DatasetChangedError', 'Dataset is unavailable or incompatible');
            let pending = 0;
            let returned = false;
            let finalized = false;
            let failed = false;
            let result = null;
            function finish() {
              if (!returned || pending || finalized || failed) return;
              finalized = true;
              const value = nextRevision(active.revision);
              const now = new Date().toISOString();
              tx.objectStore('meta').put({ key: 'active', datasetId: options.datasetId, revision: value });
              tx.objectStore('datasets').put({ ...dataset, dataRevision: nextRevision(dataset.dataRevision), updatedAt: now });
              log.add({ datasetId: options.datasetId, id: options.operationId, fingerprint: options.fingerprint, revisionBefore: active.revision, revisionAfter: value, result, createdAt: now });
              api.setResult({ operationId: options.operationId, revision: value, activeRevision: value, duplicate: false, result });
            }
            function store(name) {
              requireInput(options.stores.includes(name), 'Store is outside the declared mutation');
              return tx.objectStore(name);
            }
            function track(request, callback) {
              pending += 1;
              api.request(request, value => {
                if (callback) {
                  const response = callback(value);
                  if (response && typeof response.then === 'function') {
                    Promise.resolve(response).catch(() => {});
                    throw error('AsyncTransactionCallbackError', 'Mutation callbacks must be synchronous');
                  }
                }
                pending -= 1;
                finish();
              });
            }
            function record(value) { requireInput(value && value.datasetId === options.datasetId && uuid(value.id), 'Record must belong to the active dataset'); return value; }
            const access = Object.freeze({
              advanceAnimalSequence(expected, next) {
                requireInput(revision(expected) && revision(next) && next > expected, 'Invalid animal sequence');
                const key = 'animalSequence:' + options.datasetId;
                track(tx.objectStore('meta').get(key), sequence => {
                  if ((sequence?.value || 0) !== expected) throw error('RevisionConflictError', 'Animal code sequence changed');
                  track(tx.objectStore('meta').put({ key, value: next }));
                });
              },
              get(name, id, callback) { requireInput(uuid(id) && typeof callback === 'function', 'Record id and callback are required'); track(store(name).get([options.datasetId, id]), callback); },
              put(name, value) { track(store(name).put(record(value))); },
              add(name, value) { track(store(name).add(record(value))); },
              delete(name, id) { requireInput(uuid(id), 'Record id is required'); track(store(name).delete([options.datasetId, id])); },
              setResult(value) { result = value; },
              fail(reason) { failed = true; api.fail(reason); }
            });
            const response = work(access);
            if (response && typeof response.then === 'function') {
              Promise.resolve(response).catch(() => {});
              throw error('AsyncTransactionCallbackError', 'Prepare asynchronous work before the mutation');
            }
            returned = true;
            finish();
          });
        });
      }));
    },
    // Lifecycle primitive; caller must validate prepared data. This is not backup restoration.
    // active.revision is global and monotonic; dataset.dataRevision is local to each dataset.
    // Activation changes both metadata records atomically and invalidates the previous writer.
    activateDataset(options, targetId) {
      requireInput(options && revision(options.expectedRevision) && uuid(targetId) && targetId !== options.datasetId, 'A different target dataset and revision are required');
      return run(['meta', 'datasets'], 'readwrite', (tx, api) => guard(tx, api, options, active => {
        if (active.revision !== options.expectedRevision) throw error('RevisionConflictError', 'Data changed since it was read');
        const datasets = tx.objectStore('datasets');
        api.request(datasets.get(targetId), target => {
          if (!target || target.state !== 'staging' || target.schemaVersion !== root.config.schemaVersion) throw error('DatasetChangedError', 'Target dataset is not ready for activation');
          if (!root.config.integrationTestStores && (!target.validation || target.validation.stagingRevision !== target.stagingRevision || target.validation.stagingRevision !== options.expectedTargetRevision)) {
            throw error('DatasetNotValidatedError', 'Prepared dataset has not passed validation at this revision');
          }
          api.request(datasets.get(active.datasetId), previous => {
            if (!previous) throw error('DatasetChangedError', 'Previous dataset is missing');
            const now = new Date().toISOString();
            datasets.put({ ...previous, state: 'retired', updatedAt: now });
            datasets.put({ ...target, state: 'active', updatedAt: now });
            const activated = { key: 'active', datasetId: targetId, revision: nextRevision(active.revision) };
            tx.objectStore('meta').put(activated);
            tx.objectStore('meta').delete('writer');
            api.setResult(activated);
          });
        });
      }));
    }
  };
  storage.writeCoordinator = Object.freeze(coordinator);
}());
