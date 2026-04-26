import { useState, useEffect } from 'react'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
import CategoryAddForm from './components/CategoryAddForm'
import CategoryEditForm from './components/CategoryEditForm'
import ServiceAddForm from './components/ServiceAddForm'
import ServiceEditForm from './components/ServiceEditForm'
import {
  type SaveConfigOptions,
  dashboardApi,
  fetchDashboardConfig,
  saveDashboardConfig,
  subscribeStatus,
} from './api'
import type { Category, DashboardConfig, Service } from './types'
import {
  exportConfig as exportConfigToFile,
  importConfig as importConfigFromFile
} from './services/configService'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

type EditingService = {
  service: Service
  categoryName: string
  serviceIndex: number
}

type AddingService = {
  categoryName: string
}

type EditingCategory = {
  category: Category
  categoryIndex: number
}

function App() {
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingService, setEditingService] = useState<EditingService | null>(null)
  const [addingService, setAddingService] = useState<AddingService | null>(null)
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [serviceStatus, setServiceStatus] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchDashboardConfig();
        setConfig(data);
        document.title = data.title || "HomeLab Dashboard";
      } catch (err) {
        setError('配置加载失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!config) return;

    const loadStatus = async () => {
      try {
        const status = await dashboardApi.getStatus();
        if (import.meta.env.VITE_DEBUG_STATUS === '1') {
          console.debug('[status] loaded', status);
        }
        setServiceStatus(status);
      } catch (err) {
        console.warn('加载服务状态失败:', err);
      }
    };

    loadStatus();
    let intervalId: number | null = null;
    let unsubscribe: (() => void) | null = null;
    const startPolling = () => {
      if (intervalId) return;
      intervalId = window.setInterval(loadStatus, 30000);
    };

    unsubscribe = subscribeStatus(
      (status) => {
        if (import.meta.env.VITE_DEBUG_STATUS === '1') {
          console.debug('[status] stream event', status);
        }
        setServiceStatus(status);
      },
      (error) => {
        console.warn('服务状态实时流失败，回退到轮询:', error);
        unsubscribe?.();
        unsubscribe = null;
        startPolling();
      }
    );
    if (!unsubscribe) {
      startPolling();
    }

    return () => {
      unsubscribe?.();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [config]);

  const persistConfig = async (
    nextConfig: DashboardConfig,
    successMessage: string,
    options: SaveConfigOptions
  ) => {
    try {
      await saveDashboardConfig(nextConfig, options);
      const refreshedConfig = await fetchDashboardConfig();
      setConfig(refreshedConfig);
      document.title = refreshedConfig.title || "HomeLab Dashboard";
      dashboardApi.getStatus()
        .then((status) => {
          if (import.meta.env.VITE_DEBUG_STATUS === '1') {
            console.debug('[status] refreshed after save', status);
          }
          setServiceStatus(status);
        })
        .catch((error) => console.warn('刷新服务状态失败:', error));
      toast.success(successMessage, {
        autoClose: 2000,
        hideProgressBar: true,
        position: "bottom-right"
      });
    } catch (error) {
      console.error('API 保存配置失败:', error);
      toast.error('保存到服务端失败', {
        autoClose: 2000,
        hideProgressBar: true,
        position: "bottom-right"
      });
    }
  };

  const handleEditService = (
    categoryName: string,
    updatedService: Service,
    serviceIndex: number
  ) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        const nextService = {
          ...newConfig.items[categoryIndex].list[serviceIndex],
          ...updatedService,
        };
        newConfig.items[categoryIndex].list[serviceIndex] = nextService;

        // 编辑后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, '配置已自动保存', { action: 'updateService', service: nextService });
        }, 0);
      }

      return newConfig;
    });
    setEditingService(null); // 关闭编辑模态框
  };

  const handleAddService = (categoryName: string, newService: Service) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list.push(newService);

        const categoryId = newConfig.items[categoryIndex].id
        if (categoryId == null) {
          toast.error('分类缺少服务端 ID，无法添加服务')
          return newConfig
        }

        // 添加后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `服务 "${newService.name}" 已添加`, {
            action: 'createService',
            categoryId,
            service: newService,
          });
        }, 0);
      }

      return newConfig;
    });
    setAddingService(null); // 关闭添加模态框
  };

  const handleDeleteService = (categoryName: string, serviceIndex: number) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        const deletedService = newConfig.items[categoryIndex].list[serviceIndex];
        newConfig.items[categoryIndex].list.splice(serviceIndex, 1);

        // 删除后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `服务 "${deletedService.name}" 已删除`, {
            action: 'deleteService',
            service: deletedService,
          });
        }, 0);
      }

      return newConfig;
    });
  };

  const handleAddCategory = (newCategory: Category) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      newConfig.items.push(newCategory);

      // 添加分类后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, `分类 "${newCategory.name}" 已添加`, {
          action: 'createCategory',
          category: newCategory,
        });
      }, 0);

      return newConfig;
    });
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (categoryName: string) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        const deletedCategory = newConfig.items[categoryIndex];
        newConfig.items.splice(categoryIndex, 1);

        // 删除后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `分类 "${categoryName}" 已删除`, {
            action: 'deleteCategory',
            category: deletedCategory,
          });
        }, 0);
      }

      return newConfig;
    });
  };

  const handleOpenEditCategory = (category: Category, categoryIndex: number) => {
    setEditingCategory({ category, categoryIndex });
  };

  const handleEditCategory = (categoryIndex: number, updatedCategory: Pick<Category, 'name' | 'icon'>) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      newConfig.items[categoryIndex] = {
        ...newConfig.items[categoryIndex],
        name: updatedCategory.name,
        icon: updatedCategory.icon
      };

      // 编辑后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, '分类已更新', {
          action: 'updateCategory',
          category: newConfig.items[categoryIndex],
        });
      }, 0);

      return newConfig;
    });
    setEditingCategory(null);
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig, items: newCategories };

      // 重排序后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, '分类顺序已更新', {
          action: 'reorderCategories',
          categories: newCategories,
        });
      }, 0);

      return newConfig;
    });
  };

  const handleReorderServices = (categoryName: string, newServices: Service[]) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list = newServices;

        // 重排序后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, '服务顺序已更新', {
            action: 'reorderServices',
            services: newServices,
          });
        }, 0);
      }

      return newConfig;
    });
  };

  const handleOpenAddCategory = () => {
    setIsAddingCategory(true);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(prev => !prev);
    // 退出编辑模式时关闭所有打开的表单
    if (isEditMode) {
      setIsAddingCategory(false);
      setEditingService(null);
      setAddingService(null);
      setEditingCategory(null);
    }
  };

  const handleOpenEditService = (categoryName: string, service: Service, serviceIndex: number) => {
    setEditingService({ service, categoryName, serviceIndex });
  };

  const handleOpenAddService = (categoryName: string) => {
    setAddingService({ categoryName });
  };

  const handleExportConfig = async () => {
    try {
      await exportConfigToFile();
      toast.success('配置已导出');
    } catch (error) {
      console.error('导出配置失败:', error);
      toast.error('导出配置失败');
    }
  };

  const handleImportConfig = async (file: File) => {
    try {
      const importedConfig = await importConfigFromFile(file);
      if (importedConfig) {
        setConfig(importedConfig);
        document.title = importedConfig.title || "HomeLab Dashboard";
        toast.success('配置已导入');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      toast.error(`导入失败: ${message}`);
    }
  };

  // return (
  //   <div style={{ backgroundColor: 'red' }} className="h-full w-full overflow-auto">
  //   <div className='p-10 text-white dark:bg-dark-900'>
  //     <h1>Hello World</h1>
  //   </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //     <div className='p-10 text-white dark:bg-dark-900'>
  //       <h1>Hello World</h1>
  //     </div>
  //   </div>
  // )

  if (loading) return (
    <div className="chassis-app flex items-center justify-center h-full">
      <div className="chassis-loader"></div>
    </div>
  );
  
  if (error) return (
    <div className="chassis-app flex items-center justify-center h-full">
      <div className="chassis-error">{error}</div>
    </div>
  );

  return (
    <div className="chassis-app overflow-auto h-full w-screen flex flex-col items-center xl:flex-col">
      <Header
        title={config?.title || "HomeLab Dashboard"}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onAddCategory={handleOpenAddCategory}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        categories={config?.items || []}
        serviceStatus={serviceStatus}
      />

      {/* 编辑模式提示条 - 参考 Home Assistant 样式 */}
      {isEditMode && (
        <div className="chassis-edit-bar w-full py-3 px-4">
          <div className="container max-w-screen-xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span className="font-medium">编辑模式已启用</span>
              <span className="text-blue-100 text-sm hidden md:inline">拖拽图标/Logo可调整顺序，点击按钮编辑内容</span>
            </div>
            <button
              onClick={handleToggleEditMode}
              className="chassis-button px-4 py-1.5 transition-colors font-medium text-sm"
            >
              完成
            </button>
          </div>
        </div>
      )}

      <ServiceGrid
        categories={config?.items || []}
        columns={config?.columns || 4}
        onOpenEditService={handleOpenEditService}
        onOpenAddService={handleOpenAddService}
        onDeleteService={handleDeleteService}
        onDeleteCategory={handleDeleteCategory}
        onOpenEditCategory={handleOpenEditCategory}
        onReorderCategories={handleReorderCategories}
        onReorderServices={handleReorderServices}
        isEditMode={isEditMode}
        serviceStatus={serviceStatus}
      />

      {/* 添加分类模态框 */}
      {isAddingCategory && isEditMode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsAddingCategory(false)}
        >
          <div
            className="chassis-modal max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <CategoryAddForm
              onAdd={handleAddCategory}
              onCancel={() => setIsAddingCategory(false)}
            />
          </div>
        </div>
      )}

      {/* 编辑服务模态框 */}
      {editingService && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditingService(null)}
        >
          <div
            className="chassis-modal max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">编辑服务</h3>
            <ServiceEditForm
              service={editingService.service}
              onSave={(updatedService) =>
                handleEditService(editingService.categoryName, updatedService, editingService.serviceIndex)
              }
              onCancel={() => setEditingService(null)}
              onDelete={() => {
                if (window.confirm(`确定要删除服务 "${editingService.service.name}" 吗？`)) {
                  handleDeleteService(editingService.categoryName, editingService.serviceIndex);
                  setEditingService(null);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 添加服务模态框 */}
      {addingService && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setAddingService(null)}
        >
          <div
            className="chassis-modal max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">添加服务</h3>
            <ServiceAddForm
              onAdd={(newService) => handleAddService(addingService.categoryName, newService)}
              onCancel={() => setAddingService(null)}
            />
          </div>
        </div>
      )}

      {/* 编辑分类模态框 */}
      {editingCategory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditingCategory(null)}
        >
          <div
            className="chassis-modal max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <CategoryEditForm
              category={editingCategory.category}
              onSave={(updatedCategory) =>
                handleEditCategory(editingCategory.categoryIndex, updatedCategory)
              }
              onCancel={() => setEditingCategory(null)}
              onDelete={() => {
                if (window.confirm(`确定要删除分类 "${editingCategory.category.name}" 吗？\n此操作将删除该分类下的所有服务！`)) {
                  handleDeleteCategory(editingCategory.category.name);
                  setEditingCategory(null);
                }
              }}
            />
          </div>
        </div>
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default App;
