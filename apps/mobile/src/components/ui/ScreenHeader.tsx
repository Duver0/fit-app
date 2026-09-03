import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import { useSmartBack } from '../../hooks/useSmartBack'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  // Ruta padre a la que ir si no hay historial (ej. tras recargar la página).
  fallbackHref?: string
}

export default function ScreenHeader({ title, showBack = true, rightAction, fallbackHref }: ScreenHeaderProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const handleBack = useSmartBack(fallbackHref)

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top + 14,
      paddingBottom: 12,
      backgroundColor: colors.background,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightAction && (
        <View>{rightAction}</View>
      )}
    </View>
  )
}
