import { Button } from '@base-ui/react/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit } from '@fortawesome/free-solid-svg-icons'
import type { ServiceStatus } from '@/shared/api'
import type { DragHandleProps, ServiceViewModel } from '../model/dashboard'

type Props = { service: ServiceViewModel; onOpenEdit?: () => void; onDelete?: () => void; isEditMode?: boolean; dragHandleProps?: DragHandleProps; status?: ServiceStatus }
const escapeSVGText = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[char] ?? char))

export default function ServiceItem({ service, onOpenEdit, isEditMode, dragHandleProps, status }: Props) {
  const fallback = () => {
    const initial = escapeSVGText((service.name || '?').trim().charAt(0).toUpperCase())
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#665c54"/><text x="32" y="43" text-anchor="middle" font-family="monospace" font-size="36" fill="#ebdbb2">${initial}</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }
  const logo = service.logo?.trim() ?? ''
  const automaticIcon = service.id ? `/api/v1/services/${encodeURIComponent(service.id)}/icon` : fallback()
  const image = <img src={!logo || logo.startsWith('assets/icons/') ? automaticIcon : logo} alt={`${service.name} logo`} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = fallback() }} />
  return <Button nativeButton={false} render={<div />} className="drive-bay" onClick={() => window.open(service.url, service.target || '_blank')} aria-label={`Visit ${service.name}`}>
    {service.monitorEnabled && <span className="drive-bay__status" title={status?.status === 'up' ? `UP · ${status.responseTimeMs || 0}ms` : status?.error || 'Checking status'}>
      <span className={`status-port ${!status ? 'status-port-pending' : status.status === 'up' ? 'status-online' : 'status-port-down'}`} aria-label={`${service.name} service status ${status?.status || 'unknown'}`} />
      <span className="drive-bay__latency">{!status ? '--ms' : status.status === 'up' ? `${status.responseTimeMs || 0}ms` : 'DOWN'}</span>
    </span>}
    {isEditMode
      ? <Button nativeButton={false} render={<span />} {...dragHandleProps} className="drive-bay__logo" title="Drag to reorder" onClick={(event) => event.stopPropagation()}>{image}</Button>
      : <span className="drive-bay__logo">{image}</span>}
    <span className="drive-bay__name">{service.name}</span>
    {isEditMode && <Button className="drive-bay__edit" onClick={(event) => { event.stopPropagation(); onOpenEdit?.() }} aria-label={`Edit ${service.name}`}><FontAwesomeIcon icon={faEdit} /></Button>}
  </Button>
}
