import { View, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface VoteButtonProps {
  disputeId: string
  onVote: (disputeId: string, vote: boolean) => void
  disabled?: boolean
  myVote?: boolean | null
  style?: ViewStyle
}

export function VoteButton({
  disputeId,
  onVote,
  disabled = false,
  myVote = null,
  style,
}: VoteButtonProps) {
  const { colors } = useTheme()

  const isApproved = myVote === true
  const isRejected = myVote === false

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: 8,
        },
        style,
      ]}
    >
      {/* "Mantener" (approve) button - success */}
      <TouchableOpacity
        onPress={() => onVote(disputeId, true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Votar para mantener la marca"
        accessibilityState={{ disabled }}
        style={{
          flex: 1,
          backgroundColor: isApproved
            ? colors.success
            : colors.success + '20',
          borderRadius: 24,
          paddingVertical: 12,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          borderWidth: isApproved ? 2 : 0,
          borderColor: isApproved ? colors.success : 'transparent',
          opacity: disabled && !isApproved ? 0.4 : 1,
        }}
        activeOpacity={0.7}
      >
        <Text
          style={{
            color: isApproved ? '#1A1A1A' : colors.success,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          Mantener
        </Text>
      </TouchableOpacity>

      {/* "Refutar" (reject) button - danger/error */}
      <TouchableOpacity
        onPress={() => onVote(disputeId, false)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Votar para refutar la marca"
        accessibilityState={{ disabled }}
        style={{
          flex: 1,
          backgroundColor: isRejected
            ? colors.error
            : colors.error + '20',
          borderRadius: 24,
          paddingVertical: 12,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          borderWidth: isRejected ? 2 : 0,
          borderColor: isRejected ? colors.error : 'transparent',
          opacity: disabled && !isRejected ? 0.4 : 1,
        }}
        activeOpacity={0.7}
      >
        <Text
          style={{
            color: isRejected ? '#FFFFFF' : colors.error,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          Refutar
        </Text>
      </TouchableOpacity>
    </View>
  )
}
