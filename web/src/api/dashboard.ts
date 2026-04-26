import type {
  CategoryWithServices,
  DashboardViewModel,
  ServiceId,
  ServiceViewModel,
  ServiceStatusMap,
} from '../types'
import type {
  Category,
  CategoryCreateRequest,
  CategoryListResponse,
  CategoryUpdateRequest,
  GetDashboardResponse,
  GetStatusResponse,
  ImportConfigData,
  AuditLogListResponse,
  Service,
  ServiceListResponse,
  ServiceCreateRequest,
  ServiceUpdateRequest,
} from './contract'
import { apiClient } from './http'

type DashboardSettings = GetDashboardResponse
type CategoryResource = CategoryListResponse['data'][number]
type ServiceResource = ServiceListResponse['data'][number]
type ServiceTarget = NonNullable<ServiceCreateRequest['target']>
type ImportConfigRequest = ImportConfigData['body']

const sortByOrder = <T extends { sortOrder?: number; order?: number }>(items: T[]) =>
  [...items].sort((left, right) => (left.sortOrder ?? left.order ?? 0) - (right.sortOrder ?? right.order ?? 0))

const toServiceViewModel = (service: ServiceResource): ServiceViewModel => ({
  ...service,
  logo: service.logo,
  url: service.url,
})

const toNumberId = (id: ServiceId) => Number(id)
const toServiceTarget = (target: ServiceViewModel['target']): ServiceTarget =>
  target === '_self' ? '_self' : '_blank'

const toServicePayload = (service: ServiceViewModel): ServiceUpdateRequest => {
  return {
    categoryId: service.categoryId == null ? undefined : toNumberId(service.categoryId),
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
  createCategory: (category: CategoryWithServices) =>
    apiClient.post<Category>('/api/v1/categories', {
      name: category.name,
      icon: category.icon ?? 'fa-solid fa-folder',
    } satisfies CategoryCreateRequest),
  updateCategory: (category: CategoryWithServices) =>
    apiClient.patch<Category>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`, {
      name: category.name,
      icon: category.icon,
      order: category.order,
    } satisfies CategoryUpdateRequest),
  deleteCategory: (category: CategoryWithServices) =>
    apiClient.delete<null>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`),
  createService: (categoryId: ServiceId, service: ServiceViewModel) =>
    apiClient.post<Service>('/api/v1/services', {
      categoryId: toNumberId(categoryId),
      name: service.name,
      logo: service.logo ?? service.logoUrl ?? '',
      url: service.url ?? service.serviceUrl ?? '',
      target: toServiceTarget(service.target),
      monitorUrl: service.monitorUrl,
      monitorEnabled: service.monitorEnabled,
    } satisfies ServiceCreateRequest),
  updateService: (service: ServiceViewModel) =>
    apiClient.patch<Service>(`/api/v1/services/${encodeURIComponent(String(service.id))}`, toServicePayload(service)),
  deleteService: (service: ServiceViewModel) =>
    apiClient.delete<null>(`/api/v1/services/${encodeURIComponent(String(service.id))}`),
  getStatus: () => apiClient.get<GetStatusResponse>('/api/v1/status'),
  listAuditLogs: async () => {
    const response = await apiClient.get<AuditLogListResponse>('/api/v1/audit-logs?limit=50')
    return response.data
  },
  exportConfig: () => apiClient.blob({ url: '/api/v1/export', method: 'GET' }),
  importConfig: (config: ImportConfigRequest) =>
    apiClient.put('/api/v1/import', config),
}

export type SaveConfigOptions =
  | { action: 'createCategory'; category: CategoryWithServices }
  | { action: 'updateCategory'; category: CategoryWithServices }
  | { action: 'deleteCategory'; category: CategoryWithServices }
  | { action: 'reorderCategories'; categories: CategoryWithServices[] }
  | { action: 'createService'; categoryId: ServiceId; service: ServiceViewModel }
  | { action: 'updateService'; service: ServiceViewModel }
  | { action: 'deleteService'; service: ServiceViewModel }
  | { action: 'reorderServices'; services: ServiceViewModel[] }

export const fetchDashboardConfig = async (): Promise<DashboardViewModel> => {
  const [dashboard, categories, services]: [DashboardSettings, CategoryResource[], ServiceResource[]] = await Promise.all([
    dashboardApi.getSettings(),
    dashboardApi.listCategories(),
    dashboardApi.listServices(),
  ])

  return {
    ...dashboard,
    columns: String(dashboard.columns ?? 4),
    items: sortByOrder(categories).map((category): CategoryWithServices => {
      return {
        ...category,
        list: sortByOrder(
          services.filter((service) => service.categoryId === category.id)
        ).map(toServiceViewModel),
      }
    }),
  }
}

export const saveDashboardConfig = async <T>(nextConfig: T, options: SaveConfigOptions) => {
  switch (options.action) {
    case 'createCategory':
      await dashboardApi.createCategory(options.category)
      return nextConfig
    case 'updateCategory':
      await dashboardApi.updateCategory(options.category)
      return nextConfig
    case 'deleteCategory':
      await dashboardApi.deleteCategory(options.category)
      return nextConfig
    case 'reorderCategories':
      await Promise.all(options.categories.map((category, index) =>
        dashboardApi.updateCategory({ ...category, order: index })
      ))
      return nextConfig
    case 'createService':
      await dashboardApi.createService(options.categoryId, options.service)
      return nextConfig
    case 'updateService':
      await dashboardApi.updateService(options.service)
      return nextConfig
    case 'deleteService':
      await dashboardApi.deleteService(options.service)
      return nextConfig
    case 'reorderServices':
      await Promise.all(options.services.map((service, index) =>
        dashboardApi.updateService({ ...service, order: index })
      ))
      return nextConfig
  }
}

export const getServiceStatus = (
  serviceStatus: ServiceStatusMap | null | undefined,
  service: { id?: string | number; name?: string }
) =>
  service.id == null ? undefined : serviceStatus?.[String(service.id)]

export const subscribeStatus = (
  onStatus: (status: ServiceStatusMap) => void,
  onError?: (error: unknown) => void
) => {
  if (typeof EventSource === 'undefined') {
    return null
  }

  const source = new EventSource('/api/v1/status/stream')
  source.addEventListener('status', (event) => {
    try {
      onStatus(JSON.parse(event.data) as ServiceStatusMap)
    } catch (error) {
      onError?.(error)
    }
  })
  source.onerror = (event) => {
    onError?.(event)
  }

  return () => source.close()
}
