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

const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

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
        <ScreenHeader title="Mi Rutina" />
        <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={{ width: '48%', marginBottom: 12 }}>
              <Skeleton height={100} borderRadius={16} />
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
        <ScreenHeader title="Mi Rutina" />
        <ErrorState
          message={error.message || 'Error al cargar la rutina'}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  const routineDays = data?.myRoutineDays || []

  // Build a map dayOfWeek -> exercises for quick lookup
  const dayMap: Record<number, { id: string; exercises: any[] }> = {}
  routineDays.forEach((day: any) => {
    dayMap[day.dayOfWeek] = { id: day.id, exercises: day.exercises || [] }
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Mi Rutina" />

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
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

        {/* Grid of 7 days */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }).map((_, index) => {
            const dayOfWeek = index
            const dayData = dayMap[dayOfWeek]
            const exercises = dayData?.exercises || []
            const hasExercises = exercises.length > 0
            const customName = dayData?.name

            return (
              <TouchableOpacity
                key={dayOfWeek}
                onPress={() => router.push(`/(app)/routine/${dayOfWeek}`)}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_NAMES[dayOfWeek]}${hasExercises ? `, ${exercises.length} ejercicios` : ', sin ejercicios'}`}
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
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                  {customName || DAY_NAMES[dayOfWeek]}
                </Text>
                {customName && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 6 }}>
                    {DAY_NAMES[dayOfWeek]}
                  </Text>
                )}

                {hasExercises ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''}
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
          })}
        </View>
      </ScrollView>
    </View>
  )
}
