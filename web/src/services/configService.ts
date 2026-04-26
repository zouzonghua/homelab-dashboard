/**
 * 配置服务 - 处理配置的服务端导入和导出
 */

import { dashboardApi, fetchDashboardConfig } from '../api'

const DEFAULT_EXPORT_FILENAME = 'homelab-dashboard-config.json'

const readFileAsText = async (file: File) => {
  if (typeof file.text === 'function') {
    return await file.text()
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

/**
 * 从服务端 SQLite 导出配置为 JSON 文件
 */
export const exportConfig = async () => {
  const blob = await dashboardApi.exportConfig()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = DEFAULT_EXPORT_FILENAME
  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * 导入配置文件到服务端 SQLite，并返回刷新后的 API 配置
 */
export const importConfig = async (file: File) => {
  let config: unknown

  try {
    config = JSON.parse(await readFileAsText(file))
  } catch {
    throw new Error('配置文件格式无效')
  }

  await dashboardApi.importConfig(config)
  return await fetchDashboardConfig()
}
