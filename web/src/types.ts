import type { HTMLAttributes } from 'react'
import type {
  Category,
  CategoryCreateRequest,
  DashboardSettings,
  GetStatusResponse,
  Service,
  ServiceCreateRequest,
  ServiceStatus,
} from './api/contract'

export type ServiceId = Service['id']

export type ServiceFormData = Pick<
  ServiceCreateRequest,
  'name' | 'logo' | 'url' | 'target' | 'monitorEnabled' | 'monitorUrl'
>

type PendingService = ServiceFormData & Partial<Pick<Service, 'id' | 'categoryId' | 'order'>>

export type ServiceViewModel = (Service | PendingService) & {
  logoUrl?: string
  serviceUrl?: string
  sortOrder?: number
}

type PendingCategory = CategoryCreateRequest & Partial<Pick<Category, 'id' | 'order'>>

export type CategoryWithServices = (Category | PendingCategory) & {
  list: ServiceViewModel[]
  sortOrder?: number
}

export type DashboardViewModel = Omit<DashboardSettings, 'columns'> & {
  columns: string
  items: CategoryWithServices[]
}

export type { ServiceStatus }
export type ServiceStatusMap = GetStatusResponse

export type DragHandleProps = HTMLAttributes<HTMLElement> & Record<string, unknown>

export type BivariantCallback<Args extends unknown[]> = {
  bivarianceHack(...args: Args): void
}['bivarianceHack']
