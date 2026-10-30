import {useEffect,useState} from 'react';
import {getAgentSettings} from '../studio/api';
import {AGENT_MODULES,EFFORT_LABELS,FOLLOW_DEFAULT,effectiveChoice,type AgentSettingsView,type AgentModule,type AgentChoice} from '../studio/agent-settings';
export function ModelRows({view,change}:{view:AgentSettingsView;change:(id:AgentModule,choice:AgentChoice)=>void}){
 const models=view.catalog?.models??[],fallback=models.find(m=>m.isDefault)||models[0];
 return <>{AGENT_MODULES.map(module=>{
  const choice=view.settings.modules[module.id],actual=effectiveChoice(choice,models);
  const missing=choice.model!==FOLLOW_DEFAULT&&!models.some(m=>m.id===choice.model);
  const selected=models.find(m=>m.id===actual.model);
  const efforts=Array.from(new Set([choice.effort,...(selected?.efforts??[])]));
  return <div key={module.id}><h3>{module.name}</h3>
   <label>模型 <select aria-label={`${module.name}模型`} value={choice.model} disabled={!models.length} onChange={e=>{const model=models.find(m=>m.id===e.target.value)||fallback;change(module.id,{model:e.target.value,effort:model?.efforts.includes(choice.effort)?choice.effort:model?.defaultEffort??choice.effort})}}>
    <option value={FOLLOW_DEFAULT}>跟隨 Codex 預設{fallback?`（${fallback.name}）`:''}</option>
    {missing&&<option value={choice.model}>{choice.model} · 你的 Codex 沒有</option>}
    {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
   </select></label>
   <label>推理強度 <select aria-label={`${module.name}推理強度`} value={choice.effort} disabled={!models.length} onChange={e=>change(module.id,{...choice,effort:e.target.value})}>{efforts.map(e=><option key={e} value={e}>{EFFORT_LABELS[e]??e}</option>)}</select></label>
   {models.length>0&&missing&&<p role="status" style={{color:'#9869dc'}}>你的 Codex 沒有 {choice.model}，會改用預設的 {fallback.name}</p>}
   {actual.effort!==choice.effort&&<p style={{color:'#9869dc'}}>實際推理強度將使用 {EFFORT_LABELS[actual.effort]??actual.effort}。</p>}
  </div>;
 })}</>;
}
export default function Settings(){
 const [view,setView]=useState<AgentSettingsView>(),[error,setError]=useState(''),[cli,setCli]=useState(''),[status,setStatus]=useState(''),[saving,setSaving]=useState(false);
 useEffect(()=>{getAgentSettings().then(v=>{setView(v);setCli(v.settings.cliPath)},e=>setError(String(e)))},[]);
 async function save(){if(!view)return;setStatus('');setError('');setSaving(true);try{const r=await fetch('/api/agent-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...view.settings,cliPath:cli})});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error);setView(j.result);setStatus('已儲存')}catch(e){setError(String(e))}finally{setSaving(false)}}
 return <div><section><h2>出片AI 助理</h2><p>使用你自己的 Codex CLI。模型預設跟隨 Codex；專案也可以單獨選擇。</p>{error&&<p role="alert">{error}</p>}{view&&<><label>Codex 路徑（留空自動檢測）<input value={cli} onChange={e=>setCli(e.target.value)}/></label>{view.catalogError&&<p role="alert">{view.catalogError}</p>}<ModelRows view={view} change={(id,choice)=>setView({...view,settings:{...view.settings,modules:{...view.settings.modules,[id]:choice}}})}/><button disabled={saving} onClick={()=>void save()}>{saving?'正在儲存…':'儲存設定'}</button><p role="status">{status}</p></>}</section></div>;
}
