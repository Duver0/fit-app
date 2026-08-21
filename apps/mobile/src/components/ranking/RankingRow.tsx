import React from 'react'
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { getImageUrl } from '../../lib/api'
import ImageWithFallback from '../ui/ImageWithFallback'

const KG_TO_LB = 2.20462
function kgToLb(kg: number): string {
  return `${Math.round(kg * KG_TO_LB * 100) / 100} lb`
}

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

interface RankingRowProps {
  rank: number
  name: string
  value: number
  avatarUrl?: string | null
  isMine?: boolean
  /** Unidad del ejercicio (KG, REPS, REPS_AND_WEIGHT, MIN, SEC, M) */
  unit?: string
  /** Para unidades compuestas (REPS_AND_WEIGHT) */
  reps?: number | null
  weight?: number | null
  /** Callback para abrir el modal de disputas existentes */
  onViewDisputes?: () => void
  /** Callback para crear una nueva disputa */
  onDispute?: () => void
  hasDisputes?: boolean
  style?: ViewStyle
}

export const RankingRow = React.memo(function RankingRow({
  rank,
  name,
  value,
  avatarUrl,
  isMine = false,
  unit,
  reps,
  weight,
  onViewDisputes,
  onDispute,
  hasDisputes = false,
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
      {/* Rank */}
      <View style={{ width: 36, alignItems: 'center' }}>
        <Text
          style={{
            color: rank <= 3 ? colors.primary : colors.textSecondary,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          #{rank}
        </Text>
      </View>

      {/* Avatar */}
      <ImageWithFallback
        source={{ uri: getImageUrl(avatarUrl) }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          marginHorizontal: 8,
        }}
        fallback={
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
        }
      />

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
        </Text>
        {isMine && (
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '500' }}>
            Tú
          </Text>
        )}
      </View>

      {/* Value — detalle completo aquí (es la fuente de verdad) */}
      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
        {reps != null && weight != null ? (
          <>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
              {weight} kg.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              {reps} reps.
            </Text>
          </>
        ) : unit === 'KG' ? (
          <>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
              {value} kg
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              {kgToLb(value)}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {value} {UNIT_LABELS[unit || ''] || ''}
          </Text>
        )}
      </View>

      {/* Botones de disputa — apilados verticalmente y alineados a la derecha */}
      <View style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {onViewDisputes && (
          <TouchableOpacity
            onPress={onViewDisputes}
            accessibilityRole="button"
            accessibilityLabel={`Ver disputas de ${name}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.primary + '20',
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 5,
              minHeight: 28,
              justifyContent: 'center',
              minWidth: 72,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '500' }}>
              Disputas
            </Text>
          </TouchableOpacity>
        )}
        {!isMine && onDispute && (
          <TouchableOpacity
            onPress={onDispute}
            accessibilityRole="button"
            accessibilityLabel={`Disputar marca de ${name}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.error + '20',
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 5,
              minHeight: 28,
              justifyContent: 'center',
              minWidth: 72,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.error, fontSize: 11, fontWeight: '500' }}>
              {hasDisputes ? 'Disputado' : 'Disputar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
})
