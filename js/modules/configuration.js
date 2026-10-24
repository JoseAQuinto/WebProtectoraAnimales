(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.configuration;
  const view={kind:'species',inactive:false,optionPage:1,locationPage:1};
  function render(ctx){
    const data=ctx.snapshot.tables,command=()=>({expectedRevision:ctx.snapshot.globalRevision}),allowed=()=>ctx.canWrite();
    const action=(label,callback)=>{const button=ui.button(t(label),callback,true);button.disabled=!allowed();return button;};
    const saved=async()=>{ctx.notify(t('ui.saved'));await ctx.refresh();};
    function option(previous){
      const fields=[];if(!previous?.isSystem)fields.push({key:'customLabel',labelKey:'st.customLabel',required:true,maxLength:120});
      fields.push({key:'sortOrder',labelKey:'st.sortOrder',type:'number',numeric:true,required:true,min:0,max:100000,step:1},{key:'active',labelKey:'st.active',type:'checkbox'});
      const dialog=ui.form(t(previous?'st.editOption':'st.newOption'),fields,previous||{sortOrder:0,active:true},async(input,cmd)=>{
        if(previous)await service.updateOption(previous.id,input,cmd);else await service.createOption({kind:view.kind,...input},cmd);await saved();
      },command());
      if(previous?.isSystem)dialog.querySelector('h2').after(el('p',{class:'muted'},t('st.systemHelp')));
    }
    function location(previous){
      const parents=data.locations.filter(row=>row.id!==previous?.id&&(!row.deletedAt&&!row.archivedAt&&row.active||row.id===previous?.parentLocationId));
      const fields=[{key:'name',labelKey:'st.locationName',required:true,maxLength:120},{key:'type',labelKey:'st.locationType',required:true,options:root.domain.enums.locationType.map(value=>({value,label:t('st.location.'+value)}))},
        {key:'parentLocationId',labelKey:'st.parent',options:parents.map(row=>({value:row.id,label:row.name}))},{key:'active',labelKey:'st.active',type:'checkbox'},{key:'notes',labelKey:'a.notes',type:'textarea',keepEmpty:true,maxLength:20000}];
      return ui.form(t(previous?'st.editLocation':'st.newLocation'),fields,previous||{type:'shelter',active:true,notes:''},async(input,cmd)=>{if(previous)await service.updateLocation(previous.id,input,cmd);else await service.createLocation(input,cmd);await saved();},command());
    }
    function list(headers,rows){return rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},headers.map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows.map(row=>el('tr',{},row.map(value=>el('td',{},value))))))):el('p',{class:'muted'},t('st.empty'));}
    function pagination(key,total,paint){const pages=Math.max(1,Math.ceil(total/20));view[key]=Math.min(view[key],pages);const previous=ui.button(t('a.previous'),()=>{view[key]--;paint();},true),next=ui.button(t('a.next'),()=>{view[key]++;paint();},true);previous.disabled=view[key]<=1;next.disabled=view[key]>=pages;return el('div',{class:'actions pager'},previous,el('span',{},t('ui.recordPage',{page:view[key],pages,count:total})),next);}
    const options=el('div',{class:'stack'}),locations=el('div',{class:'stack'}),kind=el('select',{id:'configuration-kind'},root.domain.enums.catalogKind.map(value=>el('option',{value},t('st.kind.'+value)))),inactive=el('input',{type:'checkbox',id:'configuration-inactive'});kind.value=view.kind;inactive.checked=view.inactive;
    function paintOptions(){const rows=data.catalogOptions.filter(row=>row.kind===view.kind&&!row.deletedAt&&!row.archivedAt&&(view.inactive||row.active)).sort((a,b)=>a.sortOrder-b.sortOrder||root.services.catalogs.label(a).localeCompare(root.services.catalogs.label(b))||a.id.localeCompare(b.id));
      const pager=pagination('optionPage',rows.length,paintOptions);options.replaceChildren(list(['st.customLabel','st.origin','st.active','st.sortOrder','a.actions'],rows.slice((view.optionPage-1)*20,view.optionPage*20).map(row=>[root.services.catalogs.label(row),t(row.isSystem?'st.system':'st.custom'),t(row.active?'common.yes':'common.no'),row.sortOrder,action('p.edit',()=>option(row))])),pager);}
    function paintLocations(){const rows=data.locations.filter(row=>!row.deletedAt&&!row.archivedAt&&(view.inactive||row.active)).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
      const pager=pagination('locationPage',rows.length,paintLocations);locations.replaceChildren(list(['st.locationName','st.locationType','st.parent','st.active','a.actions'],rows.slice((view.locationPage-1)*20,view.locationPage*20).map(row=>[row.name,t('st.location.'+row.type),data.locations.find(item=>item.id===row.parentLocationId)?.name||t('ui.unknown'),t(row.active?'common.yes':'common.no'),action('p.edit',()=>location(row))])),pager);}
    kind.addEventListener('change',()=>{view.kind=kind.value;view.optionPage=1;paintOptions();});inactive.addEventListener('change',()=>{view.inactive=inactive.checked;view.optionPage=view.locationPage=1;paintOptions();paintLocations();});paintOptions();paintLocations();
    return el('div',{class:'stack'},el('label',{for:'configuration-inactive'},inactive,t('st.includeInactive')),el('section',{class:'card stack'},el('h2',{},t('st.catalogs')),el('p',{class:'muted'},t('st.catalogHelp')),el('label',{for:'configuration-kind'},t('st.kind')),kind,action('st.newOption',()=>option()),options),el('section',{class:'card stack'},el('h2',{},t('st.locations')),el('p',{class:'muted'},t('st.locationHelp')),action('st.newLocation',()=>location()),locations));
  }
  root.modules.configuration=Object.freeze({render});
}(window.RescueManager));
