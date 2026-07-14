import { View, Text, ViewStyle, StyleSheet } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { Avatar } from './Avatar'

interface PodiumItem {
  rank: number
  name: string
  value: number
  avatarUrl?: string | null
}

interface PodiumProps {
  items: PodiumItem[]
  style?: ViewStyle
}

const MEDAL_EMOJIS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

const COLUMN_HEIGHTS: Record<number, number> = {
  1: 140,
  2: 100,
  3: 80,
}

const ORDER: number[] = [2, 1, 3]

export function Podium({ items, style }: PodiumProps) {
  const { colors } = useTheme()

  const ranked = items.slice(0, 3).reduce<Record<number, PodiumItem>>(
    (acc, item) => {
      acc[item.rank] = item
      return acc
    },
    {},
  )

  return (
    <View style={[styles.container, style]}>
      {ORDER.map((rank) => {
        const item = ranked[rank]
        if (!item) return <View key={rank} style={styles.column} />

        const height = COLUMN_HEIGHTS[rank]

        return (
          <View key={rank} style={styles.column}>
            {item.avatarUrl !== undefined && (
              <Avatar
                name={item.name}
                size={36}
                avatarUrl={item.avatarUrl}
                style={styles.avatar}
              />
            )}
            <Text style={styles.medal} accessibilityLabel={`Rank ${rank}`}>
              {MEDAL_EMOJIS[rank]}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor:
                    rank === 1
                      ? colors.primary
                      : rank === 2
                      ? colors.secondary
                      : colors.accent,
                },
              ]}
            />
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.value, { color: colors.textSecondary }]}
            >
              {item.value}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 100,
  },
  avatar: {
    marginBottom: 4,
  },
  medal: {
    fontSize: 28,
    marginBottom: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 20,
    marginBottom: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    textAlign: 'center',
  },
})
