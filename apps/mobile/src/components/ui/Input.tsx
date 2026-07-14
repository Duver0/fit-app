import { useState } from 'react'
import {
  View,
  TextInput as RNTextInput,
  Text,
  TextInputProps,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  style?: ViewStyle
}

export function Input({
  label,
  error,
  style,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[styles.label, { color: colors.text }]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <RNTextInput
        {...textInputProps}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: colors.text,
          },
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setIsFocused(true)
          textInputProps.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          textInputProps.onBlur?.(e)
        }}
        accessibilityLabel={label || textInputProps.placeholder || 'Input'}
      />
      {error && (
        <Text
          style={[styles.error, { color: colors.error }]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
})
