/**
 * 統一看圖審片：出片的 Agent 不一定能看圖，所以由 OpenTake 來做。
 * 1. ffmpeg 從成片均勻擷取影格、拼接觸表，再跑機檢（長度、畫幅、音軌、黑場、響度）；
 * 2. 起一個只讀、臨時的 Codex，把圖附上，按風格和模板的檢查清單給結構化結論；
 * 3. 結論：透過，或者要改的條目（交給出片會話做第二輪）。
 */
import fs from 'node:fs';
import { normalizeAudio } from './audio.ts';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GeneralProject } from '../../src/general/general-contract.ts';
import { frameSize } from './brief.ts';

const run = promisify(execFile);
export type Verdict = { pass: boolean; summary: string; issues: { time: number | null; problem: string; fix: string }[] };
export type MachineCheck = { ok: boolean; text: string };
export type Frames = { frames: { file: string; time: number }[]; sheet: string; duration: number };

export const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['pass', 'summary', 'issues'],
  properties: {
    pass: { type: 'boolean', description: 'true = 可以交給使用者；false = 有必須改的問題' },
    summary: { type: 'string', description: '一兩句中文結論' },
    issues: {
      type: 'array', description: '要改的條目，最要緊的在前，最多 6 條；透過時可以為空',
      items: { type: 'object', additionalProperties: false, required: ['time', 'problem', 'fix'], properties: {
        time: { type: ['number', 'null'], description: '問題出現在第幾秒，整體問題為 null' },
        problem: { type: 'string' }, fix: { type: 'string', description: '具體怎麼改' },
      } },
    },
  },
} as const;

async function probe(ffprobe: string, file: string) {
  const { stdout } = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', file], { maxBuffer: 4 << 20 });
  const info = JSON.parse(stdout) as { format: { duration: string }; streams: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string }[] };
  return { duration: Number(info.format.duration) || 0, video: info.streams.find(s => s.codec_type === 'video'), audio: info.streams.find(s => s.codec_type === 'audio') };
}

/** Evenly spaced frames (centre of each slice) and a 4-column contact sheet. */
export async function extractFrames(ffmpeg: string, ffprobe: string, video: string, dir: string, count = 12): Promise<Frames> {
  fs.mkdirSync(dir, { recursive: true });
  const { duration } = await probe(ffprobe, video);
  if (!(duration > 0)) throw new Error('成片長度為 0，無法審片');
  const frames: Frames['frames'] = [];
  for (let i = 0; i < count; i++) {
    const time = Math.round(((i + 0.5) * duration / count) * 100) / 100;
    const file = path.join(dir, `f${String(i + 1).padStart(2, '0')}.jpg`);
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(time), '-i', video, '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', file]);
    frames.push({ file, time });
  }
  const sheet = path.join(dir, 'sheet.jpg');
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'f%02d.jpg'), '-vf', `scale=480:-2,tile=4x${Math.ceil(count / 4)}:padding=6:margin=6:color=0x1b1b1b`, '-frames:v', '1', '-q:v', '3', sheet]);
  return { frames, sheet, duration };
}

export async function machineChecks(ffmpeg: string, ffprobe: string, video: string, settings: GeneralProject['settings']): Promise<MachineCheck[]> {
  const checks: MachineCheck[] = [];
  const info = await probe(ffprobe, video);
  const { width, height } = frameSize(settings.aspect);
  checks.push({ ok: info.video?.width === width && info.video?.height === height, text: `畫幅 ${info.video?.width}×${info.video?.height}（要求 ${width}×${height}）` });
  if (settings.length !== 'auto') {
    const ok = Math.abs(info.duration - settings.length) <= settings.length * 0.1 + 0.5;
    checks.push({ ok, text: `長度 ${info.duration.toFixed(1)} 秒（要求 ${settings.length} 秒）` });
  } else checks.push({ ok: info.duration >= 5 && info.duration <= 75, text: `長度 ${info.duration.toFixed(1)} 秒` });
  checks.push({ ok: !!info.audio, text: info.audio ? `有音軌（${info.audio.codec_name}）` : '沒有音軌' });
  if (info.audio) {
    const audio = await normalizeAudio(ffmpeg, video);
    checks.push({ ok: !audio.silent, text: audio.silent ? '音軌是靜音，請補充實際聲音內容' : `聲音已由程式處理：${audio.after.integrated} LUFS / ${audio.after.peak} dBTP（目標 −14 LUFS / ≤ −1 dBTP）` });
  }
  try {
    const { stderr } = await run(ffmpeg, ['-hide_banner', '-nostats', '-i', video, '-vf', 'blackdetect=d=0.4:pix_th=0.08', '-f', 'null', '-'], { maxBuffer: 32 << 20 });
    const blacks = [...stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => `${Number(m[1]).toFixed(1)}–${Number(m[2]).toFixed(1)} 秒`);
    checks.push({ ok: blacks.length === 0, text: blacks.length ? `黑場 ${blacks.join('、')}` : '沒有黑場' });
  } catch { throw new Error('黑場檢查未完成，請檢查媒體工具後重試，無需AI 助理返工'); }
  return checks;
}

