import { afterEach, describe, expect, it, vi } from 'vitest'
import bundledConfig from '@/assets/config.json'
import { fetchConfig, fetchStatus, saveConfig, subscribeStatus } from './api'

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

  it('fetches service status from /api/status', async () => {
    const status = {
      Jellyfin: {
        status: 'up',
        code: 200,
        responseTimeMs: 12,
      },
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => status,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchStatus()).resolves.toEqual(status)
    expect(fetchMock).toHaveBeenCalledWith('/api/status')
  })

  it('subscribes to service status stream events', () => {
    const instances = []
    class EventSourceStub {
      constructor(url) {
        this.url = url
        this.listeners = {}
        instances.push(this)
      }

      addEventListener(type, listener) {
        this.listeners[type] = listener
      }

      close() {
        this.closed = true
      }
    }
    vi.stubGlobal('EventSource', EventSourceStub)

    const onStatus = vi.fn()
    const unsubscribe = subscribeStatus(onStatus)

    expect(instances).toHaveLength(1)
    expect(instances[0].url).toBe('/api/status/stream')

    instances[0].listeners.status({
      data: JSON.stringify({ Jellyfin: { status: 'up', responseTimeMs: 12 } }),
    })
    expect(onStatus).toHaveBeenCalledWith({ Jellyfin: { status: 'up', responseTimeMs: 12 } })

    unsubscribe()
    expect(instances[0].closed).toBe(true)
  })
})
