import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'

export default function Modal({ open = true, title, children, onClose, className = '' }: {
  open?: boolean
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup className={`chassis-modal ${className}`} aria-label={title}>
        <Dialog.Title className="dialog-title">{title}</Dialog.Title>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
