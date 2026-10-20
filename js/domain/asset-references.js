(function (root) {
  'use strict';
  const d = root.domain;
  // Tables whose rows only describe the past or an import bookkeeping link; they still protect a file.
  const historical = new Set(['animalEvents', 'activityLog', 'importIdentityMap']);
  const rank = { current: 0, inactive: 1, history: 2, dependent: 3 };
  // Every uuid-typed value is visited, with or without a declared ref, so new schema fields
  // (refs, originRef objects, dynamic entity ids or event parameters) protect files automatically.
  function walk(field, value, path, visit) {
    if (value === null || value === undefined) return;
    if (field.type === 'uuid') { if (typeof value === 'string') visit(value, path, field); return; }
    if (field.type === 'array' && Array.isArray(value)) value.forEach((item, index) => walk(field.items, item, path + '.' + index, visit));
    if (field.type === 'object' && field.fields && typeof value === 'object') Object.entries(field.fields).forEach(([key, child]) => walk(child, value[key], path + '.' + key, visit));
  }
  // Visits every uuid outside the record's own identity: the shared basis of reference analyses.
  function visitRecord(table, record, visit) {
    for (const [key, field] of Object.entries(d.schemas[table].fields)) if (key !== 'id' && key !== 'datasetId') walk(field, record[key], key, (value, path, leaf) => visit(value, path, leaf));
  }
  function kind(table, record, field) {
    if (historical.has(table) || !field.ref) return 'history';
    return record.archivedAt || record.deletedAt ? 'inactive' : 'current';
  }
  function signature(asset) {
    return root.utils.canonicalJson.stringify({ id: asset.id, revision: asset.revision, updatedAt: asset.updatedAt, sha256: asset.sha256,
      byteLength: asset.byteLength, type: asset.type, derivedFromAssetId: asset.derivedFromAssetId ?? null, archivedAt: asset.archivedAt ?? null, deletedAt: asset.deletedAt ?? null });
  }
  // Pure: tables of ONE dataset in, closed groups of files without incoming references out.
  function analyze(tables) {
    const assets = new Map((tables.assets || []).map(row => [row.id, row]));
    const incoming = new Map(), children = new Map();
    const add = (id, entry) => { if (!incoming.has(id)) incoming.set(id, []); incoming.get(id).push(entry); };
    for (const table of d.tableNames) {
      if (table === 'assets') continue;
      for (const record of tables[table] || []) {
        visitRecord(table, record, (value, path, leaf) => { if (assets.has(value)) add(value, { table, id: record.id, path, kind: kind(table, record, leaf) }); });
      }
    }
    for (const asset of assets.values()) {
      const parent = asset.derivedFromAssetId;
      if (parent && assets.has(parent)) { if (!children.has(parent)) children.set(parent, []); children.get(parent).push(asset.id); }
    }
    const unused = new Set([...assets.keys()].filter(id => !incoming.has(id)));
    // A parent stays while any derived file is kept; repeat until the candidate set is closed.
    let changed = true;
    while (changed) {
      changed = false;
      for (const [parent, list] of children) {
        if (unused.has(parent) && list.some(child => !unused.has(child))) { unused.delete(parent); changed = true; }
      }
    }
    const reason = id => {
      const own = incoming.get(id) || [];
      if (own.length) return own.map(entry => entry.kind).sort((a, b) => rank[a] - rank[b])[0];
      return 'dependent';
    };
    const kept = { current: { count: 0, bytes: 0 }, inactive: { count: 0, bytes: 0 }, history: { count: 0, bytes: 0 }, dependent: { count: 0, bytes: 0 } };
    for (const asset of assets.values()) if (!unused.has(asset.id)) { const value = kept[reason(asset.id)]; value.count++; value.bytes += asset.byteLength; }
    // Connected components inside the candidate set: deleting a whole group never strands a derived file.
    const seen = new Set(), groups = [];
    for (const id of [...unused].sort((a, b) => assets.get(a).createdAt.localeCompare(assets.get(b).createdAt) || a.localeCompare(b))) {
      if (seen.has(id)) continue;
      const members = [], stack = [id];
      while (stack.length) {
        const next = stack.pop(); if (seen.has(next) || !unused.has(next)) continue;
        seen.add(next); members.push(next);
        const parent = assets.get(next).derivedFromAssetId; if (parent) stack.push(parent);
        (children.get(next) || []).forEach(child => stack.push(child));
      }
      const rows = members.map(member => assets.get(member)).sort((a, b) => (a.derivedFromAssetId ? 1 : 0) - (b.derivedFromAssetId ? 1 : 0) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      groups.push({ key: rows.map(row => row.id).sort().join('+'), assetIds: rows.map(row => row.id), bytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
        files: rows.map(row => ({ id: row.id, type: row.type, mime: row.mime, originalName: row.originalName, byteLength: row.byteLength, sha256: row.sha256,
          width: row.width ?? null, height: row.height ?? null, createdAt: row.createdAt, derivedFromAssetId: row.derivedFromAssetId ?? null,
          archivedAt: row.archivedAt ?? null, deletedAt: row.deletedAt ?? null, signature: signature(row) })) });
    }
    const totalBytes = [...assets.values()].reduce((sum, row) => sum + row.byteLength, 0);
    return { totalCount: assets.size, totalBytes, unusedCount: unused.size, unusedBytes: groups.reduce((sum, group) => sum + group.bytes, 0), kept, groups,
      references: id => (incoming.get(id) || []).map(entry => ({ ...entry })) };
  }
  root.domain.assetReferences = Object.freeze({ analyze, signature, visitRecord });
}(window.RescueManager));
