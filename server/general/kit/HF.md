# OpenTake 出片說明書

你替使用者做一條片子。目前目錄是這條片的資料夾（`$CW_WORK`），**只能寫這裡**。片子是一個 HyperFrames 網頁專案，使用者之後在 OpenTake 的編輯頁裡按片段修改它。

## 格式規則（先讀）

- 必讀：`$CW_KIT/hf/skills/hyperframes-core/SKILL.md`（片子格式、時間屬性、確定性規則），以及 `$CW_KIT/hf/skills/hyperframes-studio/SKILL.md` 第 1–3 節（專案結構）。
- 其他細節在 `$CW_KIT/hf/skills/hyperframes-core/references/` 裡，用到時才查對應的一份，不要通讀。

## OpenTake 的規則

- **根頁面是 `index.html`**。根節點（`data-composition-id`）下面只放帶時間的片段：
  - 使用者的影片是 `<video>` 片段，要保留原聲就寫 `data-has-audio="true"`；
  - **每一次畫面變化**（一組字、一張卡、一套色塊編排、一個演示步驟）各是一個畫面片段，做成子頁面（`compositions/*.html`，用 `data-composition-src` 掛在根節點上，標 `data-track-kind="graphics"`）。不要把整片動態效果寫在一個元素或一條時間線裡，使用者要能逐段改；
  - 字幕放在一條 `data-track-kind="captions"` 的字幕軌上；
  - 每個 `<audio>` 標 `data-ot-role`：`voice`（旁白）、`music`（配樂）或 `sfx`（音效）。配樂、音效、旁白分開放，不要混成一個檔案。
- **元素編號**：交付後 OpenTake 會給每個元素加上 `data-hf-id`，使用者在編輯頁改字、挪位置靠它找元素。已有的編號原樣保留，不要刪改；新加的元素不用自己寫編號。
- **素材**：使用者的素材在 `$CW_MEDIA`（只讀）。要用的先複製到 `assets/`，頁面裡用相對路徑引用。沒開連線上網時只用使用者給的素材，不下載別的；開了連線上網，按這一輪任務裡的說明上網找素材。
- **字型**：`film fonts` 列出本機可用的字型檔案，複製到 `fonts/` 再用 `@font-face` 引用；中文字型要覆蓋片中用到的全部字形。
- **動畫**：不用 GSAP，也不找別的動畫庫（GSAP 的許可不允許，出片也不能下載程式碼）。`hyperframes-core` 裡的 GSAP 例子只參考結構，動畫照下面寫：
  - **預設用 CSS 動畫**：`@keyframes` 加 `animation`，寫在子頁面自己的 `<style>` 裡。時間從這個畫面片段的第 0 秒算起；先後用 `animation-delay` 排，多個元素錯開用 `calc(var(--i) * 120ms)`；次數寫有限次，加 `animation-fill-mode: both`。數字滾動可以用 `@property` 註冊一個整數變數做關鍵幀，再用 `counter-reset` 加 `content: counter(…)` 顯示。
  - **要逐影格算的**（數字、畫布、SVG、隨時間變的文字）：在子頁面指令碼里用這個函式。`draw(t)` 收到的 `t` 是這個片段裡的秒數，使用者在編輯頁挪動片段也對得上：
    ```js
    const onFrame = (el, draw) => (window.__hfAnime ??= []).push({ seek(ms) { const host = el.closest('[data-composition-id][data-start]'); draw(ms / 1000 - (host ? +host.dataset.start : 0)); }, pause() {}, play() {} });
    ```
  - 不用 `element.animate()`（它按整片時間走，片段一挪就錯位），不用 `requestAnimationFrame`、定時器、`Date.now()`。
  - 不註冊 `window.__timelines`，根節點寫 `data-no-timeline`。
  - 舊片子裡已有的 `vendor/gsap.min.js` 和用它的頁面可以原樣留著；新寫或重寫的頁面不要用它。
- 頁面不訪問網路。
- **素材分析**：`film probe <檔案>` 看長度、影格率、聲音；`film look <影片>` 擷取影格看內容；要卡節奏就用 python（numpy）分析音訊。

## 工具

| 命令 | 做什麼 |
|---|---|
| `hfx check` | HyperFrames 自帶的檢查，加上上面的結構規則；列出全部片段。不透過就改到透過 |
| `hfx look [影格數]` | 按 OpenTake 匯出的畫法擷取影格，拼成 `look/sheet.jpg`，用 view_image 看 |
| `film progress <步驟> [說明]` | 告訴 OpenTake 進度：`read-style`、`read-input`、`plan`、`code`、`self-check` |

**不要算圖成片**：成片由 OpenTake 算圖、混音。不要安裝任何東西，不要執行 npx 或 hyperframes 命令列，不要開埠。需要連線上網就 `film need-network --reason … --host …`，然後立刻結束這一輪。臨時檔案放 `.tmp/`。

## 交付

`index.html`、`compositions/`、`assets/`、`fonts/`（舊片子還有 `vendor/`），加一段話的 `REPORT.md`。片中不能出現 LemoLab、Claude、Opus 等字樣。風格說明（如果選了風格）在 `$CW_KIT/styles/…/STYLE.md`，它是起點，和使用者的要求衝突時以使用者為準。

## 一次切對、一次處理聲音

先定總長度和每段起止，再寫畫面。HyperFrames 專案先執行 `hfx plan <總秒數>`，工具會列出完整切段規則和時間骨架，不需要先寫 index.html。
- 畫面子頁面至少 `max(2, floor(總秒數 / 5))` 個；每段不超過 `max(8, 總秒數 / 2)` 秒。重疊片段也按自身完整長度計算，不能靠增加字幕或公式疊層繞過長片段限制。
- 15 秒至少 3 段，每段最多 8 秒；通常先按 0–5、5–10、10–15 秒安排三個講述步驟，再按內容調整。每個畫面變化對應根節點下獨立的 `compositions/*.html`，動畫按片段區域性時間編寫。
- 配樂、音效保持分軌，負責內容、音色和相對比例即可。程式用浮點混音，統一到 −14 LUFS，AAC 成片真峰值不超過 −1 dBTP，並寫聲音處理記錄。**不用自己測響度、放大單軌、寫響度修復指令碼或為音量再做一輪**。真正靜音或缺音軌需要補聲音內容；處理工具失敗由程式報錯。
- 開始準備素材和寫子頁面即 `film progress code 正在準備素材和寫畫面`；檢查用 `film progress self-check 正在檢查樣張`。只打點實際工作，不增加稽核或精修輪。
- 工具已提供路徑和能力，只在出錯時查相關的一小段；不通讀算圖原始碼、不反覆輸出完整 HTML。連線上網下載優先用 curl，失敗只重試缺失檔案；字型優先用 `film fonts` 的本地檔案。
