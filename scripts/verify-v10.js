'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),r=p=>fs.readFileSync(path.join(root,p),'utf8');let count=0;
function ok(label,condition){if(!condition)throw Error('FAIL '+label);console.log('PASS '+label);count++;}
const src=r('erp.html'),config=r('js/config.js');
for(const f of ['index.html','admin-login.html','sales-login.html','admin.html','erp.html','404.html','.nojekyll','assets/INCENTIFY_logo_web.png','js/bridge-client.js','js/web-adapter.js'])ok('Required: '+f,fs.existsSync(path.join(root,f)));
ok('V10 version',config.includes("VERSION: '10.0.0'"));
ok('No hardwired old Apps Script endpoint',config.includes("API_URL:''")&&config.includes("BRIDGE_URL:''"));
ok('Approved design/styles retained',src.includes('Playfair Display')&&src.includes('DM Sans'));
ok('Sales access gate retained',src.includes("SALES_ALLOWED_PAGES = new Set(['invoice','invoices','payments'])"));
ok('Admin login OTP',r('admin-login.html').includes('requestAdminOtp')&&r('admin-login.html').includes('verifyAdminOtp'));
ok('Sales login OTP',r('sales-login.html').includes('requestSalesOtp')&&r('sales-login.html').includes('verifySalesOtp'));
ok('GitHub Pages workflow',fs.existsSync(path.join(root,'.github/workflows/deploy-pages.yml')));
ok('No mock source in Git repository',!fs.existsSync(path.join(root,'dev/mock-api.js')));
ok('Backend excluded from public repository',!fs.existsSync(path.join(root,'apps-script-v9')));
for(const f of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')))new vm.Script(r('js/'+f));ok('JavaScript modules parse',true);
for(const f of ['index.html','sales-login.html','admin-login.html','admin.html','erp.html']){
 const raw=r(f);for(const match of raw.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1]);
}ok('Inline application scripts parse',true);
console.log('PASS '+count+' V10 source checks');
