import type { EditProject, Timeline } from '@/types'
import { timelineContentEnd } from './timeline-math'

/** Display the edited timeline length, rather than the sum of source assets. */
export function formatProjectDuration(timeline: Timeline): string {
  return formatSeconds(timelineContentEnd(timeline))
}

/** 螢幕錄影專案的剪輯在 OpenScreen 檔案裡，時間軸是空的：用檔案的長度（10-27，原來顯示 00:00）。 */
export function formatScreenProjectDuration(project: Pick<EditProject, 'timeline' | 'openScreenDocuments'>): string {
  const doc = Math.max(0, ...(project.openScreenDocuments || []).filter(item => !item.archivedAt).map(item => item.duration || 0))
  return doc > 0 ? formatSeconds(doc) : formatProjectDuration(project.timeline)
}

function formatSeconds(value: number): string {
  const seconds = Math.max(0, Math.round(value))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const remainder = seconds % 60
  const pair = (value: number) => String(value).padStart(2, '0')
  return hours ? `${hours}:${pair(minutes)}:${pair(remainder)}` : `${pair(minutes)}:${pair(remainder)}`
}
