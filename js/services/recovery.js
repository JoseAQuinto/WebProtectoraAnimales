(function(root){
  'use strict';
  // Read-only inventory. A recovery still goes through backup.recover and its verified-copy guard.
  async function list(){
    const datasets=await root.storage.datasetManager.list(),results=[];
    for(const dataset of datasets.filter(row=>['retired','staging'].includes(row.state)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))){
      const snapshot=await root.storage.retention.review(dataset.id);
      results.push({datasetId:dataset.id,state:dataset.state,updatedAt:dataset.updatedAt,validated:!!dataset.validation,
        organizationName:snapshot.organizationName,
        recordCount:snapshot.records,
        assetBytes:snapshot.assetBytes});
    }
    return results;
  }
  root.services.recovery=Object.freeze({list,recover:(id,command)=>root.services.backup.recover(id,command)});
}(window.RescueManager));
