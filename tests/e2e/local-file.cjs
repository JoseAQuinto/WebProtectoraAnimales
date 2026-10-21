'use strict';
// For owned local Chromium QA only. CDP passes a local path to the native file input, avoiding
// Playwright's remote 50 MiB transport ceiling without changing application or browser security.
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
async function selectOwnedFile(page,input,file){
  const temp=await fs.realpath(path.join(root,'.tmp')),resolved=await fs.realpath(file),relative=path.relative(temp,resolved);
  if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)||!(await fs.stat(resolved)).isFile())throw Error('Select an owned QA file inside .tmp');
  const handle=await input.elementHandle();if(!handle)throw Error('File input is not attached');
  const marker='qa-'+randomUUID(),session=await page.context().newCDPSession(page);
  try{
    await handle.evaluate((node,value)=>{if(node.tagName!=='INPUT'||node.type!=='file')throw Error('Choose a native file input');node.setAttribute('data-e2e-local-file',value);},marker);
    const doc=await session.send('DOM.getDocument',{depth:0}),found=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[data-e2e-local-file="'+marker+'"]'});
    if(!found.nodeId)throw Error('Native file input not found');
    await session.send('DOM.setFileInputFiles',{nodeId:found.nodeId,files:[resolved]});
    return{protocol:'DOM.setFileInputFiles',bytes:(await fs.stat(resolved)).size};
  }finally{await Promise.allSettled([handle.evaluate(node=>node.removeAttribute('data-e2e-local-file')),session.detach()]);await handle.dispose();}
}
module.exports={selectOwnedFile};
