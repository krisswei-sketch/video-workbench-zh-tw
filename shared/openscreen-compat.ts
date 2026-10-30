type Obj = Record<string, any>;
const object = (v:unknown): v is Obj => Boolean(v && typeof v === 'object' && !Array.isArray(v));
/** Import the basic v8 recording contract into the embedded v7 editor.
 * v8 changes the default frame to Auto. Freeze that geometry explicitly rather
 * than merely changing schemaVersion (official 2.1.2 schema/outputFormat).
 * Unsupported newer editing features are rejected, never silently discarded.
 * The host retains native-source.openscreen; saves also preserve revision backups.
 */
export function compatibleOpenScreenDocument(input:unknown): Obj {
 if(!object(input))throw Error('OpenScreen 文件必須是物件');
 if(input.schemaVersion===7)return structuredClone(input);
 if(input.schemaVersion!==8)throw Error(`不支援 OpenScreen 專案版本 ${input.schemaVersion}；目前支援 v7 和基礎 v8 螢幕錄影，原檔案已保留`);
 const d=structuredClone(input);
 for(const key of ['audioTracks','shaderEffects','shaderEffectRanges'])if(Array.isArray(d[key])&&d[key].length)throw Error(`此 v8 專案含尚不支援的 ${key}，請在官方 OpenScreen 中編輯；原檔案已保留`);
 if(!Array.isArray(d.assets)||!Array.isArray(d.timeline?.clips))throw Error('OpenScreen 素材或時間線無效');
 if(d.assets.some((a:Obj)=>a.kind!=='video'))throw Error('此 v8 專案含獨立音訊素材，目前不能無損匯入');
 if((d.zoomRanges||[]).some((z:Obj)=>z.rotationPreset&&!['iso','left','right'].includes(z.rotationPreset)))throw Error('此 v8 專案含尚不支援的三維運鏡');
 if((d.annotations||[]).some((a:Obj)=>a.space==='frame'))throw Error('此 v8 專案含畫布座標標註，目前不能無損匯入');
 const editor=d.legacyEditor={...(d.legacyEditor||{})};
 if(editor.aspectRatio==null||editor.aspectRatio==='auto'){
  const clips=[...d.timeline.clips].sort((a:Obj,b:Obj)=>a.timelineStartSec-b.timelineStartSec);
  const clip=clips[0],asset=d.assets.find((a:Obj)=>a.id===clip?.assetId),crop=clip?.cropRegion;
  if(asset?.cameraTrack?.sourcePath || (editor.frame&&editor.frame!=='none'))throw Error('帶攝像頭或裝置邊框的 v8 Auto 專案請先在官方 OpenScreen 選擇固定畫幅');
  const w=Number(asset?.video?.width)*(crop?.width??1),h=Number(asset?.video?.height)*(crop?.height??1);
  if(!(w>0&&h>0&&Number.isFinite(w/h)))throw Error('v8 Auto 專案缺少素材尺寸，無法保留畫幅');
  const padding=Number(editor.padding??50);
  if(!Number.isFinite(padding)||padding<0||padding>100)throw Error('螢幕錄影留白數值無效');
  const ratio=w/h,elongation=Math.max(ratio,1/ratio),fit=1-padding*.004;
  const framed=fit*elongation+(1-fit),aspect=ratio>=1?framed:1/framed;
  editor.aspectRatio=`${aspect}:1`;
  // Auto has equal margins on all sides; fixed format measures each axis.
  editor.padding=padding*Math.min(aspect,1/aspect);
 }
 d.schemaVersion=7;
 return d;
}
