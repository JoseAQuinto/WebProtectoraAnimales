(function () {
  'use strict';
  const probe = window.RescueManager.probe;
  const byId = id => document.getElementById(id);
  const owner = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const labels = { 'file-protocol': 'Apertura directa mediante file://', 'classic-script': 'Script clásico local',
    'local-css': 'Hoja de estilos local', 'indexeddb-open': 'Apertura de IndexedDB', 'transaction-complete': 'Confirmación de transacción',
    'record-roundtrip': 'Lectura y escritura de texto', 'blob-roundtrip': 'Lectura y escritura de un archivo binario',
    'atomic-rollback': 'Reversión completa tras abortar', 'storage-unavailable': 'Almacenamiento no disponible' };
  let ready = false;
  let hasControl = false;

  function render(report) {
    byId('summary').textContent = report.passed ? 'Comprobaciones iniciales correctas. Falta contrastar la persistencia y la matriz de navegadores.' :
      'Esta combinación no ha superado la comprobación. No introduzcas datos reales; conserva el informe para revisar el motivo.';
    byId('checks').replaceChildren(...report.checks.map(check => {
      const li = document.createElement('li');
      li.className = check.passed ? 'pass' : 'fail';
      li.textContent = (check.passed ? '✓ Correcto · ' : '✕ Fallo · ') + (labels[check.id] || check.id);
      return li;
    }));
    byId('details').textContent = JSON.stringify(report, null, 2);
    ready = report.storageAvailable && report.passed;
    ['run', 'download'].forEach(id => { byId(id).disabled = false; });
    ['read-marker', 'claim', 'release'].forEach(id => { byId(id).disabled = !ready; });
    byId('save-marker').disabled = !ready || !hasControl;
  }

  async function control() {
    try {
      hasControl = ready && await probe.acquire(owner);
      byId('lease-result').textContent = hasControl ? 'Esta pestaña tiene control de escritura durante 30 segundos; lo renueva mientras está activa.' :
        (ready ? 'Modo lectura: otra pestaña tiene el control. Puedes solicitarlo cuando quede libre.' : 'El control no está disponible porque falló el almacenamiento.');
      byId('save-marker').disabled = !hasControl;
    } catch (error) {
      hasControl = false;
      byId('save-marker').disabled = true;
      failure('lease-result', error);
    }
  }
  function failure(id, error) {
    byId(id).textContent = 'La operación no se ha completado. ' + error.name + ': ' + error.message;
  }
  probe.download = function () {
    const blob = new Blob([JSON.stringify(probe.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rescue-manager-diagnostico.json';
    document.body.append(anchor);
    anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    byId('json-result').textContent = 'Descarga solicitada. Selecciona el archivo guardado para comprobar su lectura.';
  };
  byId('download').addEventListener('click', probe.download);
  byId('run').addEventListener('click', async () => {
    byId('run').disabled = true;
    byId('summary').textContent = 'Comprobando…';
    render(await probe.run());
    await control();
  });
  byId('claim').addEventListener('click', control);
  byId('release').addEventListener('click', async () => {
    try {
      await probe.release(owner); hasControl = false; byId('save-marker').disabled = true;
      byId('lease-result').textContent = 'Control liberado. Esta pestaña está en modo lectura.';
    } catch (error) { failure('lease-result', error); }
  });
  byId('save-marker').addEventListener('click', async () => {
    byId('save-marker').disabled = true;
    try {
      await probe.guardedWrite(owner, byId('marker').value);
      byId('marker-result').textContent = 'Texto de prueba guardado tras confirmarse la transacción.';
    } catch (error) { failure('marker-result', error); }
    finally { byId('save-marker').disabled = !hasControl; }
  });
  byId('read-marker').addEventListener('click', async () => {
    try {
      const marker = await probe.readMarker();
      byId('marker-result').textContent = marker ? 'Texto recuperado: ' + marker.value : 'No hay texto guardado accesible en este perfil y ruta.';
    } catch (error) { failure('marker-result', error); }
  });
  byId('json-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { byId('json-result').textContent = 'El informe de prueba no puede superar 1 MiB.'; return; }
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'rescue-manager-viability-report' || data.version !== 1 || !Array.isArray(data.checks)) throw new Error('Formato de diagnóstico no reconocido');
      byId('json-result').textContent = 'JSON seleccionado y leído correctamente. Esto verifica la selección, no la integridad de un backup comercial.';
    } catch (error) { failure('json-result', error); }
  });
  probe.ready = (async () => { const report = await probe.run(); render(report); await control(); return report; })();
  setInterval(() => { if (ready && hasControl) control(); }, 10000);
}());
