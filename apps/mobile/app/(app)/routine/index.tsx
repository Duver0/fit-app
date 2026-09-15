import { useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { MY_ROUTINE_DAYS_QUERY } from '../../../src/lib/graphql'
import ScreenHeader from '../../../src/components/ui/ScreenHeader'
import { Skeleton } from '../../../src/components/ui/Skeleton'
import { ErrorState } from '../../../src/components/ui/ErrorState'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { AvatarStack } from '../../../src/components/ui/AvatarStack'
import { DAY_NAMES, DayOfWeek } from '../../../src/utils/dayHelpers'

interface RoutineExercise {
  id: string
  name: string
  imageUrl?: string | null
}

interface RoutineDay {
  id: string
  dayOfWeek: number
  name?: string | null
  exercises: Array<{ exercise: RoutineExercise }>
}

export default function RoutineIndexScreen() {
  const { colors } = useTheme()
  const { data, loading, error, refetch } = useQuery(MY_ROUTINE_DAYS_QUERY)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // --- Loading state ---
  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Mi Rutina" showBack={false} />
        <View style={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={{ width: '48%', marginBottom: 16 }}>
              <Skeleton height={140} borderRadius={16} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Mi Rutina" showBack={false} />
        <ErrorState
          message={error.message || 'Error al cargar la rutina'}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  const routineDays = (data?.myRoutineDays as RoutineDay[]) || []

  // Build a map dayOfWeek -> exercises for quick lookup
  const dayMap: Record<number, { id: string; name?: string | null; exercises: RoutineExercise[] }> = {}
  routineDays.forEach((day: RoutineDay) => {
    dayMap[day.dayOfWeek] = {
      id: day.id,
      name: day.name,
      exercises: day.exercises?.map((e) => e.exercise).filter(Boolean) || [],
    }
  })

  // Day of rest = the FIRST day of the week WITHOUT exercises (not fixed to Sunday).
  const emptyDay = [0, 1, 2, 3, 4, 5, 6].find(
    (d) => !(dayMap[d]?.exercises?.length > 0),
  ) ?? 6

  // Work days first (in week order), then the rest day at the END of the grid.
  const orderedDays: DayOfWeek[] = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[])
    .filter((d) => d !== emptyDay)
    .concat([emptyDay as DayOfWeek])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Mi Rutina" showBack={false} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Empty state: no days have exercises */}
        {routineDays.length === 0 && (
          <EmptyState
            title="Rutina vacía"
            subtitle="Agrega ejercicios a tu rutina desde un día específico"
          />
        )}

        {/* Grid of days: work days first, rest day last */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {orderedDays.map((dayOfWeek) => {
            const dayData = dayMap[dayOfWeek]
            const exercises = dayData?.exercises || []
            const hasExercises = exercises.length > 0
            const restDay = dayOfWeek === emptyDay

            // Display name: full day name in grid
            const displayName = DAY_NAMES[dayOfWeek]

            // Accessibility label
            const accessibilityLabel = restDay
              ? `${DAY_NAMES[dayOfWeek]}, día de descanso`
              : `${DAY_NAMES[dayOfWeek]}${hasExercises ? `, ${exercises.length} ejercicios` : ', sin ejercicios'}`

            const onPress = () => router.push(`/(app)/routine/${dayOfWeek}`)

            return (
              <TouchableOpacity
                key={dayOfWeek}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  backgroundColor: restDay ? colors.background : colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: restDay ? colors.primary + '4D' : colors.border, // 30% opacity
                  padding: 16,
                  width: '48%',
                  marginBottom: 16,
                  opacity: restDay ? 0.6 : 1,
                  overflow: 'hidden', // Prevent AvatarStack from overflowing card bounds
                }}
                activeOpacity={restDay ? 1 : 0.7}
              >
                {/* Day name */}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: restDay ? colors.textSecondary : colors.text,
                    marginBottom: restDay ? 0 : 8,
                  }}
                >
                  {displayName}
                </Text>

                {/* Work day: AvatarStack + count, left-aligned below the day name */}
                {!restDay && hasExercises && (
                  <View style={{ alignItems: 'flex-start' }}>
                    <AvatarStack
                      exercises={exercises.map((ex: RoutineExercise) => ({
                        id: ex.id,
                        name: ex.name,
                        imageUrl: ex.imageUrl,
                      }))}
                      maxVisible={4}
                      size={32}
                      showCount={true}
                    />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        marginTop: 8,
                      }}
                    >
                      Ejercicios: {exercises.length}
                    </Text>
                  </View>
                )}

                {/* Rest day: Moon icon centered */}
                {restDay && (
                  <View style={{ marginTop: 24, alignItems: 'center' }}>
                    <Ionicons
                      name="moon"
                      size={48}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.textSecondary,
                      }}
                    >
                      Día de descanso
                    </Text>
                  </View>
                )}

                {/* Work day without exercises: placeholder text */}
                {!restDay && !hasExercises && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                    Sin ejercicios
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}