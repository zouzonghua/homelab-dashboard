import type { Category, DashboardConfig, Service, ServiceId, ServiceStatusMap } from '../types'
import { apiClient } from './http'

type DashboardSettings = {
  [key: string]: unknown
  title?: string
  columns?: string | number
}

type CategoryResource = {
  [key: string]: unknown
  id?: ServiceId
  name: string
  icon?: string
  order?: number
  sortOrder?: number
}
type ServiceResource = Service

const sortByOrder = <T extends { sortOrder?: number; order?: number }>(items: T[]) =>
  [...items].sort((left, right) => (left.sortOrder ?? left.order ?? 0) - (right.sortOrder ?? right.order ?? 0))

const toUiService = (service: ServiceResource): Service => ({
  ...service,
  logo: service.logo ?? service.logoUrl,
  logoUrl: service.logoUrl,
  url: service.url ?? service.serviceUrl,
  serviceUrl: service.serviceUrl,
})

const toServicePayload = (service: Service) => {
  const {
    id,
    logo,
    logoUrl,
    url,
    serviceUrl,
    ...rest
  } = service

  return {
    name: rest.name,
    logo: logo ?? logoUrl,
    url: url ?? serviceUrl,
    ...Object.fromEntries(
      Object.entries(rest).filter(([key]) => key !== 'name')
    ),
  }
}

export const dashboardApi = {
  getSettings: () => apiClient.get<DashboardSettings>('/api/v1/dashboard'),
  listCategories: () => apiClient.get<CategoryResource[]>('/api/v1/categories'),
  listServices: () => apiClient.get<ServiceResource[]>('/api/v1/services'),
  createCategory: (category: Category) =>
    apiClient.post<Category>('/api/v1/categories', {
      name: category.name,
      icon: category.icon,
    }),
  updateCategory: (category: Category) =>
    apiClient.patch<Category>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`, {
      name: category.name,
      icon: category.icon,
      order: category.order,
    }),
  deleteCategory: (category: Category) =>
    apiClient.delete<null>(`/api/v1/categories/${encodeURIComponent(String(category.id))}`),
  createService: (categoryId: ServiceId, service: Service) =>
    apiClient.post<Service>('/api/v1/services', {
      categoryId,
      ...toServicePayload(service),
      target: service.target || '_blank',
    }),
  updateService: (service: Service) =>
    apiClient.patch<Service>(`/api/v1/services/${encodeURIComponent(String(service.id))}`, toServicePayload(service)),
  deleteService: (service: Service) =>
    apiClient.delete<null>(`/api/v1/services/${encodeURIComponent(String(service.id))}`),
  getStatus: () => apiClient.get<ServiceStatusMap>('/api/v1/status'),
  exportConfig: () => apiClient.blob({ url: '/api/v1/export', method: 'GET' }),
  importConfig: (config: unknown) =>
    apiClient.put<DashboardConfig>('/api/v1/import', config),
}

export type SaveConfigOptions =
  | { action: 'createCategory'; category: Category }
  | { action: 'updateCategory'; category: Category }
  | { action: 'deleteCategory'; category: Category }
  | { action: 'reorderCategories'; categories: Category[] }
  | { action: 'createService'; categoryId: ServiceId; service: Service }
  | { action: 'updateService'; service: Service }
  | { action: 'deleteService'; service: Service }
  | { action: 'reorderServices'; services: Service[] }

export const fetchDashboardConfig = async (): Promise<DashboardConfig> => {
  const [dashboard, categories, services]: [DashboardSettings, CategoryResource[], ServiceResource[]] = await Promise.all([
    dashboardApi.getSettings(),
    dashboardApi.listCategories(),
    dashboardApi.listServices(),
  ])

  return {
    ...dashboard,
    columns: String(dashboard.columns ?? 4),
    items: sortByOrder(categories).map((category): Category => {
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
  (service.id == null ? undefined : serviceStatus?.[String(service.id)]) ??
  (service.name == null ? undefined : serviceStatus?.[service.name])

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
