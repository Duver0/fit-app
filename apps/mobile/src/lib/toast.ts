import { useUIStore } from '../stores/uiStore'

/**
 * Muestra un toast desde cualquier parte del código (no solo componentes).
 * Útil para mostrar resultados de uploads, acciones manuales, etc.
 */
export function showToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
) {
  useUIStore.getState().addToast({ message, type })
}

/**
 * Atajo para mostrar un error sin tener que escribir el type cada vez.
 */
export function showErrorToast(message: string) {
  showToast(message, 'error')
}

/**
 * Atajo para mostrar un éxito.
 */
export function showSuccessToast(message: string) {
  showToast(message, 'success')
}
