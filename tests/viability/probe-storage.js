(function () {
  'use strict';
  const root = window.RescueManager = window.RescueManager || {};
  const probe = root.probe = {};
  const name = 'rescue-manager-viability';
  let connection;

  function open() {
    if (connection) return Promise.resolve(connection);
    return new Promise((resolve, reject) => {
      let request;
      try { request = indexedDB.open(name, 1); } catch (error) { reject(error); return; }
      const timeout = setTimeout(() => reject(new Error('IndexedDB open timed out')), 8000);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      request.onerror = () => { clearTimeout(timeout); reject(request.error); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB upgrade blocked by another tab')); };
      request.onsuccess = () => {
        clearTimeout(timeout);
        connection = request.result;
        connection.onversionchange = () => { connection.close(); connection = null; };
        resolve(connection);
      };
    });
  }

  async function transaction(stores, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new DOMException('Transaction aborted', 'AbortError'));
      // Request success alone never resolves a write operation.
      try { work(tx, value => { result = value; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  }

  function get(id) {
    return transaction(['records'], 'readonly', (tx, done) => {
      tx.objectStore('records').get(id).onsuccess = event => done(event.target.result || null);
    });
  }

  probe.readMarker = () => get('marker');
  probe.writeMarker = value => transaction(['records'], 'readwrite', tx => {
    tx.objectStore('records').put({ id: 'marker', value: String(value), blob: new Blob(['offline-blob-ñ'], { type: 'text/plain' }) });
  });
  probe.acquire = (owner, ttl = 30000) => transaction(['meta'], 'readwrite', (tx, done) => {
    if (!owner || !Number.isFinite(ttl) || ttl <= 0) throw new TypeError('Invalid lease');
    const store = tx.objectStore('meta');
    store.get('writer').onsuccess = event => {
      const lease = event.target.result;
      const now = Date.now();
      const allowed = !lease || lease.owner === owner || lease.expiresAt <= now;
      if (allowed) store.put({ key: 'writer', owner, expiresAt: now + ttl });
      done(allowed);
    };
  });
  probe.release = owner => transaction(['meta'], 'readwrite', (tx, done) => {
    const store = tx.objectStore('meta');
    store.get('writer').onsuccess = event => {
      const lease = event.target.result;
      if (lease && lease.owner === owner) { store.delete('writer'); done(true); }
      else done(false);
    };
  });
  probe.guardedWrite = (owner, value) => transaction(['meta', 'records'], 'readwrite', tx => {
    tx.objectStore('meta').get('writer').onsuccess = event => {
      const lease = event.target.result;
      if (!lease || lease.owner !== owner || lease.expiresAt <= Date.now()) { tx.abort(); return; }
      tx.objectStore('records').put({ id: 'marker', value: String(value), blob: new Blob(['offline-blob-ñ'], { type: 'text/plain' }) });
    };
  });
  probe.run = async function () {
    const checks = [];
    const report = { format: 'rescue-manager-viability-report', version: 1, createdAt: new Date().toISOString(),
      url: location.href, protocol: location.protocol, userAgent: navigator.userAgent,
      capabilities: { indexedDB: typeof indexedDB !== 'undefined', secureContext: isSecureContext,
        randomUUID: typeof crypto.randomUUID === 'function', getRandomValues: typeof crypto.getRandomValues === 'function',
        subtleCrypto: !!crypto.subtle, storageEstimate: typeof navigator.storage?.estimate === 'function',
        persist: typeof navigator.storage?.persist === 'function', broadcastChannel: typeof BroadcastChannel === 'function',
        fileReader: typeof FileReader === 'function', showSaveFilePicker: typeof window.showSaveFilePicker === 'function' }, checks };
    function check(id, passed, detail) { checks.push({ id, passed, detail }); }
    check('file-protocol', location.protocol === 'file:', location.protocol);
    check('classic-script', true, 'External classic script executed');
    check('local-css', getComputedStyle(document.documentElement).getPropertyValue('--probe-css-ready').trim() === 'ready', 'External CSS marker');
    try {
      await open();
      check('indexeddb-open', true, name);
      await transaction(['records', 'meta'], 'readwrite', tx => {
        tx.objectStore('records').put({ id: 'probe-record', value: 'Prueba ñ 🐾', blob: new Blob(['offline-blob-ñ'], { type: 'text/plain' }) });
        tx.objectStore('meta').put({ key: 'lastCommit', value: report.createdAt });
      });
      check('transaction-complete', true, 'Resolved only after transaction complete');
      const record = await get('probe-record');
      check('record-roundtrip', record?.value === 'Prueba ñ 🐾', 'Unicode record roundtrip');
      check('blob-roundtrip', record?.blob instanceof Blob && await record.blob.text() === 'offline-blob-ñ', 'Blob bytes decoded after transaction');
      try {
        await transaction(['records', 'meta'], 'readwrite', tx => {
          tx.objectStore('records').put({ id: 'rollback-proof', value: 'must not persist' });
          tx.objectStore('meta').put({ key: 'rollback-proof', value: 'must not persist' });
          tx.abort();
        });
        check('atomic-rollback', false, 'Aborted write unexpectedly completed');
      } catch (error) {
        const [recordAfterAbort, metaAfterAbort] = await Promise.all([
          get('rollback-proof'), transaction(['meta'], 'readonly', (tx, done) => {
            tx.objectStore('meta').get('rollback-proof').onsuccess = event => done(event.target.result);
          })
        ]);
        check('atomic-rollback', error.name === 'AbortError' && !recordAfterAbort && !metaAfterAbort, error.name);
      }
      report.storageAvailable = true;
    } catch (error) {
      report.storageAvailable = false;
      check('storage-unavailable', false, { name: error.name, message: error.message, stack: error.stack || null });
    }
    if (report.capabilities.storageEstimate) {
      try { report.quota = await navigator.storage.estimate(); }
      catch (error) { report.quotaError = { name: error.name, message: error.message }; }
    }
    report.passed = checks.every(item => item.passed);
    probe.report = report;
    return report;
  };
}());
