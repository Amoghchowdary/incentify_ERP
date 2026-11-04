/* INCENTIFY ERP V9.2 — bank statement parsing and classification (no automatic ledger posting). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.IncentifyBank92=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const cents=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const arr=x=>Array.isArray(x)?x:[];
function parseDelimited(input,delimiter){
 const s=String(input||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 if(!delimiter){const first=s.split('\n').slice(0,4).join('\n');delimiter=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',';}
 const out=[],row=[];let cell='',quoted=false;
 for(let i=0;i<s.length;i++){const ch=s[i];if(quoted){if(ch==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===delimiter){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell);if(row.some(x=>String(x).trim()))out.push(row.slice());row.length=0;cell='';}else cell+=ch;}
 if(quoted)throw Error('Unclosed quoted field in statement');row.push(cell);if(row.some(x=>String(x).trim()))out.push(row.slice());
 return out;
}
function findColumns(head){const canon=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');const h=head.map(canon);const find=(patterns,skip=[])=>{const i=h.findIndex((v,idx)=>!skip.includes(idx)&&patterns.some(p=>p.test(v)));return i<0?-1:i};return {
 date:find([/^(transactiondate|txnDate|txndate|date|valuedate|postingdate|trandate|transactiondt)$/i,/transactiondate/,/valuedate/]),
 description:find([/^(narration|description|particulars|transactiondetails|details|remarks|transactionremarks)$/,/narration/,/description/,/particulars/]),
 debit:find([/^(debit|withdrawal|withdrawals|withdrawalamt|debitamount|dramount|moneyout|paidout)$/,/withdrawal/,/debit/]),
 credit:find([/^(credit|deposit|deposits|depositamt|creditamount|cramount|moneyin)$/,/deposit/,/credit/]),
 amount:find([/^(amount|transactionamount|txnamount|amt)$/,/amount/],[]),
 drcr:find([/^(drcr|debitcredit|transactiontype|type|direction)$/]),
 balance:find([/^(balance|closingbalance|runningbalance|availablebalance|ledgerbalance)$/,/balance/]),
 reference:find([/^(referenceno|reference|refno|transactionid|transactionno|utr|utrno|chequeno|chqno|rrn|txnref)$/,/referenc/,/utr/,/chequeno/])
 };}
function amount(v){let s=String(v==null?'':v).replace(/(?:INR|Rs\.?|₹)/gi,'').replace(/[\s,\u00a0]/g,'').trim();const paren=/^\(.*\)$/.test(s);s=s.replace(/[()]/g,'');if(!s||s==='-'||s==='—')return 0;if(!/^[+-]?\d*\.?\d+$/.test(s))return NaN;const n=Number(s);return cents(paren?-n:n);}
function date(v){if(v==null||String(v).trim()==='')return '';const s=String(v).trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/,'');let y,m,d,r;
 if((r=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))){y=+r[1];m=+r[2];d=+r[3];}
 else if((r=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))){d=+r[1];m=+r[2];y=+r[3];}
 else if((r=s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})/))){d=+r[1];m=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(r[2].slice(0,3).toLowerCase())+1;y=+r[3];if(y<100)y+=y<70?2000:1900;}
 else return '';
 const chk=new Date(Date.UTC(y,m-1,d));return y>=2000&&y<=2100&&m>=1&&m<=12&&chk.getUTCFullYear()===y&&chk.getUTCMonth()===m-1&&chk.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';}
const CATEGORIES=['Unclassified','Customer receipt','Supplier payment','Office expenses','Salaries','Bank charges','Tax payment','Loan / financing','Capital introduced','Internal transfer','Cash withdrawal','Software & technology','Marketing','Travel & transport','Food & dining','Refund','Other'];
function suggest(text,direction){const t=String(text||'').toLowerCase();const rules=[[/\b(salary|payroll|wages)\b/,'Salaries','salary'],[/\b(gst|tax challan|income tax|tds|tcs)\b/,'Tax payment','tax_payable'],[/\b(charge|fee|sms alert|annual maintenance|bank commission)\b/,'Bank charges','operations'],[/\b(google|microsoft|aws|azure|hosting|software|subscription|domain)\b/,'Software & technology','operations'],[/\b(loan|emi|interest debit|repayment)\b/,'Loan / financing','loan'],[/\b(atm|cash withdrawal)\b/,'Cash withdrawal','other_asset'],[/\b(transfer to self|self transfer|own account|fund transfer between)\b/,'Internal transfer','other_asset'],[/\b(advert|meta ads|facebook ads|campaign)\b/,'Marketing','marketing'],[/\b(train|flight|hotel|uber|ola|fuel|petrol)\b/,'Travel & transport','operations'],[/\b(refund|reversal)\b/,'Refund',direction==='in'?'other_income':'operations']];for(const [re,cat,account] of rules)if(re.test(t))return{category:cat,contraAccount:account,confidence:'suggested'};
 return {category:'Unclassified',contraAccount:'',confidence:'needs-review'};}
function fingerprint(x){let h=2166136261;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function normalize(rows,map,opts={}){
 const bank=String(opts.bank||'').trim(),account=String(opts.account||'').trim(),file=String(opts.file||'').trim();if(!bank||!account)throw Error('Choose a bank name and account label');
 if(map.date<0||map.description<0||(!([map.debit,map.credit].some(n=>n>=0))&&map.amount<0))throw Error('Map Date, Description, and Debit/Credit or Amount columns');
 const result=[],invalid=[],seen=new Map();
 rows.forEach((r,offset)=>{const originalRow=offset+2;if(!r.some(x=>String(x||'').trim()))return;
 const get=k=>map[k]>=0?String(r[map[k]]??'').trim():'';
 const dt=date(get('date')),description=get('description'),debit=amount(get('debit')),credit=amount(get('credit')),single=amount(get('amount'));
 if(!dt||!description){invalid.push({row:originalRow,reason:!dt?'Invalid or missing transaction date':'Missing transaction description'});return;}
 if(![debit,credit,single].every(Number.isFinite)){invalid.push({row:originalRow,reason:'Invalid numeric amount'});return;}
 let direction='',value=0;
 if(debit!==0&&credit!==0){invalid.push({row:originalRow,reason:'Both debit and credit populated'});return;}
 if(debit!==0){direction='out';value=Math.abs(debit);}else if(credit!==0){direction='in';value=Math.abs(credit);}
 else if(map.amount>=0&&single!==0){const flag=get('drcr').toLowerCase();direction=/^(dr|debit|withdrawal|out|d)$/.test(flag)?'out':/^(cr|credit|deposit|in|c)$/.test(flag)?'in':single<0?'out':'in';value=Math.abs(single);}
 else {invalid.push({row:originalRow,reason:'Missing transaction amount'});return;}
 value=cents(value);if(value<=0||value>1e12){invalid.push({row:originalRow,reason:'Transaction amount must be positive'});return;}
 const balanceRaw=get('balance'),balance=balanceRaw?amount(balanceRaw):null;if(balanceRaw&&!Number.isFinite(balance)){invalid.push({row:originalRow,reason:'Invalid closing balance'});return;}
 const ref=get('reference');const canonical=[bank.toLowerCase(),account.toLowerCase(),dt,direction,value,description.toLowerCase().replace(/\s+/g,' '),ref.toLowerCase(),balance??''].join('|');const occurrence=(seen.get(canonical)||0)+1;seen.set(canonical,occurrence);
 const key=fingerprint(canonical+'|'+occurrence),classification=suggest(description,direction);
 result.push({id:'BT-'+key+'-'+fingerprint(bank+'|'+account),fingerprint:key,bank,account,file,date:dt,description,reference:ref,direction,amount:value,balance,category:classification.category,contraAccount:classification.contraAccount,confidence:classification.confidence,status:'unreviewed',sourceRow:originalRow,importId:String(opts.importId||''),createdAt:new Date().toISOString()});
 });return{transactions:result,invalid};}
function validateTransaction(t){if(!t||!String(t.id||'').startsWith('BT-'))return 'Missing bank transaction ID';if(!date(t.date)||date(t.date)!==t.date)return 'Invalid bank date';if(!['in','out'].includes(t.direction))return 'Invalid money direction';if(!Number.isFinite(Number(t.amount))||Number(t.amount)<=0||Number(t.amount)>1e12)return 'Invalid bank amount';if(!String(t.description||'').trim()||!String(t.account||'').trim())return 'Account and narration required';if(!['unreviewed','reviewed','matched','posted','ignored'].includes(t.status))return 'Unknown review status';return '';}
function merge(existing,incoming){const fingerprints=new Set(arr(existing).map(x=>x.id));let added=[],duplicates=0;for(const tx of arr(incoming)){if(fingerprints.has(tx.id)){duplicates++;continue;}if(validateTransaction(tx))continue;fingerprints.add(tx.id);added.push(tx);}return {added,duplicates};}
function totals(items){const data=arr(items),out={count:data.length,in:0,out:0,unreviewed:0,posted:0,matched:0,ignored:0,byCategory:{},byMonth:{}};for(const x of data){if(!x||validateTransaction(x))continue;out[x.direction]=cents(out[x.direction]+Number(x.amount));if(x.status in out&&typeof out[x.status]==='number')out[x.status]++;out.byCategory[x.category||'Unclassified']=cents((out.byCategory[x.category||'Unclassified']||0)+Number(x.amount));const m=x.date.slice(0,7);if(!out.byMonth[m])out.byMonth[m]={in:0,out:0};out.byMonth[m][x.direction]=cents(out.byMonth[m][x.direction]+Number(x.amount));}return out;}
function currentSnapshots(entries){const map=new Map();for(const e of arr(entries)){if(!e||!e.group||!e.accountName)continue;const key=e.group+'|'+String(e.accountName).trim().toLowerCase();const old=map.get(key);const when=String(e.date||'')+(e.updatedAt||e.createdAt||'');if(!old||when>String(old.date||'')+(old.updatedAt||old.createdAt||''))map.set(key,e);}return [...map.values()];}
return{parseDelimited,findColumns,amount,date,suggest,fingerprint,normalize,validateTransaction,merge,totals,currentSnapshots,CATEGORIES};
});
