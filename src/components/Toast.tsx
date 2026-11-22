import { Check, AlertTriangle } from 'lucide-react'

export type ToastTone = 'ok' | 'error'

export interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

interface ToastProps {
  toast: ToastState | null
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`} role="status">
      {toast.tone === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
      <span>{toast.message}</span>
    </div>
  )
}
