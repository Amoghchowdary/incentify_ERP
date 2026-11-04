/* INCENTIFY ERP V9.1 finance reporting core — pure, independently testable functions.
   Derived source rows are reporting records, not automatically posted double-entry journals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.IncentifyFinance91=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ACCOUNTS={
 'bank':{label:'Bank & Cash',group:'asset'},
 'receivable':{label:'Accounts Receivable',group:'asset'},
 'inventory':{label:'Inventory',group:'asset'},
 'fixed_asset':{label:'Property & Fixed Assets',group:'asset'},
 'other_asset':{label:'Other Assets',group:'asset'},
 'payable':{label:'Accounts Payable',group:'liability'},
 'tax_payable':{label:'Taxes Payable',group:'liability'},
 'loan':{label:'Loans & Borrowings',group:'liability'},
 'other_liability':{label:'Other Liabilities',group:'liability'},
 'capital':{label:'Share Capital',group:'equity'},
 'reserves':{label:'Reserves',group:'equity'},
 'sales':{label:'Sales Revenue',group:'income'},
 'other_income':{label:'Other Income',group:'income'},
 'operations':{label:'Operating Expenses',group:'expense'},
 'salary':{label:'Salaries & Payroll',group:'expense'},
 'marketing':{label:'Marketing Expenses',group:'expense'},
 'other_expense':{label:'Other Expenses',group:'expense'}
};
const money=v=>Number.isFinite(Number(v))?Number(v):0;
const arr=x=>Array.isArray(x)?x:[];
const dateOnly=v=>String(v||'').slice(0,10);
const month=v=>/^\d{4}-\d{2}/.test(String(v||''))?String(v).slice(0,7):'';
const two=v=>Math.round((v+Number.EPSILON)*100)/100;
function validateJournal(e){
 const d=ACCOUNTS[e.debit],c=ACCOUNTS[e.credit],amount=Number(e.amount);
 if(!d||!c||e.debit===e.credit)return 'Choose two different valid accounts';
 const dt=new Date(String(e.date)+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date||''))||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==e.date)return 'Enter a valid journal date';
 if(!Number.isFinite(amount)||amount<=0||amount>1e12)return 'Amount must be positive';
 if(String(e.description||'').trim().length<3)return 'Add a meaningful description';
 return '';
}
function journalEffects(state,period=''){
 const effects=Object.fromEntries(Object.keys(ACCOUNTS).map(k=>[k,0]));let invalid=0,entries=0;
 for(const e of arr(state.financeJournal)){
  if(e.voided||period&&month(e.date)!==period)continue;
  if(validateJournal(e)){invalid++;continue;}
  const n=money(e.amount);effects[e.debit]+=(['asset','expense'].includes(ACCOUNTS[e.debit].group)?n:-n);
  effects[e.credit]+=(['asset','expense'].includes(ACCOUNTS[e.credit].group)?-n:n);entries++;
 }
 return {effects,invalid,entries};
}
function earningValue(state,e){
 if(e.type==='invoice'&&e.invoiceId){
  const inv=arr(state.invoices).find(x=>x.id===e.invoiceId);
  if(inv){
   if(Number.isFinite(Number(inv.taxableValue)))return money(inv.taxableValue);
   const parts=inv.taxBreakdown||{};
   const outputTax=money(parts.cgst??inv.cgst)+money(parts.sgst??inv.sgst)+money(parts.utgst??inv.utgst)+money(parts.igst??inv.igst)+money(parts.cess??inv.cess);
   if(outputTax>0)return Math.max(0,money(inv.grand)-outputTax);
  }
 }
 return money(e.amount);
}
function incomeExpense(state,period=''){
 const include=e=>!period||month(e.date||e.issued)===period;
 const baseIncome=arr(state.earnings).filter(include).reduce((s,e)=>s+earningValue(state,e),0);
 const baseExpense=arr(state.expenses).filter(include).reduce((s,e)=>s+money(e.amount),0);
 const {effects,invalid}=journalEffects(state,period);
 const manualIncome=effects.sales+effects.other_income;
 const manualExpense=effects.operations+effects.salary+effects.marketing+effects.other_expense;
 return {baseIncome:two(baseIncome),baseExpense:two(baseExpense),manualIncome:two(manualIncome),manualExpense:two(manualExpense),income:two(baseIncome+manualIncome),expense:two(baseExpense+manualExpense),profit:two(baseIncome+manualIncome-baseExpense-manualExpense),invalid};
}
function monthly(state,months=12,end=new Date()){
 const result=[];for(let n=months-1;n>=0;n--){const d=new Date(end.getFullYear(),end.getMonth()-n,1);const id=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const x=incomeExpense(state,id);result.push({month:id,...x});}return result;
}
function latestBalances_(entries){const m=new Map();for(const e of entries){if(!e?.accountName||!e?.group)continue;const key=e.group+'|'+String(e.accountName).toLowerCase().trim(),old=m.get(key);if(!old||String(e.date||'')+String(e.updatedAt||'')>String(old.date||'')+String(old.updatedAt||''))m.set(key,e);}return [...m.values()];}
function metrics(state){
 const pnl=incomeExpense(state),journal=journalEffects(state).effects;
 const invoices=arr(state.invoices),bills=arr(state.bills);
 const receivables=invoices.reduce((s,i)=>s+Math.max(0,money(i.balanceDue ?? (money(i.grand)-money(i.amountPaid)))),0)+journal.receivable;
 const payables=bills.filter(b=>b.status!=='paid').reduce((s,b)=>s+money(b.amount),0)+journal.payable;
 const manual={};for(const e of latestBalances_(arr(state.balanceSheetEntries))){const k=String(e.group||'');manual[k]=(manual[k]||0)+money(e.amount);}
 const assets=two((manual.cash_bank||0)+(manual.other_current_asset||0)+(manual.fixed_asset||0)+receivables+journal.bank+journal.inventory+journal.fixed_asset+journal.other_asset);
 const debt=two((manual.loan||0)+journal.loan),liabilities=two(payables+(manual.tax_liability||0)+(manual.other_liability||0)+debt+journal.tax_payable+journal.other_liability);
 const equity=two((manual.share_capital||0)+(manual.other_equity||0)+pnl.profit+journal.capital+journal.reserves);
 const expensesByCategory={};for(const e of arr(state.expenses)){const k=e.category||'Other';expensesByCategory[k]=two((expensesByCategory[k]||0)+money(e.amount));}
 for(const [account,cat] of [['operations','Operations (journal)'],['salary','Salary (journal)'],['marketing','Marketing (journal)'],['other_expense','Other (journal)']])if(journal[account])expensesByCategory[cat]=two(journal[account]);
 return {...pnl,assets,liabilities,equity,debt,receivables:two(receivables),payables:two(payables),cashBank:two((manual.cash_bank||0)+journal.bank),workingCapital:two((manual.cash_bank||0)+(manual.other_current_asset||0)+receivables+journal.bank+journal.inventory+journal.other_asset-payables-(manual.tax_liability||0)-journal.tax_payable),balanceDifference:two(assets-liabilities-equity),margin:pnl.income?two(pnl.profit/pnl.income*100):null,expensesByCategory};
}
function ledgerRows(state){const rows=[];
 const add=(date,source,ref,account,debit,credit,amount,notes,status='Source record')=>rows.push({date:dateOnly(date),source,ref:String(ref||''),account,debit:two(debit),credit:two(credit),amount:two(amount),notes:String(notes||''),status});
 for(const e of arr(state.earnings)){const rev=earningValue(state,e);add(e.date,'Earning',e.number,'Revenue / '+(e.source||'Other'),0,rev,rev,(e.description||'')+(e.type==='invoice'?' · excludes output GST where invoice data is available':''));}
 for(const e of arr(state.expenses))add(e.date,'Expense',e.number,'Expense / '+(e.category||'Other'),money(e.amount),0,money(e.amount),e.description||e.paidTo);
 for(const i of arr(state.invoices))add(i.issued,'Invoice',i.number,'Accounts Receivable',0,0,money(i.balanceDue ?? (money(i.grand)-money(i.amountPaid))),i.customer,'Memo — not a journal');
 for(const b of arr(state.bills))add(b.due,'Bill',b.number||b.payee,'Accounts Payable',0,0,money(b.amount),b.category||b.payee,'Memo — not a journal');
 for(const e of arr(state.balanceSheetEntries))add(e.date,'Balance snapshot',e.accountName, String(e.group||'').replace(/_/g,' '),0,0,money(e.amount),e.notes,'Snapshot — not a journal');
 for(const b of arr(state.bankTransactions)){if(b&&b.date){add(b.date,'Bank statement',b.reference||b.id,b.account||'Bank',0,0,money(b.amount),(b.direction==='in'?'Money in':'Money out')+' · '+(b.description||''),b.status==='posted'?'Already posted by linked journal':'Statement memo — not a journal');}}
 for(const e of arr(state.financeJournal)){if(e.voided||validateJournal(e))continue;add(e.date,'Journal',e.ref||e.id,ACCOUNTS[e.debit].label,money(e.amount),0,money(e.amount),e.description,'Posted manual journal');add(e.date,'Journal',e.ref||e.id,ACCOUNTS[e.credit].label,0,money(e.amount),money(e.amount),e.description,'Posted manual journal');}
 return rows.sort((a,b)=>b.date.localeCompare(a.date)||a.source.localeCompare(b.source));
}
return {ACCOUNTS,money,month,earningValue,validateJournal,journalEffects,incomeExpense,monthly,metrics,ledgerRows,latestBalances_};
});
