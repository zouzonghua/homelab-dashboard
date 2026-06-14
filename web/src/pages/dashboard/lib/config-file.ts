/**
 * Config file helpers for server-side import and export.
 */

import { dashboardApi, type ImportConfigData } from '@/shared/api'
import { fetchDashboardConfig } from '../model/dashboard'

const DEFAULT_EXPORT_FILENAME = 'homelab-dashboard-config.json'
type ImportConfigRequest = ImportConfigData['body']

const readFileAsText = async (file: File) => {
  if (typeof file.text === 'function') {
    return await file.text()
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Export the server-side SQLite config as a JSON file.
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
 * Import a config file into server-side SQLite and return the refreshed API config.
 */
export const importConfig = async (file: File) => {
  let config: ImportConfigRequest

  try {
    config = JSON.parse(await readFileAsText(file)) as ImportConfigRequest
  } catch {
    throw new Error('Invalid config file format')
  }

  await dashboardApi.importConfig(config)
  return await fetchDashboardConfig()
}
