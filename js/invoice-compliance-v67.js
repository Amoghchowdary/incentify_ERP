/* V6.7: UI/PDF preview only; NOT an IRP-issued e-invoice or certified GST invoice. */
(()=>{
  const priorGenerate=window.generateInvoice;
  const priorSave=window.saveInvoice;
  const priorRender=window.renderLineItems;
  const priorLoad=window.loadInvoiceIntoForm;
  function choice(){
    const mode=document.getElementById('inv-tax-mode')?.value||'auto';
    const rate=Number(document.getElementById('tax-rate')?.value||0);
    const method=document.getElementById('inv-export-method')?.value||'WOPAY';
    return {mode,rate,method,taxed:mode!=='none'&&(mode==='export'||rate>0)};
  }
  function renderCompliance(){
    const c=choice(), heading=document.getElementById('prev-document-heading');
    const title=c.taxed?'Tax Invoice':'Normal Invoice';
    if(heading)heading.textContent=title;
    const th=document.querySelector('#invoice-doc .inv-items-table thead tr');
    if(th&&!th.querySelector('[data-hsn-heading]')){
      const col=document.createElement('th');col.textContent='HSN / SAC';col.dataset.hsnHeading='1';
      th.insertBefore(col,th.children[2]);
    }
    const rows=document.getElementById('prev-items');
    if(rows){
      const items=(typeof lineItems!=='undefined'?lineItems:[]);
      if(items.length){rows.querySelectorAll('tr').forEach((tr,i)=>{
        if(!tr.querySelector('[data-hsn-cell]')){
          const td=document.createElement('td');td.dataset.hsnCell='1';tr.insertBefore(td,tr.children[2]);
        }
        const cell=tr.querySelector('[data-hsn-cell]');if(cell)cell.textContent=String(items[i]?.hsn||'—');
      });}else{const cell=rows.querySelector('td[colspan]');if(cell)cell.colSpan=6;}
    }
    const meta=document.getElementById('prev-tax-compliance-meta');
    if(meta){
      const from=document.getElementById('cust-state')?.value||'';
      const taxMode=c.mode==='export'?'Export '+(c.method==='WOPAY'?'without payment of IGST (LUT/bond)':'with payment of IGST'):
        c.mode==='intra'?'CGST + SGST / UTGST':c.mode==='inter'?'IGST':c.mode==='none'?'No GST':'Auto tax determination';
      meta.textContent='Supply tax treatment: '+taxMode+(from?'  |  Place-of-supply state code: '+from:'');
    }
    const end=document.getElementById('prev-export-endorsement');
    if(end){const country=document.getElementById('inv-export-country')?.value||'';
      end.textContent=c.mode==='export' ?
        (c.method==='WOPAY'?'SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX':'SUPPLY MEANT FOR EXPORT ON PAYMENT OF INTEGRATED TAX')+(country?' | Destination: '+country:''):'';
    }
  }
  window.generateInvoice=function(){const r=priorGenerate.apply(this,arguments);renderCompliance();return r;};
  window.saveInvoice=async function(){
    const selected=choice();
    if(selected.taxed&&((typeof lineItems!=='undefined'?lineItems:[])).some(it=>!/^\d{4,8}$/.test(String(it.hsn||'')))){
      if(typeof window.toast==='function')window.toast('HSN / SAC required (4–8 digits) for each taxable line item; verify applicable digits.',true);
      else alert('Enter HSN/SAC codes for taxable lines.');
      return null;
    }
    return priorSave.apply(this,arguments);
  };
  window.renderLineItems=function(){const r=priorRender.apply(this,arguments);renderCompliance();return r;};
  if(typeof priorLoad==='function')window.loadInvoiceIntoForm=function(){const r=priorLoad.apply(this,arguments);renderCompliance();return r;};
  document.getElementById('inv-tax-mode')?.addEventListener('change',()=>setTimeout(renderCompliance,0));
  document.getElementById('tax-rate')?.addEventListener('input',()=>setTimeout(renderCompliance,0));
  document.getElementById('inv-export-method')?.addEventListener('change',()=>setTimeout(renderCompliance,0));
  renderCompliance();
})();
