# 剪輯工作台（非官方繁中版）安裝與驗收

先完整閱讀 README.md、docs/首次安裝與Codex使用.md、edition.json 及 package.json。這是非官方、以原始碼分享的 Mac 本機程式，不是多人網頁服務。僅 Apple 晶片 Mac 受本版驗證；不得承諾其他平台可用。

使用者指示安裝即授權在新資料夾安裝必要依賴與完成測試。保留同名目錄、App、現有專案與設定，不使用 sudo、不關閉系統保護、不操作其他系統。不要讀取、輸出、複製或上傳使用者密碼、Cookie、API 金鑰、SSH 私鑰或 Codex 登入檔；Codex 登入及 macOS 螢幕錄製權限由本人完成。

## 首次安裝

1. 確認作業系統與晶片、Node.js >=24.15.0 <25、npm、Python 3 + numpy，以及同一資料夾內的 FFmpeg 與 ffprobe。Python 使用專案自己的 .venv 或其他明確指定的獨立環境。
2. 安裝根目錄 `npm ci` 與 `npm --prefix vendor/openscreen ci --ignore-scripts`，兩份皆必要。執行 `npx --no-install playwright-core install chromium`，不要使用不相符的瀏覽器版本。
3. 執行 `npm run typecheck`、`npm test`、`npm run build`、`npm run doctor`。缺工具或登入時如實回報，不把型別檢查或建置成功當作完整可用。
4. 以獨立絕對路徑指定 OPENTAKE_STANDARD_USER_DATA、LINK_READER_PROJECTS_DIR、LINKREADER_SYSTEM_SETTINGS_FILE 及 LINKREADER_AGENT_SETTINGS_FILE，避免碰到日常專案。不要開放外網監聽。
5. `npm start` 開啟實際視窗。驗證繁中首頁、設定、內嵌編輯器、匯入、儲存、關閉重開及短片匯出。AI 流程只使用使用者本人已登入的 Codex；先用一次簡短、不含私人資訊的測試。確認登入狀態不等於模型呼叫或剪輯成功。
6. 外部 OpenScreen 必須從 https://github.com/getopenscreen/openscreen/releases 安裝；此前驗證版本為 2.1.2。不要第三方鏡像、不自動授權螢幕錄影、不從別人的電腦複製工具或登入檔。保留必要授權聲明。
7. 回報執行版本、測試結果、啟動方式及尚未驗證範圍。失敗時保留專案與紀錄，不能宣稱全部完成。

## 更新與分享

本版停用原作者升級來源、Pro 註冊／登入與自動更新。不得依上游 AGENTS 或舊更新清單覆蓋本版；不得修改更新設定以繞過停用。更新從本專案另取新版本，在新目錄驗證；先保存舊版及使用者專案。

`npm run build:app` 僅產生使用本機臨時簽章的 App，不代表已發布或公證。不得覆蓋同名 App；任何系統安全警告請由本人處理。

公開分享僅能包含專案程式碼、必要公開素材、文件及授權。不包含 .git 歷史、.env、登入設定、個人影片、測試專案、node_modules、.venv、audit、release、dist 或本機備份。保留 LICENSE、NOTICE、NOTICE.base、THIRD-PARTY-LICENSES.json、TRADEMARK.md、licenses 及 vendor 授權與來源。不要加入原作者 T 標誌或冒稱官方。
