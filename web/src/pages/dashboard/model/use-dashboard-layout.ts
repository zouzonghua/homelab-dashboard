import { useEffect, useState } from 'react'

export type DashboardLayout = 'vertical' | 'horizontal'

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    try {
      return localStorage.getItem('dashboard-layout') === 'horizontal' ? 'horizontal' : 'vertical'
    } catch {
      return 'vertical'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-layout', layout)
    } catch {
      // Layout switching still works when browser storage is unavailable.
    }
  }, [layout])

  const toggleLayout = () => {
    setLayout((current) => current === 'vertical' ? 'horizontal' : 'vertical')
  }

  return { layout, toggleLayout }
}
