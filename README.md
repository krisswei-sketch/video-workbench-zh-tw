# 剪輯工作台（非官方繁中版）

以繁體中文及台灣用語使用 OpenTake Standard 的開源剪輯功能。每位使用者在自己的 Apple 晶片 Mac 上，使用自己的 Codex 與專案資料。

**本儲存庫提供可安裝的原始碼，不是多人線上剪輯網站。** GitHub 頁面不會直接執行影片編輯器；目前也沒有手機可直接開啟的公開試用網址。

修改版：`2026.10.30-tw2`。基礎程式版本：`1.0.1`。這是非官方社群修改版，並非原作者、OpenAI 或 OpenScreen 官方產品。

## 用自己的 Codex 安裝

請在自己的 Mac 使用 Codex 桌面程式或 CLI，貼上：

> 請從 https://github.com/krisswei-sketch/video-workbench-zh-tw 安裝「剪輯工作台（非官方繁中版）」。先讀 README.md、AGENTS.md 和 docs/首次安裝與Codex使用.md，確認是 Apple 晶片 Mac，在新資料夾檢查依賴並完成安裝。保留既有 App、設定和影片。不要讀取或上傳我的登入檔、Cookie、金鑰或私人影片。Codex 登入、系統安全提示與螢幕錄影權限由我自行處理。請先用獨立合成測試專案驗證，再告訴我如何啟動。

Codex 雲端工作環境不能直接安裝 Mac 桌面程式；安裝步驟要在自己的 Mac 執行。模型與可用額度依各自的帳號為準，沒有共用維護者登入。

## 必要工具與第一次啟動

| 工具 | 用途 |
|---|---|
| Apple 晶片 Mac | 本版已驗證的本機執行平台；Intel Mac、Windows、Linux 尚未驗收 |
| Node.js 24.15.0 或更新的 24.x，含 npm | 安裝、建置與執行原始碼 |
| Python 3＋numpy | 影片處理；使用獨立虛擬環境 |
| FFmpeg＋ffprobe | 影片分析與處理，兩個執行檔都必須可用 |
| Playwright 鎖定版本的 Chromium | 影片算圖 |
| Codex CLI | 使用者自行安裝與登入 |
| 官方 OpenScreen 2.1.2 | 適用流程的原生影片匯出與錄影，需另行安裝 |

先完成上述工具與登入，再於新資料夾執行：

```sh
git clone https://github.com/krisswei-sketch/video-workbench-zh-tw.git
cd video-workbench-zh-tw
npm ci
npm --prefix vendor/openscreen ci --ignore-scripts
npx --no-install playwright-core install chromium
npm run typecheck
npm test
npm run build
npm run doctor
npm start
```

Python 虛擬環境、FFmpeg 路徑與從 Finder 開啟 App 的專屬工具設定，詳見 [首次安裝與 Codex 使用](docs/首次安裝與Codex使用.md)。工具不齊全時，先保留錯誤並完成設定；不要把首頁可開啟當成所有功能都可用。

`npm run build:app` 可建立使用本機臨時簽章的 App ZIP。這不等於 Apple Developer ID 簽章或 Apple 公證；本儲存庫目前未提供已公證的安裝包。遇到系統安全警告時停止並由本人處理，不要關閉系統保護或移除隔離屬性。

## 已驗證與待驗證範圍

維護端已完成 Mac App 安裝與啟動、27 項桌面回歸測試，以及透過已安裝 App 的本機 API 匯入合成影片、裁短、儲存讀回與原生 MP4 匯出。測試成品為 320×180、1.5 秒、H.264＋AAC。先前也已檢查 7 種手機及桌面模擬尺寸。

**GUI 點擊流程與手機實機操作尚未完成驗收。** 模擬尺寸不代表手機實際可連線。手機使用方案與限制見 [手機與電腦介面](docs/手機與電腦介面.md)、[手機試用架構規劃](docs/手機試用架構規劃.md)；不得直接將本機檔案服務開放到公開網路。

主介面、自己的說明與主要訊息已做台灣繁中調整。程式識別字、指令、格式代碼、原始法律文字、其他語言包及第三方即時回傳仍可能使用其他語言；Codex 回覆也依各自設定而定。詳細紀錄見 [驗證紀錄](docs/驗證紀錄.md)。

## 資料與更新

本版設定資料夾與原版分開，影片專案預設放在 `~/Movies/Video Workbench TW Projects`。不要分享 Codex 登入檔、`runtime-tools.json`、個人設定、影片或專案。使用 Codex 時，提示與相關內容依自己的服務設定處理；不是所有操作都離線。

本版停用原作者升級服務、Pro 註冊／登入及自動更新。更新時另取本專案新版本，在新資料夾驗證並保留舊版及個人專案，不將上游更新包直接覆蓋進本版。

## 來源與授權

修改自 [OpenTake Standard](https://github.com/saf1102/opentake-standard)，基準提交 `a93cb0c6c2c0adc5d2a521fab38ab44912df5934`，未包含原作者 Pro 功能。

保留 [AGPL-3.0-only](LICENSE)、[原始與第三方聲明](NOTICE)、[商標說明](TRADEMARK.md)、[非官方修改版聲明](COMMUNITY-NOTICE.md)、`NOTICE.base`、`THIRD-PARTY-LICENSES.json`、`licenses/` 及 vendor 授權。本版名稱與圖示已區分；上游示範素材的來源與必要標示保留。原始法律文字保留原文。修改與分享時請依各自授權提供對應原始碼及必要聲明。

公開內容與排除項目見 [公開發布範圍](docs/公開發布範圍.md)。
