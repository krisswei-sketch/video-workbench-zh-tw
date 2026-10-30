import platform from './platform.ts';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { SystemPreferencesSchema, type SystemPreferences, type SettingsView } from '../src/settings/schema.ts';
export const settingsFile = () => process.env.LINKREADER_SYSTEM_SETTINGS_FILE || path.join(platform.standardDataRoot(),'system-settings.json');
export const legacyProjectsRoot = () => process.env.LINK_READER_PROJECTS_DIR || platform.projectsRoot();
export function defaultPreferences():SystemPreferences { return {paths:{projects:legacyProjectsRoot(),cache:'',exports:'',backups:process.env.LINKREADER_SYSTEM_SETTINGS_FILE?path.join(path.dirname(settingsFile()),'project-snapshots'):process.env.LINK_READER_PROJECTS_DIR?path.join(process.env.LINK_READER_PROJECTS_DIR,'.project-snapshots'):path.join(platform.standardDataRoot(),'project-snapshots')},export:{preset:'quick',container:'mp4',quality:'fast',resolution:'original',revealWhenDone:false},backup:{automatic:true,intervalMinutes:15,keep:20},reserveGB:5}; }
type Stored={version:1;revision:number;preferences:SystemPreferences;libraries:string[];cacheRoots:string[];backupRoots:string[]};
export function readSystemSettings():Stored {
 if(!fs.existsSync(settingsFile()))return {version:1,revision:0,preferences:defaultPreferences(),libraries:[legacyProjectsRoot()],cacheRoots:[],backupRoots:[]};
 try{const raw=JSON.parse(fs.readFileSync(settingsFile(),'utf8'));return {...raw,preferences:SystemPreferencesSchema.parse(raw.preferences)};}catch{throw Error('系統設定檔案無法讀取，請先恢復配置；未改用其他儲存位置');}
}
const forcedRoot=()=>process.env.LINK_READER_PROJECTS_DIR&&process.env.LINK_READER_PROJECTS_DIR!==platform.projectsRoot()&&!process.env.LINKREADER_SYSTEM_SETTINGS_FILE?process.env.LINK_READER_PROJECTS_DIR:undefined;
export const projectPathOverridden=()=>!!forcedRoot();
export function projectRoots(){const forced=forcedRoot();if(forced)return [forced];const s=readSystemSettings();return [...new Set([s.preferences.paths.projects,...s.libraries])];}
export function defaultProjectRoot(){return forcedRoot()||readSystemSettings().preferences.paths.projects;}
export function validateDirectory(input:string){
 if(!path.isAbsolute(input)||input.includes('\0')||path.resolve(input)===path.parse(input).root)throw Error('請選擇具體資料夾的絕對路徑，不能使用磁碟根目錄');
 const target=path.resolve(input);
 // Do not recreate a missing external mount on the internal drive.
 if(!fs.existsSync(target)||!fs.statSync(target).isDirectory())throw Error('資料夾不存在，請先選擇或建立資料夾：'+target);
 fs.accessSync(target,fs.constants.R_OK|fs.constants.W_OK|fs.constants.X_OK);return fs.realpathSync(target);
}
export function pathStatus(dir:string){try{const target=validateDirectory(dir),s=fs.statfsSync(target);return {path:dir,online:true,writable:true,freeBytes:s.bavail*s.bsize};}catch(e){return {path:dir,online:fs.existsSync(dir),writable:false,error:e instanceof Error?e.message:String(e)};}}
export function settingsView():SettingsView {const s=readSystemSettings();return {revision:s.revision,preferences:s.preferences,libraries:projectRoots().map(pathStatus),paths:Object.fromEntries(Object.entries(s.preferences.paths).map(([k,v])=>[k,v?pathStatus(v):{path:'',online:true,writable:true}])) as SettingsView['paths'],cacheRoots:s.cacheRoots,backupRoots:s.backupRoots,projectPathOverridden:!!forcedRoot()};}
export function writeSystemSettings(preferences:unknown,revision:unknown){
 const current=readSystemSettings();if(revision!==current.revision)throw Error('設定已在其他視窗修改，請重新載入後儲存');
 const p=SystemPreferencesSchema.parse(preferences);
 for(const key of ['projects','cache','exports','backups'] as const){const value=p.paths[key].trim();if(!value&&key==='projects')throw Error('專案目錄不能為空');if(value&&key==='backups'&&value===defaultPreferences().paths.backups&&!fs.existsSync(value))fs.mkdirSync(value,{recursive:true});p.paths[key]=value&&value!==current.preferences.paths[key]?validateDirectory(value):value;}
 if(!p.paths.backups)throw Error('備份目錄不能為空');
 if(forcedRoot()&&p.paths.projects!==defaultProjectRoot())throw Error('目前執行環境固定了專案路徑，請先移除環境覆蓋');
 const file=settingsFile(),next:Stored={version:1,revision:current.revision+1,preferences:p,libraries:[...new Set([...projectRoots(),p.paths.projects])],cacheRoots:[...new Set([...current.cacheRoots,current.preferences.paths.cache,p.paths.cache].filter(Boolean))],backupRoots:[...new Set([...current.backupRoots,current.preferences.paths.backups,p.paths.backups].filter(Boolean))]};
 fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}return settingsView();
}
export function assertFreeSpace(folder:string){const reserve=readSystemSettings().preferences.reserveGB;if(reserve<=0)return;const p=pathStatus(folder);if(!p.writable)throw Error(p.error);if(p.freeBytes!==undefined&&p.freeBytes<reserve*1024**3)throw Error(`磁碟剩餘空間低於設定的 ${reserve} GB，請清理快取或選擇其他目錄：${folder}`);}

/** Register a verified migration destination without changing the new-project default. */
export function registerProjectLibrary(folder:string){
 const target=validateDirectory(folder),current=readSystemSettings();if(current.libraries.includes(target))return;
 const next={...current,revision:current.revision+1,libraries:[...current.libraries,target]},file=settingsFile(),temp=file+'.'+crypto.randomUUID()+'.tmp';
 fs.mkdirSync(path.dirname(file),{recursive:true});try{fs.writeFileSync(temp,JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}
}
