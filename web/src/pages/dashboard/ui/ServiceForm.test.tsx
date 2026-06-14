import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServiceForm from './ServiceForm'

describe('ServiceForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders initial edit values', () => {
    render(
      <ServiceForm
        initialValue={{
          name: 'Jellyfin',
          logo: '/jellyfin.svg',
          url: 'https://jellyfin.example',
          target: '_self',
          monitorEnabled: true,
          monitorUrl: 'https://jellyfin.example/health',
        }}
        submitLabel="保存"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('Jellyfin')
    expect((screen.getByLabelText('Logo 路径') as HTMLInputElement).value).toBe('/jellyfin.svg')
    expect((screen.getByLabelText('URL') as HTMLInputElement).value).toBe('https://jellyfin.example')
    expect((screen.getByLabelText('打开方式') as HTMLSelectElement).value).toBe('_self')
    expect((screen.getByLabelText('启用状态检测') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('检测 URL') as HTMLInputElement).value).toBe('https://jellyfin.example/health')
  })

  it('clears monitorUrl when monitoring is disabled before submit', () => {
    const onSubmit = vi.fn()

    render(
      <ServiceForm
        initialValue={{
          name: 'Jellyfin',
          logo: '',
          url: 'https://jellyfin.example',
          target: '_blank',
          monitorEnabled: true,
          monitorUrl: 'https://jellyfin.example/health',
        }}
        submitLabel="保存"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('启用状态检测'))
    fireEvent.click(screen.getByRole('button', { name: /保存/ }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jellyfin',
      logo: '',
      url: 'https://jellyfin.example',
      target: '_blank',
      monitorEnabled: false,
      monitorUrl: '',
    })
  })
})
