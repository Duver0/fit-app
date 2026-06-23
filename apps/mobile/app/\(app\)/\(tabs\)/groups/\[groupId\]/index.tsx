import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery } from '@apollo/client'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, TOP3_RANKING_QUERY } from '../../../../../src/lib/graphql'

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()

  const { data: groupData, loading: groupLoading, refetch: refetchGroup } = useQuery(GROUP_QUERY, {
    variables: { id: groupId },
  })
  const { data: rankingData, loading: rankingLoading, refetch: refetchRanking } = useQuery(TOP3_RANKING_QUERY, {
    variables: { groupId },
  })

  const group = groupData?.group
  const isLoading = groupLoading || rankingLoading

  const handleRefetch = () => {
    refetchGroup()
    refetchRanking()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: group?.name || 'Grupo' }} />

      <View style={{ padding: 24, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
              justifyContent: 'center', alignItems: 'center', marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                {group?.name?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>{group?.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {group?.memberCount} miembros
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push(`/(app)/(tabs)/groups/${groupId}/members`)}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Miembros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rankingData?.top3Ranking || []}
          keyExtractor={(item: any) => item.exercise.id}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
                Ranking por ejercicio
              </Text>
              {(!rankingData?.top3Ranking || rankingData.top3Ranking.length === 0) && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textSecondary }}>No hay ejercicios en este grupo aún</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }: any) => (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/(tabs)/groups/${groupId}/exercises/${item.exercise.id}`)}
              style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.exercise.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.exercise.unit}</Text>
              </View>

              {item.top.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sin marcas registradas</Text>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 }}>
                  {item.top.slice(0, 3).map((record: any, index: number) => {
                    const heights = [70, 50, 35]
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <View key={record.id} style={{ alignItems: 'center', width: 80 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{record.value}</Text>
                        <View style={{
                          width: 48,
                          height: heights[index],
                          backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                          borderRadius: 8,
                          marginVertical: 4,
                        }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{record.user.name}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
