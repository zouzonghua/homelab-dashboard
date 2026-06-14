import type {
  AuditLogListResponse,
  Category,
  CategoryCreateRequest,
  CategoryListResponse,
  CategoryUpdateRequest,
  DashboardSettings,
  GetStatusResponse,
  ImportConfigData,
  Service,
  ServiceCreateRequest,
  ServiceListResponse,
  ServiceUpdateRequest,
} from './contract'
import { apiClient } from './http'

type CategoryPayloadSource = CategoryCreateRequest & Partial<Pick<Category, 'id' | 'order'>>
type ServicePayloadSource = Pick<
  ServiceCreateRequest,
  'name' | 'logo' | 'url' | 'target' | 'monitorEnabled' | 'monitorUrl'
> &
  Partial<Pick<Service, 'id' | 'categoryId' | 'order'>> & {
    logoUrl?: string
    serviceUrl?: string
  }
type ServiceTarget = NonNullable<ServiceCreateRequest['target']>
type ImportConfigRequest = ImportConfigData['body']

function toServiceTarget(target: ServicePayloadSource['target']): ServiceTarget {
  return target === '_self' ? '_self' : '_blank'
}

function toServicePayload(service: ServicePayloadSource): ServiceUpdateRequest {
  return {
    categoryId: service.categoryId == null ? undefined : Number(service.categoryId),
    order: service.order,
    name: service.name,
    logo: service.logo ?? service.logoUrl ?? '',
    url: service.url ?? service.serviceUrl ?? '',
    target: service.target == null ? undefined : toServiceTarget(service.target),
    monitorUrl: service.monitorUrl,
    monitorEnabled: service.monitorEnabled,
  }
}

export const dashboardApi = {
  getSettings: () => apiClient.get<DashboardSettings>('/api/v1/dashboard'),
  listCategories: async () => {
    const response = await apiClient.get<CategoryListResponse>('/api/v1/categories')
    return response.data
  },
  listServices: async () => {
    const response = await apiClient.get<ServiceListResponse>('/api/v1/services')
    return response.data
  },
  createCategory: (category: CategoryPayloadSource) =>
    apiClient.post<Category>('/api/v1/categories', {
      name: category.name,
      icon: category.icon ?? 'fa-solid fa-folder',
    } satisfies CategoryCreateRequest),
  updateCategory: (category: CategoryPayloadSource) =>
    apiClient.patch<Category>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`, {
      name: category.name,
      icon: category.icon,
      order: category.order,
    } satisfies CategoryUpdateRequest),
  deleteCategory: (category: CategoryPayloadSource) =>
    apiClient.delete<null>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`),
  createService: (categoryId: Category['id'], service: ServicePayloadSource) =>
    apiClient.post<Service>('/api/v1/services', {
      categoryId: Number(categoryId),
      name: service.name,
      logo: service.logo ?? service.logoUrl ?? '',
      url: service.url ?? service.serviceUrl ?? '',
      target: toServiceTarget(service.target),
      monitorUrl: service.monitorUrl,
      monitorEnabled: service.monitorEnabled,
    } satisfies ServiceCreateRequest),
  updateService: (service: ServicePayloadSource) =>
    apiClient.patch<Service>(`/api/v1/services/${encodeURIComponent(String(service.id))}`, toServicePayload(service)),
  deleteService: (service: ServicePayloadSource) =>
    apiClient.delete<null>(`/api/v1/services/${encodeURIComponent(String(service.id))}`),
  getStatus: () => apiClient.get<GetStatusResponse>('/api/v1/status'),
  listAuditLogs: async () => {
    const response = await apiClient.get<AuditLogListResponse>('/api/v1/audit-logs?limit=50')
    return response.data
  },
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
