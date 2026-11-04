/* INCENTIFY ERP V9.3: connected business-app registers. No automatic financial posting. */
(()=>{'use strict';
const C=window.IncentifySuiteCore;if(!C)return;
const $=id=>document.getElementById(id), E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const live=()=>!!window.INCENTIFY_CONFIG?.BRIDGE_URL;
const key='incentify_v93_business_suite_preview';
const readPreview=()=>{try{const s=JSON.parse(localStorage.getItem(key)||'{}');return s&&typeof s==='object'?s:{}}catch{return {}}};
let cached=readPreview(),loaded=new Set(),moduleId='',editing='',needle='',busy=false;
const role=()=>typeof currentErpRole==='function'?currentErpRole():'ADMIN';
const readonly=()=>role()==='VIEWER';
const canRead=id=>!['employees','recruitment','approvals'].includes(id)||['ADMIN','DIRECTOR'].includes(role());
const canWrite=id=>!readonly()&&canRead(id)&&(['ADMIN','DIRECTOR'].includes(role())||(['ACCOUNTS'].includes(role())&&!['employees','recruitment'].includes(id))||(['SALES'].includes(role())&&['crm','pos','subscriptions','ecommerce','helpdesk','projects'].includes(id)));
function call(action,extra={}){const token=window.IncentifyAuth?.token?.();if(!token)throw Error('Please sign in to access the company database.');if(!window.incentifyApi?.call)throw Error('Backend API is unavailable.');return window.incentifyApi.call(action,{token,...extra});}
const stat=(msg,err=false)=>{const el=$('v93-status');if(el){el.textContent=msg;el.className='v93-status'+(err?' error':'');}};
function records(id){return Array.isArray(cached[id])?cached[id]:[];}
function activeRecords(id){return records(id).filter(r=>!r.archived);}
function setLocal(id,list){cached[id]=list;localStorage.setItem(key,JSON.stringify(cached));}
async function load(id){if(!canRead(id))throw Error('This workspace is restricted.');if(!live()){loaded.add(id);return records(id);}
 const r=await call('v93AppsList',{module:id});if(r?.success===false)throw Error(r.message||'Could not load company records');
 cached[id]=r.records||[];loaded.add(id);return records(id);
}
function nav(){const c=$('v93-navigation');if(!c)return;c.innerHTML='<button type="button" class="v93-link '+(!moduleId?'active':'')+'" data-v93-module="">▦ All Business Apps</button>'+C.groups.map(g=>`<h4>${E(g)}</h4>`+C.modules.filter(m=>m.group===g&&canRead(m.id)).map(m=>`<button type="button" class="v93-link ${moduleId===m.id?'active':''}" data-v93-module="${E(m.id)}">${E(m.label)}</button>`).join('')).join('');}
function home(){const st=C.stats(cached);$('v93-heading').textContent='Business Apps';$('v93-subheading').textContent='Connected workspaces that extend Sales and Finance';
 $('v93-body').innerHTML=`<div class="v93-home-metrics"><div><span>Stored records</span><b>${st.total}</b></div><div><span>Active leads</span><b>${st.crm}</b></div><div><span>Open support tickets</span><b>${st.openTickets}</b></div><div><span>Purchases to follow up</span><b>${st.purchasePending}</b></div></div><p class="v93-hint">Overview counts are from records loaded in this session${live()?' (visit a workspace to load its cloud records)':''}. Financial ledgers remain in Finance; these registers never post revenue, payroll, stock cost or GST automatically.</p><div class="v93-app-grid">${C.modules.filter(m=>canRead(m.id)).map(m=>`<button class="v93-app" type="button" data-v93-module="${m.id}"><strong>${E(m.label)}</strong><span>${E(m.description)}</span><small>${E(m.tag)}</small></button>`).join('')}</div>`;
}
function fields(mod,old){return mod.fields.map(f=>{const value=old?.[f.key]??'',required=f.required?'required':'',label=`<label for="v93-f-${E(f.key)}">${E(f.label)}${f.required?' *':''}</label>`;let control;
 if(f.type==='select'){control=`<select id="v93-f-${E(f.key)}" name="${E(f.key)}" ${required}><option value="">Select...</option>${f.options.map(o=>`<option value="${E(o)}" ${String(value)===o?'selected':''}>${E(o)}</option>`).join('')}</select>`;}
 else if(f.type==='textarea')control=`<textarea id="v93-f-${E(f.key)}" name="${E(f.key)}" rows="3" maxlength="2500" ${required}>${E(value)}</textarea>`;
 else{const typ=({money:'number',quantity:'number',email:'email',url:'url',date:'date'})[f.type]||'text';control=`<input id="v93-f-${E(f.key)}" name="${E(f.key)}" type="${typ}" value="${E(value)}" ${['money','quantity'].includes(f.type)?'step="any" min="0"':''} ${required} maxlength="300">`;}
 return `<div class="v93-field ${f.type==='textarea'?'wide':''}">${label}${control}</div>`;}).join('')}
function stockSummary(){const r=activeRecords('inventory'),map=new Map();for(const x of r){const id=[x.sku,x.location].join(' | '),v=map.get(id)||{sku:x.sku,item:x.item,location:x.location,quantity:0};v.quantity+=(x.movement==='Receipt'?1:-1)*Number(x.quantity||0);map.set(id,v);}
 return `<div class="v93-stock"><h3>Stock on hand</h3>${map.size?`<table><thead><tr><th>Item</th><th>SKU</th><th>Location</th><th>Available</th></tr></thead><tbody>${[...map.values()].map(x=>`<tr><td>${E(x.item)}</td><td>${E(x.sku)}</td><td>${E(x.location)}</td><td>${Number(x.quantity.toFixed(3)).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table>`:'<p class="v93-hint">Record a stock receipt to start the perpetual movement ledger.</p>'}</div>`;}
function render(){nav();if(!moduleId){home();return;}const mod=C.byId[moduleId];const items=activeRecords(moduleId);$('v93-heading').textContent=mod.label;$('v93-subheading').textContent=mod.description;
const lower=needle.toLowerCase();const visible=items.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(lower))).slice().reverse();
const cols=mod.fields.slice(0,3).concat(mod.fields.filter(x=>x.key==='status').slice(0,1)).filter((f,i,a)=>a.findIndex(x=>x.key===f.key)===i);
const table=`<div class="v93-list-heading"><strong>${items.length} active record${items.length===1?'':'s'}</strong><div><input id="v93-search" value="${E(needle)}" aria-label="Search ${E(mod.label)}" placeholder="Search records"><button type="button" data-v93-action="export">Export CSV</button></div></div><div class="v93-table-scroll"><table><thead><tr>${cols.map(f=>`<th>${E(f.label)}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${visible.map(r=>`<tr>${cols.map(f=>`<td>${E(r[f.key])}</td>`).join('')}<td><button type="button" data-v93-action="edit" data-v93-id="${E(r.id)}">Open</button>${moduleId==='inventory'?'':` <button class="danger" type="button" data-v93-action="archive" data-v93-id="${E(r.id)}">Archive</button>`}</td></tr>`).join('')||`<tr><td class="v93-empty" colspan="${cols.length+1}">No records match. ${canWrite(moduleId)?'Use the form to add a record.':'No records are visible for your role.'}</td></tr>`}</tbody></table></div>`;
const old=records(moduleId).find(r=>r.id===editing);const form=canWrite(moduleId)?`<section class="v93-editor"><h3>${old?'Edit '+mod.label:'New '+mod.label}</h3><form id="v93-form" autocomplete="off"><div class="v93-fields">${fields(mod,old)}</div><div class="v93-form-actions"><button class="v93-primary" type="submit">${old?'Save changes':'Save record'}</button>${old?'<button type="button" data-v93-action="cancel">Cancel edit</button>':''}</div></form><p class="v93-hint">${mod.id==='inventory'?'Stock movements cannot be edited or deleted. Post a correcting movement if needed.':'Records are operational entries. They do not automatically affect invoices, tax returns or accounting.'}</p></section>`:'<p class="v93-hint">Read-only or restricted workspace for this user role.</p>';
 $('v93-body').innerHTML=`<div class="v93-workspace-grid"><div class="v93-register">${moduleId==='inventory'?stockSummary():''}${table}</div>${form}</div>`;
}
async function open(id){if(id&&(!C.byId[id]||!canRead(id)))return stat('You do not have permission to open this workspace.',true);moduleId=id||'';editing='';needle='';nav();
 if(!moduleId){home();stat(live()?'Select a workspace to load live records.':'Local preview records remain on this device.');return;}
 stat('Loading '+C.byId[moduleId].label+'…');try{await load(moduleId);render();stat(live()?'Company records loaded from Apps Script.':'Local preview records loaded.');}catch(err){$('v93-body').innerHTML='<p class="v93-hint">Unable to load company records. The system will not silently switch to local storage.</p>';stat(err.message,true);}
}
async function save(e){e.preventDefault();if(!canWrite(moduleId)||busy)return;const mod=C.byId[moduleId],form=$('v93-form');if(!form)return;
 const fd=new FormData(form),payload={};for(const f of mod.fields){const raw=fd.get(f.key)||'';payload[f.key]=['money','quantity'].includes(f.type)&&raw!==''?Number(raw):String(raw).trim();}
 const old=records(moduleId).find(x=>x.id===editing),error=C.validRecord(moduleId,payload,old,records(moduleId));if(error){stat(error,true);return;}
 busy=true;stat('Saving…');try{let updated;
 if(live()){const r=await call('v93AppsUpsert',{module:moduleId,record:{...payload,...(old?{id:old.id,version:old.version}:{})}});if(r?.success===false)throw Error(r.message||'Save rejected');updated=r.record;await load(moduleId);}
 else{updated={...(old||{}),...payload,id:old?.id||'V93-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),version:(Number(old?.version)||0)+1,updatedAt:new Date().toISOString()};if(!old)updated.createdAt=updated.updatedAt;setLocal(moduleId,old?records(moduleId).map(r=>r.id===old.id?updated:r):[...records(moduleId),updated]);}
 editing='';render();stat('Saved '+mod.label+' record '+updated.id+'.');
 }catch(err){stat('Save failed: '+err.message,true);}finally{busy=false;}
}
async function archive(id){if(!canWrite(moduleId)||moduleId==='inventory')return;const rec=records(moduleId).find(x=>x.id===id);if(!rec||!confirm('Archive this record? Its audit history will be retained.'))return;
 try{if(live()){const r=await call('v93AppsArchive',{module:moduleId,id,version:rec.version});if(r?.success===false)throw Error(r.message||'Not archived');await load(moduleId);}else setLocal(moduleId,records(moduleId).map(r=>r.id===id?{...r,archived:true,version:r.version+1,archivedAt:new Date().toISOString()}:r));editing='';render();stat('Record archived.');}catch(err){stat(err.message,true);}
}
function exportCSV(){if(!moduleId)return;const mod=C.byId[moduleId],keys=['id',...mod.fields.map(f=>f.key),'createdAt','updatedAt','version'];const csvCell=v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const csv=[keys,...records(moduleId).map(x=>keys.map(k=>x[k]))].map(row=>row.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='INCENTIFY_'+moduleId+'_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function handleClick(e){const navButton=e.target.closest('[data-v93-module]');if(navButton){open(navButton.dataset.v93Module);return;}const button=e.target.closest('[data-v93-action]');if(!button)return;const action=button.dataset.v93Action,id=button.dataset.v93Id;
 if(action==='edit'){editing=id;render();document.getElementById('v93-form')?.scrollIntoView({block:'nearest'});}else if(action==='cancel'){editing='';render();}else if(action==='archive'){archive(id);}else if(action==='export'){exportCSV();}
}
function init(){const page=$('page-apps');if(!page)return;page.addEventListener('click',handleClick);page.addEventListener('submit',e=>{if(e.target.id==='v93-form')save(e);});page.addEventListener('input',e=>{if(e.target.id==='v93-search'){needle=e.target.value;const caret=e.target.selectionStart;render();$('v93-search')?.focus();try{$('v93-search').setSelectionRange(caret,caret)}catch{}}});nav();home();}
window.v93Apps={open:()=>open(moduleId),show:open,canRead,canWrite};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
