import type {
  Category as UiCategory,
  DashboardConfig as UiDashboardConfig,
  Service as UiService,
  ServiceId as UiServiceId,
  ServiceStatusMap as UiServiceStatusMap,
} from '../types'
import type {
  Category as ApiCategory,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  DashboardConfig as ApiDashboardConfig,
  GetDashboardResponse,
  GetStatusResponse,
  ListCategoriesResponse,
  ListServicesResponse,
  Service as ApiService,
  ServiceCreateRequest,
  ServiceUpdateRequest,
} from './contract'
import { apiClient } from './http'

type DashboardSettings = GetDashboardResponse
type CategoryResource = ListCategoriesResponse[number]
type ServiceResource = ListServicesResponse[number]
type ApiServiceStatusMap = GetStatusResponse
type ServiceStatusMap = UiServiceStatusMap
type ServiceTarget = NonNullable<ServiceCreateRequest['target']>

const sortByOrder = <T extends { sortOrder?: number; order?: number }>(items: T[]) =>
  [...items].sort((left, right) => (left.sortOrder ?? left.order ?? 0) - (right.sortOrder ?? right.order ?? 0))

const toUiService = (service: ServiceResource): UiService => ({
  ...service,
  logo: service.logo,
  url: service.url,
})

const toNumberId = (id: UiServiceId) => Number(id)
const toServiceTarget = (target: UiService['target']): ServiceTarget =>
  target === '_self' ? '_self' : '_blank'

const toServicePayload = (service: UiService): ServiceUpdateRequest => {
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
  listCategories: () => apiClient.get<CategoryResource[]>('/api/v1/categories'),
  listServices: () => apiClient.get<ServiceResource[]>('/api/v1/services'),
  createCategory: (category: UiCategory) =>
    apiClient.post<ApiCategory>('/api/v1/categories', {
      name: category.name,
      icon: category.icon ?? 'fa-solid fa-folder',
    } satisfies CategoryCreateRequest),
  updateCategory: (category: UiCategory) =>
    apiClient.patch<ApiCategory>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`, {
      name: category.name,
      icon: category.icon,
      order: category.order,
    } satisfies CategoryUpdateRequest),
  deleteCategory: (category: UiCategory) =>
    apiClient.delete<null>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`),
  createService: (categoryId: UiServiceId, service: UiService) =>
    apiClient.post<ApiService>('/api/v1/services', {
      categoryId: toNumberId(categoryId),
      name: service.name,
      logo: service.logo ?? service.logoUrl ?? '',
      url: service.url ?? service.serviceUrl ?? '',
      target: toServiceTarget(service.target),
      monitorUrl: service.monitorUrl,
      monitorEnabled: service.monitorEnabled,
    } satisfies ServiceCreateRequest),
  updateService: (service: UiService) =>
    apiClient.patch<ApiService>(`/api/v1/services/${encodeURIComponent(String(service.id))}`, toServicePayload(service)),
  deleteService: (service: UiService) =>
    apiClient.delete<null>(`/api/v1/services/${encodeURIComponent(String(service.id))}`),
  getStatus: () => apiClient.get<ApiServiceStatusMap>('/api/v1/status'),
  exportConfig: () => apiClient.blob({ url: '/api/v1/export', method: 'GET' }),
  importConfig: (config: ApiDashboardConfig) =>
    apiClient.put<ApiDashboardConfig>('/api/v1/import', config),
}

export type SaveConfigOptions =
  | { action: 'createCategory'; category: UiCategory }
  | { action: 'updateCategory'; category: UiCategory }
  | { action: 'deleteCategory'; category: UiCategory }
  | { action: 'reorderCategories'; categories: UiCategory[] }
  | { action: 'createService'; categoryId: UiServiceId; service: UiService }
  | { action: 'updateService'; service: UiService }
  | { action: 'deleteService'; service: UiService }
  | { action: 'reorderServices'; services: UiService[] }

export const fetchDashboardConfig = async (): Promise<UiDashboardConfig> => {
  const [dashboard, categories, services]: [DashboardSettings, CategoryResource[], ServiceResource[]] = await Promise.all([
    dashboardApi.getSettings(),
    dashboardApi.listCategories(),
    dashboardApi.listServices(),
  ])

  return {
    ...dashboard,
    columns: String(dashboard.columns ?? 4),
    items: sortByOrder(categories).map((category): UiCategory => {
      return {
        ...category,
        list: sortByOrder(
          services.filter((service) => service.categoryId === category.id)
        ).map(toUiService),
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
