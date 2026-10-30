import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import type {IncomingMessage,ServerResponse} from 'node:http';
test('community edition never contacts upstream upgrade, account or download services',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'community-upgrade-'));const old=process.env.OPENTAKE_STANDARD_USER_DATA;process.env.OPENTAKE_STANDARD_USER_DATA=root;const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;if(old===undefined)delete process.env.OPENTAKE_STANDARD_USER_DATA;else process.env.OPENTAKE_STANDARD_USER_DATA=old;fs.rmSync(root,{recursive:true,force:true})});
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('network must not be called')};
 const {upgradeApi,UPGRADE_URL,UPGRADE_FALLBACK_URL}=await import('./standard/upgrade.ts');assert.equal(UPGRADE_URL,'');assert.equal(UPGRADE_FALLBACK_URL,'');
 async function request(method:string,url:string){let body='';const res={statusCode:0,setHeader(){},end(value:string){body=value}};await upgradeApi({method,url} as IncomingMessage,res as unknown as ServerResponse);return {status:res.statusCode,body:JSON.parse(body)}}
 assert.equal((await request('GET','/api/upgrade/state')).body.clientUpdate.available,false);
 assert.equal((await request('GET','/api/upgrade/preferences')).body.daily,false);
 assert.equal((await request('GET','/api/upgrade/daily')).body.skipped,true);
 for(const [method,route] of [['POST','login'],['POST','apply'],['PUT','intent'],['GET','download'],['PUT','preferences'],['POST','dismiss']])assert.equal((await request(method,'/api/upgrade/'+route)).status,409);
 assert.equal(calls,0);
});
