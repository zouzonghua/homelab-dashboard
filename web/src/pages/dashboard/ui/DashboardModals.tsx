import type { AuditLog } from '@/shared/api'
import Modal from '@/shared/ui/Modal'
import type { CategoryWithServices, ServiceFormData } from '../model/dashboard'
import type { AddingService, EditingCategory, EditingService } from '../model/use-dashboard'
import AuditLogPanel from './AuditLogPanel'
import CategoryForm from './CategoryForm'
import ServiceForm from './ServiceForm'

type Props = {
  isAddingCategory: boolean
  isEditMode: boolean
  editingService: EditingService | null
  addingService: AddingService | null
  editingCategory: EditingCategory | null
  auditLogsOpen: boolean
  auditLogs: AuditLog[]
  auditLogsLoading: boolean
  auditLogsError: string | null
  onRefreshAuditLogs: () => void
  onCloseAuditLogs: () => void
  onCloseAddCategory: () => void
  onAddCategory: (category: CategoryWithServices) => void
  onCloseEditService: () => void
  onEditService: (categoryName: string, service: ServiceFormData, serviceIndex: number) => void
  onDeleteService: (categoryName: string, serviceIndex: number) => Promise<boolean>
  onCloseAddService: () => void
  onAddService: (categoryName: string, service: ServiceFormData) => void
  onCloseEditCategory: () => void
  onEditCategory: (categoryIndex: number, category: Pick<CategoryWithServices, 'name' | 'icon'>) => void
  onDeleteCategory: (categoryName: string) => Promise<boolean>
}
export default function DashboardModals(p: Props) {
  return <>
    <Modal open={p.isAddingCategory && p.isEditMode} title="Add category" onClose={p.onCloseAddCategory}>
      <CategoryForm title="Add new category" submitLabel="Add category" onSubmit={(category) => p.onAddCategory({ ...category, list: [] })} onCancel={p.onCloseAddCategory} />
    </Modal>
    <Modal open={Boolean(p.editingService)} title="Edit service" onClose={p.onCloseEditService}>
      {p.editingService && <ServiceForm initialValue={p.editingService.service} submitLabel="Save" onSubmit={(service) => p.onEditService(p.editingService!.categoryName, service, p.editingService!.serviceIndex)} onCancel={p.onCloseEditService}
        onDelete={async () => { if (await p.onDeleteService(p.editingService!.categoryName, p.editingService!.serviceIndex)) p.onCloseEditService() }} />}
    </Modal>
    <Modal open={Boolean(p.addingService)} title="Add service" onClose={p.onCloseAddService}>
      {p.addingService && <ServiceForm submitLabel="Add" onSubmit={(service) => p.onAddService(p.addingService!.categoryName, service)} onCancel={p.onCloseAddService} />}
    </Modal>
    <Modal open={Boolean(p.editingCategory)} title="Edit category" onClose={p.onCloseEditCategory}>
      {p.editingCategory && <CategoryForm title="Edit category" initialValue={p.editingCategory.category} submitLabel="Save" onSubmit={(category) => p.onEditCategory(p.editingCategory!.categoryIndex, category)} onCancel={p.onCloseEditCategory}
        onDelete={async () => { if (await p.onDeleteCategory(p.editingCategory!.category.name)) p.onCloseEditCategory() }} />}
    </Modal>
    <AuditLogPanel open={p.auditLogsOpen} logs={p.auditLogs} loading={p.auditLogsLoading} error={p.auditLogsError} onRefresh={p.onRefreshAuditLogs} onClose={p.onCloseAuditLogs} />
  </>
}
