import type { ReactNode } from 'react'
import { ThemeProvider } from '@/shared/ui/theme'
import { UIProvider } from '@/shared/ui/UIProvider'
import { QueryProvider } from './QueryProvider'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider><UIProvider>{children}</UIProvider></ThemeProvider>
    </QueryProvider>
  )
}
