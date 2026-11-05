/* Simulator for Code.js-generated gateway + Github frontend's MessageChannel. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const code=fs.readFileSync(path.join(root,'Apps_Script_ADMIN_ONLY','Code.js'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'..','js','v12-gateway.js'),'utf8');
const props={getProperty:(key)=>key==='V94_ACTIVE_SLOT'?'A':key==='V5_DB_ID'?'TEST_DB':null};
const html={XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput(s){return {getContent:()=>s,setXFrameOptionsMode(){return this}}}};
const content={MimeType:{JSON:'JSON'},createTextOutput(s){return {getContent:()=>s,setMimeType(){return this}}}};
const ctx=vm.createContext({console,HtmlService:html,ContentService:content,PropertiesService:{getScriptProperties:()=>props},SpreadsheetApp:{openById:()=>({getSheetByName:()=>({})})},Logger:{log(){}},Date,JSON,Math,Set,Map,RegExp,Error});
vm.runInContext(code,ctx);vm.runInContext('isInitialized_=()=>true',ctx);
const health=JSON.parse(ctx.doGet({parameter:{health:'1'}}).getContent());
if(health.version!=='12.0.0'||health.status!=='ONLINE'||health.transport!=='HTML_SERVICE_MESSAGE_PORT')throw Error('Health mismatch');
let bad=ctx.doGet({parameter:{gateway:'1',origin:'https://attacker.example',channel:'abcdefghijklmnopqrstuvwxyz123456'}}).getContent();
if(!bad.includes('denied'))throw Error('Host allowlist bypass');
bad=ctx.doGet({parameter:{gateway:'1',origin:'https://amoghchowdary.github.io',channel:'bad'}}).getContent();
if(!bad.includes('denied'))throw Error('Invalid channel bypass');
const valid=ctx.doGet({parameter:{gateway:'1',origin:'https://amoghchowdary.github.io',channel:'abcdef0123456789abcdef0123456789'}}).getContent();
const script=valid.match(/<script>([\s\S]*?)<\/script>/);
if(!script)throw Error('Gateway generated script missing');new vm.Script(script[1]);
class Port {constructor(){this.onmessage=null;this.peer=null}postMessage(msg){const peer=this.peer;if(peer&&peer.onmessage)queueMicrotask(()=>peer.onmessage({data:msg}))}start(){}close(){}}
class Channel {constructor(){this.port1=new Port();this.port2=new Port();this.port1.peer=this.port2;this.port2.peer=this.port1}}
const listeners={};const nodes=[];
const page={location:{origin:'https://amoghchowdary.github.io'}};
const windowObj={INCENTIFY_CONFIG:{API_URL:'https://script.google.com/macros/s/ABCDE12345/exec'},addEventListener(type,fn){listeners[type]=fn},removeEventListener(){}};
const document={body:{appendChild(node){nodes.push(node);setImmediate(()=>{
  const u=new URL(node.src);const h=ctx.doGet({parameter:Object.fromEntries(u.searchParams)}).getContent();const m=h.match(/<script>([\s\S]*?)<\/script>/);if(!m)throw Error('HTML gate invalid');
  const serverPage={top:{postMessage(data,origin,ports){if(origin!=='https://amoghchowdary.github.io')throw Error('Wrong destination origin');listeners.message({data,origin:'https://n-abc-script.googleusercontent.com',ports})}}};
  const run={withSuccessHandler(fn){this.success=fn;return this},withFailureHandler(fn){this.fail=fn;return this},v12GatewayCall(req){setImmediate(()=>this.success({success:true,action:req.action,version:'12.0.0'}))}};
  vm.runInNewContext(m[1],{window:serverPage,google:{script:{run}},MessageChannel:Channel,console,setInterval,clearInterval});
 })},},createElement(tag){return {tag,style:{},setAttribute(){},remove(){}}},documentElement:{appendChild(){}}};
windowObj.location=page.location;
vm.runInNewContext(client,{window:windowObj,globalThis:{crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'}},crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},document,location:page.location,URL,setTimeout,clearTimeout,console});
(async()=>{
 await windowObj.incentifyApi.waitReady(5000);
 const reply=await windowObj.incentifyApi.call('health',{},5000);
 if(!reply.success||reply.action!=='health'||reply.version!=='12.0.0')throw Error('Roundtrip failed');
 console.log('PASS V12 backend gateway: restricted origin, valid message port, app-protocol roundtrip.');
})().catch(e=>{console.error(e);process.exitCode=1});
