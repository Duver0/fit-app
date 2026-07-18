import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { Image } from 'expo-image'
import { useTheme } from '../../theme/ThemeProvider'
import Slider from '@react-native-community/slider'
import { IMAGE_CONFIG } from '../../lib/imageConfig'

// ---------------------------------------------------------------------------
// HTML con Cropper.js (v1.6.2) — inline para evitar depender de internet
// ---------------------------------------------------------------------------
const CROPPER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #1a1a2e; overflow: hidden; display: flex; align-items: center; justify-content: center; }
#container { max-width: 100%; max-height: 100%; }
img { max-width: 100%; max-height: 100%; display: block; }
.cropper-view-box, .cropper-face { border-radius: 0; }
.cropper-line { background-color: transparent; }
</style>
</head>
<body>
<div id="container">
  <img id="image" src="__IMAGE_SRC__" crossorigin="anonymous">
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js"></script>
<script>
var image = document.getElementById('image');
var cropper = new Cropper(image, {
  viewMode: 1,
  dragMode: 'crop',
  aspectRatio: __ASPECT_RATIO__,
  autoCropArea: 1,
  responsive: true,
  restore: false,
  guides: true,
  center: true,
  highlight: false,
  cropBoxMovable: true,
  cropBoxResizable: true,
  toggleDragModeOnDontDouble: false,
  minCropBoxWidth: 50,
  minCropBoxHeight: 50,
});

function sendCropData() {
  var data = cropper.getData(true);
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'crop',
    x: Math.round(data.x),
    y: Math.round(data.y),
    width: Math.round(data.width),
    height: Math.round(data.height),
  }));
}

// Click confirm from RN
window.addEventListener('message', function(event) {
  if (event.data === 'getCropData') {
    sendCropData();
  }
});

// Enviar datos iniciales para que RN calcule preview
image.addEventListener('load', function() {
  setTimeout(function() {
    cropper.getCroppedCanvas({ width: 200 }).toBlob(function(blob) {
      var reader = new FileReader();
      reader.onloadend = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'preview',
          dataUrl: reader.result
        }));
      };
      reader.readAsDataURL(blob);
    });
  }, 300);
});
</script>
</body>
</html>`

export interface CropData {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageEditorResult {
  /** URI de la imagen original antes de editar */
  originalUri: string
  /** Datos de recorte (coordenadas en píxeles originales) */
  cropData: CropData
  /** Ancho de salida deseado */
  outputWidth: number
  /** Alto de salida deseado */
  outputHeight: number
}

interface ImageEditorModalProps {
  visible: boolean
  imageUri: string
  /** Aspect ratio del recorte: 'free' | '1:1' | '4:3' | '16:9' */
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9'
  /** Valor inicial del control de tamaño (px del lado más largo) */
  initialOutputSize?: number
  /** Tamaño máximo de salida (px) */
  maxOutputSize?: number
  /** Tamaño mínimo de salida (px) */
  minOutputSize?: number
  onCancel: () => void
  onConfirm: (result: ImageEditorResult) => void
}

function getAspectRatioValue(aspect?: string): number | string {
  switch (aspect) {
    case '1:1': return 1
    case '4:3': return 4 / 3
    case '16:9': return 16 / 9
    case 'free':
    default: return NaN
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
  const webviewRef = useRef<any>(null)
  const [outputSize, setOutputSize] = useState(initialOutputSize)
  const [cropData, setCropData] = useState<CropData | null>(null)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [webviewReady, setWebviewReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const aspectValue = getAspectRatioValue(aspectRatio)
  const isFixedAspect = typeof aspectValue === 'number'
  const aspectForUrl = isFixedAspect ? aspectValue : 'NaN'

  // Calcular alto según aspect ratio
  const outputHeight = !isFixedAspect
    ? outputSize // free → cuadrado por defecto
    : Math.round(outputSize / aspectValue)

  const finalWidth = outputSize
  const finalHeight = outputHeight

  // --- Construir HTML con la imagen real ---
  const html = CROPPER_HTML
    .replace('__IMAGE_SRC__', imageUri)
    .replace('__ASPECT_RATIO__', String(aspectForUrl))

  // --- Escuchar mensajes del WebView ---
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)
      if (msg.type === 'crop') {
        setCropData({ x: msg.x, y: msg.y, width: msg.width, height: msg.height })
      } else if (msg.type === 'preview') {
        setPreviewUri(msg.dataUrl)
        setIsLoading(false)
      }
    } catch {}
  }, [])

  // --- Pedir datos de recorte al WebView ---
  const requestCropData = useCallback(() => {
    webviewRef.current?.postMessage('getCropData')
  }, [])

  // --- Confirmar ---
  const handleConfirm = useCallback(() => {
    if (!cropData) {
      // Si aún no tenemos datos, pedirlos y esperar un frame
      requestCropData()
      setTimeout(() => {
        if (cropData) {
          onConfirm({
            originalUri: imageUri,
            cropData,
            outputWidth: finalWidth,
            outputHeight: finalHeight,
          })
        }
      }, 200)
      return
    }
    onConfirm({
      originalUri: imageUri,
      cropData,
      outputWidth: finalWidth,
      outputHeight: finalHeight,
    })
  }, [cropData, imageUri, finalWidth, finalHeight, onConfirm, requestCropData])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Editar imagen</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.primary, fontWeight: '700' }]}>
              Confirmar
            </Text>
          </TouchableOpacity>
        </View>

        {/* WebView con Cropper.js */}
        <View style={styles.webviewWrapper}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <WebView
            ref={webviewRef}
            source={{ html }}
            style={styles.webview}
            onMessage={handleMessage}
            onLoad={() => setWebviewReady(true)}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            originWhitelist={['*']}
          />
        </View>

        {/* Control de tamaño + preview */}
        <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {/* Preview pequeño */}
          <View style={styles.previewRow}>
            {previewUri && (
              <Image
                source={{ uri: previewUri }}
                style={[styles.preview, { borderColor: colors.border }]}
                contentFit="cover"
              />
            )}
            <View style={styles.previewInfo}>
              <Text style={[styles.dimensionText, { color: colors.text }]}>
                {finalWidth} × {finalHeight} px
              </Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Tamaño final
              </Text>
            </View>
          </View>

          {/* Slider */}
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Pequeña</Text>
            <Slider
              style={styles.slider}
              value={outputSize}
              onValueChange={(val) => {
                setOutputSize(Math.round(val))
                requestCropData()
              }}
              minimumValue={minOutputSize}
              maximumValue={maxOutputSize}
              step={50}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Grande</Text>
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  headerBtnText: {
    fontSize: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  preview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dimensionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    marginTop: 2,
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
    width: 50,
    textAlign: 'center',
  },
})
