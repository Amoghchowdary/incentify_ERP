/* V12 production frontend build. Node-only, no dependencies. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist');
const DEFAULT_URL='https://script.google.com/macros/s/AKfycbwXgGjgYDGUNXjd7UwW1PRVIL2wuRaW9MGFRZMnOaauDKi5yEiOkMyinpoZyAQ3YXNE/exec';
function getLocalEnv(){const p=path.join(root,'.env.local');if(!fs.existsSync(p))return{};const out={};for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][\w]*)=(.*)$/);if(m)out[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}return out}
const local=getLocalEnv();
const url=String(process.env.INCENTIFY_ERP_API_URL||local.INCENTIFY_ERP_API_URL||DEFAULT_URL).trim();
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error('V12 requires a real Apps Script /exec endpoint.');
const files=['index.html','admin-login.html','sales-login.html','erp.html','admin.html','404.html','.nojekyll'];
const dirs=['assets','css','js'];
for(const p of [...files,...dirs])if(!fs.existsSync(path.join(root,p)))throw Error('Missing required frontend source: '+p);
const staging=path.join(root,'dist-v12-staging');fs.rmSync(staging,{recursive:true,force:true});fs.mkdirSync(staging,{recursive:true});
try{
  for(const name of files)fs.copyFileSync(path.join(root,name),path.join(staging,name));
  for(const name of dirs)fs.cpSync(path.join(root,name),path.join(staging,name),{recursive:true});
  const cfgFile=path.join(staging,'js/config.js');let cfg=fs.readFileSync(cfgFile,'utf8');
  if(!cfg.includes("API_URL:''"))throw Error('Unrecognized configuration source; refusing release');
  cfg=cfg.replace("API_URL:''",'API_URL:'+JSON.stringify(url));fs.writeFileSync(cfgFile,cfg);
  for(const f of ['index.html','admin-login.html','sales-login.html','erp.html','admin.html']){
    const html=fs.readFileSync(path.join(staging,f),'utf8');
    if(!html.includes('js/v12-gateway.js')||html.includes('bridge-client.js'))throw Error('Incomplete V12 frontend script bootstrap: '+f);
  }
  fs.writeFileSync(path.join(staging,'BUILD_INFO.json'),JSON.stringify({version:'12.0.0',frontendOwner:'Amoghchowdary',backendOwner:'INCENTIFY administrator',mode:'two-account',transport:'HTML_SERVICE_MESSAGE_PORT',frontendPublishedAs:'static-GitHub-Pages',verifiedLive:false},null,2));
  for(const name of ['Code.js','Code.gs','Bridge.html','appsscript.json','.env.local','Login.html','AdminLogin.html','SalesLogin.html','ERP.html','Admin.html'])if(fs.readdirSync(staging).includes(name))throw Error('Private or Apps Script-hosted file leaked: '+name);
  fs.rmSync(dest,{recursive:true,force:true});fs.renameSync(staging,dest);
  console.log('PASS V12 GitHub Pages frontend build: '+files.length+' entry files; backend URL '+new URL(url).host);
}catch(e){fs.rmSync(staging,{recursive:true,force:true});throw e}
