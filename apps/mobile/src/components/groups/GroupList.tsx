import { FlatList, View, RefreshControl, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { GroupCard } from './GroupCard'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'

interface GroupListGroup {
  id: string
  name: string
  memberCount: number
  avatarUrl?: string | null
}

interface GroupListProps {
  groups: GroupListGroup[]
  onPress: (groupId: string) => void
  loading?: boolean
  emptyMessage?: string
  onRefresh?: () => void
  refreshing?: boolean
  style?: ViewStyle
}

function SkeletonCard() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        minHeight: 44,
      }}
    >
      <Skeleton
        width={48}
        height={48}
        borderRadius={24}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} borderRadius={4} />
        <Skeleton width="35%" height={12} borderRadius={4} />
      </View>
    </View>
  )
}

export function GroupList({
  groups,
  onPress,
  loading = false,
  emptyMessage = 'No hay grupos disponibles',
  onRefresh,
  refreshing = false,
  style,
}: GroupListProps) {
  const { colors } = useTheme()

  if (loading) {
    return (
      <View style={[{ padding: 16 }, style]}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    )
  }

  return (
    <FlatList
      data={groups}
      keyExtractor={(item) => item.id}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={
        <EmptyState
          title={emptyMessage}
          subtitle="Crea uno o acepta una invitación para empezar"
        />
      }
      renderItem={({ item }) => (
        <GroupCard
          group={item}
          onPress={() => onPress(item.id)}
        />
      )}
      style={style}
    />
  )
}
