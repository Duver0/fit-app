import { createContext, useContext, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { colors, ThemeColors } from './colors'
import { useThemeStore } from '../stores/themeStore'

interface ThemeContextValue {
  colors: ThemeColors
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: colors.light,
  isDark: false,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const storeDark = useThemeStore(state => state.isDark)
  const isDark = storeDark ?? systemScheme === 'dark'

  return (
    <ThemeContext.Provider value={{ colors: isDark ? colors.dark : colors.light, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
