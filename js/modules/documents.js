(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (...args) => root.core.i18n.t(...args), service = root.services.documents;
  const entityKey = type => ({ animal:'table.animals', contact:'table.contacts', adoption:'table.adoptions', veterinary_record:'table.veterinaryRecords' })[type];
  function render(ctx, entity) {
    const panel = el('section', {class:'card stack documents-panel'}), results = el('div'), filters = {search:'', mode:'', state:'active', page:1};
    const data = () => ctx.snapshot.tables, command = () => ({expectedRevision:ctx.snapshot.globalRevision});
    const canWrite = () => root.services.context.status().canWrite;
    const action = (key, work, mutation = true) => { const node = ui.button(t(key), work, true); node.disabled = mutation && !canWrite(); return node; };
    const category = id => { const row = data().catalogOptions.find(item=>item.id===id); return row ? root.services.catalogs.label(row) : t('ui.unknown'); };
    const label = (key, control) => {const id='document-field-'+root.utils.ids.uuidV4();control.id=id;return el('div',{class:'field'},el('label',{for:id},t(key)),control);};
    async function saved() { ctx.notify(t('ui.saved')); await ctx.refresh(); paint(); }
    function metadata(row) {
      const types = data().catalogOptions.filter(item=>item.kind==='document_type' && ((!item.deletedAt&&!item.archivedAt&&item.active)||item.id===row?.typeId));
      return [{key:'title',labelKey:'d.title',required:true,maxLength:200},{key:'typeId',labelKey:'d.type',required:true,options:types.map(item=>({value:item.id,label:root.services.catalogs.label(item)}))},
        {key:'date',labelKey:'d.date',type:'date',required:true},{key:'notes',labelKey:'d.notes',type:'textarea',keepEmpty:true,advancedKey:'d.additional'}];
    }
    function editor(row, mode) {
      mode = row?.mode || mode;
      const fields=metadata(row).filter(field=>!row||field.key!=='date'), external=mode==='external_reference';
      if(external) fields.push({key:'externalFileName',labelKey:'d.externalName',required:true,maxLength:255},{key:'externalLocation',labelKey:'d.location',required:true,type:'textarea',help:'d.externalHelp'},
        {key:'externalFileType',labelKey:'d.fileType',maxLength:100},{key:'originalFile',labelKey:'d.originalFile',type:'file',help:'d.hashHelp',advancedKey:'d.additional'});
      else if(!row) fields.push({key:'file',labelKey:'d.file',type:'file',required:true,accept:'.pdf,.png,.jpg,.jpeg,.webp,.txt',help:'d.fileHelp'});
      ui.form(t(row?'d.edit':external?'d.newExternal':'d.newEmbedded'),fields,row||{date:root.utils.dates.today(data().organizationSettings[0].timeZone)},async(input,cmd)=>{
        const {file,originalFile,...values}=input;
        if(originalFile){if(originalFile.size>root.config.limits.backupBytes||!originalFile.size)throw new RangeError('File size');values.originalSha256=await root.utils.integrity.sha256(new Uint8Array(await originalFile.arrayBuffer()));}
        if(row) await service.update(row.id,values,cmd);
        else {if(entity)values.links=[entity];if(external)await service.createExternal(values,cmd);else await service.createEmbedded(values,file,cmd);}
        await saved();
      },command());
    }
    function confirmChange(key, work) {
      let busy=false; const errors=el('p',{role:'alert',class:'form-errors'}), captured=command(), operationId=root.utils.ids.uuidV4();
      const apply=action(key,async()=>{if(busy)return;busy=true;apply.disabled=true;try{await work({...captured,operationId});modal.close();await saved();}catch(error){errors.textContent=ui.message(error);}finally{busy=false;apply.disabled=false;}});
      const modal=ui.dialog(t(key),[el('p',{},t('d.preserve')),errors,apply],{beforeClose:()=>!busy});
    }
    function compare(row) {
      ui.form(t('d.compare'),[{key:'file',labelKey:'d.file',type:'file',required:true,help:'d.compareHelp'}],{},async({file})=>{
        const result=await service.compareExternal(row.id,file);ctx.notify(t(result.matches===null?'d.noOriginalHash':result.matches?'d.matches':'d.differs'));await ctx.refresh();
      });
    }
    function targetName(type,id) {
      const row=data()[root.domain.entityTables[type]].find(item=>item.id===id);
      if(!row)return t('ui.unknown'); if(type==='contact')return row.name;
      const animal=type==='animal'?row:data().animals.find(item=>item.id===row.animalId);
      return (animal?animal.code+' · '+animal.name:t(entityKey(type)))+(type==='animal'?'':' · '+(row.date||row.adoptionDate||''));
    }
    function links(row, beforeChange) {
      const area=el('div',{class:'stack'}), active=data().documentLinks.filter(link=>link.documentId===row.id&&!link.deletedAt&&!link.archivedAt);
      area.append(el('h3',{},t('d.links')),active.length?el('ul',{},active.map(link=>el('li',{},t(entityKey(link.entityType))+': '+targetName(link.entityType,link.entityId)+' ',
        action('d.unlink',()=>{beforeChange();confirmChange('d.unlink',cmd=>service.unlink(link.id,cmd));})))):el('p',{class:'muted'},t('d.noLinks')));
      const type=el('select',{},root.domain.enums.documentEntityType.map(value=>el('option',{value},t(entityKey(value))))), target=el('select');
      const fill=()=>{target.replaceChildren(...data()[root.domain.entityTables[type.value]].filter(item=>!item.deletedAt&&!item.archivedAt&&!item.mergedIntoContactId).map(item=>el('option',{value:item.id},targetName(type.value,item.id))));};
      type.addEventListener('change',fill);fill();
      area.append(label('d.linkType',type),label('d.linkTarget',target),action('d.link',()=>{if(!target.value)return;const relation={entityType:type.value,entityId:target.value};beforeChange();confirmChange('d.link',cmd=>service.link(row.id,relation,cmd));}));
      return area;
    }
    function detail(row) {
      const isExternal=row.mode==='external_reference', content=el('div',{class:'stack'},el('p',{class:'badge'},t(isExternal?'d.external':'d.embedded')),
        el('p',{},category(row.typeId)+' · '+row.date),el('p',{class:'preserve-lines'},row.notes||t('d.noNotes')),
        isExternal?el('div',{},el('p',{},row.externalFileName),el('p',{class:'preserve-lines'},row.externalLocation),el('p',{class:'notice warning'},t('d.externalHelp'))):null);
      const controls=el('div',{class:'actions'}), editable=!row.deletedAt&&!row.archivedAt;
      if(!isExternal)controls.append(action('d.download',()=>ctx.action(async()=>{const file=await service.download(row.id);ui.download(file.blob,file.fileName);}),false));
      else controls.append(action('d.compare',()=>compare(row),false));
      if(editable)controls.append(action('dc.title',()=>{modal.close();root.modules.documentDates.open(ctx,row,saved);}),action('d.edit',()=>{modal.close();editor(row);}),action('d.archive',()=>{modal.close();confirmChange('d.archive',cmd=>service.archive(row.id,cmd));}));
      if(row.archivedAt&&!row.deletedAt)controls.append(action('d.unarchive',()=>{modal.close();confirmChange('d.unarchive',cmd=>service.unarchive(row.id,cmd));}));
      controls.append(action(row.deletedAt?'d.restore':'d.trash',()=>{modal.close();confirmChange(row.deletedAt?'d.restore':'d.trash',cmd=>service[row.deletedAt?'restore':'trash'](row.id,cmd));}));
      content.append(controls);if(editable)content.append(links(row,()=>modal.close()));
      const modal=ui.dialog(row.title,content,{wide:true});
    }
    function chooseExisting() {
      const rows=service.list(data()).filter(row=>!data().documentLinks.some(link=>!link.deletedAt&&link.documentId===row.id&&link.entityType===entity.entityType&&link.entityId===entity.entityId));
      const choices=el('select',{},rows.map(row=>el('option',{value:row.id},row.title+' · '+row.date)));
      const modal=ui.dialog(t('d.linkExisting'),[label('d.title',choices),action('d.link',()=>{if(choices.value){modal.close();confirmChange('d.link',cmd=>service.link(choices.value,entity,cmd));}})]);
    }
    function paint() {
      const rows=service.list(data(),{...entity,search:filters.search,mode:filters.mode,trash:filters.state==='trash',includeArchived:filters.state==='all'});
      const pages=Math.max(1,Math.ceil(rows.length/20));filters.page=Math.min(filters.page,pages);
      const table=el('table',{},el('thead',{},el('tr',{},['d.title','d.type','d.date','d.mode','d.state','d.actions'].map(key=>el('th',{scope:'col'},t(key))))),
        el('tbody',{},rows.slice((filters.page-1)*20,filters.page*20).map(row=>el('tr',{},el('th',{scope:'row'},row.title),el('td',{},category(row.typeId)),el('td',{},row.date),el('td',{},t(row.mode==='embedded'?'d.embedded':'d.external')),
          el('td',{},t(row.deletedAt?'d.trash':row.archivedAt?'d.archived':'d.active')),el('td',{},action('d.open',()=>detail(row),false))))));
      const previous=action('d.previous',()=>{filters.page--;paint();},false),next=action('d.next',()=>{filters.page++;paint();},false);previous.disabled=filters.page<=1;next.disabled=filters.page>=pages;
      results.replaceChildren(rows.length?el('div',{class:'table-wrap'},table):el('p',{class:'muted'},t('d.empty')),el('div',{class:'actions'},previous,el('span',{},t('d.page',{page:filters.page,pages,count:rows.length})),next));
    }
    const search=el('input',{type:'search',maxlength:200}), mode=el('select',{},['','embedded','external_reference'].map(value=>el('option',{value},t(value==='embedded'?'d.embedded':value?'d.external':'d.allModes')))),
      state=el('select',{},['active','all','trash'].map(value=>el('option',{value},t('d.'+value))));
    for(const [control,key]of[[search,'search'],[mode,'mode'],[state,'state']])control.addEventListener(control===search?'input':'change',()=>{filters[key]=control.value;filters.page=1;paint();});
    const used=data().assets.reduce((sum,row)=>sum+row.byteLength,0);
    panel.append(el('h2',{},t('nav.documents')),el('p',{class:'muted'},t('d.help')),el('p',{},t('d.budget',{used:(used/1048576).toFixed(2),limit:64})),
      el('div',{class:'actions'},action('d.newEmbedded',()=>editor(null,'embedded')),action('d.newExternal',()=>editor(null,'external_reference')),entity?action('d.linkExisting',chooseExisting):null),
      el('div',{class:'people-filters'},label('d.search',search),label('d.mode',mode),label('d.state',state)),results);
    paint();return panel;
  }
  root.modules.documents=Object.freeze({render});
}(window.RescueManager));
