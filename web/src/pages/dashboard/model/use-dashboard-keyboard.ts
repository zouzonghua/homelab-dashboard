import { useEffect, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useTheme, getNextTheme } from '@/shared/ui/theme'
import type { useDashboard } from './use-dashboard'

type Dashboard = ReturnType<typeof useDashboard>

export function useDashboardKeyboard(dashboard: Dashboard, toggleLayout: () => void) {
  const [helpOpen, setHelpOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || dashboard.loading || dashboard.error) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const typing = Boolean(target?.closest('input, textarea, select, [role="combobox"], [role="menu"], [role="listbox"], [contenteditable]:not([contenteditable="false"])'))
      const key = event.key.toLowerCase()
      const dialogs = document.querySelectorAll<HTMLElement>('.chassis-modal')
      const dialog = dialogs[dialogs.length - 1]

      if (dialog?.getAttribute('role') === 'alertdialog') return
      if (dialog) {
        if (!typing && !helpOpen && dashboard.auditLogsOpen && key === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          void dashboard.refetchAuditLogs()
          return
        }
        if (event.key !== '?' || typing) return
      }
      if (typing) return
      if (!event.altKey && target?.closest('[aria-roledescription="sortable"]') && [' ', 'enter', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
      if (event.repeat && !['j', 'k', 'arrowdown', 'arrowup', 'arrowleft', 'arrowright'].includes(key)) return

      const section = target?.closest<HTMLElement>('[data-category-name]')
      const categoryIndex = dashboard.config?.items.findIndex((category) => category.name === section?.dataset.categoryName) ?? -1
      const category = dashboard.config?.items[categoryIndex]
      const serviceElement = target?.closest<HTMLElement>('[data-service-index]')
      const serviceIndex = serviceElement ? Number(serviceElement.dataset.serviceIndex) : -1
      const service = category?.list[serviceIndex]

      if (event.altKey && !event.ctrlKey && !event.metaKey && dashboard.isEditMode && category && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault()
        const delta = key === 'arrowup' || key === 'arrowleft' ? -1 : 1
        if (service) {
          const next = serviceIndex + delta
          if (next >= 0 && next < category.list.length) dashboard.reorderServices(category.name, arrayMove(category.list, serviceIndex, next))
        } else {
          const items = dashboard.config!.items
          const next = categoryIndex + delta
          if (next >= 0 && next < items.length) dashboard.reorderCategories(arrayMove(items, categoryIndex, next))
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (['j', 'k', 'arrowdown', 'arrowup', 'arrowleft', 'arrowright', 'home', 'end'].includes(key)) {
        const items = Array.from(document.querySelectorAll<HTMLElement>('.rack-section__header, .drive-bay:not(.drive-bay--add)'))
        const current = items.findIndex((item) => item === target || item.contains(target))
        const delta = ['k', 'arrowup', 'arrowleft'].includes(key) ? -1 : 1
        const next = key === 'home' ? 0 : key === 'end' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + delta))
        event.preventDefault()
        items[next]?.focus()
        return
      }

      switch (key) {
        case '?': setHelpOpen((open) => !open); break
        case 'e': dashboard.toggleEditMode(); break
        case 'v': if (window.matchMedia('(min-width: 640px)').matches) toggleLayout(); break
        case 't': setTheme(getNextTheme(theme)); break
        case 'i': document.getElementById('dashboard-config-import')?.click(); break
        case 'o': void dashboard.exportConfig(); break
        case 'g': dashboard.openAuditLogs(); break
        case 'a':
          if (!dashboard.isEditMode) dashboard.toggleEditMode()
          dashboard.openAddCategory()
          break
        case 'n': if (dashboard.isEditMode && category) dashboard.openAddService(category.name); break
        case 'r':
          if (!dashboard.isEditMode || !category) return
          if (service) dashboard.openEditService(category.name, service, serviceIndex)
          else dashboard.openEditCategory(category, categoryIndex)
          break
        case 'd':
          if (!dashboard.isEditMode || !category) return
          if (service) void dashboard.deleteService(category.name, serviceIndex)
          else void dashboard.deleteCategory(category.name)
          break
        case 'escape': if (dashboard.isEditMode) dashboard.toggleEditMode(); break
        default: return
      }
      event.preventDefault()
    }
    // Capture form shortcuts before a Select or Checkbox consumes Enter.
    const handleFormShortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat || !(event.ctrlKey || event.metaKey)) return
      const dialogs = document.querySelectorAll<HTMLElement>('.chassis-modal')
      const dialog = dialogs[dialogs.length - 1]
      if (!dialog || dialog.getAttribute('role') === 'alertdialog') return
      if (event.key === 'Enter' && dialog.querySelector('form')) {
        event.preventDefault()
        event.stopPropagation()
        dialog.querySelector('form')!.requestSubmit()
      } else if (event.shiftKey && event.key === 'Delete') {
        event.preventDefault()
        event.stopPropagation()
        dialog.querySelector<HTMLButtonElement>('.wm-form-button--danger')?.click()
      }
    }
    window.addEventListener('keydown', handleFormShortcut, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleFormShortcut, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dashboard, toggleLayout, helpOpen, theme, setTheme])

  return { helpOpen, openHelp: () => setHelpOpen(true), closeHelp: () => setHelpOpen(false) }
}
