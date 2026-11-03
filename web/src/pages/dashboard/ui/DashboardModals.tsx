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
  onEditService: (serviceId: number, service: ServiceFormData) => void
  onDeleteService: (serviceId: number) => Promise<boolean>
  onCloseAddService: () => void
  onAddService: (categoryId: number, service: ServiceFormData) => void
  onCloseEditCategory: () => void
  onEditCategory: (categoryId: number, category: Pick<CategoryWithServices, 'name' | 'icon'>) => void
  onDeleteCategory: (categoryId: number) => Promise<boolean>
}
export default function DashboardModals(p: Props) {
  return <>
    <Modal open={p.isAddingCategory && p.isEditMode} title="Add category" onClose={p.onCloseAddCategory}>
      <CategoryForm title="Add new category" submitLabel="Add category" onSubmit={(category) => p.onAddCategory({ ...category, list: [] })} onCancel={p.onCloseAddCategory} />
    </Modal>
    <Modal open={Boolean(p.editingService)} title="Edit service" onClose={p.onCloseEditService}>
      {p.editingService && <ServiceForm initialValue={p.editingService.service} submitLabel="Save" onSubmit={(service) => p.onEditService(p.editingService!.serviceId, service)} onCancel={p.onCloseEditService}
        onDelete={async () => { if (await p.onDeleteService(p.editingService!.serviceId)) p.onCloseEditService() }} />}
    </Modal>
    <Modal open={Boolean(p.addingService)} title="Add service" onClose={p.onCloseAddService}>
      {p.addingService && <ServiceForm submitLabel="Add" onSubmit={(service) => p.onAddService(p.addingService!.categoryId, service)} onCancel={p.onCloseAddService} />}
    </Modal>
    <Modal open={Boolean(p.editingCategory)} title="Edit category" onClose={p.onCloseEditCategory}>
      {p.editingCategory && <CategoryForm title="Edit category" initialValue={p.editingCategory.category} submitLabel="Save" onSubmit={(category) => p.onEditCategory(p.editingCategory!.categoryId, category)} onCancel={p.onCloseEditCategory}
        onDelete={async () => { if (await p.onDeleteCategory(p.editingCategory!.categoryId)) p.onCloseEditCategory() }} />}
    </Modal>
    <AuditLogPanel open={p.auditLogsOpen} logs={p.auditLogs} loading={p.auditLogsLoading} error={p.auditLogsError} onRefresh={p.onRefreshAuditLogs} onClose={p.onCloseAuditLogs} />
  </>
}
