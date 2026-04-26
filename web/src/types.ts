import type { HTMLAttributes } from 'react'

export type ServiceId = string | number

export interface Service {
  [key: string]: unknown
  id?: ServiceId
  categoryId?: ServiceId
  name: string
  logo?: string
  logoUrl?: string
  url?: string
  serviceUrl?: string
  target?: string
  order?: number
  sortOrder?: number
  monitorEnabled?: boolean
  monitorUrl?: string
}

export interface Category {
  [key: string]: unknown
  id?: ServiceId
  name: string
  icon?: string
  order?: number
  sortOrder?: number
  list: Service[]
}

export interface DashboardConfig {
  [key: string]: unknown
  title?: string
  columns?: string | number
  items: Category[]
}

export interface ServiceStatus {
  status?: 'up' | 'down' | string
  responseTimeMs?: number
  error?: string
}

export type ServiceStatusMap = Record<string, ServiceStatus>

export type DragHandleProps = HTMLAttributes<HTMLElement> & Record<string, unknown>

export type BivariantCallback<Args extends unknown[]> = {
  bivarianceHack(...args: Args): void
}['bivarianceHack']
