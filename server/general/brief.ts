/**
 * 需求單（work/BRIEF.md）和每一輪發給 Agent 的話：需求已定、不要提問，短到一眼讀完。
 * 第一版一輪做完；成片沒過 OpenTake 的檢查才改一輪；使用者要改片再開一輪。
 * 輪與輪之間，OpenTake 把使用者插的話、連線上網答覆帶進下一輪。
 */
import path from 'node:path';
import type { GeneralMedia, GeneralProject } from '../../src/general/general-contract.ts';

export type StyleInfo = { id: string; name_zh: string; input_type: string; description_zh?: string };
/** 不用風格 (S先生 2026-10-25): no style rules at all, the film follows the person's own words, as Opus and OpenFilm work. */
export const FREE_STYLE: StyleInfo = { id: 'free', name_zh: '不用風格', input_type: 'any', description_zh: '不套風格，完全按你的要求做' };
const isFree = (id: string) => id === FREE_STYLE.id;
export type Phase = 'plan' | 'make' | 'polish' | 'revise';
export type QueuedNote = { text: string; reference?: { time: number; rect: { x: number; y: number; w: number; h: number }; image?: string } };

export const frameSize = (aspect: GeneralProject['settings']['aspect']) => aspect === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const lengthText = (length: GeneralProject['settings']['length']) => length === 'auto' ? '按內容定，15–60 秒' : `${length} 秒（上下不超過 10%）`;

export function buildBrief(project: GeneralProject, style: StyleInfo, kit: string, media: (GeneralMedia & { file: string; fps?: string })[]): string {
  const { width, height } = frameSize(project.settings.aspect);
  const footage = project.inputs.kind === 'footage';
  const free = isFree(style.id);
  const lines = [
    '# OpenTake 通用剪輯 · 製片任務',
    '',
    '你替使用者做一條片子。**自己做完，不要提問，沒有人會回答。** 拿不準的按合理預設決定，寫進 REPORT.md。',
    '',
    '| 項 | 值 |', '|---|---|',
    free
      ? '| 風格 | 不套風格庫，完全按使用者的要求設計 |'
      : `| 風格 | ${style.name_zh}：\`${path.join(kit, 'styles', style.id, 'STYLE.md')}\` 是起點，和使用者的要求衝突時以使用者為準 |`,
    `| 輸入 | ${footage ? `使用者的影片 ${media.length} 段（見下）` : '一段文案（見下），沒有素材'} |`,
    `| 長度 | ${lengthText(project.settings.length)} |`,
    `| 畫幅 | ${width}×${height}（${project.settings.aspect}），30 fps |`,
    '| 旁白 | 不要旁白 |',
    '| 螢幕文字 | 中文（品牌名、專有名詞保持原文）；每屏停留 ≥ 字數 ÷ 4.5 + 1.5 秒 |',
    footage
      ? '| 聲音 | 素材有聲音（歌曲、現場聲、對白）就以原聲為主，不另配樂；沒有聲音再用 numpy 合成配樂和音效 |'
      : '| 聲音 | 配樂和音效用 numpy 合成，簡單就好 |',
    '',
  ];
  if (footage) {
    lines.push('## 素材（只讀）', '');
    for (const m of media) lines.push(`- \`${m.file}\`（頁面裡 \`/_media/${path.basename(m.file)}\`）：${m.name}，${m.duration.toFixed(1)} 秒，${m.width}×${m.height}${m.fps ? `，約 ${m.fps} fps` : ''}`);
    lines.push('', '只用這些素材，不編造數字、引文和事實。', '');
  }
  if (project.inputs.text.trim()) lines.push('## 文案', '', ...project.inputs.text.trim().split('\n').map(l => `> ${l}`), '', footage ? '文案是補充說明或片中可用的文字。' : '這是片子要講的內容：可以拆成多屏、精簡措辭，每個意思都要在畫面上傳達到；不偽造截圖、資料和來源。', '');
  if (project.inputs.note.trim()) lines.push('## 使用者的要求（優先於一切）', '', ...project.inputs.note.trim().split('\n').map(l => `> ${l}`), '');
  lines.push('說明書：`' + path.join(kit, 'HF.md') + '`（片子的格式、OpenTake 的規則和工具）。', '');
  return lines.join('\n');
}

// One turn makes the whole first cut as a HyperFrames project (read → design → write → check → look once); OpenTake
// renders and mixes it afterwards. The slow, costly parts were extra turns, long required reading, forced polish and
// the agent rendering by itself (S先生 2026-10-25).
const MAKE = (_kit: string, styleId: string) => [
  '## 怎麼做（一輪做完，目標 10 分鐘內）',
  '',
  `1. \`film progress read-style\`：讀 HF.md${isFree(styleId) ? '' : '和 STYLE.md'}，以及 HF.md 指定的兩份格式規則。其他文件只在需要時查一小段。`,
  '2. `film progress read-input`：看清輸入。素材用 `film probe`、`film look <素材>`；要卡節奏就自己用 numpy 分析音訊。',
  '3. `film progress plan`：心裡定好分鏡和節拍，執行 `hfx plan <總秒數>` 一次看全切段數量和長度限制；先定每段起止，再寫程式碼，不用寫方案檔案。',
  '4. `film progress code`：寫 index.html、每個畫面變化一個子頁面（compositions/）、聲音片段；素材、字型複製進專案。準備素材就切到 code，不要拖到寫完；響度和真峰值由程式統一處理，不寫調響度指令碼。',
  '5. `film progress self-check`：`hfx check` 直到透過，再 `hfx look`，用 view_image 看一遍接觸表，把使用者的要求一條一條對照。沒做到的改掉，改完再看一次；都做到了就結束，不要為打磨反覆返工。',
  '6. 寫 REPORT.md：使用者的每條要求一行，寫做到了沒有、怎麼做到的。**不要算圖成片**（OpenTake 會算圖）。最後用中文給使用者回兩三句：做了什麼、有什麼已知問題（不講程式碼和路徑）。',
].join('\n');

