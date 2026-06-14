import type { ReactNode } from 'react'
import { ThemeProvider } from '@/shared/ui/theme'
import { QueryProvider } from './QueryProvider'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryProvider>
  )
}
