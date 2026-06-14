import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
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
  const error = configQuery.error ? '配置加载失败' : null

  const statusQuery = useQuery({
    ...dashboardQueries.status(),
    enabled: Boolean(config),
  })
  const serviceStatus = (statusQuery.data ?? {}) as ServiceStatusMap

  const auditLogsQuery = useQuery({
    ...dashboardQueries.auditLogs(),
    enabled: auditLogsOpen,
  })

  useEffect(() => {
    if (!config) return
    document.title = config.title || 'HomeLab Dashboard'
  }, [config])

  useEffect(() => {
    if (!config) return

    let unsubscribe: (() => void) | null = null

    unsubscribe = subscribeStatus(
      (status) => {
        if (import.meta.env.VITE_DEBUG_STATUS === '1') {
          console.debug('[status] stream event', status)
        }
        queryClient.setQueryData(dashboardQueries.status().queryKey, status)
      },
      (error) => {
        console.warn('服务状态实时流失败，使用 React Query 轮询:', error)
        unsubscribe?.()
        unsubscribe = null
      },
    )

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
      toast.success(variables.successMessage, {
        autoClose: 1000,
        hideProgressBar: true,
        position: 'top-right',
      })
    },
    onError: (error) => {
      console.error('API 保存配置失败:', error)
      toast.error('保存到服务端失败', {
        autoClose: 1000,
        hideProgressBar: true,
        position: 'top-right',
      })
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
          persistConfig(newConfig, '配置已自动保存', { action: 'updateService', service: nextService })
        }, 0)
      }

      return newConfig
    })
    setEditingService(null)
  }

  const handleAddService = (categoryName: string, newService: ServiceFormData) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      const categoryIndex = newConfig.items.findIndex((item) => item.name === categoryName)

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list.push(newService)

        const categoryId = newConfig.items[categoryIndex].id
        if (categoryId == null) {
          toast.error('分类缺少服务端 ID，无法添加服务')
          return newConfig
        }

        setTimeout(() => {
          persistConfig(newConfig, `服务 "${newService.name}" 已添加`, {
            action: 'createService',
            categoryId,
            service: newService,
          })
        }, 0)
      }

      return newConfig
    })
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
          persistConfig(newConfig, `服务 "${deletedService.name}" 已删除`, {
            action: 'deleteService',
            service: deletedService,
          })
        }, 0)
      }

      return newConfig
    })
  }

  const handleAddCategory = (newCategory: CategoryWithServices) => {
    setConfig((prevConfig) => {
      if (!prevConfig) return prevConfig
      const newConfig = { ...prevConfig }
      newConfig.items.push(newCategory)

      setTimeout(() => {
        persistConfig(newConfig, `分类 "${newCategory.name}" 已添加`, {
          action: 'createCategory',
          category: newCategory,
        })
      }, 0)

      return newConfig
    })
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
          persistConfig(newConfig, `分类 "${categoryName}" 已删除`, {
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
        persistConfig(newConfig, '分类已更新', {
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
        persistConfig(newConfig, '分类顺序已更新', {
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
          persistConfig(newConfig, '服务顺序已更新', {
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
      toast.success('配置已导出')
    } catch (error) {
      console.error('导出配置失败:', error)
      toast.error('导出配置失败')
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
        document.title = importedConfig.title || 'HomeLab Dashboard'
        toast.success('配置已导入')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      toast.error(`导入失败: ${message}`)
    }
  }

  return {
    config,
    loading,
    error,
    serviceStatus,
    auditLogs: auditLogsQuery.data ?? [],
    auditLogsLoading: auditLogsQuery.isLoading,
    auditLogsError: auditLogsQuery.error ? '操作记录加载失败' : null,
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
    deleteService: handleDeleteService,
    addCategory: handleAddCategory,
    editCategory: handleEditCategory,
    deleteCategory: handleDeleteCategory,
    reorderCategories: handleReorderCategories,
    reorderServices: handleReorderServices,
    exportConfig: handleExportConfig,
    importConfig: handleImportConfig,
  }
}
