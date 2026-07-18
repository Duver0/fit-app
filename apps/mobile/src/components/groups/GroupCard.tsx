import { TouchableOpacity, View, Text, Image, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { getImageUrl } from '../../lib/api'

interface GroupCardGroup {
  id: string
  name: string
  memberCount: number
  avatarUrl?: string | null
}

interface GroupCardProps {
  group: GroupCardGroup
  onPress: () => void
  style?: ViewStyle
}

export function GroupCard({ group, onPress, style }: GroupCardProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Grupo ${group.name}, ${group.memberCount} miembros`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {getImageUrl(group.avatarUrl) ? (
        <Image
          source={{ uri: getImageUrl(group.avatarUrl) }}
          style={[styles.avatar, { backgroundColor: colors.primary }]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.text }]}>
            {group.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
})
