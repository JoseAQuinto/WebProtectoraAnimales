(function (root) {
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  let urls=[],generation=0;
  function dispose(){generation++;root.modules.animalList.dispose();urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  const cat=(tables,id)=>{const row=tables.catalogOptions.find(item=>item.id===id);return row?root.services.catalogs.label(row):t('ui.unknown');};
  const field=(key,value)=>el('div',{},el('dt',{},t(key)),el('dd',{class:'preserve-lines'},value||t('ui.unknown')));
  const table=(keys,rows)=>rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},keys.map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows.map(values=>el('tr',{},values.map(value=>el('td',{},value??t('ui.unknown')))))))):el('p',{class:'muted'},t('a.emptySection'));
  function image(tables,assetId,alt,large=false){
    const img=el('img',{alt,class:large?'animal-photo':'animal-thumbnail',loading:'lazy'}),token=generation;
    const row=tables.assets.find(item=>item.id===assetId);
    if(!row)return el('span',{class:'no-photo','aria-label':t('a.noPhoto')},'◇');
    root.services.assetFiles.validateAsset(row).then(file=>{if(token!==generation)return;const url=URL.createObjectURL(file.blob);urls.push(url);img.src=url;}).catch(()=>{img.replaceWith(el('span',{class:'muted'},t('a.photoError')));});
    return img;
  }
  function render(ctx){
    const tables=ctx.snapshot.tables,forms=root.modules.animalForms;
    const civilToday=root.utils.dates.today(tables.organizationSettings[0].timeZone);
    const date=value=>{if(!value)return null;const format=tables.organizationSettings[0].dateFormat;return format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;};
    const grams=value=>new Intl.NumberFormat(root.core.i18n.language,{style:'unit',unit:'gram',unitDisplay:'short'}).format(value);
    const command=()=>({expectedRevision:ctx.snapshot.globalRevision});
    const action=(key,work,secondary=true)=>{const node=ui.button(t(key),work,secondary);node.disabled=!root.services.context.status().canWrite;return node;};
    const optionLabel=id=>cat(tables,id);
    function photo(animal){ui.form(t('a.setPhoto'),[{key:'file',labelKey:'a.photo',type:'file',required:true,accept:'.png,.jpg,.jpeg,.webp',help:'a.photoHelp'}],{},async({file},cmd)=>{await root.services.photos.set(animal.id,file,cmd);ctx.notify(t('ui.saved'));await ctx.refresh();},command());}
    function location(animal){
      const shelters=tables.locations.filter(row=>!row.deletedAt&&!row.archivedAt&&row.active);
      const episode=tables.stayEpisodes.find(row=>row.animalId===animal.id&&!row.exitDate),openFoster=tables.fosterStays.some(row=>row.animalId===animal.id&&!row.endDate);
      const dialog=ui.form(t('a.changeLocation'),[{key:'date',labelKey:'a.date',type:'date',required:true,min:episode?.entryDate,max:civilToday},{key:'kind',labelKey:'a.location',required:true,options:['shelter','temporary_external'].map(value=>({value,label:t('a.location.'+value)}))},
        {key:'locationId',labelKey:'a.shelter',options:shelters.map(row=>({value:row.id,label:row.name}))},{key:'description',labelKey:'a.externalLocation',type:'textarea',maxLength:2000},
        {key:'reason',labelKey:'a.reason',required:true,maxLength:200},{key:'fosterEndReason',labelKey:'a.fosterEndReason',required:openFoster,maxLength:200}],
      {date:root.utils.dates.today(tables.organizationSettings[0].timeZone),kind:animal.locationKind==='foster'?'shelter':animal.locationKind,locationId:animal.locationId,description:animal.externalLocationDescription},async(input,cmd)=>{
        await root.services.animals.changeLocation({animalId:animal.id,date:input.date,reason:input.reason,fosterEndReason:input.fosterEndReason,
          location:input.kind==='shelter'?{kind:'shelter',id:input.locationId}:{kind:'temporary_external',description:input.description}},cmd);ctx.notify(t('ui.saved'));await ctx.refresh();
      },command());
      const kind=dialog.querySelector('[name=kind]'),place=dialog.querySelector('[name=locationId]'),external=dialog.querySelector('[name=description]');
      const paint=()=>{const shelter=kind.value==='shelter';place.required=shelter;place.closest('.field').hidden=!shelter;external.required=!shelter;external.closest('.field').hidden=shelter;};kind.addEventListener('change',paint);paint();
    }
    function availability(animal){ui.form(t('a.setAvailability'),[{key:'availability',labelKey:'a.availability',required:true,options:['available','unavailable'].map(value=>({value,label:t('a.availability.'+value)}))}],{availability:animal.adoptionAvailability},async(input,cmd)=>{
      await root.services.animals.setAvailability({animalId:animal.id,...input},cmd);ctx.notify(t('ui.saved'));await ctx.refresh();},command());}
    function where(animal){if(animal.locationKind==='shelter')return tables.locations.find(row=>row.id===animal.locationId)?.name||t('ui.unknown');
      if(animal.locationKind==='temporary_external')return animal.externalLocationDescription;
      if(animal.locationKind==='foster'){const stay=tables.fosterStays.find(row=>row.animalId===animal.id&&!row.endDate),profile=tables.fosterProfiles.find(row=>row.id===stay?.fosterProfileId);return root.services.contacts.resolve(tables,profile?.contactId)?.name||t('a.location.foster');}return t('ui.unknown');}
    function details(animal){
      const active=!animal.archivedAt&&!animal.deletedAt,underCare=animal.managementStatus==='under_care';
      const latest=root.services.weights.latest(tables,animal.id),actions=el('div',{class:'actions'});
      if(active){actions.append(action('a.edit',()=>forms.edit(ctx,animal)),action('a.setPhoto',()=>photo(animal)),action('a.addWeight',()=>forms.weight(ctx,animal)));
        if(underCare)actions.append(action('a.changeLocation',()=>location(animal)),action('a.setAvailability',()=>availability(animal)),action('a.exit',()=>forms.exit(ctx,animal)));
        if(animal.managementStatus==='other_exit')actions.append(action('a.reenter',()=>forms.entry(ctx,animal)));
        if(!underCare)actions.append(action('a.archive',()=>forms.disposition(ctx,animal,'archive')),action('a.trash',()=>forms.disposition(ctx,animal,'trash')));
      }else actions.append(action('a.restore',()=>forms.disposition(ctx,animal,'restore')));
      if(active&&animal.photoAssetId)actions.append(action('a.removePhoto',()=>{if(confirm(t('a.removePhotoConfirm')))ctx.action(async()=>{await root.services.photos.remove(animal.id,{...command(),operationId:root.utils.ids.uuidV4()});ctx.notify(t('ui.saved'));});}));
      const tabs=el('div',{class:'tabs','aria-label':t('a.sections')}),body=el('div',{class:'stack'});
      const sections={
        info:()=>el('div',{class:'stack'},el('dl',{class:'detail-grid'},field('a.code',animal.code),field('a.species',optionLabel(animal.speciesId)),field('a.breed',animal.breed),field('a.sex',t('a.sex.'+animal.sex)),
          field('a.birthDate',date(animal.birthDate)),field('a.birthPrecision',t('a.precision.'+animal.birthPrecision)),field('af.estimatedAgeMonths',animal.estimatedAgeMonths===null?null:new Intl.NumberFormat(root.core.i18n.language).format(animal.estimatedAgeMonths)),field('af.estimatedAgeReferenceDate',date(animal.estimatedAgeReferenceDate)),field('a.microchip',animal.microchipOriginal),field('a.size',animal.sizeId?optionLabel(animal.sizeId):null),
          field('a.color',animal.color),field('a.sterilization',t('a.sterilization.'+animal.sterilizationStatus)),field('a.location',where(animal)),field('a.lastWeight',latest?grams(latest.grams)+' · '+date(latest.date):null)),
          ...['description','character','behavior','specialNeeds','notes'].filter(key=>animal[key]).map(key=>el('section',{},el('h3',{},t('a.'+key)),el('p',{class:'preserve-lines'},animal[key]))),
          el('h3',{},t('a.weights')),table(['a.date','a.weight','a.notes','a.actions'],root.services.weights.list(tables,animal.id).map(row=>[date(row.date),grams(row.grams),row.notes,
            active?action('a.edit',()=>ui.form(t('a.editWeight'),[{key:'date',labelKey:'a.date',type:'date',required:true,max:civilToday},{key:'grams',labelKey:'a.grams',type:'number',numeric:true,required:true,min:1,max:Number.MAX_SAFE_INTEGER,step:1},{key:'notes',labelKey:'a.notes',type:'textarea',keepEmpty:true}],row,async(input,cmd)=>{await root.services.weights.update(row.id,input,cmd);ctx.notify(t('ui.saved'));await ctx.refresh();},command())):null]))),
        health:()=>root.modules.healthWorkflow.render(ctx,animal),
        foster:()=>root.modules.fosterWorkflow.render(ctx,animal),
        adoption:()=>root.modules.adoptionWorkflow.render(ctx,animal),
        expenses:()=>table(['a.date','a.title','a.amount','a.state'],tables.financialMovements.filter(row=>row.animalId===animal.id).sort((a,b)=>b.date.localeCompare(a.date)).map(row=>[row.date,row.concept,root.utils.money.format(row.amountMinor,row.currencyCode,{locale:root.core.i18n.language}),t('a.finance.'+row.status)])),
        documents:()=>ctx.documents({entityType:'animal',entityId:animal.id}),
        history:()=>root.modules.animalHistory.render(ctx,animal)
      };
      let selected=ctx.route.tab&&sections[ctx.route.tab]?ctx.route.tab:'info';
      const choose=key=>{selected=key;for(const control of tabs.children)control.setAttribute('aria-pressed',String(control.dataset.tab===key));body.replaceChildren(sections[key]());};
      for(const key of Object.keys(sections)){const control=ui.button(t('a.tab.'+key),()=>{window.location.hash='animals/'+animal.id+'/'+key;},true);control.dataset.tab=key;tabs.append(control);}choose(selected);
      return [el('header',{class:'page-heading'},el('div',{},el('a',{href:'#animals'},t('a.back')),el('p',{class:'eyebrow'},animal.code),el('h1',{},animal.name),el('p',{},t('a.status.'+animal.managementStatus)+' · '+t('a.availability.'+animal.adoptionAvailability)))),
        el('section',{class:'card animal-summary'},image(tables,animal.photoAssetId,animal.name,true),el('div',{class:'stack'},actions,el('p',{class:'muted'},t('a.recordHelp')))),tabs,el('section',{class:'card'},body)];
    }
    if(ctx.route.id){const row=tables.animals.find(item=>item.id===ctx.route.id);return row?details(row):[el('h1',{},t('a.notFound')),el('a',{href:'#animals'},t('a.back'))];}
    return root.modules.animalList.render(ctx,{image:row=>image(tables,row.thumbnailAssetId,row.name),create:()=>forms.entry(ctx),where,dispose});
  }
  root.modules.animals=Object.freeze({render,dispose});
}(window.RescueManager));
