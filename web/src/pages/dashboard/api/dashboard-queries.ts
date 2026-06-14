import { queryOptions } from '@tanstack/react-query'
import { dashboardApi } from '@/shared/api'
import { fetchDashboardConfig } from '../model/dashboard'

export const dashboardQueries = {
  all: () => ['dashboard'] as const,
  config: () =>
    queryOptions({
      queryKey: [...dashboardQueries.all(), 'config'] as const,
      queryFn: fetchDashboardConfig,
    }),
  status: () =>
    queryOptions({
      queryKey: [...dashboardQueries.all(), 'status'] as const,
      queryFn: dashboardApi.getStatus,
      refetchInterval: 30000,
    }),
  auditLogs: () =>
    queryOptions({
      queryKey: [...dashboardQueries.all(), 'auditLogs'] as const,
      queryFn: dashboardApi.listAuditLogs,
    }),
}
