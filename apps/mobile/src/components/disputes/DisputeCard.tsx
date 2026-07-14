import { View, Text, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { VoteButton } from './VoteButton'

interface DisputeCardUser {
  name: string
}

interface DisputeCardVote {
  vote: boolean
  user: DisputeCardUser
}

interface DisputeCardDispute {
  id: string
  reason: string
  status: string
  initiatedBy: DisputeCardUser
  expiresAt: string
  votes: DisputeCardVote[]
}

interface DisputeCardProps {
  dispute: DisputeCardDispute
  myVote?: boolean | null
  groupId: string
  onVote?: (disputeId: string, vote: boolean) => void
  isExpired?: boolean
  style?: ViewStyle
}

function getTimeRemaining(expiresAt: string): string {
  try {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expirado'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h restantes`
    }
    if (hours > 0) return `${hours}h ${minutes}m restantes`
    return `${minutes}m restantes`
  } catch {
    return 'Tiempo desconocido'
  }
}

function getStatusBadge(status: string): { label: string; bg: string; textColor: string } {
  switch (status) {
    case 'OPEN':
      return { label: 'Abierta', bg: '#F0FFF4', textColor: '#2D7D46' }
    case 'RESOLVED':
      return { label: 'Resuelta', bg: '#F0F4FF', textColor: '#2D5F8A' }
    case 'REJECTED':
      return { label: 'Rechazada', bg: '#FFF0F0', textColor: '#8A2D2D' }
    default:
      return { label: status, bg: '#F1F3F5', textColor: '#636E72' }
  }
}

export function DisputeCard({
  dispute,
  myVote = null,
  onVote,
  isExpired = false,
  style,
}: DisputeCardProps) {
  const { colors } = useTheme()

  const isOpen = dispute.status === 'OPEN'
  const badge = getStatusBadge(dispute.status)
  const timeRemaining = getTimeRemaining(dispute.expiresAt)

  const approveCount = dispute.votes.filter((v) => v.vote === false).length
  const rejectCount = dispute.votes.filter((v) => v.vote === true).length

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Header: initiator + status badge */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text
          style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
          numberOfLines={1}
        >
          {dispute.initiatedBy.name}
        </Text>
        <View
          style={{
            backgroundColor: badge.bg,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: badge.textColor, fontSize: 12, fontWeight: '500' }}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <Text
        style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}
        numberOfLines={3}
      >
        {dispute.reason}
      </Text>

      {/* Expiry and vote tally row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: isExpired || timeRemaining === 'Expirado' ? colors.error : colors.textSecondary,
            fontSize: 12,
          }}
        >
          {isExpired || timeRemaining === 'Expirado' ? 'Expirado' : timeRemaining}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.success,
                marginRight: 4,
              }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {rejectCount}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.error,
                marginRight: 4,
              }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {approveCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Vote buttons */}
      {isOpen && !isExpired && timeRemaining !== 'Expirado' && onVote && (
        <VoteButton
          disputeId={dispute.id}
          onVote={onVote}
          disabled={myVote !== null}
          myVote={myVote}
        />
      )}
    </View>
  )
}
