import type {
  AuditLogListResponse,
  Category,
  CategoryCreateRequest,
  CategoryListResponse,
  CategoryUpdateRequest,
  DashboardSettings,
  GetStatusResponse,
  ImportConfigRequest,
  Service,
  ServiceCreateRequest,
  ServiceListResponse,
  ServiceUpdateRequest,
} from './contract'
import { apiClient } from './http'

const DEFAULT_CATEGORY_ICON = 'fa-solid fa-folder'

type CategoryWriteSource = CategoryCreateRequest & Partial<Pick<Category, 'id' | 'order'>>
type ServiceWriteSource = Pick<
  ServiceCreateRequest,
  'name' | 'logo' | 'url' | 'target' | 'monitorEnabled' | 'monitorUrl'
> &
  Partial<Pick<Service, 'id' | 'categoryId' | 'order'>>
type ServiceTarget = NonNullable<ServiceCreateRequest['target']>

function resourceUrl(resource: 'categories' | 'services', id: CategoryWriteSource['id'] | ServiceWriteSource['id']): string {
  return `/api/v1/${resource}/${encodeURIComponent(String(id))}`
}

async function listResponseData<T extends { data: unknown }>(url: string): Promise<T['data']> {
  const response = await apiClient.get<T>(url)
  return response.data
}

function toServiceTarget(target: ServiceWriteSource['target']): ServiceTarget {
  return target === '_self' ? '_self' : '_blank'
}

function toCreateCategoryRequest(category: CategoryWriteSource): CategoryCreateRequest {
  return {
    name: category.name,
    icon: category.icon ?? DEFAULT_CATEGORY_ICON,
  }
}

function toUpdateCategoryRequest(category: CategoryWriteSource): CategoryUpdateRequest {
  return {
    name: category.name,
    icon: category.icon,
    order: category.order,
  }
}

function toCreateServiceRequest(categoryId: Category['id'], service: ServiceWriteSource): ServiceCreateRequest {
  return {
    categoryId: Number(categoryId),
    name: service.name,
    logo: service.logo,
    url: service.url,
    target: toServiceTarget(service.target),
    monitorUrl: service.monitorUrl,
    monitorEnabled: service.monitorEnabled,
  }
}

function toUpdateServiceRequest(service: ServiceWriteSource): ServiceUpdateRequest {
  return {
    categoryId: service.categoryId == null ? undefined : Number(service.categoryId),
    order: service.order,
    name: service.name,
    logo: service.logo,
    url: service.url,
    target: service.target == null ? undefined : toServiceTarget(service.target),
    monitorUrl: service.monitorUrl,
    monitorEnabled: service.monitorEnabled,
  }
}

export const dashboardApi = {
  getSettings: () => apiClient.get<DashboardSettings>('/api/v1/dashboard'),
  listCategories: () => listResponseData<CategoryListResponse>('/api/v1/categories'),
  listServices: () => listResponseData<ServiceListResponse>('/api/v1/services'),
  createCategory: (category: CategoryWriteSource) =>
    apiClient.post<Category>('/api/v1/categories', toCreateCategoryRequest(category)),
  updateCategory: (category: CategoryWriteSource) =>
    apiClient.patch<Category>(resourceUrl('categories', category.id), toUpdateCategoryRequest(category)),
  deleteCategory: (category: CategoryWriteSource) => apiClient.delete<null>(resourceUrl('categories', category.id)),
  createService: (categoryId: Category['id'], service: ServiceWriteSource) =>
    apiClient.post<Service>('/api/v1/services', toCreateServiceRequest(categoryId, service)),
  updateService: (service: ServiceWriteSource) =>
    apiClient.patch<Service>(resourceUrl('services', service.id), toUpdateServiceRequest(service)),
  deleteService: (service: ServiceWriteSource) => apiClient.delete<null>(resourceUrl('services', service.id)),
  getStatus: () => apiClient.get<GetStatusResponse>('/api/v1/status'),
  listAuditLogs: () => listResponseData<AuditLogListResponse>('/api/v1/audit-logs?limit=50'),
  exportConfig: () => apiClient.blob({ url: '/api/v1/export', method: 'GET' }),
  importConfig: (config: ImportConfigRequest) => apiClient.put('/api/v1/import', config),
}

export function subscribeStatus(
  onStatus: (status: GetStatusResponse) => void,
  onError?: (error: unknown) => void,
) {
  if (typeof EventSource === 'undefined') {
    return null
  }

  const source = new EventSource('/api/v1/status/stream')
  source.addEventListener('status', (event) => {
    try {
      onStatus(JSON.parse(event.data) as GetStatusResponse)
    } catch (error) {
      onError?.(error)
    }
  })
  source.onerror = (event) => {
    onError?.(event)
  }

  return () => source.close()
}
