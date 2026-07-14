import { TouchableOpacity, View, Text, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface ExercisePreviewTopItem {
  rank: number
  name: string
  value: number
}

interface ExercisePreviewExercise {
  id: string
  name: string
  unit: string
}

interface ExercisePreviewProps {
  exercise: ExercisePreviewExercise
  top?: ExercisePreviewTopItem[]
  onPress: () => void
  style?: ViewStyle
}

export function ExercisePreview({
  exercise,
  top,
  onPress,
  style,
}: ExercisePreviewProps) {
  const { colors } = useTheme()

  const hasTop = top && top.length > 0

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name} - ${exercise.unit}${hasTop ? `, mejor marca: ${top![0].name} ${top![0].value}` : ', sin marcas'}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 44,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {/* Exercise name and unit */}
      <Text
        style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
        numberOfLines={1}
      >
        {exercise.name}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
        {exercise.unit}
      </Text>

      {/* Top performer preview */}
      {hasTop ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 18,
              fontWeight: 'bold',
              marginRight: 6,
            }}
          >
            {top![0].value}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
            {top![0].name}
          </Text>
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          Sin registros
        </Text>
      )}

      {/* Additional top performers indicator */}
      {hasTop && top!.length > 1 && (
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
          +{top!.length - 1} {top!.length - 1 === 1 ? 'más' : 'más'}
        </Text>
      )}
    </TouchableOpacity>
  )
}
