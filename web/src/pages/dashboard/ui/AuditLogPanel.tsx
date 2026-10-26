import Modal from '@/shared/ui/Modal'
import { Button } from '@base-ui/react/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { AuditLog } from '@/shared/api'

type AuditLogPanelProps = {
  open: boolean
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

const AuditLogPanel = ({ open, logs, loading, error, onRefresh, onClose }: AuditLogPanelProps) => {
  return (
    <Modal open={open} title="Activity log" onClose={onClose} className="audit-log-panel">
        <header className="audit-log-panel__header">
          <div>
            <p>Last 50 config changes</p>
          </div>
          <div >
            <Button className="chassis-icon-button audit-log-panel__button" onClick={onRefresh} aria-label="Refresh activity log" title="Refresh">
              <FontAwesomeIcon icon={faRotateRight} />
            </Button>
            <Button className="chassis-icon-button audit-log-panel__button" onClick={onClose} aria-label="Close activity log" title="Close">
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        </header>

        <div className="audit-log-panel__body">
          {loading && <div className="audit-log-panel__empty">Loading</div>}
          {!loading && error && <div className="audit-log-panel__error">{error}</div>}
          {!loading && !error && logs.length === 0 && <div className="audit-log-panel__empty">No activity yet</div>}
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
    </Modal>
  )
}

export default AuditLogPanel
