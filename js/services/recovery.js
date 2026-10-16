(function(root){
  'use strict';
  // Read-only inventory. A recovery still goes through backup.recover and its verified-copy guard.
  async function list(){
    const datasets=await root.storage.datasetManager.list(),results=[];
    for(const dataset of datasets.filter(row=>['retired','staging'].includes(row.state)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))){
      const snapshot=await root.storage.repositories.snapshot(dataset.id);
      if(!snapshot)continue;
      results.push({datasetId:dataset.id,state:dataset.state,updatedAt:dataset.updatedAt,validated:!!dataset.validation,
        organizationName:snapshot.tables.organizationSettings[0]?.name||null,
        recordCount:Object.values(snapshot.tables).reduce((sum,rows)=>sum+rows.length,0),
        assetBytes:snapshot.tables.assets.reduce((sum,row)=>sum+row.byteLength,0)});
    }
    return results;
  }
  root.services.recovery=Object.freeze({list,recover:(id,command)=>root.services.backup.recover(id,command)});
}(window.RescueManager));
