(() => {
'use strict';
const CONF=window.INCENTIFY_CONFIG||{};
class IncentifyV12Gateway {
 constructor(url){
   this.baseUrl=String(url||'');this.seq=0;this.pending=new Map();this.port=null;this.ready=false;this.iframe=null;
   this.channel=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):'ch'+Date.now()+Math.random().toString(36).slice(2));
   this._readyPromise=new Promise((resolve,reject)=>{this._resolveReady=resolve;this._rejectReady=reject});
   this._readyTimer=setTimeout(()=>this._fail(new Error('INCENTIFY Apps Script V12 did not connect. Verify the admin deployment version, Web app access, and https://amoghchowdary.github.io origin.')),30000);
   this._onWindowMessage=this._onWindowMessage.bind(this);
   window.addEventListener('message',this._onWindowMessage);
   if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(this.baseUrl)){
     this._fail(new Error('INCENTIFY Apps Script URL is missing or invalid.'));return;
   }
   this._mount();
 }
 _mount(){
   const src=new URL(this.baseUrl);src.searchParams.set('gateway','1');src.searchParams.set('channel',this.channel);src.searchParams.set('origin',location.origin);
   const frame=document.createElement('iframe');frame.src=src.href;frame.title='INCENTIFY API transport';
   frame.setAttribute('aria-hidden','true');frame.setAttribute('tabindex','-1');
   frame.style.cssText='position:absolute;width:1px;height:1px;opacity:0;border:0;pointer-events:none;left:-9999px;top:-9999px';
   (document.body||document.documentElement).appendChild(frame);this.iframe=frame;
 }
 _googleOrigin(origin){try{const u=new URL(origin);return u.protocol==='https:' && (u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com')||u.hostname.endsWith('.google.com'));}catch(_){return false}}
 _onWindowMessage(event){
   const d=event.data||{};
   if(d.type!=='INCENTIFY_V12_READY'||d.channel!==this.channel||!this._googleOrigin(event.origin))return;
   if(!event.ports||!event.ports[0])return;
   if(this.ready)return;
   const port=event.ports[0];this.port=port;port.onmessage=e=>this._onPortMessage(e.data||{});if(port.start)port.start();
   port.postMessage({type:'INCENTIFY_V12_ACK',channel:this.channel});
 }
 _onPortMessage(d){
   if(d.channel!==this.channel)return;
   if(d.type==='INCENTIFY_V12_ACKED'&&!this.ready){this.ready=true;clearTimeout(this._readyTimer);this._resolveReady();return}
   if(d.type!=='INCENTIFY_V12_RESPONSE'||!d.id)return;
   const job=this.pending.get(String(d.id));if(!job)return;
   this.pending.delete(String(d.id));clearTimeout(job.timer);
   const r=d.result||{};
   if(r.success===false){const e=new Error(r.message||r.error||'Server request failed');e.code=r.error||'SERVER_ERROR';e.details=r;job.reject(e)}else job.resolve(r);
 }
 _fail(error){this.lastError=error;clearTimeout(this._readyTimer);if(this._rejectReady)this._rejectReady(error)}
 waitReady(timeout=32000){if(this.ready)return Promise.resolve();return Promise.race([this._readyPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timed out waiting for INCENTIFY Apps Script V12.')),timeout))]);}
 async call(action,payload={},timeout=45000){
   await this.waitReady();
   if(typeof action!=='string'||!action)throw new Error('API action required');
   const id='v12-'+Date.now()+'-'+(++this.seq);
   const request={action,...payload};
   return new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Backend request timed out: '+action))},timeout);
     this.pending.set(id,{resolve,reject,timer});
     try{this.port.postMessage({type:'INCENTIFY_V12_REQUEST',channel:this.channel,id,request})}
     catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}
   });
 }
 destroy(){window.removeEventListener('message',this._onWindowMessage);if(this.port)try{this.port.close()}catch(_){}if(this.iframe)this.iframe.remove();for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(new Error('Gateway destroyed'))}this.pending.clear()}
}
window.IncentifyV12Gateway=IncentifyV12Gateway;
window.incentifyApi=new IncentifyV12Gateway(CONF.API_URL);
})();
