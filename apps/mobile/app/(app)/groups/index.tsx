import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { useGroups } from '../../../src/hooks/useGroups'
import { getImageUrl } from '../../../src/lib/api'
import ScreenHeader from '../../../src/components/ui/ScreenHeader'
import InvitationBell from '../../../src/components/InvitationBell'
import { Ionicons } from '@expo/vector-icons'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days}d`
  const months = Math.floor(days / 30)
  return `hace ${months}mes`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

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
      <ScreenHeader
        title="Mis Grupos"
        showBack={false}
        rightAction={<InvitationBell />}
      />

      <FlatList
        data={groups}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 96 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 16 }}>No tienes grupos aún</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Creá un grupo o aceptá una invitación para empezar</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/groups/${item.id}`)}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {/* Color accent bar */}
            <View style={{ height: 4, backgroundColor: colors.primary }} />

            <View style={{ padding: 20 }}>
              {/* Top row: avatar + name */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {getImageUrl(item.avatarUrl) ? (
                  <Image
                    source={{ uri: getImageUrl(item.avatarUrl) }}
                    style={{ width: 64, height: 64, borderRadius: 20, marginRight: 16 }}
                  />
                ) : (
                  <View style={{
                    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary + '20',
                    justifyContent: 'center', alignItems: 'center', marginRight: 16,
                  }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>

              {/* Meta row */}
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="people" size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
                  </Text>
                </View>
                {item.owner && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="person" size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                      {item.owner.name}
                    </Text>
                  </View>
                )}
                {item.createdAt && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push('/(app)/groups/create')}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30,
          justifyContent: 'center', alignItems: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={32} color={colors.text} />
      </TouchableOpacity>
    </View>
  )
}
