import {EnvironmentResults} from '../standard/EnvironmentResults'
import type {EnvironmentCheck} from '../../shared/creation-tools'
import {AboutUpdate} from '../standard/ClientUpdate'
import {useEffect,useState} from 'react'
import {Settings} from 'lucide-react'
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog'
import {ThemeSwitcher} from '@/workspace/ThemeSwitcher'
import AgentSettings from '@/pages/StandardSettings'
import './system-settings.css'
import pkg from '../../package.json'
function MediaDoctor(){
 const [value,setValue]=useState<EnvironmentCheck>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const check=async()=>{setBusy(true);setError('');try{const response=await fetch('/api/environment');if(!response.ok)throw Error();const data=await response.json();setValue(data.items?data:{ok:data.ffmpeg.ok,checkedAt:'',items:[{id:'ffmpeg',label:'FFmpeg / ffprobe',...data.ffmpeg}]})}catch{setError('環境檢查失敗，請重試')}finally{setBusy(false)}};
 useEffect(()=>{void check()},[]);
 return <section><h3>出片工具環境檢查</h3>{value&&<EnvironmentResults value={value}/>}<p role="status" style={{color:'#9869dc'}}>{busy?'正在檢查…':error}</p><button disabled={busy} onClick={()=>void check()}>重新檢查</button></section>
}
export function StandardAbout(){return <><AboutUpdate/><MediaDoctor/><section><h3>剪輯工作台（非官方繁中版）</h3><p>基礎程式版本 {pkg.version}；繁中修改版 2026.10.29-tw1。</p><p>修改自 OpenTake Standard，與原作者及 OpenAI 無隸屬關係。通用剪輯及螢幕錄影在本機執行；需要 AI 時使用你自己的 Codex 登入與用量。</p><p>本版不提供原作者 Pro 註冊或登入，不自動聯絡升級服務。資料儲存在各自電腦；只有使用者主動使用 Codex 或允許上網找素材時，相關內容才會依該服務設定傳送。</p><p>程式碼採用 AGPL-3.0-only；OpenTake 與 OpenScreen 名稱屬各自權利人。請參閱授權及第三方聲明。</p><a href="/NOTICE" target="_blank" rel="noreferrer">開源授權與第三方聲明</a></section></>}
export function SystemSettings(){const [open,setOpen]=useState(false),[group,setGroup]=useState('general');return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button className="system-settings-entry" aria-label="系統設定" title="系統設定"><Settings size={17}/><span>系統設定</span></button></DialogTrigger><DialogContent className="system-settings" showCloseButton={false}><header><div><DialogTitle>系統設定</DialogTitle><DialogDescription>管理這臺電腦上的創作環境與預設行為。</DialogDescription></div><button onClick={()=>setOpen(false)} aria-label="關閉系統設定">關閉</button></header><div className="system-settings-layout"><nav aria-label="設定分類">{[['general','通用與外觀'],['agents','已連接的 Agent'],['about','關於與更新']].map(([id,label])=><button key={id} aria-current={group===id?'page':undefined} onClick={()=>setGroup(id)}>{label}</button>)}</nav><main id="settings-panel">{group==='general'?<><h2>通用與外觀</h2><section><h3>介面主題</h3><p>立即套用，保留目前工作台版面配置。</p><ThemeSwitcher/></section><section><h3>專案自動儲存</h3><p>編輯後自動儲存；儲存失敗會在編輯器中提示。</p></section></>:group==='agents'?<AgentSettings/>:<StandardAbout/>}</main></div><footer><span>Agent 設定在對應分組獨立儲存</span></footer></DialogContent></Dialog>}
