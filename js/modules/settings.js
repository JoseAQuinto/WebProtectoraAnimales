(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);let generation=0,urls=[],reminderTimer=null;
  function dispose(){generation++;urls.forEach(url=>URL.revokeObjectURL(url));urls=[];clearInterval(reminderTimer);}
  function logo(snapshot){
    const org=snapshot?.tables.organizationSettings[0];if(!org?.logoAssetId)return null;
    const image=el('img',{class:'organization-logo',alt:t('st.logoAlt',{name:org.name})}),token=generation;
    root.services.photos.read(org.logoAssetId).then(file=>{if(token!==generation)return;const url=URL.createObjectURL(file.blob);urls.push(url);image.src=url;}).catch(()=>{if(token===generation)image.replaceWith(el('span',{class:'muted'},t('a.photoError')));});return image;
  }
  async function reminder(ctx){
    const area=el('aside',{class:'notice warning','aria-label':t('st.backupReminder')}),token=generation;
    async function paint(){try{const value=root.services.backupReminders.evaluate(ctx.snapshot,await root.services.backup.list());if(token!==generation)return;
      area.hidden=!value.due;area.replaceChildren(el('p',{},t(value.verified?'st.backupDue':'st.noVerifiedBackup',value)),el('p',{class:'muted'},t('st.reminderHelp')),el('a',{href:'#backup',class:'button secondary'},t('st.makeBackup')));
    }catch(_){if(token===generation){area.hidden=false;area.replaceChildren(el('p',{},t('st.reminderError')),el('a',{href:'#backup'},t('nav.backup')));}}}
    await paint();if(token===generation){clearInterval(reminderTimer);reminderTimer=setInterval(()=>{if(area.isConnected&&!document.hidden)paint();},60000);}return area;
  }
  function render(ctx,editOrganization){
    const org=ctx.snapshot.tables.organizationSettings[0],command=()=>({expectedRevision:ctx.snapshot.globalRevision});
    const saved=async()=>{ctx.notify(t('ui.saved'));await ctx.refresh();},action=(key,callback)=>{const button=ui.button(t(key),callback,true);button.disabled=!ctx.canWrite();return button;};
    function preferences(){
      const fields=[{key:'animalView',labelKey:'st.animalView',required:true,options:['table','cards'].map(value=>({value,label:t('st.view.'+value)}))},{key:'pageSize',labelKey:'st.pageSize',required:true,options:[10,25,50,100].map(value=>({value,label:String(value)}))},
        {key:'printDetails',labelKey:'st.printDetails',type:'textarea',keepEmpty:true,maxLength:20000},{key:'printFooter',labelKey:'st.printFooter',type:'textarea',keepEmpty:true,maxLength:2000},
        {key:'backupRemindersEnabled',labelKey:'st.remindersEnabled',type:'checkbox'},{key:'backupReminderDays',labelKey:'st.reminderDays',type:'number',numeric:true,required:true,min:1,max:365,step:1},{key:'backupReminderWrites',labelKey:'st.reminderWrites',type:'number',numeric:true,required:true,min:1,max:100000,step:1}];
      const dialog=ui.form(t('st.preferences'),fields,{...org,...org.displayPreferences},async(input,cmd)=>{const {animalView,pageSize,...patch}=input;await root.services.settings.update({...patch,displayPreferences:{animalView,pageSize:Number(pageSize)}},cmd);await saved();},command());dialog.querySelector('h2').after(el('p',{class:'muted'},t('st.preferencesHelp')));
    }
    function setLogo(){return ui.form(t('st.setLogo'),[{key:'file',labelKey:'st.logo',type:'file',required:true,accept:'.png,.jpg,.jpeg,.webp',help:'a.photoHelp'}],{},async({file},cmd)=>{await root.services.photos.setOrganizationLogo(file,cmd);await saved();},command());}
    function removeLogo(){return ui.form(t('st.removeLogo'),[{key:'confirmed',labelKey:'st.removeLogoConfirm',type:'checkbox',required:true}],{},async(input,cmd)=>{if(input.confirmed){await root.services.photos.removeOrganizationLogo(cmd);await saved();}},command());}
    const pair=(key,value)=>el('div',{},el('dt',{},t(key)),el('dd',{class:'preserve-lines'},value||t('ui.unknown')));
    return[el('header',{class:'page-heading'},el('h1',{},t('nav.settings'))),el('section',{class:'card stack'},el('h2',{},org.name),el('dl',{class:'detail-grid'},pair('field.phone',org.phone),pair('field.email',org.email),pair('field.address',org.address),pair('field.currencyCode',org.currencyCode),pair('field.timeZone',org.timeZone)),el('div',{class:'actions'},action('ui.editSettings',editOrganization),action('st.preferences',preferences),action('st.setLogo',setLogo),org.logoAssetId?action('st.removeLogo',removeLogo):null),el('p',{class:'muted'},t('st.currencyHelp'))),root.modules.configuration.render(ctx),el('a',{href:'#demo'},t('dm.manage')),el('a',{href:'#retention'},t('nav.retention'))];
  }
  root.modules.settings=Object.freeze({render,dispose,logo,reminder});
}(window.RescueManager));
