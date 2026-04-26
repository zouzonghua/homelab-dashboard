import config from '@/assets/config.json'

/**
 * 获取配置文件
 * @returns {Promise<Object>} 配置对象
 */
export const fetchConfig = async () => {
  try {
    const response = await fetch('/api/config')
    if (!response.ok) {
      throw new Error(`加载配置失败: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.warn('加载 API 配置失败，使用内置配置:', error)
    return config
  }
}

/**
 * 保存配置文件
 * @param {Object} nextConfig 配置对象
 * @returns {Promise<Object>} 保存后的配置对象
 */
export const saveConfig = async (nextConfig) => {
  const response = await fetch('/api/config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nextConfig),
  })

  if (!response.ok) {
    throw new Error(`保存配置失败: ${response.status}`)
  }

  if (response.status === 204) {
    return nextConfig
  }

  return await response.json()
}

export const fetchStatus = async () => {
  const response = await fetch('/api/status')
  if (!response.ok) {
    throw new Error(`加载服务状态失败: ${response.status}`)
  }
  return await response.json()
}

export const subscribeStatus = (onStatus, onError) => {
  if (typeof EventSource === 'undefined') {
    return null
  }

  const source = new EventSource('/api/status/stream')
  source.addEventListener('status', (event) => {
    try {
      onStatus(JSON.parse(event.data))
    } catch (error) {
      onError?.(error)
    }
  })
  source.onerror = (event) => {
    onError?.(event)
  }

  return () => source.close()
}
