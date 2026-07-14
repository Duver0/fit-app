import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  StyleSheet,
  TextStyle,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig: Record<
  NonNullable<ButtonProps['size']>,
  { height: number; textSize: number }
> = {
  sm: { height: 36, textSize: 14 },
  md: { height: 44, textSize: 16 },
  lg: { height: 56, textSize: 18 },
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  size = 'md',
}: ButtonProps) {
  const { colors } = useTheme()
  const config = sizeConfig[size]

  const bgColor = (() => {
    if (variant === 'secondary') return colors.secondary
    if (variant === 'danger') return colors.error
    if (variant === 'ghost') return 'transparent'
    return colors.primary
  })()

  const textColor = (() => {
    if (variant === 'ghost') return colors.text
    return '#1A1A1A'
  })()

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          height: config.height,
          borderRadius: config.height / 2,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: textColor, fontSize: config.textSize },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontWeight: '600',
  },
})