const TASKS: Record<Phase, (kit: string, styleId: string) => string> = {
  plan: MAKE, // a session saved before the one-turn first cut
  make: MAKE,
  polish: () => [
    '## 這一輪：成片沒過 OpenTake 的檢查',
    '',
    '只改下面寫的問題，改完 `hfx check`、`hfx look` 複查，更新 REPORT.md，不用算圖。最後用中文回一兩句話說改了什麼。',
  ].join('\n'),
  revise: () => [
    '## 這一輪：使用者要改片',
    '',
    '只改使用者要求的地方，其他保持不變：人改過的片段（屬性和位置）保留原樣。改完 `hfx check`、`hfx look` 看一眼，更新 REPORT.md，不用算圖。最後用中文回一兩句話說改了什麼。',
  ].join('\n'),
};

/** A framed region: seconds into the film, the rectangle in the video's own pixels (x, y from the top left). */
export function referenceText(ref: NonNullable<QueuedNote['reference']>) {
  const r = ref.rect;
  return `第 ${ref.time.toFixed(2)} 秒，畫面 (${Math.round(r.x)}, ${Math.round(r.y)}, ${Math.round(r.w)}, ${Math.round(r.h)}) 區域（成片畫素座標：左上角起的 x、y 和寬、高）${ref.image ? '，截圖見附圖' : ''}`;
}

export function turnPrompt(input: {
  phase: Phase; kit: string; styleId: string; brief?: string; resumed?: boolean; review?: string; revision?: { version: number; text: string; reference?: QueuedNote['reference'] };
  queued?: QueuedNote[]; network?: { allowed: boolean; hosts: string[] };
  /** the project's 連線上網 switch is on: commands may reach the network this turn */
  networkOn?: boolean;
  /** the person's own edits of the version being revised (OpenTake keeps them in the next version) */
  personEdits?: string[];
}): string {
  const parts: string[] = [];
  if (input.brief) parts.push(input.brief, '---', '');
  if (input.resumed) parts.push('上一輪被停止了，檔案都還在。先看 `progress.json`、`film.json` 和已有檔案，從停下的地方接著把這一輪做完。', '');
  // 連線上網 is for finding material the person did not give (S先生 2026-10-26)
  if (input.networkOn && !input.network) parts.push('使用者在 OpenTake 裡開啟了連線上網：這一輪命令可以連線上網，不用申請。可以上網找素材補充畫面和聲音（圖片、圖示、音效、配樂、資料等），使用者給的素材優先。只用可以免費使用的素材（公有領域、CC0、CC BY 這類），下載到 `assets/`，在 REPORT.md 裡列出每個素材的來源網址、作者和許可，方便使用者發布時署名。只訪問需要的地址。', '');
  if (input.network) parts.push(input.network.allowed ? `使用者允許連線上網（你申請的：${input.network.hosts.join('、')}）。這一輪命令可以連線上網，只訪問需要的地址，用完就繼續離線做。` : '使用者沒有允許連線上網。用離線辦法完成，做不到的部分簡化或去掉，並在 REPORT.md 裡說明。', '');
  parts.push(TASKS[input.phase](input.kit, input.styleId));
  if (input.review) parts.push('', '### OpenTake 的檢查結果', '', input.review);
  if (input.revision) {
    const ref = input.revision.reference;
    parts.push('', `### 使用者對第 ${input.revision.version} 版的意見`, '', `> ${input.revision.text.split('\n').join('\n> ')}`);
    if (ref) parts.push('', `使用者指的是${referenceText(ref)}。`);
  }
  if (input.personEdits?.length) {
    parts.push('', '### 使用者在編輯頁手動改過的地方', '',
      '使用者看到的成片裡，下面這些已經是改過的樣子。OpenTake 會把它們自動帶到新版，你不用寫程式碼去實現。除非使用者這次的意見就是要改這幾處，否則不要改這些元素的文字，也不要刪它們的 data-hf-id。', '',
      ...input.personEdits);
  }
  if (input.queued?.length) {
    parts.push('', '### 使用者在你工作時說的話（這一輪一併處理；和需求單衝突時以使用者為準）', '');
    for (const note of input.queued) {
      parts.push(`- ${note.text.replace(/\n/g, ' ')}`);
      if (note.reference) parts.push(`  （指的是${referenceText(note.reference)}）`);
    }
  }
  if (!input.networkOn) parts.push('', '需要連線上網就 `film need-network --reason … --host …`，然後立刻結束這一輪。');
  return parts.join('\n');
}
