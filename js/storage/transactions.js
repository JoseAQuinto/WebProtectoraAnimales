(function () {
  'use strict';
  const storage = window.RescueManager.storage;

  function assertSynchronous(value) {
    if (value && typeof value.then === 'function') {
      Promise.resolve(value).catch(() => {});
      throw storage.error('AsyncTransactionCallbackError', 'Prepare asynchronous work before starting a transaction');
    }
  }

  // Infrastructure primitive. Business writes must use writeCoordinator.mutate.
  // work and request callbacks run synchronously; only tx.complete resolves.
  storage.transactions = Object.freeze({
    async run(stores, mode, work) {
      if (!Array.isArray(stores) || !stores.length || !['readonly', 'readwrite'].includes(mode) || typeof work !== 'function') {
        throw storage.error('InvalidInputError', 'Invalid transaction arguments');
      }
      const db = await storage.database.open();
      return new Promise((resolve, reject) => {
        let tx;
        try { tx = db.transaction([...new Set(stores)], mode); }
        catch (error) { reject(error); return; }
        let result = null;
        let failure = null;
        const api = {
          setResult(value) { result = value; },
          fail(error) {
            failure = failure || error || storage.error('AbortError', 'Transaction aborted');
            try { tx.abort(); } catch (_) { /* onabort/oncomplete still owns settlement. */ }
          },
          request(request, onSuccess) {
            request.onerror = () => { failure = failure || request.error; };
            request.onsuccess = () => {
              try { if (onSuccess) assertSynchronous(onSuccess(request.result)); }
              catch (error) { api.fail(error); }
            };
            return request;
          }
        };
        tx.oncomplete = () => failure ? reject(failure) : resolve(result);
        tx.onabort = () => reject(failure || tx.error || storage.error('AbortError', 'Transaction aborted'));
        try { assertSynchronous(work(tx, api)); }
        catch (error) { api.fail(error); }
      });
    }
  });
}());
