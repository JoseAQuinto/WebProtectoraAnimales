(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.reports;
  const SVG_NS='http'+ '://www.w3.org/2000/svg';
  const number=value=>new Intl.NumberFormat(root.core.i18n.language).format(value);
  // Chart axes read "nov 2026" instead of the stored 2026-11 key.
  const monthLabel=(value,year='2-digit')=>/^\d{4}-\d{2}$/.test(value)?new Intl.DateTimeFormat(root.core.i18n.language,{month:'short',year,timeZone:'UTC'}).format(new Date(Date.UTC(Number(value.slice(0,4)),Number(value.slice(5,7))-1,1))):value;
  const view={from:null,to:null};
  function svg(tag,attributes,...children){const node=document.createElementNS(SVG_NS,tag);for(const[key,value]of Object.entries(attributes))node.setAttribute(key,String(value));children.flat().forEach(child=>{if(child!=null)node.append(child instanceof Node?child:document.createTextNode(String(child)));});return node;}
  function graph(rows,series,format,helpKey='rp.chartHelp'){
    const shown=rows.slice(-12),max=Math.max(1,...shown.flatMap(row=>series.map(item=>row[item.key]))),width=720,height=200,slot=width/Math.max(1,shown.length),barWidth=Math.min(20,slot/(series.length+1));
    if(!shown.some(row=>series.some(item=>row[item.key]>0)))return el('p',{class:'muted'},t('rp.empty'));
    const chart=svg('svg',{viewBox:'0 0 '+width+' '+height,'aria-hidden':'true',class:'report-chart'});
    shown.forEach((row,index)=>{series.forEach((item,column)=>{const value=row[item.key],barHeight=value/max*150,x=index*slot+slot/2+(column-series.length/2)*barWidth;
      chart.append(svg('rect',{x,y:172-barHeight,width:barWidth-2,height:barHeight,fill:item.color},svg('title',{},monthLabel(row.month)+' · '+t(item.label)+': '+format(value))));});
      chart.append(svg('text',{x:index*slot+slot/2,y:192,'text-anchor':'middle','font-size':10,fill:'#172f32'},monthLabel(row.month)));});
    return el('div',{},el('div',{class:'actions'},series.map(item=>el('span',{class:'badge'},svg('svg',{viewBox:'0 0 12 12',width:12,height:12,'aria-hidden':'true'},svg('rect',{x:0,y:0,width:12,height:12,fill:item.color})),' ',t(item.label)))),chart,el('p',{class:'muted'},t(helpKey)));
  }
  function render(ctx){
    const org=ctx.snapshot.tables.organizationSettings[0],today=root.utils.dates.today(org.timeZone),currency=org.currencyCode,money=value=>root.utils.money.format(value,currency,{locale:root.core.i18n.language});
    if(!view.from)view.from=today.slice(0,4)+'-01-01';if(!view.to)view.to=today;
    const results=el('div',{class:'stack'}),errors=el('p',{role:'alert',class:'form-errors'});let exportData=null;
    const decimal=value=>{const p=root.utils.money.currencies[currency],negative=value<0,raw=String(Math.abs(value)).padStart(p+1,'0');return(negative?'-':'')+(p?raw.slice(0,-p)+'.'+raw.slice(-p):raw);};
    const metric=(key,value)=>el('article',{class:'card'},el('h3',{},t(key)),el('p',{class:'metric-value'},value));
    const section=(key,...children)=>el('section',{class:'card stack'},el('h2',{},t(key)),...children);
    function csvDialog(id,headers,rows){ui.form(t('rp.downloadCsv'),[{key:'delimiter',labelKey:'rp.separator',required:true,options:[{value:',',label:t('rp.comma')},{value:';',label:t('rp.semicolon')}]},{key:'bom',labelKey:'rp.excel',type:'checkbox'}],{delimiter:root.core.i18n.language==='es'?';':',',bom:true},async input=>{
      const csv=root.utils.tabular.csv(headers,rows,input);ui.download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'report-'+id+'-'+view.from+'-'+view.to+'.csv');});}
    function table(id,keys,rows,formats={},csvFormats={}){formats={'rp.month':value=>monthLabel(value,'numeric'),...formats};
      const headers=keys.map(key=>t(key)+(formats[key]===money?' ('+currency+')':''));
      const exported=rows.map(row=>row.map((value,index)=>csvFormats[keys[index]]?csvFormats[keys[index]](value):value));
      exportData.sections.push({id,headers,rows:exported});let page=1;
      const content=el('div'),previous=ui.button(t('a.previous'),()=>{page--;paintTable();},true),next=ui.button(t('a.next'),()=>{page++;paintTable();},true),count=el('span');
      function paintTable(){const pages=Math.max(1,Math.ceil(rows.length/24));previous.disabled=page<=1;next.disabled=page>=pages;count.textContent=t('rp.page',{page,pages,count:rows.length});
        content.replaceChildren(rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},headers.map(header=>el('th',{scope:'col'},header)))),el('tbody',{},rows.slice((page-1)*24,page*24).map(row=>el('tr',{},row.map((value,index)=>el(index?'td':'th',index?{}:{scope:'row'},formats[keys[index]]?formats[keys[index]](value):typeof value==='number'?number(value):value))))))):el('p',{class:'muted'},t('rp.empty')));}
      paintTable();return el('div',{class:'stack'},content,el('div',{class:'actions pager'},previous,count,next,ui.button(t('rp.downloadCsv'),()=>csvDialog(id,headers,exported),true)));
    }
    function paint(){
      errors.textContent='';exportData=null;
      if(!from.checkValidity()||!to.checkValidity()||!from.value||!to.value||from.value>to.value){results.replaceChildren();errors.textContent=t('rp.periodError');return;}
      view.from=from.value;view.to=to.value;
      try{
        const snapshot=ctx.snapshot,data=snapshot.tables,period={from:view.from,to:view.to},census=service.currentCensus(data),totals=service.financialSummary(data,period),material=service.materialDonations(data,period),adoptionTime=service.timeToAdoption(data,period);
        const entries=service.entriesPerMonth(data,period),adoptions=service.adoptionsPerMonth(data,period),finances=service.financesPerMonth(data,period);
        const monthly=entries.map((row,index)=>({month:row.month,entries:row.count,adoptions:adoptions[index].count,income:finances.income[index].amountMinor,expense:finances.expense[index].amountMinor}));
        exportData={format:'animal-rescue-manager-report',reportFormatVersion:1,appVersion:root.config.appVersion,generatedAt:new Date().toISOString(),dataRevision:snapshot.dataRevision,period,currentReferenceDate:today,currencyCode:currency,includesFiles:false,notBackup:true,sections:[]};
        const annual=new Map();for(const row of monthly){const year=row.month.slice(0,4);if(!annual.has(year))annual.set(year,{entries:0,adoptions:0,income:0n,expense:0n});const a=annual.get(year);a.entries+=row.entries;a.adoptions+=row.adoptions;a.income+=BigInt(row.income);a.expense+=BigInt(row.expense);}
        const moneyCols={'rp.income':money,'rp.expense':money,'rp.total':money,'rp.balance':money},csvMoney={'rp.income':decimal,'rp.expense':decimal,'rp.total':decimal,'rp.balance':decimal};
        const distribution=kind=>{const funcs={species:'speciesDistribution',sex:'sexDistribution',age:'ageDistribution',availability:'availabilityDistribution',situation:'situationDistribution'},prefix={sex:'a.sex.',age:'rp.age.',availability:'a.availability.',situation:'a.status.'};
          return table('distribution-'+kind,['rp.dimension','rp.records'],service[funcs[kind]](data,today).map(row=>[kind==='species'?root.services.catalogs.label(data.catalogOptions.find(item=>item.id===row.key)):t(prefix[kind]+row.key),row.count]));};
        const animalNames=new Map(data.animals.map(row=>[row.id,row.name+' ('+row.code+')']));
        results.replaceChildren(
          section('rp.census.title',el('p',{class:'muted'},t('rp.currentHelp',{date:root.utils.dates.display(today,org.dateFormat)})),el('div',{class:'metric-grid'},Object.entries(census).map(([key,value])=>metric('rp.'+key,number(value))))),
          section('rp.finances.title',el('div',{class:'metric-grid'},metric('rp.income',money(totals.incomeMinor)),metric('rp.expense',money(totals.expenseMinor)),metric('rp.balance',money(totals.balanceMinor)),metric('rp.veterinaryExpenses',money(service.veterinaryExpenses(data,period))),metric('rp.monetaryDonations',money(service.monetaryDonations(data,period))),metric('rp.materialDonations',number(material.count))),
            el('p',{class:'muted'},t('rp.materialHelp',{count:material.lines,value:money(material.estimatedValueMinor)}))),
          section('rp.entriesAdoptions.title',el('p',{class:'muted'},t('rp.entriesAdoptionsHelp')),graph(monthly,[{key:'entries',label:'rp.entries',color:'#176d62'},{key:'adoptions',label:'rp.adoptions',color:'#ab6719'}],number),table('entries-adoptions',['rp.month','rp.entries','rp.adoptions'],monthly.map(row=>[row.month,row.entries,row.adoptions]))),
          section('rp.incomeExpense.title',graph(monthly,[{key:'income',label:'rp.income',color:'#176d62'},{key:'expense',label:'rp.expense',color:'#ab6719'}],money),table('income-expense',['rp.month','rp.income','rp.expense'],monthly.map(row=>[row.month,row.income,row.expense]),moneyCols,csvMoney)),
          section('rp.annual',table('annual',['rp.year','rp.entries','rp.adoptions','rp.income','rp.expense','rp.balance'],[...annual].map(([year,row])=>[year,row.entries,row.adoptions,Number(row.income),Number(row.expense),Number(row.income-row.expense)]),moneyCols,csvMoney)),
          section('rp.distribution.title',...['species','sex','age','availability','situation'].flatMap(kind=>[el('h3',{},t('rp.'+kind)),kind==='age'?el('p',{class:'muted'},t('rp.ageHelp')):null,distribution(kind)]).filter(Boolean)),
          section('rp.timeToAdoption.title',el('p',{},adoptionTime.cases?t('rp.averageDays',{days:number(adoptionTime.averageDays),cases:number(adoptionTime.cases)}):t('rp.noCases')),el('p',{class:'muted'},t('rp.adoptionTimeHelp'))),
          section('rp.costs.title',table('animal-costs',['rp.animal','rp.total'],service.costsByAnimal(data,period).map(row=>[animalNames.get(row.animalId)||t('ui.unknown'),row.totalMinor]),moneyCols,csvMoney),el('h3',{},t('rp.generalExpenses')),el('p',{},money(service.generalExpenses(data,period))),el('p',{class:'muted'},t('rp.costsHelp'))));
        const censusRows=Object.entries(census).map(([key,value])=>[t('rp.'+key),value]);exportData.sections.unshift({id:'current-census',headers:[t('rp.dimension'),t('rp.records')],rows:censusRows});
        exportData.criteriaVersion='reports-v1';
        exportData.sections.push({id:'period-summary',headers:[t('rp.dimension'),t('rp.value')],rows:[[t('rp.income'),decimal(totals.incomeMinor)],[t('rp.expense'),decimal(totals.expenseMinor)],[t('rp.balance'),decimal(totals.balanceMinor)],[t('rp.veterinaryExpenses'),decimal(service.veterinaryExpenses(data,period))],[t('rp.monetaryDonations'),decimal(service.monetaryDonations(data,period))],[t('rp.materialDonations'),material.count],[t('dn.lines'),material.lines],[t('dn.estimatedValueMinor'),decimal(material.estimatedValueMinor)],[t('rp.generalExpenses'),decimal(service.generalExpenses(data,period))],[t('rp.meanDays'),adoptionTime.averageDays],[t('rp.records'),adoptionTime.cases]]});
      }catch(error){results.replaceChildren();exportData=null;errors.textContent=error instanceof RangeError?t('rp.rangeError'):ui.message(error);}
    }
    const from=el('input',{type:'date',required:true,min:'0001-01-01',max:'9999-12-31',value:view.from}),to=el('input',{type:'date',required:true,min:'0001-01-01',max:'9999-12-31',value:view.to});
    for(const input of[from,to])input.addEventListener('change',paint);
    const label=(key,control)=>{const id='report-'+key;control.id=id;return el('div',{class:'field'},el('label',{for:id},t('rp.'+key)),control);};
    const json=ui.button(t('rp.json'),()=>{if(!exportData){errors.focus();return;}ui.download(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}),'report-'+view.from+'-'+view.to+'.json');},true);
    paint();return[el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.reports')),el('p',{class:'muted'},t('rp.help')))),el('section',{class:'card stack'},el('div',{class:'people-filters'},label('from',from),label('to',to)),errors,el('div',{class:'actions'},json,ui.button(t('ui.print'),()=>window.print(),true)),el('p',{class:'muted'},t('rp.exportHelp'))),results];
  }
  root.modules.reports=Object.freeze({render,chart:graph});
}(window.RescueManager));
