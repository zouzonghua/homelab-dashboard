import type { HTMLAttributes } from 'react'
import type {
  Category,
  CategoryCreateRequest,
  DashboardSettings,
  GetStatusResponse,
  Service,
  ServiceCreateRequest,
} from '@/shared/api'
import { dashboardApi } from '@/shared/api'

export type ServiceFormData = Pick<
  ServiceCreateRequest,
  'name' | 'logo' | 'url' | 'target' | 'monitorEnabled' | 'monitorUrl'
>

type PendingService = ServiceFormData & Partial<Pick<Service, 'id' | 'categoryId' | 'order'>>

export type ServiceViewModel = (Service | PendingService) & {
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

export type ServiceStatusMap = GetStatusResponse

export type DragHandleProps = HTMLAttributes<HTMLElement> & Record<string, unknown>

export type BivariantCallback<Args extends unknown[]> = {
  bivarianceHack(...args: Args): void
}['bivarianceHack']

export type SaveConfigOptions =
  | { action: 'createCategory'; category: CategoryWithServices }
  | { action: 'updateCategory'; category: CategoryWithServices }
  | { action: 'deleteCategory'; category: CategoryWithServices }
  | { action: 'reorderCategories'; categories: CategoryWithServices[] }
  | { action: 'createService'; categoryId: Category['id']; service: ServiceViewModel }
  | { action: 'updateService'; service: ServiceViewModel }
  | { action: 'deleteService'; service: ServiceViewModel }
  | { action: 'reorderServices'; services: ServiceViewModel[] }

function sortByOrder<T extends { sortOrder?: number; order?: number }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => (left.sortOrder ?? left.order ?? 0) - (right.sortOrder ?? right.order ?? 0),
  )
}

export function buildDashboardViewModel(
  settings: DashboardSettings,
  categories: Category[],
  services: Service[],
): DashboardViewModel {
  return {
    ...settings,
    columns: String(settings.columns ?? 4),
    items: sortByOrder(categories).map((category) => ({
      ...category,
      list: sortByOrder(services.filter((service) => service.categoryId === category.id)),
    })),
  }
}

export async function fetchDashboardConfig(): Promise<DashboardViewModel> {
  const [settings, categories, services] = await Promise.all([
    dashboardApi.getSettings(),
    dashboardApi.listCategories(),
    dashboardApi.listServices(),
  ])

  return buildDashboardViewModel(settings, categories, services)
}

export async function saveDashboardConfig<T>(nextConfig: T, options: SaveConfigOptions): Promise<T> {
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
      await Promise.all(
        options.categories.map((category, index) => dashboardApi.updateCategory({ ...category, order: index })),
      )
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
      await Promise.all(
        options.services.map((service, index) => dashboardApi.updateService({ ...service, order: index })),
      )
      return nextConfig
  }
}

export function getServiceStatus(
  serviceStatus: ServiceStatusMap | null | undefined,
  service: { id?: string | number; name?: string },
) {
  return service.id == null ? undefined : serviceStatus?.[String(service.id)]
}

export function updateService(
  dashboard: DashboardViewModel,
  categoryName: string,
  serviceIndex: number,
  service: ServiceFormData,
): DashboardViewModel {
  const categoryIndex = dashboard.items.findIndex((category) => category.name === categoryName)

  return {
    ...dashboard,
    items: dashboard.items.map((category, index) => {
      if (index !== categoryIndex) {
        return category
      }

      return {
        ...category,
        list: category.list.map((currentService, index) =>
          index === serviceIndex ? { ...currentService, ...service } : currentService,
        ),
      }
    }),
  }
}

export function reorderCategories(
  dashboard: DashboardViewModel,
  categories: CategoryWithServices[],
): DashboardViewModel {
  return {
    ...dashboard,
    items: categories,
  }
}
