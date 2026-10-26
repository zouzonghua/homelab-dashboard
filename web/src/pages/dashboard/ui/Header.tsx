import { Toolbar } from '@base-ui/react/toolbar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faCheck, faTableColumns, faTableList, faKeyboard } from '@fortawesome/free-solid-svg-icons'
import ThemeToggle from '@/shared/ui/ThemeToggle'
import ConfigTools from './ConfigTools'
import type { DashboardLayout } from '../model/use-dashboard-layout'

type HeaderProps = {
  onOpenHelp: () => void
  layout: DashboardLayout
  onToggleLayout: () => void
  onExportConfig: () => void
  onImportConfig: (file: File) => void
  onOpenAuditLogs: () => void
  onAddCategory: () => void
  isEditMode: boolean
  onToggleEditMode: () => void
}

export default function Header(props: HeaderProps) {
  return <header className="chassis-header">
    <Toolbar.Root className="toolbar" aria-label="Dashboard tools">
      <ConfigTools onExport={props.onExportConfig} onImport={props.onImportConfig} onOpenAuditLogs={props.onOpenAuditLogs} />
      <Toolbar.Button className="chassis-icon-button" onClick={props.onToggleEditMode} aria-label={props.isEditMode ? 'Exit edit mode' : 'Enter edit mode'} title="Edit mode (E)">
        <FontAwesomeIcon icon={props.isEditMode ? faCheck : faEdit} />
      </Toolbar.Button>
      {props.isEditMode && <Toolbar.Button className="chassis-icon-button" onClick={props.onAddCategory} aria-label="Add new category" title="Add category (A)"><FontAwesomeIcon icon={faPlus} /></Toolbar.Button>}
      <Toolbar.Button className="chassis-icon-button layout-toggle" onClick={props.onToggleLayout} aria-label={`Switch to ${props.layout === 'vertical' ? 'horizontal' : 'vertical'} layout`} title="Switch layout (V)">
        <FontAwesomeIcon icon={props.layout === 'vertical' ? faTableList : faTableColumns} />
      </Toolbar.Button>
      <ThemeToggle />
      <Toolbar.Button className="chassis-icon-button" onClick={props.onOpenHelp} aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)"><FontAwesomeIcon icon={faKeyboard} /></Toolbar.Button>
    </Toolbar.Root>
  </header>
}
