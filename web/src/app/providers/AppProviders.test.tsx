import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from './AppProviders'
import { useTheme } from '@/shared/ui/theme'

function ThemeProbe() {
  const { theme } = useTheme()

  return <span data-testid="theme-value">{theme}</span>
}

describe('AppProviders', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('provides theme context to child components', () => {
    render(
      <AppProviders>
        <ThemeProbe />
      </AppProviders>,
    )

    expect(screen.getByTestId('theme-value').textContent).toMatch(/^(system|light|dark)$/)
  })
})
