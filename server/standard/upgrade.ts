import {clientHeaders,updateView,dismissUpdate} from './client-update.ts';
import platform from '../platform.ts';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import type {IncomingMessage,ServerResponse} from 'node:http';import {bodyJson,sendJson} from '../http.ts';
import upgradeConfig from '../../upgrade.json' with {type:'json'};
export const UPGRADE_URL=upgradeConfig.endpoint;
// Public owner confirmed by S先生; an unpublished raw file fails closed to beta.
export const UPGRADE_FALLBACK_URL='';
const fallback=process.env.OPENTAKE_UPGRADE_FALLBACK_URL||UPGRADE_FALLBACK_URL;
const local=process.env.OPENTAKE_UPGRADE_TEST_URL;
if(local && !/^http:\/\/127\.0\.0\.1:\d+$/.test(local))throw Error('測試授權服務必須是本機地址');
const origin=local||(UPGRADE_URL?new URL(UPGRADE_URL).origin:'');
const root=platform.standardDataRoot();
const file=path.join(root,'upgrade-session.json');
type Saved={token?:string;daily?:boolean;checkedDay?:string};let saved:Saved={};try{saved=JSON.parse(fs.readFileSync(file,'utf8'))}catch{/* fresh profile */}
function save(){fs.mkdirSync(root,{recursive:true,mode:0o700});fs.writeFileSync(file+'.tmp',JSON.stringify(saved),{mode:0o600});fs.chmodSync(file+'.tmp',0o600);fs.renameSync(file+'.tmp',file)}
async function remote(route:string,method='GET',body?:unknown){const r=await fetch(origin+route,{method,headers:{...clientHeaders(),'Content-Type':'application/json',...(saved.token?{Authorization:`Bearer ${saved.token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});const value=await r.json();if(!r.ok){if(r.status===401){delete saved.token;save()}throw Object.assign(Error(value.error||'操作失敗'),{status:r.status})}return value}
async function config(){for(const url of [local?local+'/standard/upgrade.json':UPGRADE_URL,fallback]){if(!url)continue;try{const r=await fetch(url,{headers:url===fallback?undefined:clientHeaders(true),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});if(!r.ok)continue;const v=await r.json();if(v.mode==='beta'||v.mode==='paid'&&Array.isArray(v.plans)&&v.plans.length===3)return v}catch{/* offline default */}}return {mode:'beta',notice:'',offline:true}}
function publicView(value:Record<string,unknown>){const {token:_token,...rest}=value;return rest}
export async function upgradeApi(req:IncomingMessage,res:ServerResponse){const route=new URL(req.url||'/','http://localhost').pathname.replace('/api/upgrade','');try{
 if(!local && !upgradeConfig.updatesEnabled){
  const clientUpdate={currentVersion:(await import('../../package.json',{with:{type:'json'}})).default.version,release:null,available:false,notify:false,disabled:true};
  if(req.method==='GET'&&route==='/client')return sendJson(res,200,clientUpdate);
  if(req.method==='GET'&&route==='/preferences')return sendJson(res,200,{daily:false,disabled:true});
  if(req.method==='GET'&&route==='/daily')return sendJson(res,200,{skipped:true,disabled:true});
  if(req.method==='GET'&&route==='/state')return sendJson(res,200,{upgrade:{mode:'beta',notice:upgradeConfig.notice,disabled:true},account:null,error:'',clientUpdate});
  return sendJson(res,409,{error:'非官方繁中版已停用原作者的升級、登入與申請服務。'});
 }
 if(req.method==='GET'&&route==='/client')return sendJson(res,200,updateView());
 if(req.method==='POST'&&route==='/dismiss'){const b=await bodyJson(req) as {action:string};return sendJson(res,200,dismissUpdate(b.action))}
 if(req.method==='GET'&&route==='/preferences')return sendJson(res,200,{daily:saved.daily!==false});
 if(req.method==='PUT'&&route==='/preferences'){const b=await bodyJson(req) as {daily?:boolean};saved.daily=b.daily!==false;save();return sendJson(res,200,{daily:saved.daily})}
 if(req.method==='GET'&&(route==='/state'||route==='/daily')){const day=new Date().toLocaleDateString('en-CA');if(route==='/daily'&&(saved.daily===false||saved.checkedDay===day))return sendJson(res,200,{skipped:true});const upgrade=await config();let account=null,error='';if(saved.token&&route!=='/daily')try{account=publicView(await remote('/api/me'))}catch(e){error=e instanceof Error?e.message:'狀態檢查失敗'}saved.checkedDay=day;save();return sendJson(res,200,{upgrade,account,error,clientUpdate:upgrade.offline?{...updateView(),notify:false,offline:true}:updateView(upgrade.standard??null,route==='/state')})}
 if(req.method==='POST'&&(route==='/apply'||route==='/login')){const input=await bodyJson(req);const result=await remote(route==='/apply'?'/api/standard/apply':'/api/login','POST',{...input,...(route==='/login'?{scope:'standard'}:{}),device:'電腦 · '+(process.platform==='darwin'?'macOS':process.platform)});saved.token=result.token;save();return sendJson(res,200,publicView(result))}
 if(req.method==='PUT'&&route==='/intent')return sendJson(res,200,await remote('/api/pro/intent','PUT',await bodyJson(req)));
 if(req.method==='POST'&&route==='/logout'){try{await remote('/api/logout','POST')}finally{delete saved.token;save()}return sendJson(res,200,{ok:true})}
 if(req.method==='GET'&&route==='/download'){if(process.platform!=='darwin')throw Object.assign(Error('Windows 版 Pro 尚未提供，請勿下載 macOS 安裝包。'),{status:409});const value=await remote('/api/me');if(!value.downloadUrl)throw Error(value.downloadMessage||'目前帳號沒有可用下載');const u=new URL(value.downloadUrl,origin);if(u.origin!==origin||!u.pathname.startsWith('/releases/'))throw Error('下載地址無效');res.writeHead(302,{Location:u.href,'Referrer-Policy':'no-referrer','Cache-Control':'no-store'});return res.end()}
 return sendJson(res,404,{error:'介面不存在'});
 }catch(e){return sendJson(res,(e as {status?:number}).status||503,{error:e instanceof Error?e.message:'服務暫時不可用'})}}
