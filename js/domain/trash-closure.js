(function (root) {
  'use strict';
  const d = root.domain;
  // Rows that only describe or link the deleted facts; they never survive their target.
  const base = ['activityLog', 'importIdentityMap', 'documentLinks'];
  // Facts owned by a root. Anything else that points into the closure blocks removal:
  // finance, donations, inventory, other people, profiles, documents or configuration.
  const policies = {
    animals: [...base, 'animalEvents', 'stayEpisodes', 'weightMeasurements', 'fosterStays', 'adoptionApplications', 'reservations', 'adoptions', 'veterinaryRecords', 'carePlans', 'tasks'],
    documents: [...base, 'animalEvents']
  };
  const excluded = new Set(['documentLinks', 'assets']);
  // Shared vocabulary is not reported as a lost relation.
  const configuration = new Set(['organizationSettings', 'catalogOptions', 'locations']);
  const key = (table, id) => table + '/' + id;
  function signature(table, row) {
    return root.utils.canonicalJson.stringify({ table, id: row.id, revision: row.revision, updatedAt: row.updatedAt, deletedAt: row.deletedAt ?? null, archivedAt: row.archivedAt ?? null });
  }
  // Root candidates: trashed rows of tables that allow trash, excluding relation and file rows.
  function roots(tables) {
    const found = [];
    for (const table of d.tableNames) {
      if (excluded.has(table) || d.schemas[table].allowTrash === false) continue;
      for (const row of tables[table] || []) if (row.deletedAt) found.push({ table, id: row.id, deletedAt: row.deletedAt });
    }
    return found.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || a.table.localeCompare(b.table) || a.id.localeCompare(b.id));
  }
  function index(tables) {
    const rows = new Map(), incoming = new Map();
    for (const table of d.tableNames) for (const row of tables[table] || []) rows.set(row.id, { table, row });
    for (const table of d.tableNames) for (const row of tables[table] || []) d.assetReferences.visitRecord(table, row, (value, path) => {
      if (!rows.has(value) || value === row.id) return;
      if (!incoming.has(value)) incoming.set(value, []);
      incoming.get(value).push({ table, row, path });
    });
    return { rows, incoming };
  }
  // Pure: the exact set removed with one trashed root, the records that block it and the relations kept.
  function analyze(tables, table, id, options = {}) {
    const target = (tables[table] || []).find(row => row.id === id);
    if (!target || excluded.has(table) || d.schemas[table]?.allowTrash === false) return { blocked: true, root: null, blockers: [{ reason: 'missing', table, id }], records: [], counts: {}, affected: {}, assets: [] };
    const { rows, incoming } = index(tables), cascade = new Set(policies[table] || base), closure = new Map([[target.id, { table, row: target }]]), blockers = [], queue = [target.id];
    if (!target.deletedAt) blockers.push({ reason: 'notInTrash', table, id });
    while (queue.length) {
      const memberId = queue.shift();
      for (const entry of incoming.get(memberId) || []) {
        if (closure.has(entry.row.id)) continue;
        const owner = entry.row.animalId;
        if (!cascade.has(entry.table) || entry.table === 'assets') { if (entry.table !== 'assets') blockers.push({ reason: 'referenced', table: entry.table, id: entry.row.id, path: entry.path, targetTable: closure.get(memberId).table, targetId: memberId }); continue; }
        // Another animal's facts are never removed through this root.
        if (table === 'animals' && owner && owner !== target.id) { blockers.push({ reason: 'otherAnimal', table: entry.table, id: entry.row.id, path: entry.path, targetTable: closure.get(memberId).table, targetId: memberId }); continue; }
        closure.set(entry.row.id, { table: entry.table, row: entry.row }); queue.push(entry.row.id);
      }
    }
    if (table === 'animals' && target.managementStatus === 'under_care') blockers.push({ reason: 'underCare', table, id });
    for (const { table: name, row } of closure.values()) if (name === 'tasks' && ['pending', 'in_progress'].includes(row.status)) blockers.push({ reason: 'openTask', table: name, id: row.id });
    // Files referenced by removed rows join only when nothing else will use them afterwards.
    const referencedAssets = new Set(), affected = {};
    for (const { table: name, row } of closure.values()) d.assetReferences.visitRecord(name, row, value => {
      const found = rows.get(value); if (!found || closure.has(value)) return;
      if (found.table === 'assets') { referencedAssets.add(value); return; }
      if (configuration.has(found.table)) return;
      (affected[found.table] = affected[found.table] || new Set()).add(value);
    });
    const next = Object.fromEntries(d.tableNames.map(name => [name, (tables[name] || []).filter(row => !closure.has(row.id))]));
    const groups = d.assetReferences.analyze(next).groups.filter(group => group.assetIds.some(asset => referencedAssets.has(asset)));
    const assets = groups.flatMap(group => group.files.map(file => ({ id: file.id, type: file.type, originalName: file.originalName, byteLength: file.byteLength })));
    for (const asset of assets) closure.set(asset.id, { table: 'assets', row: tables.assets.find(row => row.id === asset.id) });
    const removed = new Set(assets.map(asset => asset.id)); next.assets = next.assets.filter(row => !removed.has(row.id));
    if (!blockers.length) {
      try { d.validateDataset(next, { datasetId: target.datasetId, today: options.today, throwOnError: true }); }
      catch (error) { blockers.push({ reason: 'validation', table, id, details: (error.details || []).slice(0, 5).map(item => ({ table: item.table, id: item.id, path: item.path, code: item.code })) }); }
    }
    const records = [...closure.values()].map(({ table: name, row }) => ({ table: name, id: row.id, signature: signature(name, row) })).sort((a, b) => a.table.localeCompare(b.table) || a.id.localeCompare(b.id));
    const counts = {}; records.forEach(record => { counts[record.table] = (counts[record.table] || 0) + 1; });
    return { blocked: blockers.length > 0, root: { table, id, deletedAt: target.deletedAt ?? null }, blockers, records, counts,
      affected: Object.fromEntries(Object.entries(affected).map(([name, ids]) => [name, ids.size])), assets, assetBytes: assets.reduce((sum, asset) => sum + asset.byteLength, 0) };
  }
  root.domain.trashClosure = Object.freeze({ roots, analyze, signature, policies: Object.freeze(Object.fromEntries(Object.entries(policies).map(([name, list]) => [name, Object.freeze(list)]))) });
}(window.RescueManager));
