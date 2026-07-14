import { View, Text, Switch, StyleSheet } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { useThemeStore } from '../../stores/themeStore'

export function ThemeToggle() {
  const { colors } = useTheme()
  const isDark = useThemeStore((state) => state.isDark)
  const toggle = useThemeStore((state) => state.toggle)

  return (
    <View style={styles.container} accessibilityLabel="Theme toggle">
      <Text style={[styles.icon]}>
        {isDark ? '🌙' : '☀️'}
      </Text>
      <Switch
        value={isDark}
        onValueChange={toggle}
        trackColor={{
          false: colors.border,
          true: colors.primary,
        }}
        thumbColor={colors.surface}
        accessibilityLabel={
          isDark ? 'Switch to light mode' : 'Switch to dark mode'
        }
        accessibilityRole="switch"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
})
