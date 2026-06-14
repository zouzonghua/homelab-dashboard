import type { QueryObserverResult } from '@tanstack/react-query'
import type { AuditLog } from '@/shared/api'
import type { CategoryWithServices, ServiceFormData, ServiceViewModel } from '../model/dashboard'
import type { AddingService, EditingCategory, EditingService } from '../model/use-dashboard'
import AuditLogPanel from './AuditLogPanel'
import CategoryForm from './CategoryForm'
import ServiceForm from './ServiceForm'

type DashboardModalsProps = {
  isAddingCategory: boolean
  isEditMode: boolean
  editingService: EditingService | null
  addingService: AddingService | null
  editingCategory: EditingCategory | null
  auditLogsOpen: boolean
  auditLogs: AuditLog[]
  auditLogsLoading: boolean
  auditLogsError: string | null
  onRefreshAuditLogs: () => Promise<QueryObserverResult<AuditLog[], Error>>
  onCloseAuditLogs: () => void
  onCloseAddCategory: () => void
  onAddCategory: (category: CategoryWithServices) => void
  onCloseEditService: () => void
  onEditService: (categoryName: string, service: ServiceFormData, serviceIndex: number) => void
  onDeleteService: (categoryName: string, serviceIndex: number) => void
  onCloseAddService: () => void
  onAddService: (categoryName: string, service: ServiceFormData) => void
  onCloseEditCategory: () => void
  onEditCategory: (categoryIndex: number, category: Pick<CategoryWithServices, 'name' | 'icon'>) => void
  onDeleteCategory: (categoryName: string) => void
}

export default function DashboardModals({
  isAddingCategory,
  isEditMode,
  editingService,
  addingService,
  editingCategory,
  auditLogsOpen,
  auditLogs,
  auditLogsLoading,
  auditLogsError,
  onRefreshAuditLogs,
  onCloseAuditLogs,
  onCloseAddCategory,
  onAddCategory,
  onCloseEditService,
  onEditService,
  onDeleteService,
  onCloseAddService,
  onAddService,
  onCloseEditCategory,
  onEditCategory,
  onDeleteCategory,
}: DashboardModalsProps) {
  return (
    <>
      {isAddingCategory && isEditMode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onCloseAddCategory}
        >
          <div className="chassis-modal max-w-md w-full mx-4 p-6" onClick={(event) => event.stopPropagation()}>
            <CategoryForm
              title="添加新分类"
              submitLabel="添加分类"
              onSubmit={(category) => onAddCategory({ ...category, list: [] })}
              onCancel={onCloseAddCategory}
            />
          </div>
        </div>
      )}

      {auditLogsOpen && (
        <AuditLogPanel
          logs={auditLogs}
          loading={auditLogsLoading}
          error={auditLogsError}
          onRefresh={onRefreshAuditLogs}
          onClose={onCloseAuditLogs}
        />
      )}

      {editingService && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onCloseEditService}
        >
          <div className="chassis-modal max-w-md w-full mx-4 p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">编辑服务</h3>
            <ServiceForm
              initialValue={editingService.service}
              submitLabel="保存"
              onSubmit={(updatedService) =>
                onEditService(editingService.categoryName, updatedService, editingService.serviceIndex)
              }
              onCancel={onCloseEditService}
              onDelete={() => {
                if (window.confirm(`确定要删除服务 "${editingService.service.name}" 吗？`)) {
                  onDeleteService(editingService.categoryName, editingService.serviceIndex)
                  onCloseEditService()
                }
              }}
            />
          </div>
        </div>
      )}

      {addingService && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onCloseAddService}
        >
          <div className="chassis-modal max-w-md w-full mx-4 p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">添加服务</h3>
            <ServiceForm
              submitLabel="添加"
              onSubmit={(newService) => onAddService(addingService.categoryName, newService)}
              onCancel={onCloseAddService}
            />
          </div>
        </div>
      )}

      {editingCategory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onCloseEditCategory}
        >
          <div className="chassis-modal max-w-md w-full mx-4 p-6" onClick={(event) => event.stopPropagation()}>
            <CategoryForm
              title="编辑分类"
              initialValue={editingCategory.category}
              submitLabel="保存"
              onSubmit={(updatedCategory) => onEditCategory(editingCategory.categoryIndex, updatedCategory)}
              onCancel={onCloseEditCategory}
              onDelete={() => {
                if (window.confirm(`确定要删除分类 "${editingCategory.category.name}" 吗？\n此操作将删除该分类下的所有服务！`)) {
                  onDeleteCategory(editingCategory.category.name)
                  onCloseEditCategory()
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
