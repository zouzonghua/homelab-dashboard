import { useState, useEffect } from 'react'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
import CategoryAddForm from './components/CategoryAddForm'
import CategoryEditForm from './components/CategoryEditForm'
import ServiceAddForm from './components/ServiceAddForm'
import ServiceEditForm from './components/ServiceEditForm'
import { fetchConfig, fetchStatus, saveConfig, subscribeStatus } from './utils/api'
import {
  saveConfigToStorage,
  loadConfigFromStorage,
  exportConfig as exportConfigToFile,
  importConfig as importConfigFromFile
} from './services/configService'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingService, setEditingService] = useState(null) // { service, categoryName, serviceIndex }
  const [addingService, setAddingService] = useState(null) // { categoryName }
  const [editingCategory, setEditingCategory] = useState(null) // { category, categoryIndex }
  const [serviceStatus, setServiceStatus] = useState({})

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchConfig();
        setConfig(data);
        document.title = data.title || "HomeLab Dashboard";
      } catch (err) {
        const storedConfig = loadConfigFromStorage();

        if (storedConfig) {
          setConfig(storedConfig);
          document.title = storedConfig.title || "HomeLab Dashboard";
        } else {
          setError('配置加载失败');
          console.error(err);
        }
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
        const status = await fetchStatus();
        if (import.meta.env.VITE_DEBUG_STATUS === '1') {
          console.debug('[status] loaded', status);
        }
        setServiceStatus(status);
      } catch (err) {
        console.warn('加载服务状态失败:', err);
      }
    };

    loadStatus();
    let intervalId = null;
    let unsubscribe = null;
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

  const persistConfig = async (nextConfig, successMessage) => {
    try {
      await saveConfig(nextConfig);
      saveConfigToStorage(nextConfig);
      fetchStatus()
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
      saveConfigToStorage(nextConfig);
      toast.success('已保存到本地缓存', {
        autoClose: 2000,
        hideProgressBar: true,
        position: "bottom-right"
      });
    }
  };

  const handleEditService = (categoryName, updatedService, serviceIndex) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list[serviceIndex] = updatedService;

        // 编辑后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, '配置已自动保存');
        }, 0);
      }

      return newConfig;
    });
    setEditingService(null); // 关闭编辑模态框
  };

  const handleAddService = (categoryName, newService) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list.push(newService);

        // 添加后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `服务 "${newService.name}" 已添加`);
        }, 0);
      }

      return newConfig;
    });
    setAddingService(null); // 关闭添加模态框
  };

  const handleDeleteService = (categoryName, serviceIndex) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        const deletedService = newConfig.items[categoryIndex].list[serviceIndex];
        newConfig.items[categoryIndex].list.splice(serviceIndex, 1);

        // 删除后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `服务 "${deletedService.name}" 已删除`);
        }, 0);
      }

      return newConfig;
    });
  };

  const handleAddCategory = (newCategory) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      newConfig.items.push(newCategory);

      // 添加分类后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, `分类 "${newCategory.name}" 已添加`);
      }, 0);

      return newConfig;
    });
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = (categoryName) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items.splice(categoryIndex, 1);

        // 删除后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, `分类 "${categoryName}" 已删除`);
        }, 0);
      }

      return newConfig;
    });
  };

  const handleOpenEditCategory = (category, categoryIndex) => {
    setEditingCategory({ category, categoryIndex });
  };

  const handleEditCategory = (categoryIndex, updatedCategory) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      newConfig.items[categoryIndex] = {
        ...newConfig.items[categoryIndex],
        name: updatedCategory.name,
        icon: updatedCategory.icon
      };

      // 编辑后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, '分类已更新');
      }, 0);

      return newConfig;
    });
    setEditingCategory(null);
  };

  const handleReorderCategories = (newCategories) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig, items: newCategories };

      // 重排序后自动保存配置
      setTimeout(() => {
        persistConfig(newConfig, '分类顺序已更新');
      }, 0);

      return newConfig;
    });
  };

  const handleReorderServices = (categoryName, newServices) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list = newServices;

        // 重排序后自动保存配置
        setTimeout(() => {
          persistConfig(newConfig, '服务顺序已更新');
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

  const handleOpenEditService = (categoryName, service, serviceIndex) => {
    setEditingService({ service, categoryName, serviceIndex });
  };

  const handleOpenAddService = (categoryName) => {
    setAddingService({ categoryName });
  };

  const handleExportConfig = () => {
    const success = exportConfigToFile(config);
    if (success) {
      toast.success('配置已导出');
    } else {
      toast.error('导出配置失败');
    }
  };

  const handleImportConfig = async (file) => {
    try {
      const importedConfig = await importConfigFromFile(file);
      if (importedConfig) {
        setConfig(importedConfig);
        document.title = importedConfig.title || "HomeLab Dashboard";
        // 导入后自动保存配置
        await persistConfig(importedConfig, '配置已导入并保存');
      }
    } catch (error) {
      toast.error(`导入失败: ${error.message}`);
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
