/* Refuses publishing a redirect, mock app, or backend source. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..','dist');const required=['index.html','admin-login.html','sales-login.html','erp.html','admin.html','404.html','.nojekyll','BUILD_INFO.json','js/config.js','js/v12-gateway.js','js/web-adapter.js'];
for(const file of required)if(!fs.existsSync(path.join(dir,file)))throw Error('Missing deployment artifact '+file);
for(const forbidden of ['Code.js','Code.gs','Bridge.html','Login.html','appsscript.json','js/bridge-client.js','.env.local'])if(fs.existsSync(path.join(dir,forbidden)))throw Error('Private/obsolete artifact published '+forbidden);
const info=JSON.parse(fs.readFileSync(path.join(dir,'BUILD_INFO.json'),'utf8'));
if(info.version!=='12.0.0'||info.transport!=='HTML_SERVICE_MESSAGE_PORT'||info.mode!=='two-account')throw Error('Incorrect release metadata');
const config=fs.readFileSync(path.join(dir,'js/config.js'),'utf8');if(!/API_URL:"https:\/\/script\.google\.com\/macros\/s\/[^"\s]+\/exec"/.test(config))throw Error('Missing configured production Apps Script URL');
for(const name of ['index.html','admin-login.html','sales-login.html','erp.html','admin.html']){
 const html=fs.readFileSync(path.join(dir,name),'utf8');if(!html.includes('<main')&&!html.includes('class="'))throw Error('Visual ERP screen missing '+name);
 if(!html.includes('v12-gateway.js')||html.includes('location.replace('+'"https://script.google.com'))throw Error('V12 route is not the full frontend: '+name);
 for(const m of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)){
  const rel=m[1];if(/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(rel))continue;
  if(!fs.existsSync(path.join(dir,rel)))throw Error('Missing asset '+rel+' referenced by '+name);
 }
}
new vm.Script(fs.readFileSync(path.join(dir,'js/v12-gateway.js'),'utf8'));
console.log('PASS V12 deployment artifact: full ERP pages, backend excluded, configured transport, assets complete.');
