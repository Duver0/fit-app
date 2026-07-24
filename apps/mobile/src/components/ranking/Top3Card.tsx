import { TouchableOpacity, View, Text, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { Podium } from '../ui/Podium'

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'pts',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

interface Top3TopItem {
  rank: number
  name: string
  value: number
  avatarUrl?: string | null
}

interface Top3CardExercise {
  name: string
  unit: string
}

interface Top3CardProps {
  exercise: Top3CardExercise
  top: Top3TopItem[]
  onPress: () => void
  style?: ViewStyle
}

export function Top3Card({ exercise, top, onPress, style }: Top3CardProps) {
  const { colors } = useTheme()

  const hasTop = top.length > 0
  const displayTop = top.slice(0, 3).map((t) => ({
    ...t,
    unitLabel: UNIT_LABELS[exercise.unit] || exercise.unit,
  }))

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ranking de ${exercise.name}. ${hasTop ? `Top: ${displayTop.map(t => `${t.name} ${t.value}`).join(', ')}` : 'Sin marcas registradas'}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 44,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {exercise.unit}
        </Text>
      </View>

      {/* Podium */}
      {!hasTop ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Sin marcas registradas
        </Text>
      ) : (
        <Podium items={displayTop} />
      )}
    </TouchableOpacity>
  )
}
