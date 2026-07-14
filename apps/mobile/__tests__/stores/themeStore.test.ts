import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../../src/stores/themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDark: false })
  })

  describe('initial state', () => {
    it('should start with isDark = false', () => {
      expect(useThemeStore.getState().isDark).toBe(false)
    })
  })

  describe('toggle', () => {
    it('should switch isDark from false to true', () => {
      useThemeStore.getState().toggle()
      expect(useThemeStore.getState().isDark).toBe(true)
    })

    it('should switch isDark from true to false', () => {
      useThemeStore.setState({ isDark: true })
      useThemeStore.getState().toggle()
      expect(useThemeStore.getState().isDark).toBe(false)
    })

    it('should toggle multiple times correctly', () => {
      useThemeStore.getState().toggle()
      useThemeStore.getState().toggle()
      expect(useThemeStore.getState().isDark).toBe(false)

      useThemeStore.getState().toggle()
      useThemeStore.getState().toggle()
      useThemeStore.getState().toggle()
      expect(useThemeStore.getState().isDark).toBe(true)
    })
  })

  describe('setDark', () => {
    it('should set isDark to true', () => {
      useThemeStore.getState().setDark(true)
      expect(useThemeStore.getState().isDark).toBe(true)
    })

    it('should set isDark to false', () => {
      useThemeStore.setState({ isDark: true })
      useThemeStore.getState().setDark(false)
      expect(useThemeStore.getState().isDark).toBe(false)
    })

    it('should set isDark to same value without error', () => {
      useThemeStore.getState().setDark(false)
      expect(useThemeStore.getState().isDark).toBe(false)
    })
  })
})
