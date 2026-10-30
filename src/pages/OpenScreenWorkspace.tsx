import { useWorkspaceLeaveGuard, WorkspaceLink as Link } from '@/workspace/navigation-guard'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CircleStop, FileVideo2, MonitorUp, RefreshCw, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router'
import type { EditProject, OpenScreenBridgeMessage, OpenScreenHostSession } from '@/types'
import { acquireLock, cancelOpenScreenHostSession, confirmOpenScreenHostCandidate, getOpenScreenHostSession, getProject, launchOpenScreenHost } from '@/studio/api'
import '@/screen-motion/openscreen-workspace.css'
import embeddedGlass from '@/workspace/embedded-glass.css?inline'

function createClientId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function getClientId() {
  // The main editor and OpenScreen are two views of the same personal project,
  // so they must renew one shared browser identity instead of locking each
  // other out.
  const key = 'link-reader-editor-client'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const value = createClientId()
  localStorage.setItem(key, value)
  return value
}

export default function OpenScreenWorkspace() {
  const { id = '' } = useParams()
  const clientId = useMemo(getClientId, [])
  const [project, setProject] = useState<EditProject | null>(null)
  const [writable, setWritable] = useState(false)
  const [status, setStatus] = useState('正在連線 OpenScreen 編輯器…')
  const [hostSession, setHostSession] = useState<OpenScreenHostSession | null>(null)
  const [importingCandidate, setImportingCandidate] = useState('')
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const sync = () => { const doc = iframeRef.current?.contentDocument; if (doc) doc.documentElement.dataset.uiTheme = document.documentElement.dataset.uiTheme || 'original'; };
    window.addEventListener('linkreader-ui-theme', sync);
    window.addEventListener('storage', sync);
    return () => {window.removeEventListener('linkreader-ui-theme', sync);window.removeEventListener('storage', sync);};
  }, [])

  useWorkspaceLeaveGuard(async () => { if (writable && ['未儲存', '正在儲存…'].includes(status)) throw new Error('螢幕錄影專案正在儲存，請儲存完成後再切換模組'); })

  const refreshLock = useCallback(async (takeover = false) => {
    if (!id) return
    try {
      const lock = await acquireLock(id, clientId, takeover)
      setWritable(lock.acquired)
      if (!lock.acquired) setStatus(`唯讀：${lock.lock.clientName} 正在編輯`)
    } catch (reason) {
      setWritable(false)
      setStatus(reason instanceof Error ? reason.message : '無法取得專案編輯鎖')
    }
  }, [clientId, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void Promise.all([getProject(id), refreshLock()])
      .then(([nextProject]) => {
        if (cancelled) return
        setProject(nextProject)
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : String(reason)))
    const heartbeat = window.setInterval(() => void refreshLock(false), 5_000)
    return () => {
      cancelled = true
      window.clearInterval(heartbeat)
    }
  }, [id, refreshLock])

  useEffect(() => {
    const onMessage = (event: MessageEvent<OpenScreenBridgeMessage>) => {
      if (event.origin !== window.location.origin || event.data?.projectId !== id) return
      if (event.data.type === 'ready') setStatus(writable ? 'OpenScreen 全功能模式' : 'OpenScreen 唯讀模式')
      if (event.data.type === 'save-state') {
        setStatus(writable ? String(event.data.payload.label || '已儲存') : 'OpenScreen 唯讀模式')
      }
      if (event.data.type === 'error') setError(String(event.data.payload.message || 'OpenScreen 編輯器發生錯誤'))
      if (event.data.type === 'recording-state' && event.data.payload.session) setHostSession(event.data.payload.session as OpenScreenHostSession)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [id, writable])

  useEffect(() => {
    if (!hostSession || ['completed', 'cancelled', 'failed'].includes(hostSession.status)) return
    const timer = window.setInterval(() => {
      void getOpenScreenHostSession(id, hostSession.id).then(setHostSession).catch(() => undefined)
    }, 2_000)
    return () => window.clearInterval(timer)
  }, [hostSession, id])

  const editorUrl = useMemo(() => {
    const query = new URLSearchParams({
      windowType: 'editor', browser: '1', linkreaderProjectId: id,
      linkreaderClientId: clientId, linkreaderWritable: writable ? '1' : '0',
    })
    return `/openscreen/linkreader.html?${query}`
  }, [clientId, id, writable])

  const launchHud = async () => {
    try {
      setError('')
      const session = await launchOpenScreenHost(id, clientId)
      setHostSession(session)
      setStatus('已開啟 OpenScreen，等待匯入錄製影片')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const importCandidate = async (file: string) => {
    if (!hostSession) return
    try {
      setError('')
      setImportingCandidate(file)
      const result = await confirmOpenScreenHostCandidate(id, hostSession.id, file, clientId)
      setHostSession(result.session)
      setStatus('錄製專案已匯入，正在載入編輯器…')
      iframeRef.current?.contentWindow?.location.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setImportingCandidate('')
    }
  }

  const cancelHudReceive = async () => {
    if (!hostSession) return
    try {
      setHostSession(await cancelOpenScreenHostSession(id, hostSession.id, clientId))
      setStatus('已停止接收原生錄製結果')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const hostStatusLabel = hostSession ? {
    launching: '正在啟動 OpenScreen…',
    waiting: '等待 OpenScreen 開始錄製',
    recording: '宿主 Mac 正在錄製',
    processing: '錄製已停止，正在等待 OpenScreen 寫入專案',
    selecting: `檢測到 ${hostSession.candidates.length || hostSession.candidateFiles.length} 個本次錄製結果`,
    completed: '錄製結果已匯入目前專案',
    cancelled: '已停止接收錄制結果',
    failed: hostSession.error || '原生錄製接收失敗',
  }[hostSession.status] : ''

  return <div className="openscreen-workspace-shell">
    <header className="openscreen-hostbar">
      <div className="openscreen-hostbar__left">
        <Link to="/screen-motion" className="openscreen-icon-button" title="螢幕錄影專案列表"><ArrowLeft size={17} /></Link>
        <strong>{project?.name || '螢幕錄影運鏡'}</strong>
        <span className={writable ? 'openscreen-save openscreen-save--active' : 'openscreen-save'}>
          <ShieldCheck size={14} />{status}
        </span>
      </div>
      <div className="openscreen-hostbar__actions">
        {!writable && <button type="button" onClick={() => void refreshLock(true)}>接管編輯</button>}
        <button type="button" onClick={() => iframeRef.current?.contentWindow?.location.reload()}><RefreshCw size={15} />重新載入</button>
        <button type="button" onClick={() => void launchHud()} disabled={!writable}><MonitorUp size={15} />開始螢幕錄影</button>

      </div>
    </header>
    {error && <div className="openscreen-host-error">{error}<button onClick={() => setError('')}>關閉</button></div>}
    {hostSession && !['completed', 'cancelled'].includes(hostSession.status) && <div className={`openscreen-host-session openscreen-host-session--${hostSession.status}`}>
      <span className="openscreen-host-session__pulse" />
      <div>
        <strong>{hostStatusLabel}</strong>
        <small>錄製物件是目前宿主 Mac；剪輯工作台（非官方繁中版） 只接收本次會話新增的 OpenScreen 專案。</small>
      </div>
      {hostSession.status !== 'failed' && <button type="button" onClick={() => void cancelHudReceive()} disabled={!writable}>
        <CircleStop size={15} />停止接收
      </button>}
    </div>}
    {hostSession?.status === 'selecting' && <div className="openscreen-candidate-panel">
      <div className="openscreen-candidate-panel__summary">
        <FileVideo2 size={16} />
        原生錄製已結束，檢測到 {hostSession.candidateFiles.length} 個候選專案。請選擇正確結果後匯入目前專案。
      </div>
      <div className="openscreen-candidate-panel__files">
        {(hostSession.candidates.length ? hostSession.candidates : hostSession.candidateFiles.map((file) => ({ file, title: file.split('/').pop() || file, duration: 0, sourceCount: 0, sizeBytes: 0, updatedAt: 0 }))).map((candidate) => <button
          type="button"
          key={candidate.file}
          title={candidate.file}
          disabled={!writable || Boolean(importingCandidate)}
          onClick={() => void importCandidate(candidate.file)}
        >
          <span>{candidate.title}</span>
          <small>{candidate.duration > 0 ? `${Math.floor(candidate.duration / 60)}:${String(Math.round(candidate.duration % 60)).padStart(2, '0')} · ` : ''}{candidate.sourceCount || 0} 個源 · {(candidate.sizeBytes / 1024).toFixed(0)} KB</small>
          <b>{importingCandidate === candidate.file ? '正在匯入…' : '確認匯入'}</b>
        </button>)}
      </div>
    </div>}
    <iframe
      key={editorUrl}
      ref={iframeRef}
      onLoad={event => {
        const doc = event.currentTarget.contentDocument
        if (doc) doc.documentElement.dataset.uiTheme = document.documentElement.dataset.uiTheme || 'original'
        if (!doc || doc.getElementById('linkreader-glass-theme')) return
        const style = doc.createElement('style')
        style.id = 'linkreader-glass-theme'
        style.textContent = embeddedGlass
        doc.head.appendChild(style)
      }}
      className="openscreen-microfrontend"
      src={editorUrl}
      title="OpenScreen 全功能編輯器"
      allow="camera; microphone; display-capture; clipboard-read; clipboard-write; fullscreen"
    />
  </div>
}