export function reviewPrompt(input: { styleId: string; styleName: string; kit: string; project: GeneralProject; frames: Frames; checks: MachineCheck[]; round: number }): string {
  const { project, frames, checks } = input;
  const footage = project.inputs.kind === 'footage';
  return [
    '你是 OpenTake 的審片員。只看附上的畫面給結論，不修改任何檔案，不執行算圖。',
    `第一張圖是全片接觸表（4 列，從左到右、從上到下，依次是 ${frames.frames.map(f => `${f.time}s`).join('、')}），後面是其中幾幀的大圖。`,
    '',
    input.styleId === 'free'
      ? `這條不用風格庫，按使用者的要求判斷。常見失敗在 \`${path.join(input.kit, 'docs', 'DIRECTOR.md')}\` 第 10 節：可以讀，但結論以畫面為準。`
      : `風格：${input.styleId}（${input.styleName}）。風格規則在 \`${path.join(input.kit, 'styles', input.styleId, 'STYLE.md')}\`，是起點；和使用者的補充要求衝突時以使用者為準。常見失敗在 \`${path.join(input.kit, 'docs', 'DIRECTOR.md')}\` 第 10 節：可以讀，但結論以畫面為準。`,
    `要求：${frameSize(project.settings.aspect).width}×${frameSize(project.settings.aspect).height}，${project.settings.length === 'auto' ? '長度按內容' : `${project.settings.length} 秒`}，不配旁白，螢幕文字中文。`,
    footage ? '輸入是使用者自己的影片：畫面應當來自這些素材。' : `輸入是文案，下面每個意思都要在畫面上傳達到：\n> ${project.inputs.text.trim().split('\n').join('\n> ')}`,
    project.inputs.note.trim() ? `使用者補充：${project.inputs.note.trim()}` : '',
    '',
    '機檢結果：', ...checks.map(c => `- ${c.ok ? '✓' : '✗'} ${c.text}`),
    '',
    '逐項檢查：',
    '1. 文字：完整、沒有錯字、沒有出畫或被遮擋、字號夠大、顏色和底色分得開；',
    input.styleId === 'free' ? '2. 要求：使用者補充要求裡的每一條，逐條對照畫面有沒有做到；' : '2. 風格和要求：使用者補充要求裡的每一條有沒有做到；配色、材質、字型、構圖是不是這個風格，而不是普通的幻燈片；',
    '3. 畫面：主體夠大不貼邊，沒有空白幀、穿幫、錯位、半截元素；',
    '4. 節奏和運鏡：鏡頭之間有變化，不是每屏靜止停好幾秒；',
    '5. 內容：' + (footage ? '用了使用者的素材，沒有編造數字或文字；' : '文案的意思都講到了，沒有編造數字；'),
    '6. 版式：各段是不是同一套構圖只換了字？疊加的字和色塊夠不夠大、有沒有衝擊力（像海報，而不是貼在邊上的小條）？',
    '7. 機檢裡打 ✗ 的項。',
    '',
    '不管透過與否，issues 裡都要寫出全片最弱的兩三處，具體到第幾秒、換成什麼樣的構圖或做法，好讓下一輪能真正改好，而不是小修小補。',
    '',
    `只有會讓使用者覺得「這條不能用」的問題才判不透過。${input.round > 1 ? '這是改過一輪之後的複審，小問題寫進 issues 但可以判透過。' : ''}每條 issue 寫清楚第幾秒、什麼問題、具體怎麼改。只輸出 JSON。`,
  ].filter(line => line !== undefined).join('\n');
}

/** The reviewer's last message → verdict. Tolerates extra text around the JSON. */
export function parseVerdict(text: string): Verdict {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('審片結論不是 JSON');
  const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  if (typeof raw.pass !== 'boolean') throw new Error('審片結論缺少 pass');
  const issues = Array.isArray(raw.issues) ? raw.issues.slice(0, 8).map(i => {
    const item = (i || {}) as Record<string, unknown>;
    const time = typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : null;
    return { time, problem: String(item.problem || '').trim(), fix: String(item.fix || '').trim() };
  }).filter(i => i.problem) : [];
  return { pass: raw.pass, summary: String(raw.summary || '').trim() || (raw.pass ? '透過' : '需要修改'), issues };
}

/** One line per issue, for the step detail and for the next round. */
export function verdictText(verdict: Verdict): string {
  if (!verdict.issues.length) return verdict.summary;
  return [verdict.summary, ...verdict.issues.map((i, n) => `${n + 1}. ${i.time !== null ? `${i.time} 秒：` : ''}${i.problem}${i.fix ? `（改法：${i.fix}）` : ''}`)].join('\n');
}
