import { useEffect, useState } from 'react'

export type DashboardLayout = 'vertical' | 'horizontal' | 'masonry'

export const nextLayout = { vertical: 'horizontal', horizontal: 'masonry', masonry: 'vertical' } as const

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    try {
      const saved = localStorage.getItem('dashboard-layout')
      return saved === 'horizontal' || saved === 'masonry' ? saved : 'vertical'
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
    setLayout((current) => nextLayout[current])
  }

  return { layout, toggleLayout }
}
