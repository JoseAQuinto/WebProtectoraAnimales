(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),views=new Map();
  function render(ctx,animal){
    const view=views.get(animal.id)||{trash:false,page:1};views.set(animal.id,view);
    const area=el('div',{class:'stack'}),trash=el('input',{type:'checkbox',id:'weight-trash'});trash.checked=view.trash;
    const date=value=>{const format=ctx.snapshot.tables.organizationSettings[0].dateFormat;return format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;};
    const grams=value=>new Intl.NumberFormat(root.core.i18n.language,{style:'unit',unit:'gram',unitDisplay:'short'}).format(value),command=()=>({expectedRevision:ctx.snapshot.globalRevision});
    const allowed=()=>!animal.archivedAt&&!animal.deletedAt&&ctx.canWrite(),action=(label,callback)=>{const button=ui.button(t(label),callback,true);button.disabled=!allowed();return button;};
    const saved=async()=>{ctx.notify(t('ui.saved'));await ctx.refresh();};
    function edit(row){ui.form(t('a.editWeight'),[{key:'date',labelKey:'a.date',type:'date',required:true,max:root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone)},{key:'grams',labelKey:'a.grams',type:'number',numeric:true,required:true,min:1,max:Number.MAX_SAFE_INTEGER,step:1},{key:'notes',labelKey:'a.notes',type:'textarea',keepEmpty:true,maxLength:20000}],row,async(input,cmd)=>{await root.services.weights.update(row.id,input,cmd);await saved();},command());}
    function disposition(row){const key=row.deletedAt?'wt.restore':'wt.trash';const dialog=ui.form(t(key),[{key:'confirmed',labelKey:row.deletedAt?'wt.restoreConfirm':'wt.trashConfirm',type:'checkbox',required:true}],{},async(input,cmd)=>{if(input.confirmed){await root.services.weights[row.deletedAt?'restore':'trash'](row.id,cmd);await saved();}},command());dialog.querySelector('h2').after(el('p',{},animal.name+' · '+date(row.date)+' · '+grams(row.grams)));}
    function paint(){const rows=root.services.weights.list(ctx.snapshot.tables,animal.id,{trash:view.trash}),pages=Math.max(1,Math.ceil(rows.length/20));view.page=Math.min(view.page,pages);const previous=ui.button(t('a.previous'),()=>{view.page--;paint();},true),next=ui.button(t('a.next'),()=>{view.page++;paint();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      const body=rows.slice((view.page-1)*20,view.page*20).map(row=>{
        const actions=el('div',{class:'actions'},!view.trash?action('a.edit',()=>edit(row)):null,
          action(view.trash?'wt.restore':'wt.trash',()=>disposition(row)));
        return el('tr',{},el('td',{},date(row.date)),el('th',{scope:'row'},grams(row.grams)),
          el('td',{class:'preserve-lines'},row.notes),el('td',{},actions));
      });
      const table=rows.length?el('div',{class:'table-wrap'},el('table',{},
        el('thead',{},el('tr',{},['a.date','a.weight','a.notes','a.actions'].map(key=>el('th',{scope:'col'},t(key))))),
        el('tbody',{},body))):el('p',{class:'muted'},t('wt.empty'));
      area.replaceChildren(table,el('div',{class:'actions'},previous,
        el('span',{},t('a.page',{page:view.page,pages,count:rows.length})),next));
    }
    trash.addEventListener('change',()=>{view.trash=trash.checked;view.page=1;paint();});paint();
    return el('section',{class:'stack weights-panel'},el('h3',{},t('a.weights')),el('p',{class:'muted'},t('wt.help')),el('label',{for:'weight-trash'},trash,t('wt.showTrash')),area);
  }
  root.modules.weights=Object.freeze({render});
}(window.RescueManager));
