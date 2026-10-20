(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  // Read-only printable sheet. Personal data (people, their contact details and a foster
  // home as location) and internal notes appear only when explicitly chosen; text uses textContent.
  function sheet(tables,animal,options,images){
    const org=tables.organizationSettings[0],format=org.dateFormat,live=row=>!row.deletedAt;
    const date=value=>!value?null:format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;
    const option=id=>{const row=tables.catalogOptions.find(item=>item.id===id);return row?root.services.catalogs.label(row):null;};
    const person=id=>{const contact=root.services.contacts.resolve(tables,id);if(!contact)return null;return[contact.name,...contact.phones.map(phone=>phone.original),contact.email,contact.address].filter(Boolean).join(' · ');};
    const named=id=>options.personal?person(id):null,grams=value=>new Intl.NumberFormat(root.core.i18n.language,{style:'unit',unit:'gram',unitDisplay:'short'}).format(value);
    const pair=(key,value)=>value===null||value===undefined||value===''?null:el('div',{},el('dt',{},t(key)),el('dd',{class:'preserve-lines'},String(value)));
    const block=(key,rows,headers)=>el('section',{class:'print-block'},el('h3',{},t(key)),rows.length?el('table',{},el('thead',{},el('tr',{},headers.map(header=>el('th',{scope:'col'},t(header))))),el('tbody',{},rows.map(values=>el('tr',{},values.map(value=>el('td',{class:'preserve-lines'},value??'—')))))):el('p',{class:'muted'},t('a.emptySection')));
    let where=null;
    if(animal.locationKind==='shelter')where=tables.locations.find(row=>row.id===animal.locationId)?.name||null;
    else if(animal.locationKind==='temporary_external')where=animal.externalLocationDescription;
    else if(animal.locationKind==='foster'){const stay=tables.fosterStays.find(row=>row.animalId===animal.id&&!row.endDate),profile=tables.fosterProfiles.find(row=>row.id===stay?.fosterProfileId);where=options.personal&&profile?t('a.location.foster')+': '+person(profile.contactId):t('a.location.foster');}
    const weights=root.services.weights.list(tables,animal.id).slice(0,10),latest=weights[0];
    const health=tables.veterinaryRecords.filter(row=>row.animalId===animal.id&&live(row)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
    const plans=tables.carePlans.filter(row=>row.animalId===animal.id&&live(row)&&['planned','active'].includes(row.status));
    const episodes=tables.stayEpisodes.filter(row=>row.animalId===animal.id&&live(row)).sort((a,b)=>a.entryDate.localeCompare(b.entryDate));
    const fosters=tables.fosterStays.filter(row=>row.animalId===animal.id&&live(row)).sort((a,b)=>a.startDate.localeCompare(b.startDate));
    const adoptions=tables.adoptions.filter(row=>row.animalId===animal.id&&live(row)).sort((a,b)=>a.adoptionDate.localeCompare(b.adoptionDate));
    const linked=new Set(tables.documentLinks.filter(row=>live(row)&&row.entityType==='animal'&&row.entityId===animal.id).map(row=>row.documentId));
    const documents=tables.documents.filter(row=>linked.has(row.id)&&live(row)).sort((a,b)=>b.date.localeCompare(a.date));
    const today=root.utils.dates.today(org.timeZone);
    return el('article',{class:'print-sheet','aria-label':t('pr.sheet')},
      el('header',{class:'print-sheet-header'},images.logo||null,el('div',{},el('strong',{},org.name),org.printDetails?el('p',{class:'preserve-lines'},org.printDetails):null)),
      el('div',{class:'print-sheet-title'},images.photo||null,el('div',{},el('p',{class:'eyebrow'},animal.code),el('h2',{},animal.name),el('p',{},t('a.status.'+animal.managementStatus)+' · '+t('a.availability.'+animal.adoptionAvailability)),el('p',{class:'muted'},t('pr.printedOn',{date:date(today)})))),
      el('dl',{class:'detail-grid'},[pair('a.species',option(animal.speciesId)),pair('a.breed',animal.breed),pair('a.sex',t('a.sex.'+animal.sex)),pair('a.birthDate',date(animal.birthDate)),pair('af.estimatedAgeMonths',animal.estimatedAgeMonths),pair('a.size',animal.sizeId?option(animal.sizeId):null),pair('a.color',animal.color),pair('a.microchip',animal.microchipOriginal),pair('a.sterilization',t('a.sterilization.'+animal.sterilizationStatus)+(animal.sterilizationDate?' · '+date(animal.sterilizationDate):'')),pair('a.location',where),pair('a.lastWeight',latest?grams(latest.grams)+' · '+date(latest.date):null),pair('pr.deceasedOn',date(animal.deceasedOn))].filter(Boolean)),
      ...['description','character','behavior','specialNeeds',...(options.notes?['notes']:[])].filter(key=>animal[key]).map(key=>el('section',{class:'print-block'},el('h3',{},t('a.'+key)),el('p',{class:'preserve-lines'},animal[key]))),
      block('pr.health',health.map(row=>[date(row.date),t('a.vet.'+row.type),row.title,row.results||null,...(options.personal?[named(row.veterinarianContactId)||named(row.clinicContactId)]:[])]),['a.date','pr.type','a.title','pr.results',...(options.personal?['pr.professional']:[])]),
      plans.length?block('pr.plans',plans.map(row=>[row.name,row.medication,[row.doseInstructions,row.routeInstructions,row.frequencyInstructions].filter(Boolean).join('\n')||null,date(row.startDate),date(row.plannedEndDate)]),['a.title','pr.medication','pr.instructions','pr.start','pr.end']):null,
      block('pr.weights',weights.map(row=>[date(row.date),grams(row.grams)]),['a.date','pr.weight']),
      block('pr.stays',episodes.map(row=>[date(row.entryDate),t('hi.entry.'+row.entryType),row.entryReason,date(row.exitDate),row.exitReason?t('hi.exit.'+row.exitReason):null]),['pr.entryDate','pr.type','a.reason','pr.exitDate','pr.exitReason']),
      fosters.length?block('pr.fosters',fosters.map(row=>[date(row.startDate),date(row.endDate),...(options.personal?[person(tables.fosterProfiles.find(item=>item.id===row.fosterProfileId)?.contactId)]:[])]),['pr.start','pr.end',...(options.personal?['pr.family']:[])]):null,
      adoptions.length?block('pr.adoptions',adoptions.map(row=>[date(row.adoptionDate),date(row.returnDate),row.returnReason,...(options.personal?[person(row.adopterContactId)]:[])]),['pr.adoptionDate','pr.returnDate','a.reason',...(options.personal?['pr.adopter']:[])]):null,
      documents.length?block('pr.documents',documents.map(row=>[date(row.date),row.title,t(row.mode==='embedded'?'pr.embedded':'pr.external')]),['a.date','a.title','pr.mode']):null,
      el('footer',{class:'print-sheet-footer'},el('p',{class:'muted'},t(options.personal?'pr.personalIncluded':'pr.personalExcluded')),org.printFooter?el('p',{class:'preserve-lines'},org.printFooter):null));
  }
  function image(tables,id,className,alt,urls){
    const row=tables.assets.find(item=>item.id===id);if(!row)return Promise.resolve(null);
    return root.services.assetFiles.validateAsset(row).then(file=>new Promise(resolve=>{const url=URL.createObjectURL(file.blob);urls.push(url);const img=el('img',{alt,class:className});img.addEventListener('load',()=>resolve(img),{once:true});img.addEventListener('error',()=>resolve(null),{once:true});img.src=url;})).catch(()=>null);
  }
  async function open(ctx,animal){
    const tables=ctx.snapshot.tables,org=tables.organizationSettings[0],urls=[];
    const [photo,logo]=await Promise.all([image(tables,animal.photoAssetId,'print-sheet-photo',animal.name,urls),image(tables,org.logoAssetId,'print-sheet-logo',org.name,urls)]);
    const personal=el('input',{type:'checkbox',id:'print-personal'}),notes=el('input',{type:'checkbox',id:'print-notes'}),preview=el('div',{class:'print-preview'});
    const build=()=>sheet(tables,animal,{personal:personal.checked,notes:notes.checked},{photo:photo?.cloneNode(),logo:logo?.cloneNode()});
    const paint=()=>preview.replaceChildren(build());personal.addEventListener('change',paint);notes.addEventListener('change',paint);
    let printed=null;const cleanup=()=>{printed?.remove();printed=null;document.documentElement.classList.remove('printing-sheet');};
    const print=ui.button(t('ui.print'),()=>{cleanup();printed=build();printed.classList.add('print-sheet-output');document.body.append(printed);document.documentElement.classList.add('printing-sheet');window.addEventListener('afterprint',cleanup,{once:true});window.print();});
    const dialog=ui.dialog(t('pr.title'),[el('div',{class:'print-controls stack'},el('p',{class:'muted'},t('pr.help')),el('label',{for:personal.id},personal,t('pr.includePersonal')),el('label',{for:notes.id},notes,t('pr.includeNotes')),el('div',{class:'actions'},print)),preview],{wide:true,onClose:()=>{cleanup();urls.forEach(url=>URL.revokeObjectURL(url));}});
    paint();return dialog;
  }
  root.modules.animalPrint=Object.freeze({open,sheet});
}(window.RescueManager));
