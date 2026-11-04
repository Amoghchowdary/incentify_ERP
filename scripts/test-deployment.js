'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const must=['index.html','admin-login.html','sales-login.html','erp.html','admin.html','404.html','.nojekyll','BUILD_INFO.json','js/config.js','js/auth.js','js/bridge-client.js'];
for(const f of must)if(!fs.existsSync(path.join(dist,f)))throw Error('Build missing '+f);
for(const f of ['dev/mock-api.js','apps-script-v9/Code.gs','backend_reference/Code.gs','.env.local'])if(fs.existsSync(path.join(dist,f)))throw Error('Build leaks '+f);
const info=JSON.parse(fs.readFileSync(path.join(dist,'BUILD_INFO.json'),'utf8'));
if(info.mode!=='live'||info.version!=='10.0.0'||!info.backendConfigured)throw Error('Wrong build metadata');
const cfg=fs.readFileSync(path.join(dist,'js/config.js'),'utf8');
if(!/API_URL:"https:\/\/script\.google\.com\/macros\/s\/[^"\s]+\/exec"/.test(cfg))throw Error('Production endpoint missing');
if(cfg.includes('PASTE_')||cfg.includes('YOUR_')||cfg.includes("BRIDGE_URL:''"))throw Error('Unconfigured endpoint');
for(const name of ['index.html','sales-login.html','admin-login.html','erp.html','admin.html']){
 const html=fs.readFileSync(path.join(dist,name),'utf8');if(/dev\/mock-api|123456.*preview/i.test(html))throw Error('Mock behavior found in '+name);
 for(const m of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)){
  const rel=m[1];if(/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(rel))continue;
  if(!fs.existsSync(path.join(dist,rel)))throw Error('Missing asset '+rel+' from '+name);
 }
}
console.log('PASS V10 deployable output: live-only bridge, complete routes/assets, no mock or backend code.');
