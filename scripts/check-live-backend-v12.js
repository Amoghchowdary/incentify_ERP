/* GitHub Actions release gate; requires V12 to be deployed by the INCENTIFY admin. */
'use strict';
const DEFAULT_URL='https://script.google.com/macros/s/AKfycbwXgGjgYDGUNXjd7UwW1PRVIL2wuRaW9MGFRZMnOaauDKi5yEiOkMyinpoZyAQ3YXNE/exec';
const url=String(process.env.INCENTIFY_ERP_API_URL||DEFAULT_URL).trim();
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error('Invalid backend /exec URL.');
(async()=>{
 let result;
 try{
  const res=await fetch(url+'?health=1',{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const raw=await res.text();result=JSON.parse(raw);
 }catch(e){throw Error('INCENTIFY ADMIN backend health unavailable; block GitHub publication. '+e.message)}
 if(result.version!=='12.0.0'||result.status!=='ONLINE'||result.transport!=='HTML_SERVICE_MESSAGE_PORT'||result.frontendOrigin!=='https://amoghchowdary.github.io')
   throw Error('Release blocked: expected INCENTIFY ADMIN backend V12 ONLINE with GitHub origin; response='+JSON.stringify(result).slice(0,600));
 console.log('PASS LIVE BACKEND GATE: V12 ONLINE, INCENTIFY-admin backend ready for browser acceptance.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
