import {
  View,
  Text,
  Image,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

interface AvatarProps {
  name: string
  size?: number
  avatarUrl?: string | null
  style?: ViewStyle
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getColorFromName(name: string, colors: Record<string, string>): string {
  const palette = [colors.primary, colors.secondary, colors.accent]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

export function Avatar({
  name,
  size = 40,
  avatarUrl,
  style,
}: AvatarProps) {
  const { colors } = useTheme()
  const bgColor = getColorFromName(name, colors)
  const fontSize = size * 0.4

  if (avatarUrl) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        accessibilityLabel={`Avatar for ${name}`}
      >
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          accessibilityLabel={`Avatar for ${name}`}
        />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize,
            color: '#1A1A1A',
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: '600',
  },
})
