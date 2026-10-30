import * as Dialog from '@radix-ui/react-dialog';
import {LIBRARY_STYLES} from '@/workspace/style-library/library-styles';
import {openUpgrade} from './Upgrade';
export function ProStyleDialog({id,onClose}:{id:string|null;onClose:()=>void}){
 const style=LIBRARY_STYLES.find(s=>s.id===id);
 return <Dialog.Root open={!!style} onOpenChange={open=>{if(!open)onClose()}}><Dialog.Portal><Dialog.Overlay className="standard-pro-overlay"/><Dialog.Content className="home-soon standard-pro-page standard-style-dialog"><section className="home-entry standard-pro-intro" data-kind="koubo"><div className="standard-pro-media"><video src={style?.preview} poster={style?.poster} controls muted loop playsInline/></div><div className="standard-pro-copy"><div className="standard-pro-title"><Dialog.Title>{style?.name_zh}</Dialog.Title><span className="standard-pro-badge">Pro</span></div><Dialog.Description>{style?.description_zh} 此為原版 OpenTake Pro 風格，本分享版未提供。</Dialog.Description><div className="standard-pro-actions"><button className="home-entry__button" onClick={()=>{onClose();openUpgrade()}}>本版未提供 Pro</button><Dialog.Close>返回風格</Dialog.Close></div></div></section></Dialog.Content></Dialog.Portal></Dialog.Root>
}
