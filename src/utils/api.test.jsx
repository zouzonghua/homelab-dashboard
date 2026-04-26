import { afterEach, describe, expect, it, vi } from 'vitest'
import bundledConfig from '@/assets/config.json'
import { fetchConfig, saveConfig } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches config from /api/config first', async () => {
    const apiConfig = { title: 'API config', items: [] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiConfig,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchConfig()).resolves.toEqual(apiConfig)
    expect(fetchMock).toHaveBeenCalledWith('/api/config')
  })

  it('falls back to bundled config when /api/config fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    await expect(fetchConfig()).resolves.toEqual(bundledConfig)
  })

  it('saves config with PUT JSON to /api/config', async () => {
    const config = { title: 'Saved config', items: [] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => config,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveConfig(config)).resolves.toEqual(config)
    expect(fetchMock).toHaveBeenCalledWith('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
  })

  it('throws when saving config fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))

    await expect(saveConfig({ items: [] })).rejects.toThrow('保存配置失败')
  })
})
