import { useState } from 'react'
import { ViewStyle, ImageStyle as RNImageStyle } from 'react-native'
import { Image, ImageContentFit, ImageSource } from 'expo-image'

interface Props {
  /** URL de la imagen */
  source?: { uri?: string } | string | null
  /** Estilo del contenedor de la imagen */
  style?: RNImageStyle | ViewStyle
  /** Cómo se ajusta la imagen al contenedor */
  resizeMode?: ImageContentFit
  /** Children se renderiza como fallback cuando la imagen falla */
  fallback?: React.ReactNode
  fallbackStyle?: ViewStyle
  /** Clases adicionales o estilos para el contenedor */
  className?: string
}

/**
 * Wrapper de expo-image que muestra un fallback si la URL da error (400, 404, etc.)
 * o si la URL es inválida.
 *
 * Usa expo-image con cachePolicy="disk" para evitar re-descargar imágenes
 * del servidor de wger cada vez que se abre la app.
 *
 * Uso típico:
 * ```
 * <ImageWithFallback
 *   source={{ uri: getImageUrl(url) }}
 *   style={{ width: 100, height: 100 }}
 *   fallback={<View style={{ width: 100, height: 100, backgroundColor: 'red' }} />}
 * />
 * ```
 */
export default function ImageWithFallback({
  source,
  fallback,
  ...props
}: Props) {
  const [failed, setFailed] = useState(false)

  // Extraer URI
  const uri = typeof source === 'string' ? source : source?.uri
  const expoSource: ImageSource = uri ? { uri } : (null as any)

  // Si no hay source o falló la carga, renderizar fallback
  if (!uri || failed) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return (
    <Image
      source={expoSource}
      cachePolicy="disk"
      onError={() => setFailed(true)}
      {...(props as any)}
    />
  )
}
