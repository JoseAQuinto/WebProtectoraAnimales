(function(root){
  'use strict';
  function replace(h,changes,previous,date,reason,field){
    if(previous.supersededByEventId||previous.voidReason)throw new root.core.errors.AppError('hc.unsupported');
    const replacement=h.create('animalEvents',{animalId:previous.animalId,type:previous.type,eventDate:date,recordedAt:h.now,
      source:previous.source,originKey:'correction:'+h.operationId+':'+previous.id,correctsEventId:previous.id,
      parameters:{...previous.parameters,reason,field}});
    changes.push(h.replace('animalEvents',h.edit('animalEvents',previous,{supersededByEventId:replacement.id})),h.insert('animalEvents',replacement));return replacement;
  }
  root.services.historyEvents=Object.freeze({replace});
}(window.RescueManager));
