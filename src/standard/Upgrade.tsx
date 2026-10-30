import {useEffect,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import edition from '../../edition.json';
import './pro-flow.css';
export const openUpgrade=()=>window.dispatchEvent(new Event('opentake-upgrade'));
export function UpgradeButton(){return <button className="home-entry__button" onClick={openUpgrade}>非官方繁中版</button>}
export function UpgradePreferences(){return <p>本版停用自動更新與原作者的 Pro 申請服務。</p>}
export function UpgradeDialog(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const show=()=>setOpen(true);window.addEventListener('opentake-upgrade',show);return()=>window.removeEventListener('opentake-upgrade',show)},[]);
 return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="pro-flow-overlay"/><Dialog.Content className="pro-flow pro-flow-modal" aria-describedby="community-edition-description"><div className="dialog"><Dialog.Title>剪輯工作台（非官方繁中版）</Dialog.Title><p id="community-edition-description">本版修改自 OpenTake Standard，並非原作者或 OpenAI 官方產品。僅提供原開源版本已包含的功能；標示 Pro 的模組不在本版範圍內。</p><p>使用你自己的 Mac 與 Codex，影片專案儲存在你的電腦。這是原始碼分享版，不是多人共用的線上剪輯服務。</p><p>本版沒有 Pro 帳號註冊、付款或申請表，也不會將資料送到原作者的升級服務。</p>{edition.sourcePublished ? <a href={edition.sourceUrl} target="_blank" rel="noreferrer">查看繁中版原始碼與使用說明</a> : <p>本版尚未公開上傳；原始碼與使用說明隨本機交付資料夾提供。</p>}<div className="row"><Dialog.Close className="primary">關閉</Dialog.Close></div></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}
