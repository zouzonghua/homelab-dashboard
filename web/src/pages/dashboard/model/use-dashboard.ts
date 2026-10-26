import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notifications'
import { useConfirm } from '@/shared/ui/UIProvider'
import { subscribeStatus } from '@/shared/api'
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

export type EditingService = {
  service: ServiceViewModel
  categoryName: string
  serviceIndex: number
}

export type AddingService = {
  categoryName: string
}

export type EditingCategory = {
  category: CategoryWithServices
  categoryIndex: number
}

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

  const saveMutation = useMutation({
    mutationFn: ({ nextConfig, options }: { nextConfig: DashboardViewModel; options: SaveConfigOptions; successMessage: string }) =>
      saveDashboardConfig(nextConfig, options),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueries.config().queryKey })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQueries.status().queryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardQueries.auditLogs().queryKey }),
      ])
      toast.success(variables.successMessage)
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

  const handleEditService = (
    categoryName: string,
    updatedService: ServiceFormData,
    serviceIndex: number,
  ) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      const categoryIndex = newConfig.items.findIndex((item) => item.name === categoryName)

      if (categoryIndex !== -1) {
        const nextService = {
          ...newConfig.items[categoryIndex].list[serviceIndex],
          ...updatedService,
        }
        newConfig.items[categoryIndex].list[serviceIndex] = nextService

        setTimeout(() => {
          persistConfig(newConfig, 'Configuration saved', { action: 'updateService', service: nextService })
        }, 0)
      }

      return newConfig
    })
    setEditingService(null)
  }

  const handleAddService = (categoryName: string, newService: ServiceFormData) => {
    if (!config) return
    const categoryId = config.items.find((category) => category.name === categoryName)?.id
    if (categoryId == null) {
      toast.error('Category is missing a server ID, cannot add service')
      return
    }
    void persistConfig(config, `Service "${newService.name}" added`, { action: 'createService', categoryId, service: newService })
    setAddingService(null)
  }

  const handleDeleteService = (categoryName: string, serviceIndex: number) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      const categoryIndex = newConfig.items.findIndex((item) => item.name === categoryName)

      if (categoryIndex !== -1) {
        const deletedService = newConfig.items[categoryIndex].list[serviceIndex]
        newConfig.items[categoryIndex].list.splice(serviceIndex, 1)

        setTimeout(() => {
          persistConfig(newConfig, `Service "${deletedService.name}" deleted`, {
            action: 'deleteService',
            service: deletedService,
          })
        }, 0)
      }

      return newConfig
    })
  }

  const handleAddCategory = (newCategory: CategoryWithServices) => {
    if (!config) return
    void persistConfig(config, `Category "${newCategory.name}" added`, { action: 'createCategory', category: newCategory })
    setIsAddingCategory(false)
  }

  const handleDeleteCategory = (categoryName: string) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      const categoryIndex = newConfig.items.findIndex((item) => item.name === categoryName)

      if (categoryIndex !== -1) {
        const deletedCategory = newConfig.items[categoryIndex]
        newConfig.items.splice(categoryIndex, 1)

        setTimeout(() => {
          persistConfig(newConfig, `Category "${categoryName}" deleted`, {
            action: 'deleteCategory',
            category: deletedCategory,
          })
        }, 0)
      }

      return newConfig
    })
  }

  const handleOpenEditCategory = (category: CategoryWithServices, categoryIndex: number) => {
    setEditingCategory({ category, categoryIndex })
  }

  const handleEditCategory = (categoryIndex: number, updatedCategory: Pick<CategoryWithServices, 'name' | 'icon'>) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      newConfig.items[categoryIndex] = {
        ...newConfig.items[categoryIndex],
        name: updatedCategory.name,
        icon: updatedCategory.icon,
      }

      setTimeout(() => {
        persistConfig(newConfig, 'Category updated', {
          action: 'updateCategory',
          category: newConfig.items[categoryIndex],
        })
      }, 0)

      return newConfig
    })
    setEditingCategory(null)
  }

  const handleReorderCategories = (newCategories: CategoryWithServices[]) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig, items: newCategories }

      setTimeout(() => {
        persistConfig(newConfig, 'Category order updated', {
          action: 'reorderCategories',
          categories: newCategories,
        })
      }, 0)

      return newConfig
    })
  }

  const handleReorderServices = (categoryName: string, newServices: ServiceViewModel[]) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      const categoryIndex = newConfig.items.findIndex((item) => item.name === categoryName)

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list = newServices

        setTimeout(() => {
          persistConfig(newConfig, 'Service order updated', {
            action: 'reorderServices',
            services: newServices,
          })
        }, 0)
      }

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
    openEditService: (categoryName: string, service: ServiceViewModel, serviceIndex: number) => {
      setEditingService({ service, categoryName, serviceIndex })
    },
    closeEditService: () => setEditingService(null),
    openAddService: (categoryName: string) => setAddingService({ categoryName }),
    closeAddService: () => setAddingService(null),
    openEditCategory: handleOpenEditCategory,
    closeEditCategory: () => setEditingCategory(null),
    openAuditLogs: () => setAuditLogsOpen(true),
    closeAuditLogs: () => setAuditLogsOpen(false),
    toggleEditMode: handleToggleEditMode,
    editService: handleEditService,
    addService: handleAddService,
    deleteService: async (categoryName: string, serviceIndex: number) => {
      const service = config?.items.find((category) => category.name === categoryName)?.list[serviceIndex]
      if (!service || !await confirm(`Delete service "${service.name}"?`)) return false
      handleDeleteService(categoryName, serviceIndex)
      return true
    },
    addCategory: handleAddCategory,
    editCategory: handleEditCategory,
    deleteCategory: async (categoryName: string) => {
      if (!await confirm(`Delete category "${categoryName}"? This also deletes every service in the group.`)) return false
      handleDeleteCategory(categoryName)
      return true
    },
    reorderCategories: handleReorderCategories,
    reorderServices: handleReorderServices,
    exportConfig: handleExportConfig,
    importConfig: handleImportConfig,
  }
}
