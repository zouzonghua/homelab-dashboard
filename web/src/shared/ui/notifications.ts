import { Toast } from '@base-ui/react/toast'

export const toastManager = Toast.createToastManager()
export const notify = {
  success: (title: string) => toastManager.add({ title, type: 'success', timeout: 2500 }),
  error: (title: string) => toastManager.add({ title, type: 'error', timeout: 5000 }),
}
