import { View, Text, StyleSheet } from 'react-native'
import { Avatar } from './Avatar'
import { useTheme } from '../../theme/ThemeProvider'

interface ExerciseWithImage {
  id: string
  name: string
  imageUrl?: string | null
}

interface AvatarStackProps {
  exercises: ExerciseWithImage[]
  maxVisible?: number
  size?: number
  showCount?: boolean
}

const DEFAULT_MAX_VISIBLE = 4
const DEFAULT_SIZE = 32

export function AvatarStack({
  exercises,
  maxVisible = DEFAULT_MAX_VISIBLE,
  size = DEFAULT_SIZE,
  showCount = true,
}: AvatarStackProps) {
  const { colors } = useTheme()

  if (!exercises || exercises.length === 0) {
    return null
  }

  const visibleExercises = exercises.slice(0, maxVisible)
  const overflowCount = exercises.length - maxVisible

  return (
    <View style={styles.container}>
      {visibleExercises.map((exercise, index) => (
        <View
          key={exercise.id}
          style={[
            styles.avatarWrapper,
            {
              marginLeft: index === 0 ? 0 : -size * 0.35,
              zIndex: maxVisible - index,
            },
          ]}
        >
          <Avatar
            name={exercise.name}
            size={size}
            avatarUrl={exercise.imageUrl || null}
          />
          {/* White ring separator between stacked avatars */}
          {index < visibleExercises.length - 1 && (
            <View style={[
              styles.ring,
              { width: size, height: size, borderWidth: 2, borderColor: colors.background },
            ]} />
          )}
        </View>
      ))}

      {showCount && (
        <Text style={[
          styles.count,
          { fontSize: size * 0.4, color: colors.textSecondary },
        ]}>
          {exercises.length}
        </Text>
      )}

      {overflowCount > 0 && (
        <View
          style={[
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          accessibilityLabel={`Y ${overflowCount} ejercicios más`}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.4 }]}>+{overflowCount}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexWrap: 'nowrap',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 9999,
  },
  count: {
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 0,
  },
  overflow: {
    backgroundColor: '#E8E0D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    flexShrink: 0,
  },
  overflowText: {
    fontWeight: '700',
    color: '#636E72',
  },
})