import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export default function ScreenHeader({ title, showBack = true, rightAction }: ScreenHeaderProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      backgroundColor: colors.background,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
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
