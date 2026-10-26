import { Input } from '@base-ui/react/input'
import { useRef, type ChangeEvent } from 'react'
import { Menu } from '@base-ui/react/menu'
import { Toolbar } from '@base-ui/react/toolbar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTools } from '@fortawesome/free-solid-svg-icons'

type ConfigToolsProps = { onExport: () => void; onImport: (file: File) => void; onOpenAuditLogs: () => void }

export default function ConfigTools({ onExport, onImport, onOpenAuditLogs }: ConfigToolsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) { onImport(file); event.target.value = '' }
  }
  return <>
    <Menu.Root>
      <Menu.Trigger render={<Toolbar.Button className="chassis-icon-button" />} aria-label="Config tools" title="Config tools">
        <FontAwesomeIcon icon={faTools} />
      </Menu.Trigger>
      <Menu.Portal><Menu.Positioner className="popup-positioner" align="start" sideOffset={4}>
        <Menu.Popup className="popup" aria-label="Config tools">
          <Menu.Item className="popup-item" onClick={onExport}>Export config</Menu.Item>
          <Menu.Item className="popup-item" onClick={() => fileInputRef.current?.click()}>Import config</Menu.Item>
          <Menu.Item className="popup-item" onClick={onOpenAuditLogs}>Activity log</Menu.Item>
        </Menu.Popup>
      </Menu.Positioner></Menu.Portal>
    </Menu.Root>
    <Input id="dashboard-config-import" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" hidden />
  </>
}
