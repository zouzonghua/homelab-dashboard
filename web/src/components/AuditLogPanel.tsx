import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { AuditLog } from '../api/contract'

type AuditLogPanelProps = {
  logs: AuditLog[]
  loading: boolean
  error?: string | null
  onRefresh: () => void
  onClose: () => void
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

const AuditLogPanel = ({ logs, loading, error, onRefresh, onClose }: AuditLogPanelProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <section className="chassis-modal audit-log-panel w-full max-w-3xl mx-4" onClick={(event) => event.stopPropagation()}>
        <header className="audit-log-panel__header">
          <div>
            <h2>操作记录</h2>
            <p>最近 50 条配置变更</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="chassis-icon-button audit-log-panel__button" onClick={onRefresh} aria-label="刷新操作记录" title="刷新">
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
            <button className="chassis-icon-button audit-log-panel__button" onClick={onClose} aria-label="关闭操作记录" title="关闭">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </header>

        <div className="audit-log-panel__body">
          {loading && <div className="audit-log-panel__empty">加载中</div>}
          {!loading && error && <div className="audit-log-panel__error">{error}</div>}
          {!loading && !error && logs.length === 0 && <div className="audit-log-panel__empty">暂无操作记录</div>}
          {!loading && !error && logs.length > 0 && (
            <ul className="audit-log-list">
              {logs.map((log) => (
                <li className="audit-log-item" key={log.id}>
                  <div className="audit-log-item__main">
                    <span className="audit-log-item__summary">{log.summary}</span>
                    <span className="audit-log-item__meta">{log.action} · {log.resourceType}{log.resourceId ? ` #${log.resourceId}` : ''}</span>
                  </div>
                  <time className="audit-log-item__time" dateTime={log.createdAt}>{formatTime(log.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

export default AuditLogPanel
