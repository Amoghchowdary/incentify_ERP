/* INCENTIFY ERP V9.4: cloud synchronization for legacy local-storage screens.
 * Live mode fails closed. Google Sheets is authoritative after setup/migration.
 */
(()=>{'use strict';
const sources={catalog:'incentify_v79_items',quotations:'incentify_v70_quotations_local',gstDocuments:'incentify_v75_gst_document_drafts',caReviews:'incentify_v78_ca_drafts'};
const prefs={businessTax:['incentify_v83_gst_preferences','incentify_v84_tax_defaults','incentify_v79_tax_preferences','incentify_v85-local-ui-setup','incentify_v84_mcp_connection']};
const live=()=>!!window.INCENTIFY_CONFIG?.BRIDGE_URL;
const call=(action,data={})=>window.incentifyApi.call(action,{token:window.IncentifyAuth.token(),...data});
const notice=(msg,error=false)=>{let el=document.getElementById('v9-sync-status');if(!el){el=document.createElement('div');el.id='v9-sync-status';el.setAttribute('role','status');el.style.cssText='position:fixed;right:12px;bottom:8px;z-index:1000;max-width:320px;background:#f8fafc;color:#173456;border:1px solid #b6c9d7;border-radius:6px;padding:7px 11px;font:12px Arial';document.body.appendChild(el)}el.textContent=msg;el.style.borderColor=error?'#b91c1c':'#b6c9d7';};
const parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
function read(section){if(sources[section])return parse(sources[section],[]);if(section==='businessTax')return Object.fromEntries(prefs.businessTax.map(k=>[k,parse(k,{})]));return null;}
function hydrate(section,value){
 if(sources[section]&&Array.isArray(value)){
   const key=sources[section],before=localStorage.getItem(key),after=JSON.stringify(value);
   if(before&&before!==after&&!localStorage.getItem('v94-backup-'+key))localStorage.setItem('v94-backup-'+key,before);
   localStorage.setItem(key,after);
 }
 if(section==='businessTax'&&value&&typeof value==='object')for(const [key,v]of Object.entries(value))if(prefs.businessTax.includes(key)){
   const before=localStorage.getItem(key),after=JSON.stringify(v);
   if(before&&before!==after&&!localStorage.getItem('v94-backup-'+key))localStorage.setItem('v94-backup-'+key,before);
   localStorage.setItem(key,after);
 }
}
let connected=false,sectionRevisions={},queue=Promise.resolve(),unsynced=new Set(),unsyncedDrafts=new Map(),lastError='';
async function init(){if(!live())return;connected=false;
 try{const response=await call('v9GetWorkspace'),space=response.workspace||{};
  sectionRevisions=response.sectionRevisions||{};
  for(const key of Object.keys(sources))if(!unsynced.has(key))hydrate(key,space[key]??[]);
  if(!unsynced.has('businessTax'))hydrate('businessTax',space.businessTax??{});
  connected=true;lastError='';notice('Google Sheets connected · Company workspace loaded');
 }catch(err){lastError=err.message;notice('Google Sheets not connected: '+err.message,true);throw err;}
}
function sync(section){if(!live())return Promise.resolve();
 if(!connected){unsynced.add(section);lastError='Backend not connected';notice('Not saved to cloud — reconnect before continuing.',true);return Promise.reject(new Error(lastError));}
 const value=read(section);if(value===null)return Promise.resolve();
 const next=queue.catch(()=>{}).then(async()=>{
   const before=sectionRevisions[section]??0;try{const r=await call('v9PutWorkspace',{section,value,expectedSectionRevision:before});
     sectionRevisions[section]=r.sectionRevision;unsynced.delete(section);unsyncedDrafts.delete(section);lastError='';notice('Saved '+section+' to Google Sheets');return r;
   }catch(err){unsynced.add(section);unsyncedDrafts.set(section,{value,expectedRevision:before});lastError=err.message;notice('Cloud save failed for '+section+': '+err.message,true);throw err;}
 });queue=next;return next;
}
function addHook(name,section){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){
 const out=original.apply(this,args);Promise.resolve(out).then(()=>sync(section)).catch(err=>console.error('INCENTIFY cloud workspace save failed',err));return out;
};}
function attach(){
 addHook('v79SaveItem','catalog');addHook('v79DeleteItem','catalog');addHook('writeQuotations','quotations');
 addHook('v75WriteRegister','gstDocuments');addHook('v78SaveReview','caReviews');
 addHook('v83StorePrefs','businessTax');addHook('v84SaveTax','businessTax');addHook('v84SaveMcp','businessTax');addHook('v79StorePrefs','businessTax');addHook('v85SaveSetup','businessTax');
 if(live())notice('Live mode · Connecting to Google Sheets…');
}
const api=window.electronAPI;if(api&&typeof api.loadData==='function'){
 const original=api.loadData;api.loadData=async function(...args){const state=await original.apply(this,args);try{await init();}catch(err){console.error('INCENTIFY secondary workspace synchronization failed',err);}return state;};
}
window.v94WorkspaceSync={retry:async()=>{if(!connected)await init();for(const section of [...unsynced]){const draft=unsyncedDrafts.get(section);if(!draft)continue;const current=sectionRevisions[section]??0;if(current!==draft.expectedRevision)throw Error('Section '+section+' changed on the server; reconcile the local draft before retrying.');const res=await call('v9PutWorkspace',{section,value:draft.value,expectedSectionRevision:current});sectionRevisions[section]=res.sectionRevision;hydrate(section,draft.value);unsynced.delete(section);unsyncedDrafts.delete(section);}return{success:true};},status:()=>({connected,unsynced:[...unsynced],lastError,sectionRevisions:{...sectionRevisions}})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
