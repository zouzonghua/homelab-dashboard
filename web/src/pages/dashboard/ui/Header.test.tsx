import { describe, expect, it } from 'vitest'
import { getCategoryLed } from './Header'
import type { CategoryWithServices, ServiceStatusMap } from '../model/dashboard'

const category = (services: CategoryWithServices['list']): CategoryWithServices => ({
  id: 1,
  name: 'Media',
  icon: 'fa-solid fa-film',
  order: 0,
  list: services,
})

const service = (id: number): CategoryWithServices['list'][number] => ({
  id,
  categoryId: 1,
  order: id,
  name: `Service ${id}`,
  logo: '',
  url: `https://service-${id}.example`,
  target: '_blank',
  monitorEnabled: true,
})

const status = (entries: Record<string, 'up' | 'down'>): ServiceStatusMap =>
  Object.fromEntries(
    Object.entries(entries).map(([id, value]) => [
      id,
      {
        name: `Service ${id}`,
        status: value,
        method: 'GET',
        code: value === 'up' ? 200 : 500,
        responseTimeMs: 12,
        checkedAt: new Date().toISOString(),
      },
    ]),
  )

describe('getCategoryLed', () => {
  it('uses green when every monitored service is up', () => {
    const led = getCategoryLed(category([service(1), service(2)]), status({ 1: 'up', 2: 'up' }))

    expect(led.className).toBe('status-online')
  })

  it('uses yellow when only part of a category is down', () => {
    const led = getCategoryLed(category([service(1), service(2)]), status({ 1: 'up', 2: 'down' }))

    expect(led.className).toBe('status-port-warning')
  })

  it('uses red when every monitored service is down', () => {
    const led = getCategoryLed(category([service(1), service(2)]), status({ 1: 'down', 2: 'down' }))

    expect(led.className).toBe('status-port-down')
  })
})
