'use strict';
// A parent PID alone is insufficient: Windows reuses it while old child rows remain.
function descendants(rows,identity){
  const root=rows.find(row=>row.ProcessId===identity.ProcessId&&row.CreatedAt===identity.CreatedAt);
  if(!root||!Number.isFinite(Date.parse(root.CreatedAt)))return[];
  const owned=new Map([[root.ProcessId,root]]);let previous;
  do{previous=owned.size;for(const row of rows){const parent=owned.get(row.ParentProcessId);
    if(parent&&Number.isFinite(Date.parse(row.CreatedAt))&&Date.parse(row.CreatedAt)>=Date.parse(parent.CreatedAt))owned.set(row.ProcessId,row);
  }}while(previous!==owned.size);
  return rows.filter(row=>owned.has(row.ProcessId));
}
function verifiedRoot(rows,pid,profile,startedAt){
  return rows.find(row=>row.ProcessId===pid&&typeof row.CommandLine==='string'&&row.CommandLine.toLowerCase().includes(profile.toLowerCase())&&Date.parse(row.CreatedAt)>=startedAt-2000)||null;
}
module.exports={descendants,verifiedRoot};
