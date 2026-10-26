import { Button } from '@base-ui/react/button'
import { useDashboard } from '../model/use-dashboard'
import { useDashboardLayout } from '../model/use-dashboard-layout'
import DashboardModals from './DashboardModals'
import Header from './Header'
import ShortcutHelp from './ShortcutHelp'
import { useDashboardKeyboard } from '../model/use-dashboard-keyboard'
import ServiceGrid from './ServiceGrid'

export default function DashboardPage() {
  const dashboard = useDashboard()
  const { layout, toggleLayout } = useDashboardLayout()
  const keyboard = useDashboardKeyboard(dashboard, toggleLayout)

  if (dashboard.loading) return (
    <div className="chassis-app">
      <div className="chassis-loader"></div>
    </div>
  )

  if (dashboard.error) return (
    <div className="chassis-app">
      <div className="chassis-error">{dashboard.error}</div>
    </div>
  )

  return (
    <div className="chassis-app">
      <Header
        onOpenHelp={keyboard.openHelp}
        layout={layout}
        onToggleLayout={toggleLayout}
        onExportConfig={dashboard.exportConfig}
        onImportConfig={dashboard.importConfig}
        onOpenAuditLogs={dashboard.openAuditLogs}
        onAddCategory={dashboard.openAddCategory}
        isEditMode={dashboard.isEditMode}
        onToggleEditMode={dashboard.toggleEditMode}
      />

      {dashboard.isEditMode && (
        <div className="chassis-edit-bar">
          <div className="edit-bar-content">
            <div className="edit-bar-label">
              <svg className="edit-indicator" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span >Edit mode enabled</span>
              <span className="edit-hint">Drag icons or logos to reorder, then use the buttons to edit content</span>
            </div>
            <Button
              onClick={dashboard.toggleEditMode}
              className="chassis-button"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      <ServiceGrid
        categories={dashboard.config?.items || []}
        layout={layout}
        columns={dashboard.config?.columns || 4}
        onOpenEditService={dashboard.openEditService}
        onOpenAddService={dashboard.openAddService}
        onDeleteService={dashboard.deleteService}
        onDeleteCategory={dashboard.deleteCategory}
        onOpenEditCategory={dashboard.openEditCategory}
        onReorderCategories={dashboard.reorderCategories}
        onReorderServices={dashboard.reorderServices}
        isEditMode={dashboard.isEditMode}
        serviceStatus={dashboard.serviceStatus}
      />

      <DashboardModals
        isAddingCategory={dashboard.isAddingCategory}
        isEditMode={dashboard.isEditMode}
        editingService={dashboard.editingService}
        addingService={dashboard.addingService}
        editingCategory={dashboard.editingCategory}
        auditLogsOpen={dashboard.auditLogsOpen}
        auditLogs={dashboard.auditLogs}
        auditLogsLoading={dashboard.auditLogsLoading}
        auditLogsError={dashboard.auditLogsError}
        onRefreshAuditLogs={dashboard.refetchAuditLogs}
        onCloseAuditLogs={dashboard.closeAuditLogs}
        onCloseAddCategory={dashboard.closeAddCategory}
        onAddCategory={dashboard.addCategory}
        onCloseEditService={dashboard.closeEditService}
        onEditService={dashboard.editService}
        onDeleteService={dashboard.deleteService}
        onCloseAddService={dashboard.closeAddService}
        onAddService={dashboard.addService}
        onCloseEditCategory={dashboard.closeEditCategory}
        onEditCategory={dashboard.editCategory}
        onDeleteCategory={dashboard.deleteCategory}
      />

      <ShortcutHelp open={keyboard.helpOpen} onClose={keyboard.closeHelp} />


    </div>
  )
}
