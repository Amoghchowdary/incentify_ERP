/* V12 static release verification; no private backend in GitHub source. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');let n=0;
function ok(x,m){if(!x)throw Error('FAIL '+m);console.log('PASS '+m);n++}
const pages=['index.html','admin-login.html','sales-login.html','erp.html','admin.html'];
for(const f of [...pages,'404.html','js/v12-gateway.js','js/web-adapter.js','js/auth.js','js/config.js','.github/workflows/deploy-pages.yml'])ok(fs.existsSync(path.join(root,f)),'Required frontend '+f);
for(const f of ['js/bridge-client.js','Code.js','Code.gs','Login.html','Bridge.html','appsscript.json'])ok(!fs.existsSync(path.join(root,f)),'No private/obsolete frontend '+f);
const gateway=fs.readFileSync(path.join(root,'js/v12-gateway.js'),'utf8');new vm.Script(gateway);ok(true,'V12 browser gateway JavaScript syntax');
ok(gateway.includes('INCENTIFY_V12_READY')&&gateway.includes('INCENTIFY_V12_ACK')&&gateway.includes('MessagePort')===false&&gateway.includes('event.ports'),'Origin-checked MessageChannel handshake');
ok(gateway.includes('waitReady(')&&gateway.includes('Backend request timed out'),'Timeouts and diagnostics');
const files={};for(const page of pages){const text=fs.readFileSync(path.join(root,page),'utf8');files[page]=text;
  ok(text.includes('js/v12-gateway.js')&&!text.includes('js/bridge-client.js'),page+' uses V12 gateway');
  const scripts=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];for(const m of scripts)new vm.Script(m[1]);
  ok(scripts.length>0,page+' inline scripts valid');
}
const original=require('node:fs');const {ZipFile}=Object; // no runtime zip dependency
ok(!gateway.includes('123456')&&!Object.values(files).some(x=>x.includes('dev/mock-api.js')),'No preview OTP or mock API');
ok(fs.readFileSync(path.join(root,'.github/workflows/deploy-pages.yml'),'utf8').includes('check-live-backend-v12.js'),'Live admin backend exit gate before GitHub Pages deploy');
ok(fs.readFileSync(path.join(root,'package.json'),'utf8').includes('12.0.0'),'Version V12');
console.log('V12 FRONTEND SOURCE EXIT GATE: '+n+' checks passed.');
