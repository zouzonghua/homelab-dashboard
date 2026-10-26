import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ServiceForm from './ServiceForm'

describe('ServiceForm', () => {
  beforeAll(() => { vi.stubGlobal('PointerEvent', MouseEvent) })
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
        submitLabel="Save"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Jellyfin')
    expect((screen.getByLabelText('Logo path') as HTMLInputElement).value).toBe('/jellyfin.svg')
    expect((screen.getByLabelText('URL') as HTMLInputElement).value).toBe('https://jellyfin.example')
    expect(screen.getByRole('combobox', { name: 'Open behavior' }).textContent).toContain('Same tab (_self)')
    expect(screen.getByRole('checkbox', { name: 'Enable health checks' }).getAttribute('aria-checked')).toBe('true')
    expect((screen.getByLabelText('Health check URL') as HTMLInputElement).value).toBe('https://jellyfin.example/health')
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
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable health checks' }))
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))

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
