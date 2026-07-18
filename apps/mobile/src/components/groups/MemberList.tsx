import { FlatList, View, Text, Image, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { getImageUrl } from '../../lib/api'

interface MemberListUser {
  id: string
  name: string
  avatarUrl?: string | null
}

interface MemberListItem {
  id: string
  user: MemberListUser
  role: string
}

interface MemberListProps {
  members: MemberListItem[]
  isOwner?: boolean
  onRemove?: (userId: string) => void
  onInvite?: () => void
  style?: ViewStyle
}

export function MemberList({
  members,
  isOwner = false,
  onRemove,
  onInvite,
  style,
}: MemberListProps) {
  const { colors } = useTheme()

  const renderMember = ({ item }: { item: MemberListItem }) => {
    const isOwnerMember = item.role === 'OWNER'

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {getImageUrl(item.user.avatarUrl) ? (
          <Image
            source={{ uri: getImageUrl(item.user.avatarUrl) }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isOwnerMember ? colors.warning : colors.accent,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
              {item.user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '500' }} numberOfLines={1}>
            {item.user.name}
          </Text>
        </View>

        {isOwnerMember && (
          <View
            style={{
              backgroundColor: colors.warning + '40',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12 }}>
              Dueño
            </Text>
          </View>
        )}

        {isOwner && !isOwnerMember && onRemove && (
          <TouchableOpacity
            onPress={() => onRemove(item.user.id)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar a ${item.user.name} del grupo`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.error + '20',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 12 }}>
              Eliminar
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        isOwner && onInvite ? (
          <TouchableOpacity
            onPress={onInvite}
            accessibilityRole="button"
            accessibilityLabel="Invitar miembro"
            style={{
              backgroundColor: colors.primary,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              alignSelf: 'flex-start',
              marginBottom: 16,
              minHeight: 44,
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              + Invitar
            </Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
            No hay miembros en este grupo
          </Text>
        </View>
      }
      renderItem={renderMember}
      style={style}
    />
  )
}
