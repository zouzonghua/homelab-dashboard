import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useDashboard } from '../model/use-dashboard'
import DashboardModals from './DashboardModals'
import Header from './Header'
import ServiceGrid from './ServiceGrid'

export default function DashboardPage() {
  const dashboard = useDashboard()

  if (dashboard.loading) return (
    <div className="chassis-app flex items-center justify-center h-full">
      <div className="chassis-loader"></div>
    </div>
  )

  if (dashboard.error) return (
    <div className="chassis-app flex items-center justify-center h-full">
      <div className="chassis-error">{dashboard.error}</div>
    </div>
  )

  return (
    <div className="chassis-app overflow-auto h-full w-screen flex flex-col items-center xl:flex-col">
      <Header
        title={dashboard.config?.title || 'HomeLab Dashboard'}
        onExportConfig={dashboard.exportConfig}
        onImportConfig={dashboard.importConfig}
        onOpenAuditLogs={dashboard.openAuditLogs}
        onAddCategory={dashboard.openAddCategory}
        isEditMode={dashboard.isEditMode}
        onToggleEditMode={dashboard.toggleEditMode}
        categories={dashboard.config?.items || []}
        serviceStatus={dashboard.serviceStatus}
      />

      {dashboard.isEditMode && (
        <div className="chassis-edit-bar w-full py-3 px-4">
          <div className="container max-w-screen-xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span className="font-medium">编辑模式已启用</span>
              <span className="text-blue-100 text-sm hidden md:inline">拖拽图标/Logo可调整顺序，点击按钮编辑内容</span>
            </div>
            <button
              onClick={dashboard.toggleEditMode}
              className="chassis-button px-4 py-1.5 transition-colors font-medium text-sm"
            >
              完成
            </button>
          </div>
        </div>
      )}

      <ServiceGrid
        categories={dashboard.config?.items || []}
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

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  )
}
