import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [], globalLoading: false })
  })

  describe('initial state', () => {
    it('should start with empty toasts', () => {
      expect(useUIStore.getState().toasts).toEqual([])
    })

    it('should start with globalLoading = false', () => {
      expect(useUIStore.getState().globalLoading).toBe(false)
    })
  })

  describe('addToast', () => {
    it('should add a toast with a generated id', () => {
      useUIStore.getState().addToast({ message: 'Hello', type: 'success' })
      const toasts = useUIStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe('Hello')
      expect(toasts[0].type).toBe('success')
      expect(toasts[0].id).toBeDefined()
      expect(typeof toasts[0].id).toBe('string')
    })

    it('should add multiple toasts', () => {
      useUIStore.getState().addToast({ message: 'First' })
      useUIStore.getState().addToast({ message: 'Second' })
      expect(useUIStore.getState().toasts).toHaveLength(2)
    })

    it('should default type to undefined when not provided', () => {
      useUIStore.getState().addToast({ message: 'No type' })
      expect(useUIStore.getState().toasts[0].type).toBeUndefined()
    })
  })

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      useUIStore.getState().addToast({ message: 'Toast 1' })
      useUIStore.getState().addToast({ message: 'Toast 2' })
      const [first, second] = useUIStore.getState().toasts

      useUIStore.getState().removeToast(first.id)

      const remaining = useUIStore.getState().toasts
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(second.id)
    })

    it('should do nothing when id does not exist', () => {
      useUIStore.getState().addToast({ message: 'Only toast' })
      useUIStore.getState().removeToast('non-existent-id')
      expect(useUIStore.getState().toasts).toHaveLength(1)
    })

    it('should do nothing when toasts is empty', () => {
      useUIStore.getState().removeToast('any-id')
      expect(useUIStore.getState().toasts).toEqual([])
    })
  })

  describe('setGlobalLoading', () => {
    it('should set globalLoading to true', () => {
      useUIStore.getState().setGlobalLoading(true)
      expect(useUIStore.getState().globalLoading).toBe(true)
    })

    it('should set globalLoading to false', () => {
      useUIStore.getState().setGlobalLoading(true)
      useUIStore.getState().setGlobalLoading(false)
      expect(useUIStore.getState().globalLoading).toBe(false)
    })
  })
})
