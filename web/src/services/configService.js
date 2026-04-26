/**
 * 配置服务 - 处理配置的存储、加载、导入和导出
 */

// 本地存储的键名
const CONFIG_STORAGE_KEY = 'homelab_dashboard_config';

/**
 * 将配置保存到本地存储
 * @param {Object} config 要保存的配置对象
 */
export const saveConfigToStorage = (config) => {
  try {
    const configString = JSON.stringify(config);
    localStorage.setItem(CONFIG_STORAGE_KEY, configString);
    return true;
  } catch (error) {
    console.error('保存配置失败:', error);
    return false;
  }
};

/**
 * 从本地存储加载配置
 * @returns {Object|null} 加载的配置对象，如果不存在则返回null
 */
export const loadConfigFromStorage = () => {
  try {
    const configString = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!configString) return null;
    return JSON.parse(configString);
  } catch (error) {
    console.error('加载配置失败:', error);
    return null;
  }
};

/**
 * 导出配置为JSON文件
 * @param {Object} config 要导出的配置对象
 */
export const exportConfig = (config) => {
  try {
    const configString = JSON.stringify(config, null, 2);
    const blob = new Blob([configString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接并自动点击
    const link = document.createElement('a');
    link.href = url;
    link.download = 'homelab-dashboard-config.json';
    document.body.appendChild(link);
    link.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('导出配置失败:', error);
    return false;
  }
};

/**
 * 导入配置文件
 * @param {File} file 要导入的JSON文件
 * @returns {Promise<Object|null>} 解析后的配置对象，如果失败则返回null
 */
export const importConfig = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target.result);
          resolve(config);
        } catch (parseError) {
          console.error('解析配置文件失败:', parseError);
          reject(new Error('配置文件格式无效'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('导入配置失败:', error);
      reject(error);
    }
  });
}; 