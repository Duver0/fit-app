import {
  View,
  Text,
  Pressable,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface CardProps {
  title?: string
  subtitle?: string
  onPress?: () => void
  children?: React.ReactNode
  style?: ViewStyle
}

export function Card({
  title,
  subtitle,
  onPress,
  children,
  style,
}: CardProps) {
  const { colors } = useTheme()

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.text,
        },
        style,
      ]}
    >
      {title && (
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title || 'Card'}
        style={({ pressed }) => [
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
})
