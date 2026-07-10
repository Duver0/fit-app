import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useGroups } from '../../../../src/hooks/useGroups'

export default function GroupsScreen() {
  const { colors } = useTheme()
  const { groups, isLoading, error, refetch } = useGroups()

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>Error al cargar grupos</Text>
        <TouchableOpacity onPress={refetch} style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 24, padding: 12, paddingHorizontal: 24 }}>
          <Text style={{ color: colors.text }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>Mis Grupos</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No tienes grupos aún</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Crea uno o acepta una invitación</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(tabs)/groups/${item.id}`)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
              justifyContent: 'center', alignItems: 'center', marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push('/(app)/(tabs)/groups/create')}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28,
          justifyContent: 'center', alignItems: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 28, color: colors.text, fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  )
}
