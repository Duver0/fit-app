import {
  View,
  Text,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { useState } from 'react'
import { Image } from 'expo-image'
import { useTheme } from '../../theme/ThemeProvider'
import { getImageUrl } from '../../lib/api'

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
  const [imgFailed, setImgFailed] = useState(false)

  const resolvedUrl = getImageUrl(avatarUrl)

  // Carga progresiva de UX:
  // 1. SIEMPRE renderizamos al instante el círculo con las iniciales del nombre:
  //    la estructura de la semana y del día se ve completa de inmediato, sin
  //    esperar a que lleguen las imágenes de la API (que es lo que más tarda).
  // 2. La imagen real se carga EN SEGUNDO PLANO (expo-image usa cache y no
  //    bloquea el render) y aparece por encima de las iniciales con un fade.
  //    Si no hay URL, falla la carga o está descargándose, quedan las iniciales.
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

      {resolvedUrl && !imgFailed ? (
        <Image
          source={{ uri: resolvedUrl }}
          cachePolicy="disk"
          transition={250}
          style={[
            styles.image,
            styles.imageOverlay,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          onError={() => setImgFailed(true)}
          accessibilityLabel={`Avatar for ${name}`}
        />
      ) : null}
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
  initials: {
    fontWeight: '600',
  },
  image: {
    resizeMode: 'cover',
  },
  // La imagen se superpone a las iniciales (que quedan siempre de base).
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
