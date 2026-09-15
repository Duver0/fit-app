import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRef, useEffect } from 'react'
import { useTheme } from '../../theme/ThemeProvider'

interface NumberSpinnerProps {
  /** The numeric string value ('' allowed for empty) */
  value: string
  onChange: (value: string) => void
  /** Increment step (e.g. 1 for reps, 2.5 for kg) */
  step?: number
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Number of decimals for display (0 = integer, 1 = one decimal, etc.) */
  decimals?: number
  /** Optional unit suffix shown next to the number (e.g. 'kg', 'reps') */
  unit?: string
  accessibilityLabel?: string
}

/**
 * A playful stepper for numeric input: big bold number in the middle,
 * round -/+ controls on the sides. Feels like a game, not a form.
 */
export function NumberSpinner({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 0,
  unit,
  accessibilityLabel = 'Valor',
}: NumberSpinnerProps) {
  const { colors } = useTheme()

  const parsed = value === '' ? NaN : parseFloat(value)
  const isNumber = !isNaN(parsed)
  const displayValue = !isNumber ? '0' : parsed.toFixed(decimals)

  // Quick pop animation when the value changes (gamified feel)
  const scale = useRef(new Animated.Value(1)).current
  useEffect(() => {
    scale.setValue(1.15)
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start()
  }, [displayValue, scale])

  const setFromNumber = (n: number) => {
    const clamped = Math.min(Math.max(n, min), max)
    const formatted =
      decimals > 0
        ? clamped.toFixed(decimals)
        : Math.round(clamped).toString()
    onChange(formatted)
  }

  const handleDecrement = () => setFromNumber((isNumber ? parsed : min) - step)
  const handleIncrement = () => setFromNumber((isNumber ? parsed : min) + step)

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleDecrement}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} disminuir`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.button,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Ionicons name="remove" size={24} color={colors.primary} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.valueBox,
          {
            backgroundColor: colors.primary + '12',
            borderColor: colors.primary + '40',
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          style={[styles.valueText, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {displayValue}
        </Text>
        {unit ? (
          <Text style={[styles.unitText, { color: colors.textSecondary }]}>
            {unit}
          </Text>
        ) : null}
      </Animated.View>

      <TouchableOpacity
        onPress={handleIncrement}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} aumentar`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.button,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Ionicons name="add" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueBox: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  valueText: {
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
  },
})