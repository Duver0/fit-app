import { View, Text, ViewStyle, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { Button } from './Button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  style?: ViewStyle
}

export function ErrorState({ message, onRetry, style }: ErrorStateProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <Ionicons
        name="alert-circle"
        size={48}
        color={colors.error}
        style={styles.icon}
        accessibilityLabel="Error"
      />
      <Text style={[styles.message, { color: colors.error }]}>
        {message}
      </Text>
      {onRetry && (
        <View style={styles.action}>
          <Button
            title="Retry"
            onPress={onRetry}
            variant="danger"
            size="md"
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  action: {
    marginTop: 24,
    minWidth: 160,
  },
})
