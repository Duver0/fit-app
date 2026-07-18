import { useState, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Platform,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useTheme } from '../../theme/ThemeProvider'
import { IMAGE_CONFIG } from '../../lib/imageConfig'

export interface CropData {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageEditorResult {
  /** URI de la imagen original */
  originalUri: string
  /** Datos de recorte (en web se envía la imagen completa) */
  cropData: CropData
  /** Ancho de salida deseado */
  outputWidth: number
  /** Alto de salida deseado */
  outputHeight: number
}

interface ImageEditorModalProps {
  visible: boolean
  imageUri: string
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9'
  initialOutputSize?: number
  maxOutputSize?: number
  minOutputSize?: number
  onCancel: () => void
  onConfirm: (result: ImageEditorResult) => void
}

function getAspectRatioValue(aspect?: string): number | null {
  switch (aspect) {
    case '1:1': return 1
    case '4:3': return 4 / 3
    case '16:9': return 16 / 9
    case 'free':
    default: return null
  }
}

export default function ImageEditorModal({
  visible,
  imageUri,
  aspectRatio = '1:1',
  initialOutputSize = 800,
  maxOutputSize = IMAGE_CONFIG.MAX_DIMENSION,
  minOutputSize = 200,
  onCancel,
  onConfirm,
}: ImageEditorModalProps) {
  const { colors } = useTheme()
  const [outputSize, setOutputSize] = useState(initialOutputSize)
  const [imageLoaded, setImageLoaded] = useState(false)

  const aspectValue = getAspectRatioValue(aspectRatio)
  const isFixedAspect = aspectValue !== null

  const outputHeight = !isFixedAspect
    ? outputSize
    : Math.round(outputSize / aspectValue!)

  const finalWidth = outputSize
  const finalHeight = outputHeight

  const handleConfirm = useCallback(() => {
    onConfirm({
      originalUri: imageUri,
      cropData: { x: 0, y: 0, width: 0, height: 0 },
      outputWidth: finalWidth,
      outputHeight: finalHeight,
    })
  }, [imageUri, finalWidth, finalHeight, onConfirm])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={[styles.headerBtn, { color: colors.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Editar imagen</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={[styles.headerBtn, { color: colors.primary, fontWeight: '700' }]}>
              Confirmar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview de la imagen */}
        <View style={styles.imageWrapper}>
          {!imageLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />
        </View>

        {/* Controles */}
        <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.dimensionRow}>
            <Text style={[styles.dimensionText, { color: colors.text }]}>
              {finalWidth} × {finalHeight} px
            </Text>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Arrastrá el slider para ajustar el tamaño final
            </Text>
          </View>

          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
              {minOutputSize}px
            </Text>
            <Slider
              style={styles.slider}
              value={outputSize}
              onValueChange={(val) => setOutputSize(Math.round(val))}
              minimumValue={minOutputSize}
              maximumValue={maxOutputSize}
              step={50}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
              {maxOutputSize}px
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  dimensionRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dimensionText: {
    fontSize: 18,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  sliderLabel: {
    fontSize: 11,
    width: 48,
    textAlign: 'center',
  },
})
