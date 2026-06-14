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
        submitLabel="Save"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Jellyfin')
    expect((screen.getByLabelText('Logo path') as HTMLInputElement).value).toBe('/jellyfin.svg')
    expect((screen.getByLabelText('URL') as HTMLInputElement).value).toBe('https://jellyfin.example')
    expect((screen.getByLabelText('Open behavior') as HTMLSelectElement).value).toBe('_self')
    expect((screen.getByLabelText('Enable health checks') as HTMLInputElement).checked).toBe(true)
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

    fireEvent.click(screen.getByLabelText('Enable health checks'))
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
