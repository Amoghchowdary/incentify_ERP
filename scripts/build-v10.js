'use strict';
// Production-only, dependency-free GitHub Pages release builder.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist');
function envFile(filepath){if(!fs.existsSync(filepath))return{};const out={};for(const line of fs.readFileSync(filepath,'utf8').split(/\r?\n/)){
  const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&!line.trimStart().startsWith('#'))out[m[1]]=m[2].replace(/^(?:"|')|(?:"|')$/g,'');
}return out;}
const local=envFile(path.join(root,'.env.local'));
const url=String(process.env.INCENTIFY_ERP_API_URL||local.INCENTIFY_ERP_API_URL||'').trim();
const mode=String(process.env.INCENTIFY_BACKEND_MODE||local.INCENTIFY_BACKEND_MODE||'live').toLowerCase();
if(mode!=='live')throw Error('V10 refuses preview builds: INCENTIFY_BACKEND_MODE must be live.');
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)||/PASTE_|YOUR_|EXAMPLE/i.test(url)){
 throw Error('Refusing GitHub release: provide the REAL V10 Apps Script /exec URL via INCENTIFY_ERP_API_URL. The older V6 endpoint is not automatically reused.');
}
const entries=['index.html','admin-login.html','sales-login.html','erp.html','admin.html','404.html','.nojekyll'];
for(const name of entries)if(!fs.existsSync(path.join(root,name)))throw Error('Missing '+name);
// No destructive rebuild occurs until validation above succeeds.
const staging=path.join(root,'dist-v10-temp');fs.rmSync(staging,{recursive:true,force:true});fs.mkdirSync(staging,{recursive:true});
try{
 for(const name of entries)fs.copyFileSync(path.join(root,name),path.join(staging,name));
 for(const dir of ['assets','css','js'])fs.cpSync(path.join(root,dir),path.join(staging,dir),{recursive:true});
 const config=path.join(staging,'js/config.js');let cfg=fs.readFileSync(config,'utf8');
 if(!cfg.includes("API_URL:''")||!cfg.includes("BRIDGE_URL:''"))throw Error('Unexpected config format; refusing partial injection.');
 cfg=cfg.replace("API_URL:''",'API_URL:'+JSON.stringify(url)).replace("BRIDGE_URL:''",'BRIDGE_URL:'+JSON.stringify(url+'?bridge=1'));
 fs.writeFileSync(config,cfg);
 fs.writeFileSync(path.join(staging,'BUILD_INFO.json'),JSON.stringify({version:'10.0.0',mode:'live',backendConfigured:true,backendHost:'script.google.com',builtAt:new Date().toISOString(),acceptance:'Live OTP, Sheets and payments require post-deployment testing'},null,2));
 for(const name of ['index.html','admin-login.html','sales-login.html','erp.html','admin.html']){
  const html=fs.readFileSync(path.join(staging,name),'utf8');
  if(!html.includes('js/config.js')||!html.includes('js/bridge-client.js')||!html.includes('js/auth.js'))throw Error('Incomplete live bootstrap: '+name);
 }
 for(const forbidden of ['dev','apps-script-v9','backend_reference','backend_uploaded_v6_1_reference','node_modules'])if(fs.existsSync(path.join(staging,forbidden)))throw Error('Sensitive or mock folder leaked: '+forbidden);
 fs.rmSync(dest,{recursive:true,force:true});fs.renameSync(staging,dest);
 console.log('PASS V10 GITHUB PAGES LIVE BUILD, '+entries.length+' entry files, configured backend '+new URL(url).host);
}catch(e){fs.rmSync(staging,{recursive:true,force:true});throw e;}
