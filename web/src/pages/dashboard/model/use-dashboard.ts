import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notifications'
import { useConfirm } from '@/shared/ui/UIProvider'
import { subscribeStatus, type MasonryOrder } from '@/shared/api'
import { dashboardQueries } from '../api/dashboard-queries'
import {
  exportConfig as exportConfigToFile,
  importConfig as importConfigFromFile,
} from '../lib/config-file'
import type {
  CategoryWithServices,
  DashboardViewModel,
  SaveConfigOptions,
  ServiceFormData,
  ServiceStatusMap,
  ServiceViewModel,
} from './dashboard'
import { saveDashboardConfig } from './dashboard'

export type EditingService = { service: ServiceViewModel; serviceId: number }
export type AddingService = { categoryId: number }
export type EditingCategory = { category: CategoryWithServices; categoryId: number }

export function useDashboard() {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingService, setEditingService] = useState<EditingService | null>(null)
  const [addingService, setAddingService] = useState<AddingService | null>(null)
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [auditLogsOpen, setAuditLogsOpen] = useState(false)

  const configQuery = useQuery(dashboardQueries.config())
  const config = configQuery.data ?? null
  const loading = configQuery.isLoading
  const error = configQuery.error ? 'Failed to load config' : null
  const [statusPollingEnabled, setStatusPollingEnabled] = useState(false)

  const statusQuery = useQuery({
    ...dashboardQueries.status(),
    enabled: Boolean(config) && statusPollingEnabled,
  })
  const serviceStatus = (statusQuery.data ?? {}) as ServiceStatusMap

  const auditLogsQuery = useQuery({
    ...dashboardQueries.auditLogs(),
    enabled: auditLogsOpen,
  })

  useEffect(() => {
    if (!config) return
    document.title = config.title || 'Homelab'
  }, [config])

  useEffect(() => {
    if (!config) return

    let unsubscribe: (() => void) | null = null

    unsubscribe = subscribeStatus(
      (status) => {
        setStatusPollingEnabled(false)
        if (import.meta.env.VITE_DEBUG_STATUS === '1') {
          console.debug('[status] stream event', status)
        }
        queryClient.setQueryData(dashboardQueries.status().queryKey, status)
      },
      (error) => {
        console.warn('Live status stream failed, falling back to React Query polling:', error)
        unsubscribe?.()
        unsubscribe = null
        setStatusPollingEnabled(true)
      },
    )

    if (!unsubscribe) {
      setStatusPollingEnabled(true)
    }

    return () => {
      unsubscribe?.()
    }
  }, [config, queryClient])

  const setConfig = (updater: (prevConfig: DashboardViewModel | null) => DashboardViewModel | null) => {
    queryClient.setQueryData<DashboardViewModel>(dashboardQueries.config().queryKey, (current) => {
      const next = updater(current ?? null)
      return next ?? current
    })
  }

  const saveKey = ['dashboard-save']
  const saveMutation = useMutation({
    mutationKey: saveKey,
    scope: { id: 'dashboard-save' },
    mutationFn: ({ nextConfig, options }: { nextConfig: DashboardViewModel; options: SaveConfigOptions; successMessage: string }) =>
      saveDashboardConfig(nextConfig, options),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQueries.status().queryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardQueries.auditLogs().queryKey }),
      ])
      toast.success(variables.successMessage)
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: saveKey }) === 1) {
        return queryClient.invalidateQueries({ queryKey: dashboardQueries.config().queryKey })
      }
    },
    onError: (error) => {
      console.error('Failed to save API config:', error)
      toast.error('Failed to save to server')
    },
  })

  const persistConfig = async (
    nextConfig: DashboardViewModel,
    successMessage: string,
    options: SaveConfigOptions,
  ) => {
    saveMutation.mutate({ nextConfig, successMessage, options })
  }

  const handleEditService = (serviceId: number, updatedService: ServiceFormData) => {
    const service = config?.items.flatMap((category) => category.list).find((item) => item.id === serviceId)
    if (!config || !service) return
    void persistConfig(config, 'Configuration saved', { action: 'updateService', service: { ...service, ...updatedService } })
    setEditingService(null)
  }

  const handleAddService = (categoryId: number, newService: ServiceFormData) => {
    if (!config) return
    void persistConfig(config, `Service "${newService.name}" added`, { action: 'createService', categoryId, service: newService })
    setAddingService(null)
  }

  const handleAddCategory = (newCategory: CategoryWithServices) => {
    if (!config) return
    void persistConfig(config, `Category "${newCategory.name}" added`, { action: 'createCategory', category: newCategory })
    setIsAddingCategory(false)
  }

  const handleOpenEditCategory = (category: CategoryWithServices) => {
    if (category.id != null) setEditingCategory({ category, categoryId: category.id })
  }

  const handleEditCategory = (categoryId: number, updatedCategory: Pick<CategoryWithServices, 'name' | 'icon'>) => {
    const category = config?.items.find((item) => item.id === categoryId)
    if (!config || !category) return
    void persistConfig(config, 'Category updated', { action: 'updateCategory', category: { ...category, ...updatedCategory } })
    setEditingCategory(null)
  }

  const handleReorderCategories = (newCategories: CategoryWithServices[], masonry?: MasonryOrder) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig, items: newCategories }
      const ids = newCategories.flatMap(({ id }) => id == null ? [] : [id])
      if (masonry && ids.length === newCategories.length) {
        newConfig.masonryPlacements = {
          ...prevConfig.masonryPlacements,
          [masonry.capacity]: { ids, sizes: masonry.sizes },
        }
      }

      setTimeout(() => {
        persistConfig(newConfig, 'Category order updated', {
          action: 'reorderCategories',
          categories: newCategories,
          masonry,
        })
      }, 0)

      return newConfig
    })
  }

  const handleReorderServices = (categoryId: number, newServices: ServiceViewModel[]) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const category = prevConfig.items.find((item) => item.id === categoryId)
      if (!category) return prevConfig
      const newConfig = {
        ...prevConfig,
        items: prevConfig.items.map((item) => item === category ? { ...item, list: newServices } : item),
      }

      setTimeout(() => {
        persistConfig(newConfig, 'Service order updated', {
          action: 'reorderServices',
          services: newServices,
        })
      }, 0)

      return newConfig
    })
  }

  const handleToggleEditMode = () => {
    setIsEditMode((current) => !current)
    if (isEditMode) {
      setIsAddingCategory(false)
      setEditingService(null)
      setAddingService(null)
      setEditingCategory(null)
    }
  }

  const handleExportConfig = async () => {
    try {
      await exportConfigToFile()
      toast.success('Config exported')
    } catch (error) {
      console.error('Failed to export config:', error)
      toast.error('Failed to export config')
    }
  }

  const handleImportConfig = async (file: File) => {
    try {
      const importedConfig = await importConfigFromFile(file)
      if (importedConfig) {
        queryClient.setQueryData(dashboardQueries.config().queryKey, importedConfig)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: dashboardQueries.status().queryKey }),
          queryClient.invalidateQueries({ queryKey: dashboardQueries.auditLogs().queryKey }),
        ])
        document.title = importedConfig.title || 'Homelab'
        toast.success('Config imported')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Import failed: ${message}`)
    }
  }

  return {
    config,
    loading,
    error,
    serviceStatus,
    auditLogs: auditLogsQuery.data ?? [],
    auditLogsLoading: auditLogsQuery.isLoading,
    auditLogsError: auditLogsQuery.error ? 'Failed to load activity logs' : null,
    refetchAuditLogs: auditLogsQuery.refetch,
    isAddingCategory,
    isEditMode,
    editingService,
    addingService,
    editingCategory,
    auditLogsOpen,
    openAddCategory: () => setIsAddingCategory(true),
    closeAddCategory: () => setIsAddingCategory(false),
    openEditService: (service: ServiceViewModel) => {
      if (service.id != null) setEditingService({ service, serviceId: service.id })
    },
    closeEditService: () => setEditingService(null),
    openAddService: (categoryId: number) => setAddingService({ categoryId }),
    closeAddService: () => setAddingService(null),
    openEditCategory: handleOpenEditCategory,
    closeEditCategory: () => setEditingCategory(null),
    openAuditLogs: () => setAuditLogsOpen(true),
    closeAuditLogs: () => setAuditLogsOpen(false),
    toggleEditMode: handleToggleEditMode,
    editService: handleEditService,
    addService: handleAddService,
    deleteService: async (serviceId: number) => {
      const service = config?.items.flatMap((category) => category.list).find((item) => item.id === serviceId)
      if (!config || !service || !await confirm(`Delete service "${service.name}"?`)) return false
      void persistConfig(config, `Service "${service.name}" deleted`, { action: 'deleteService', service })
      return true
    },
    addCategory: handleAddCategory,
    editCategory: handleEditCategory,
    deleteCategory: async (categoryId: number) => {
      const category = config?.items.find((item) => item.id === categoryId)
      if (!config || !category || !await confirm(`Delete category "${category.name}"? This also deletes every service in the group.`)) return false
      void persistConfig(config, `Category "${category.name}" deleted`, { action: 'deleteCategory', category })
      return true
    },
    reorderCategories: handleReorderCategories,
    reorderServices: handleReorderServices,
    exportConfig: handleExportConfig,
    importConfig: handleImportConfig,
  }
}
