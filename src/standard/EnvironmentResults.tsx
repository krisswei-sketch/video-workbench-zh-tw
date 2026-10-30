import type {EnvironmentCheck} from '../../shared/creation-tools'
export function EnvironmentResults({value}:{value:EnvironmentCheck}) {
 return <section aria-label="出片工具檢查" aria-live="polite" style={{overflowWrap:'anywhere'}}>
  {!value.ok && <p style={{color:'#9869dc'}}>先準備好以下工具，再開始做片。填寫的內容已保留。</p>}
  {value.items.map(item=><div key={item.id} style={{color:item.ok?'inherit':'#9869dc',marginBlock:12}}>
   <strong>{item.label} · {item.ok?'透過':'需要處理'}</strong>
   <p style={{whiteSpace:'pre-wrap',marginBlock:4}}>{item.ok?item.version:item.message}</p>
   {item.ok?<small style={{whiteSpace:'pre-wrap'}}>{item.path}</small>:<p style={{whiteSpace:'pre-wrap',marginBlock:4}}>{item.install}</p>}
  </div>)}
 </section>
}
