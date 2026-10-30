# 首次安裝與 Codex 使用

## 安裝前

確認「蘋果選單 → 關於這台 Mac」顯示 Apple 晶片，例如 M1、M2、M3。準備足夠空間安裝 npm 依賴、Chromium 與影片。這是本機工具；GitHub 網頁是原始碼與文件入口，不是線上編輯器。

從官方來源準備 Node.js 24.15.0 或更新的 24.x、Python 3、FFmpeg 與 ffprobe。可使用既有的 Homebrew；若沒有，請先依官方流程安裝，不要由腳本擅自取得系統管理權限。

- Node.js：https://nodejs.org/
- Python：https://www.python.org/downloads/macos/
- FFmpeg：https://ffmpeg.org/download.html
- OpenScreen：https://github.com/getopenscreen/openscreen/releases （已驗證版本為 2.1.2）
- Codex CLI：https://developers.openai.com/codex/cli/

## 自己完成 Codex 登入

若 `codex --version` 可執行，先使用既有版本，不必重複安裝。若未安裝，可依官方文件使用 `npm install -g @openai/codex`。請勿使用 sudo；若 npm 的全域目錄不可寫，請改用使用者管理的 Node 環境。

在終端機自行執行 `codex login`，由你在官方登入頁完成登入。`codex login status` 只用來檢查狀態，不要把完整輸出、`~/.codex`、Cookie 或登入檔傳給別人。本站維護者不需要取得你的 OpenAI 帳號密碼或 API 金鑰。

## 安裝原始碼

將原始碼放進新資料夾。確認 `node --version` 符合 24.x，再依 README 安裝根目錄及 `vendor/openscreen` 兩份鎖定依賴。

Python 請用自己的獨立環境，例如在專案資料夾執行：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install numpy
export LINKREADER_PYTHON="$PWD/.venv/bin/python"
```

`export` 只對目前終端機有效；日後從其他終端機啟動時，也要設定。不要修改系統 Python。

確認 `ffmpeg -version` 與 `ffprobe -version` 均可執行。若沒有放進 PATH，可在啟動前將兩個執行檔所在的同一資料夾設為 `LINKREADER_BIN_DIR`。不要從其他人的私有安裝路徑複製工具或設定。

在原始碼資料夾執行：

```sh
npm ci
npm --prefix vendor/openscreen ci --ignore-scripts
npx --no-install playwright-core install chromium
npm run typecheck
npm test
npm run build
npm run doctor
npm start
```

環境檢查會實際測試 Python、瀏覽器、FFmpeg 與 Codex 登入，不會替你登入。任一步驟失敗，請保留目錄與紀錄，修正後重試，不要跳過錯誤後直接宣稱安裝完成。

## 使用流程

1. 開啟程式，確認標示「剪輯工作台／非官方繁中版」。
2. 到「系統設定 → 已連接的 Agent」，檢查 Codex CLI 路徑、可用模型及推理強度。模型來自自己的帳號，不預設所有人都有相同模型。
3. 若畫面提供連線測試，可送出一次簡短測試。這會使用自己的 Codex 用量；登入狀態檢查本身不是模型呼叫成功的證明。
4. 先新增測試專案，匯入一段不含私人內容的短影片。
5. 螢幕錄影編輯器可先下指令：「請用繁體中文及台灣用語回覆。先說明這段影片適合怎麼剪，暫時不要更動時間軸。」需要 AI 時，相關提示與素材內容依自己的 Codex 設定處理。
6. 再測試一次小修改，例如刪除明確指定的停頓區間。檢查時間軸、儲存、關閉後重開。
7. 先測試短片 MP4 匯出；有外部 OpenScreen 版本或權限錯誤時，保留專案並按提示處理。

「通用剪輯」的 AI 產片另需完整環境檢查通過；瀏覽器單程序測試、伺服器算圖與 Codex 沙盒的執行條件不同，不能只因首頁開得起來就當作全部功能可用。

## 錄影權限與日後啟動

OpenScreen 需要自行從官方來源安裝。macOS 要求螢幕、系統音訊或麥克風權限時，請由本人在系統畫面決定。不要關閉系統安全保護，也不要自動授權。

日後到原始碼資料夾，重新設定有需要的 `LINKREADER_PYTHON`／`LINKREADER_BIN_DIR`，再執行 `npm start`。Node.js 與原始碼目錄需保留。

可選擇 `npm run build:app` 建立使用本機臨時簽章的 App；這不是已公證安裝包。ZIP 會產生在 release，請解壓到新的本機資料夾驗證，勿覆蓋同名 App，勿繞過 macOS 安全警告。不需要為了啟動而修改原本其他系統。

## 尚未驗證的範圍

維護端已完成的測試、限制與日期見 docs/驗證紀錄.md。你的第一次安裝仍需驗證自己的 Codex、外部 OpenScreen、權限及影片匯出。不同帳號、系統版本及工具版本可能有差異。

## Mac App 專屬工具設定

從 Finder 開啟 App 時不一定能取得終端機環境變數。可由自己的 Codex 在本版專屬資料夾 `~/Library/Application Support/剪輯工作台（非官方繁中版）/runtime-tools.json` 設定已驗證工具的完整路徑。僅支援 `LINKREADER_PYTHON`、`LINKREADER_BIN_DIR`（同一資料夾內須有 ffmpeg 與 ffprobe）及選用的 `OPENSCREEN_BIN`。不放入密碼或金鑰，不修改全域 PATH；設定後重新開啟本版 App。此檔案是各自 Mac 的本機設定，不可包含在分享包中。
