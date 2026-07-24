import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'

interface DayCardProps {
  dayOfWeek: number
  name: string
  hasExercises: boolean
  exerciseCount: number
  onPress: () => void
}

const DAY_LABELS: Record<number, string> = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo',
}

export default function DayCard({
  dayOfWeek,
  name,
  hasExercises,
  exerciseCount,
  onPress,
}: DayCardProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}${hasExercises ? `, ${exerciseCount} ejercicios` : ', sin ejercicios'}`}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        width: '48%',
        marginBottom: 12,
      }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
        {name}
      </Text>

      {hasExercises ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Sin ejercicios
        </Text>
      )}

      <View style={{
        marginTop: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: hasExercises ? colors.primary + '20' : colors.border,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: hasExercises ? colors.primary : colors.textSecondary,
        }}>
          {dayOfWeek + 1}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
