import { View, Text, ViewStyle, StyleSheet } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface BadgeProps {
  text: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  style?: ViewStyle
}

export function Badge({ text, variant = 'default', style }: BadgeProps) {
  const { colors } = useTheme()

  const bgColor = (() => {
    if (variant === 'success') return colors.success
    if (variant === 'warning') return colors.warning
    if (variant === 'error') return colors.error
    return colors.border
  })()

  const textColor = (() => {
    if (variant === 'default') return colors.textSecondary
    return '#1A1A1A'
  })()

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor },
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: textColor }]}
        accessibilityRole="text"
      >
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
