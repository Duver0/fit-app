import { View, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface RankingRowProps {
  rank: number
  name: string
  value: number
  avatarUrl?: string | null
  isMine?: boolean
  onDispute?: () => void
  hasDispute?: boolean
  style?: ViewStyle
}

export function RankingRow({
  rank,
  name,
  value,
  avatarUrl,
  isMine = false,
  onDispute,
  hasDispute = false,
  style,
}: RankingRowProps) {
  const { colors } = useTheme()

  return (
    <View
      style={[
        {
          backgroundColor: isMine ? colors.primary + '18' : colors.surface,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: isMine ? colors.primary + '40' : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
        },
        style,
      ]}
    >
      {/* Rank number */}
      <Text
        style={{
          width: 32,
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: 16,
          color: rank <= 3 ? colors.primary : colors.textSecondary,
        }}
      >
        #{rank}
      </Text>

      {/* Avatar */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.accent,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 8,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Name */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: isMine ? '700' : '500',
          }}
          numberOfLines={1}
        >
          {name}
          {isMine ? ' (tú)' : ''}
        </Text>
      </View>

      {/* Value */}
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: 'bold',
          marginRight: 8,
        }}
      >
        {value}
      </Text>

      {/* Dispute button */}
      {!isMine && onDispute && (
        <TouchableOpacity
          onPress={onDispute}
          accessibilityRole="button"
          accessibilityLabel={`Disputar marca de ${name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            backgroundColor: colors.error + '20',
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 4,
            minHeight: 32,
            justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.error, fontSize: 12 }}>
            {hasDispute ? 'Disputado' : 'Disputar'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Has dispute badge indicator */}
      {!isMine && hasDispute && !onDispute && (
        <View
          style={{
            backgroundColor: colors.warning + '40',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 11 }}>
            En disputa
          </Text>
        </View>
      )}
    </View>
  )
}
