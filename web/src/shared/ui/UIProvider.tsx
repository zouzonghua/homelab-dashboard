import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Button } from '@base-ui/react/button'
import { Toast } from '@base-ui/react/toast'
import { toastManager } from './notifications'

const ConfirmContext = createContext<((message: string) => Promise<boolean>) | null>(null)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm requires UIProvider')
  return confirm
}

function Notifications() {
  const { toasts } = Toast.useToastManager()
  return <Toast.Portal><Toast.Viewport className="toast-viewport">
    {toasts.map((toast) => <Toast.Root key={toast.id} toast={toast} className="toast">
      <Toast.Content><Toast.Title /><Toast.Description /></Toast.Content>
      <Toast.Close className="icon-button" aria-label="Dismiss notification">×</Toast.Close>
    </Toast.Root>)}
  </Toast.Viewport></Toast.Portal>
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)
  const cancelRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const confirm = (text: string) => {
    if (resolveRef.current) return Promise.resolve(false)
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setMessage(text)
    })
  }
  const finish = (result: boolean) => {
    const resolve = resolveRef.current
    resolveRef.current = null
    setMessage(null)
    resolve?.(result)
  }
  return <ConfirmContext.Provider value={confirm}>
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Notifications />
      <AlertDialog.Root open={message !== null} onOpenChange={(open) => { if (!open) finish(false) }}>
        <AlertDialog.Portal><AlertDialog.Backdrop className="dialog-backdrop" />
          <AlertDialog.Popup className="chassis-modal confirm-dialog" initialFocus={cancelRef} finalFocus={returnFocusRef}>
            <AlertDialog.Title>Confirm deletion</AlertDialog.Title>
            <AlertDialog.Description>{message}</AlertDialog.Description>
            <div className="wm-form-actions"><div className="wm-form-actions__confirm">
              <Button ref={cancelRef} onClick={() => finish(false)}>Cancel</Button>
              <Button className="danger" onClick={() => finish(true)}>Delete</Button>
            </div></div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Toast.Provider>
  </ConfirmContext.Provider>
}
