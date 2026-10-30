import edition from '../../edition.json';
import './client-update.css';
export function UpdateReminder(){return null}
export function ClientUpdate(){return null}
export function AboutUpdate(){return <section className="standard-update-about"><h2>關於與更新</h2><p>{edition.name} · {edition.version}</p><p>本版已停用自動更新與原作者的升級來源，避免覆蓋繁體中文修改。更新時請下載本分享專案的新版本，保留舊版、設定及影片專案，重新依安裝指引驗證。</p>{edition.sourcePublished ? <a href={edition.sourceUrl} target="_blank" rel="noreferrer">查看繁中版版本與完整原始碼</a> : <p>本版尚未公開上傳，完整原始碼與本機交付資料夾一併提供。</p>}</section>}
