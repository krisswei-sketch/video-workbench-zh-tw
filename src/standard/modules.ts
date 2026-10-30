export const modules = [
  {
    "id": "general",
    "path": "/general",
    "name": "通用剪輯",
    "brief": "從影片或文案開始，挑風格做一條片",
    "pro": false,
    "poster": "/home/general-poster.jpg",
    "video": "/home/general-loop.mp4"
  },
  {
    "id": "screen",
    "path": "/screen-motion",
    "name": "螢幕錄影運鏡",
    "brief": "錄下操作，安排鏡頭，匯出清晰演示",
    "pro": false,
    "poster": "/home/module-screen-poster.jpg",
    "video": "/home/module-screen-loop.mp4"
  },
  {
    "id": "koubo",
    "description": "匯入口播原始影片，智慧粗剪去掉口誤、停頓和重複。動態效果卡、字幕、配樂一起排好，每一步都能精細調整。",
    "path": "/pro/koubo",
    "name": "口播剪輯",
    "brief": "把口播素材剪成節奏清楚的成片",
    "pro": true,
    "poster": "/home/koubo-poster.jpg",
    "video": "/home/koubo-loop.mp4"
  },
  {
    "id": "motion",
    "description": "小卡、半卡、全卡三種講解動態效果卡，按你說的內容自動挑選、排進時間軸，一鍵換風格。",
    "path": "/pro/motion",
    "name": "動態效果庫",
    "brief": "挑選和編排講解動態效果卡",
    "pro": true,
    "poster": "/home/module-motion-poster.jpg",
    "video": "/home/module-motion-loop.mp4"
  },
  {
    "id": "reader",
    "description": "貼一個抖音、小紅書、公眾號或網頁連結，取回正文、影片和逐字稿，讀完直接存起來寫稿用。",
    "path": "/pro/reader",
    "name": "連結讀取",
    "brief": "從連結整理正文和影片素材",
    "pro": true,
    "poster": "/home/module-reader-poster.jpg",
    "video": "/home/module-reader-loop.mp4"
  },
  {
    "id": "publish",
    "description": "寫稿、自查、稽核、標題簡介和封面一條龍，最後一鍵填進抖音、小紅書、B 站的發布頁。",
    "path": "/pro/publish",
    "name": "文案發布",
    "brief": "寫稿、稽核並準備平台發布素材",
    "pro": true,
    "poster": "/home/publish-poster.jpg",
    "video": "/home/publish-loop.mp4"
  },
  {
    "id": "analytics",
    "description": "多個平台的資料對齊到一起，逐篇診斷；發布後 6 小時盯著，提前提示可能的爆款和限流。",
    "path": "/pro/analytics",
    "name": "營運分析",
    "brief": "對照內容資料成效檢討表現",
    "pro": true,
    "poster": "/home/module-analytics-poster.jpg",
    "video": "/home/module-analytics-loop.mp4"
  },
  {
    "id": "topics",
    "description": "設好研究方向，AI 每天幫你找題、核實原文、打分排序。",
    "path": "/pro/topics",
    "name": "智慧選題",
    "brief": "整理研究資料，尋找內容方向",
    "pro": true,
    "poster": "/home/module-topics-poster.jpg",
    "video": "/home/module-topics-loop.mp4"
  }
] as const;
