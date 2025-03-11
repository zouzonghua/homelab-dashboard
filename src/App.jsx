import { useState, useEffect } from 'react'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
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
      />
      <ServiceGrid 
        categories={config?.items || []} 
        columns={config?.columns || 4} 
        onEditService={handleEditService}
      />
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
