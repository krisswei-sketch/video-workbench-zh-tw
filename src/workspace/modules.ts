/** Eight workspace modules in three groups. The home page and the module dock read this one list, in this order. */
export type WorkspaceModuleGroup = 'prepare' | 'make' | 'review'
export type WorkspaceModuleOnly = 'koubo' | 'general'
export type WorkspaceModuleId = 'topics' | 'library' | 'reader' | 'screen' | 'studio' | 'motion' | 'styles' | 'analytics'
export type WorkspaceModule = {
  readonly id: WorkspaceModuleId
  readonly path: string
  readonly name: string
  readonly shortName: string
  readonly description: string
  /** One short line for the home module card. */
  readonly brief: string
  readonly pro?: boolean
  readonly group: WorkspaceModuleGroup
  /** Set only when the module serves one kind of editing. */
  readonly only?: WorkspaceModuleOnly
}

/** The general-editing entrance: /general starts a new project (① 選風格 → ② 放素材); /general/projects/:id is its work page. */
export const GENERAL_EDIT_PATH = '/general'

export const MODULE_GROUPS: readonly { readonly id: WorkspaceModuleGroup; readonly label: string }[] = [
  { id: 'prepare', label: '準備' },
  { id: 'make', label: '製作' },
  { id: 'review', label: '發布與成效檢討' },
]

export const MODULE_ONLY_LABELS: Readonly<Record<WorkspaceModuleOnly, string>> = { koubo: '口播專用', general: '通用專用' }

export const WORKSPACE_MODULES: readonly WorkspaceModule[] = [
  { id: 'topics', pro: true, path: '/pro/topics', name: 'AI智慧選題庫', shortName: '智慧選題', description: '同步飛書選題與分析維度，閱讀研究資料。', brief: '同步選題和研究資料', group: 'prepare' },
  { id: 'reader', pro: true, path: '/pro/reader', name: '連結讀取器', shortName: '連結讀取', description: '從連結獲取正文與影片，整理可用內容。', brief: '從連結取正文和影片', group: 'prepare' },
  { id: 'screen', path: '/screen-motion', name: '螢幕錄影運鏡工作台', shortName: '螢幕錄影運鏡', description: '編輯螢幕錄影、安排鏡頭，製作清晰的操作演示。', brief: '剪螢幕錄影，排鏡頭', group: 'prepare' },
  { id: 'studio', path: '/studio', name: '剪輯台', shortName: '剪輯台', description: '通用剪輯專案都在這裡。', brief: '通用剪輯和全部專案', group: 'make' },
  { id: 'motion', pro: true, path: '/pro/motion', name: '動態效果庫', shortName: '動態效果庫', description: '預覽、比較和挑選動態效果卡。', brief: '預覽、挑選動態效果卡', group: 'make', only: 'koubo' },
  { id: 'styles', path: '/styles', name: '風格庫', shortName: '風格庫', description: '預覽和挑選通用剪輯的影片風格。', brief: '56 種影片風格', group: 'make', only: 'general' },
  { id: 'library', pro: true, path: '/pro/publish', name: '文案發布', shortName: '文案發布', description: '寫稿、稽核、標題簡介和封面，最後一鍵填進各平台發布頁。', brief: '寫好稿子，發出去', group: 'review' },
  { id: 'analytics', pro: true, path: '/pro/analytics', name: '自媒體營運分析臺', shortName: '營運分析', description: '對照內容資料與歷史快照，成效檢討營運表現。', brief: '對照資料做成效檢討', group: 'review' },
]

export function workspaceModuleById(id: WorkspaceModuleId) {
  return WORKSPACE_MODULES.find(m => m.id === id)
}

const within = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`)

export function workspaceModule(pathname: string) {
  if (pathname === '/studio/motion-lab') return workspaceModuleById('motion')
  // 參考資料池 (the former 文案素材庫 page) belongs to 文案發布.
  if (pathname === '/library') return workspaceModuleById('library')
  // General editing is the second entrance of 剪輯台.
  if (within(pathname, GENERAL_EDIT_PATH)) return workspaceModuleById('studio')
  return WORKSPACE_MODULES.find(m => within(pathname, m.path))
}

/** Groups in display order, each with its modules in list order. */
export function groupedModules() {
  return MODULE_GROUPS.map(group => ({ ...group, modules: WORKSPACE_MODULES.filter(m => m.group === group.id) }))
}

/** Arrow-key focus across all module capsules, wrapping at both ends. `current` is -1 when no capsule has focus. */
export function nextModuleIndex(current: number, direction: 'previous' | 'next', total: number) {
  if (total <= 0) return -1
  if (direction === 'previous') return current <= 0 || current >= total ? total - 1 : current - 1
  return current < 0 || current >= total - 1 ? 0 : current + 1
}
