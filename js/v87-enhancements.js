/* INCENTIFY ERP V8.7 — frontend enhancements. Does not change finance ledger or legacy API. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mailHistoryKey='incentify_v87_mail_history';
const allInvoices=()=>typeof DB!=='undefined'&&Array.isArray(DB.invoices)?DB.invoices:[];
function stat(id,message){const n=$(id);if(n)n.textContent=message;}

// Preserve the original Razorpay desk but show it ONLY when the Razorpay section is chosen.
function organizeGateway(){
  const page=$('page-gateway');if(!page||$('v87-razorpay-content'))return;
  const wrapper=document.createElement('div');wrapper.id='v87-razorpay-content';wrapper.className='v87-provider-content';wrapper.hidden=true;
  Array.from(page.children).filter(el=>!el.classList.contains('v86-gateway-sidebar')&&!el.classList.contains('v86-gateway-top')).forEach(el=>wrapper.appendChild(el));
  page.appendChild(wrapper);
}
const originalProviderTab=window.v86GatewayTab;
window.v86GatewayTab=function(tab){
  organizeGateway();if(typeof originalProviderTab==='function')originalProviderTab(tab);
  const d=$('v87-razorpay-content');if(d)d.hidden=(tab!=='razorpay');
  const page=$('page-gateway');if(page)page.dataset.selectedProvider=tab;
};

// Hide specialized item taxes unless the business has enabled compensation cess
// and the user deliberately opts this product into cess after tax review.
function cessBusinessAllowed(){
  try{return typeof v83BusinessPrefs==='function'&&v83BusinessPrefs().allowCess==='yes';}catch(_){return false;}
}
window.v87RefreshCatalogForm=function(){
  const eligible=cessBusinessAllowed(),panel=$('v87-cess-container'),note=$('v87-cess-disabled-note');
  if(panel)panel.hidden=!eligible;
  if(note)note.hidden=eligible;
  if(!eligible){if($('v87-cess-eligible'))$('v87-cess-eligible').checked=false;if($('v83-cess-mode'))$('v83-cess-mode').value='none';if($('v84-item-business-cess'))$('v84-item-business-cess').checked=false;}
  v87CessToggle();
};
window.v87CessToggle=function(){
  const show=cessBusinessAllowed()&&!!$('v87-cess-eligible')?.checked;
  if($('v87-cess-controls'))$('v87-cess-controls').hidden=!show;
  if(!show&&$('v83-cess-mode'))$('v83-cess-mode').value='none';
  if(!show&&$('v84-item-business-cess'))$('v84-item-business-cess').checked=false;
  if(typeof v83CessFields==='function')v83CessFields();
};
window.v87SaveItem=function(){
  if(!cessBusinessAllowed()||!$('v87-cess-eligible')?.checked){
    if($('v83-cess-mode'))$('v83-cess-mode').value='none';
    if($('v84-item-business-cess'))$('v84-item-business-cess').checked=false;
  }
  if(typeof v79SaveItem==='function')v79SaveItem();
  // Do not carry one item's exceptional cess applicability into the next item.
  if($('v87-cess-eligible'))$('v87-cess-eligible').checked=false;
  if($('v87-hsn-results'))$('v87-hsn-results').hidden=true;
  v87CessToggle();
};

let queryTimer=0,lastQuery=0;
function localCatalogMatches(name,type){
  if(typeof v79ReadItems!=='function')return [];
  const n=name.toLowerCase();return v79ReadItems().filter(x=>x.type===type&&(x.name||'').toLowerCase().includes(n)&&/^\d{4,8}$/.test(String(x.hsn||''))).slice(0,7).map(x=>({code:x.hsn,description:x.name,type:x.type,source:'saved catalogue'}));
}
function showHSN(results,message){
  stat('v87-hsn-status',message);
  const box=$('v87-hsn-results');if(!box)return;
  if(!results.length){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;box.innerHTML=results.slice(0,8).map((c,i)=>'<button type="button" class="v87-hsn-choice" data-hsn-index="'+i+'"><span>'+esc(c.code)+'</span>'+esc(c.description)+' <small>('+esc(c.source||'master')+')</small></button>').join('');
  box.querySelectorAll('[data-hsn-index]').forEach(btn=>btn.addEventListener('click',()=>{
    const match=results[Number(btn.dataset.hsnIndex)];$('v79-item-hsn').value=String(match.code);
    stat('v87-hsn-status','Selected '+match.code+'. Confirm classification and GST rate before issuing an invoice.');box.hidden=true;
  }));
}
window.v87HSNInput=function(){
  clearTimeout(queryTimer);const name=$('v79-item-name')?.value.trim()||'',type=$('v79-item-type')?.value||'goods';
  if(name.length<3){showHSN([],'Enter at least 3 characters to search.');return;}
  queryTimer=setTimeout(async()=>{
    const id=++lastQuery;
    const local=localCatalogMatches(name,type);
    if(local.some(c=>c.description.toLowerCase()===name.toLowerCase())){
      const match=local.find(c=>c.description.toLowerCase()===name.toLowerCase());
      $('v79-item-hsn').value=match.code;
      showHSN(local,'Code auto-filled from your saved catalogue. Review before use.');return;
    }
    showHSN(local,local.length?'Select a previously verified product. Checking master…':'Checking HSN/SAC master…');
    try{
      const data=await window.incentifyApi.call('hsnSearch',{token:window.IncentifyAuth.token(),query:name,type});
      if(!data.success)throw Error('Master not connected');
      if(id!==lastQuery)return;
      const remote=(Array.isArray(data.items)?data.items:[]).filter(x=>/^\d{4,8}$/.test(String(x.code||''))).map(x=>({code:String(x.code),description:String(x.description||''),type,source:'HSN master'}));
      const unique=[...local,...remote].filter((x,i,a)=>a.findIndex(y=>y.code===x.code)===i);
      showHSN(unique,unique.length?'Select the relevant HSN/SAC code.':'No match in the master. Enter a verified code manually.');
    }catch(_){if(id!==lastQuery)return;showHSN(local,local.length?'Saved catalogue matches shown. Connect the Apps Script HSN master for more.':'HSN master not connected. A CA-verified code can still be entered manually.');}
  },320);
};

// A standalone customer mailing page. No app passwords or authentication secrets are ever collected.
function getInvoice(){return allInvoices().find(x=>String(x.id)===$('v87-mail-invoice')?.value)||null;}
function chooseInvoice(){const inv=getInvoice();if(inv){
  const recipient=inv.customerEmail||((inv.customerContact||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
  if(recipient)$('v87-mail-to').value=recipient;
}v87SelectTemplate();}
window.v87InvoiceMailChanged=chooseInvoice;
window.v87SelectTemplate=function(){
  const kind=$('v87-mail-template')?.value||'invoice',inv=getInvoice();
  const brand=typeof getBusinessSettings==='function'?(getBusinessSettings().brandName||'Our business'):'Our business';
  const customer=inv?.customer||'Customer';const no=inv?.number||'[Invoice number]';
  const amount=inv?'₹'+Number(inv.grand||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'[Invoice total]';
  const templates={invoice:{subject:'Invoice '+no+' from '+brand,body:'Hello '+customer+',\n\nPlease find the invoice '+no+' for '+amount+'.\n\nThank you,\n'+brand},reminder:{subject:'Payment reminder — '+no,body:'Hello '+customer+',\n\nThis is a reminder about the payment due against invoice '+no+'. Please let us know if you need any clarification.\n\nRegards,\n'+brand},quotation:{subject:'Follow-up on your quotation — '+brand,body:'Hello '+customer+',\n\nWe are following up on the quotation sent to you. Please contact us if you would like to proceed.\n\nRegards,\n'+brand},custom:{subject:'',body:''}};
  const t=templates[kind]||templates.custom;if($('v87-mail-subject'))$('v87-mail-subject').value=t.subject;if($('v87-mail-body'))$('v87-mail-body').value=t.body;
};
function mailHistory(){try{return JSON.parse(localStorage.getItem(mailHistoryKey)||'[]')}catch{return []}}
function renderMailHistory(){const e=$('v87-mail-history');if(!e)return;const entries=mailHistory();e.innerHTML=entries.length?entries.slice(0,8).map(x=>'<div>✓ '+esc(x.to)+' · '+esc(x.at)+' · '+esc(x.subject)+'</div>').join(''):'No emails recorded in this browser.';}
function refreshInvoiceOptions(){const select=$('v87-mail-invoice');if(!select)return;const current=select.value;select.innerHTML='<option value="">No invoice selected</option>'+allInvoices().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.number||'Invoice')+' — '+esc(x.customer||'Customer')+'</option>').join('');select.value=current;}
window.v87TestBackend=async function(){if(!window.INCENTIFY_CONFIG?.BRIDGE_URL){stat('v87-backend-status','Preview mode — no cloud service is connected.');return false;}stat('v87-backend-status','Checking configured Apps Script service…');try{const body=await window.incentifyApi.call('v9Diagnostics',{token:window.IncentifyAuth.token()});if(!body.success)throw Error(body.error||'Service unavailable');stat('v87-backend-status','Connected · '+(body.version||'backend')+' · Mail '+(body.mailEnabled?'enabled':'disabled'));return true;}catch(e){stat('v87-backend-status','Not connected — '+String(e.message||'service unavailable'));return false;}};
function readPdf(file){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(file.type!=='application/pdf'||file.size>5*1024*1024)return reject(Error('Choose a PDF under 5 MB.'));const r=new FileReader();r.onerror=()=>reject(Error('Cannot read PDF'));r.onload=()=>resolve({name:file.name.replace(/[^A-Za-z0-9._-]/g,'_'),mime:'application/pdf',base64:String(r.result||'').split(',')[1]});r.readAsDataURL(file);});}
let sending=false;
window.v87SendMail=async function(){if(sending)return;
  const to=$('v87-mail-to')?.value.trim()||'',subject=$('v87-mail-subject')?.value.trim()||'',body=$('v87-mail-body')?.value||'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||!subject||!body.trim()){stat('v87-mail-status','Enter a valid customer email, subject and message.');return;}
  const file=$('v87-mail-pdf')?.files?.[0]||null;
  if(!confirm('Send this email to '+to+'?'+(file?'\nAttachment: '+file.name:'\nNo PDF is attached.')))return;
  sending=true;stat('v87-mail-status','Submitting to the configured Google Apps Script mail service…');
  try{const attachment=await readPdf(file),payload={to,subject,body,sourceInvoiceId:getInvoice()?.id||'',attachments:attachment?[attachment]:[]};
    const requestId='mail-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    const data=await window.incentifyApi.call('mailSend',{token:window.IncentifyAuth.token(),payload,requestId});if(!data.success||data.status!=='sent')throw Error(data.error||'Delivery was not confirmed');
    const list=mailHistory();list.unshift({to,subject,at:new Date().toLocaleString('en-IN'),requestId:data.requestId||''});localStorage.setItem(mailHistoryKey,JSON.stringify(list.slice(0,40)));
    stat('v87-mail-status','Sent through the connected Google mail service. Request ID: '+(data.requestId||'available in server logs'));renderMailHistory();
  }catch(e){stat('v87-mail-status','Not sent: '+String(e.message||'Delivery unavailable'));}finally{sending=false;}
};
// Route invoice email actions into the dedicated Mailing workspace.
window.v86OpenEmail=function(){
  if($('v86-email-modal'))$('v86-email-modal').hidden=true;
  if(typeof showPage==='function')showPage('mailing');
  const no=$('inv-number')?.value||'';
  const inv=allInvoices().find(x=>String(x.number)===no);
  if(inv&&$('v87-mail-invoice')){$('v87-mail-invoice').value=String(inv.id);v87InvoiceMailChanged();}
  else {const contact=$('cust-contact')?.value||'',candidate=(contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';if(candidate)$('v87-mail-to').value=candidate;v87SelectTemplate();}
};
function init(){organizeGateway();v87RefreshCatalogForm();v86GatewayTab('upi');refreshInvoiceOptions();v87SelectTemplate();renderMailHistory();v87TestBackend();}
if(typeof showPage==='function'){const originalShow=showPage;showPage=function(id){const result=originalShow.apply(this,arguments);if(id==='gateway'){v86GatewayTab('upi');}if(id==='catalog'){v87RefreshCatalogForm();}if(id==='mailing'){refreshInvoiceOptions();v87TestBackend();}return result;};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
