import { useState } from 'react'
import { Image, ImageProps, ViewStyle } from 'react-native'

interface Props extends Omit<ImageProps, 'onError'> {
  /** Children se renderiza como fallback cuando la imagen falla */
  fallback?: React.ReactNode
  fallbackStyle?: ViewStyle
}

/**
 * Wrapper de Image que muestra un fallback si la URL da error (400, 404, etc.)
 * o si la URL es inválida.
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
  fallbackStyle,
  ...props
}: Props) {
  const [failed, setFailed] = useState(false)

  // Si no hay source o falló la carga, renderizar fallback
  if (!source || failed) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return (
    <Image
      source={source}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}
