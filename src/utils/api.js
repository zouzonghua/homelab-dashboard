import config from '@/assets/config.json'

/**
 * 获取配置文件
 * @returns {Promise<Object>} 配置对象
 */
export const fetchConfig = async () => {
  try {
    return config
  } catch (error) {
    console.error('加载配置文件失败:', error)
    throw error
  }
} 