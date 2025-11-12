import { useState, useEffect } from 'react'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
import CategoryAddForm from './components/CategoryAddForm'
import CategoryEditForm from './components/CategoryEditForm'
import ServiceAddForm from './components/ServiceAddForm'
import ServiceEditForm from './components/ServiceEditForm'
import { fetchConfig } from './utils/api'
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

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 先尝试从本地存储加载
        const storedConfig = loadConfigFromStorage();
        
        if (storedConfig) {
          setConfig(storedConfig);
          document.title = storedConfig.title || "HomeLab Dashboard";
        } else {
          // 如果本地没有，再从默认配置加载
          const data = await fetchConfig();
          setConfig(data);
          document.title = data.title || "HomeLab Dashboard";
        }
      } catch (err) {
        setError('配置加载失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleEditService = (categoryName, updatedService, serviceIndex) => {
    setConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      const categoryIndex = newConfig.items.findIndex(item => item.name === categoryName);

      if (categoryIndex !== -1) {
        newConfig.items[categoryIndex].list[serviceIndex] = updatedService;

        // 编辑后自动保存配置
        setTimeout(() => {
          saveConfigToStorage(newConfig);
          toast.success('配置已自动保存', {
            autoClose: 2000,
            hideProgressBar: true,
            position: "bottom-right"
          });
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
          saveConfigToStorage(newConfig);
          toast.success(`服务 "${newService.name}" 已添加`, {
            autoClose: 2000,
            hideProgressBar: true,
            position: "bottom-right"
          });
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
          saveConfigToStorage(newConfig);
          toast.success(`服务 "${deletedService.name}" 已删除`, {
            autoClose: 2000,
            hideProgressBar: true,
            position: "bottom-right"
          });
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
        saveConfigToStorage(newConfig);
        toast.success(`分类 "${newCategory.name}" 已添加`, {
          autoClose: 2000,
          hideProgressBar: true,
          position: "bottom-right"
        });
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
          saveConfigToStorage(newConfig);
          toast.success(`分类 "${categoryName}" 已删除`, {
            autoClose: 2000,
            hideProgressBar: true,
            position: "bottom-right"
          });
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
        saveConfigToStorage(newConfig);
        toast.success('分类已更新', {
          autoClose: 2000,
          hideProgressBar: true,
          position: "bottom-right"
        });
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
        saveConfigToStorage(newConfig);
        toast.success('分类顺序已更新', {
          autoClose: 2000,
          hideProgressBar: true,
          position: "bottom-right"
        });
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
          saveConfigToStorage(newConfig);
          toast.success('服务顺序已更新', {
            autoClose: 2000,
            hideProgressBar: true,
            position: "bottom-right"
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
        // 导入后自动保存到本地存储
        saveConfigToStorage(importedConfig);
        toast.success('配置已导入并保存');
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
    <div className="flex items-center justify-center h-full dark:bg-dark-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-full dark:bg-dark-900">
      <div className="text-red-500 text-xl">{error}</div>
    </div>
  );

  return (
    <div className="overflow-auto bg-gray-50 dark:text-white dark:bg-dark-900 h-full w-screen flex flex-col items-center xl:flex-col">
      <Header
        title={config?.title || "HomeLab Dashboard"}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onAddCategory={handleOpenAddCategory}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
      />

      {/* 编辑模式提示条 - 参考 Home Assistant 样式 */}
      {isEditMode && (
        <div className="w-full bg-blue-500 dark:bg-blue-600 text-white py-3 px-4 shadow-lg">
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
              className="px-4 py-1.5 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium text-sm"
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
      />

      {/* 添加分类模态框 */}
      {isAddingCategory && isEditMode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsAddingCategory(false)}
        >
          <div
            className="bg-white dark:bg-dark-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
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
            className="bg-white dark:bg-dark-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
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
            className="bg-white dark:bg-dark-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
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
            className="bg-white dark:bg-dark-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
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
