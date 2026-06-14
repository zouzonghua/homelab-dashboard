import { describe, expect, it } from 'vitest'
import type { Category, DashboardSettings, Service } from '@/shared/api'
import {
  buildDashboardViewModel,
  reorderCategories,
  updateService,
  type CategoryWithServices,
  type DashboardViewModel,
} from './dashboard'

const settings: DashboardSettings = {
  title: 'Homelab',
  columns: 3,
}

const categories: Category[] = [
  { id: 2, name: 'Media', icon: 'fa-film', order: 1 },
  { id: 1, name: 'Core', icon: 'fa-server', order: 0 },
]

const services: Service[] = [
  {
    id: 3,
    categoryId: 2,
    name: 'Jellyfin',
    url: 'https://jellyfin.example',
    target: '_blank',
    monitorEnabled: true,
    order: 1,
  },
  {
    id: 2,
    categoryId: 1,
    name: 'Grafana',
    url: 'https://grafana.example',
    target: '_blank',
    monitorEnabled: true,
    order: 0,
  },
  {
    id: 1,
    categoryId: 2,
    name: 'Plex',
    url: 'https://plex.example',
    target: '_self',
    monitorEnabled: false,
    order: 0,
  },
]

describe('buildDashboardViewModel', () => {
  it('sorts categories and groups sorted services by category id', () => {
    const result = buildDashboardViewModel(settings, categories, services)

    expect(result.columns).toBe('3')
    expect(result.items.map((category) => category.name)).toEqual(['Core', 'Media'])
    expect(result.items[0].list.map((service) => service.name)).toEqual(['Grafana'])
    expect(result.items[1].list.map((service) => service.name)).toEqual(['Plex', 'Jellyfin'])
  })
})

describe('updateService', () => {
  it('updates one service without mutating the input dashboard', () => {
    const dashboard = buildDashboardViewModel(settings, categories, services)
    const originalCategory = dashboard.items[1]
    const originalService = originalCategory.list[0]

    const result = updateService(dashboard, 'Media', 0, {
      name: 'Plex Updated',
      logo: '/plex.svg',
      url: 'https://plex-new.example',
      target: '_blank',
      monitorEnabled: true,
      monitorUrl: 'https://plex-new.example/health',
    })

    expect(result).not.toBe(dashboard)
    expect(result.items[1]).not.toBe(originalCategory)
    expect(result.items[1].list[0]).toEqual({
      ...originalService,
      name: 'Plex Updated',
      logo: '/plex.svg',
      url: 'https://plex-new.example',
      target: '_blank',
      monitorEnabled: true,
      monitorUrl: 'https://plex-new.example/health',
    })
    expect(dashboard.items[1]).toBe(originalCategory)
    expect(dashboard.items[1].list[0]).toBe(originalService)
    expect(originalService.name).toBe('Plex')
  })

  it('updates only the first category when names are duplicated', () => {
    const dashboard = buildDashboardViewModel(settings, categories, services)
    const firstCategory = dashboard.items[1]
    const duplicateCategory: CategoryWithServices = {
      ...firstCategory,
      id: 3,
      list: [{ ...firstCategory.list[0], id: 4, categoryId: 3 }],
    }
    const dashboardWithDuplicate = {
      ...dashboard,
      items: [...dashboard.items, duplicateCategory],
    }

    const result = updateService(dashboardWithDuplicate, 'Media', 0, {
      name: 'Updated',
      logo: '',
      url: 'https://updated.example',
      target: '_blank',
      monitorEnabled: false,
    })

    expect(result.items[1].list[0].name).toBe('Updated')
    expect(result.items[2]).toBe(duplicateCategory)
    expect(result.items[2].list[0].name).toBe('Plex')
  })
})

describe('reorderCategories', () => {
  it('returns the supplied categories as new dashboard items', () => {
    const dashboard: DashboardViewModel = buildDashboardViewModel(settings, categories, services)
    const reordered: CategoryWithServices[] = [dashboard.items[1], dashboard.items[0]]

    const result = reorderCategories(dashboard, reordered)

    expect(result).not.toBe(dashboard)
    expect(result.items).toBe(reordered)
    expect(dashboard.items.map((category) => category.name)).toEqual(['Core', 'Media'])
  })
})
