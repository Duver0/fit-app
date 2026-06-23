import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

interface UIState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  globalLoading: boolean
  setGlobalLoading: (val: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set(state => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  globalLoading: false,
  setGlobalLoading: (val) => set({ globalLoading: val }),
}))
