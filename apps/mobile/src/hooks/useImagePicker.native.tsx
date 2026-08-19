import { useState, useRef, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'
import { Alert, Platform } from 'react-native'
import { IMAGE_CONFIG } from '../lib/imageConfig'
import ImageEditorModal, {
  ImageEditorResult,
} from '../components/ui/ImageEditorModal'

// ------------------------------------------------------------------
// Obtener tamaño de archivo — funciona en native y web
// ------------------------------------------------------------------
async function getFileSize(uri: string): Promise<number> {
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      return blob.size
    } catch {
      return 0
    }
  }
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true })
    return fileInfo.exists ? (fileInfo.size ?? 0) : 0
  } catch {
    return 0
  }
}

export interface ProcessedImage {
  /** URI local de la imagen ya editada, redimensionada y comprimida */
  uri: string
  /** Ancho final en px */
  width: number
  /** Alto final en px */
  height: number
  /** Tipo MIME (siempre image/jpeg tras compresión) */
  type: string
  /** Nombre sugerido para la subida */
  name: string
  /** Tamaño final en bytes */
  size: number
}

export interface UseImagePickerOptions {
  /** Contexto para mensajes de error (ej: "grupo", "ejercicio") */
  context?: string
  /** Tamaño máximo en bytes (default: 2 MB) */
  maxFileSize?: number
  /** Dimensión máxima del lado más largo en px (default: 1200) */
  maxDimension?: number
  /** Calidad de compresión 0-1 (default: 0.8) */
  quality?: number
  /** Aspect ratio del recorte: 'free' | '1:1' | '4:3' | '16:9' */
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9'
}

/**
 * Hook que gestiona el flujo completo de selección → edición → compresión
 * de imágenes. Retorna un modal (`ImageEditorModal`) que debe renderizarse
 * en el árbol del componente padre, y `pickImage()` que resuelve con la
 * imagen ya procesada (`ProcessedImage`) o `null` si el usuario cancela.
 *
 * @example
 * ```tsx
 * const { pickImage, ImageEditorModal, isLoading } = useImagePicker({
 *   context: 'grupo',
 *   aspectRatio: '1:1',
 * })
 *
 * const handleChangeImage = async () => {
 *   const img = await pickImage()
 *   if (img) {
 *     // img.uri contiene la imagen local ya editada y comprimida
 *   }
 * }
 *
 * return (
 *   <ImageEditorModal />
 * )
 * ```
 */
export function useImagePicker(options: UseImagePickerOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null)

  // Referencia mutable para resolver la promesa desde el modal
  const resolveRef = useRef<((result: ProcessedImage | null) => void) | null>(null)

  const {
    context = 'Imagen',
    maxFileSize = IMAGE_CONFIG.MAX_FILE_SIZE,
    maxDimension = IMAGE_CONFIG.MAX_DIMENSION,
    quality = IMAGE_CONFIG.COMPRESSION_QUALITY,
    aspectRatio = '1:1',
  } = options

  // ------------------------------------------------------------------
  // Compresión final (después de la edición)
  // ------------------------------------------------------------------
  const compressImage = useCallback(
    async (sourceUri: string, targetWidth: number, targetHeight: number): Promise<ProcessedImage> => {
      // 1. Redimensionar al tamaño exacto que eligió el usuario
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      )

      // 2. Validar tamaño
      const fileSize = await getFileSize(result.uri)

      if (fileSize > maxFileSize) {
        // Re-intentar con más compresión
        if (quality > 0.3) {
          return compressWithQuality(sourceUri, targetWidth, targetHeight, quality - 0.2)
        }
        throw new Error(
          `La ${context.toLowerCase()} sigue siendo demasiado grande ` +
            `(${(fileSize / 1024 / 1024).toFixed(1)} MB). ` +
            `El máximo permitido es ${(maxFileSize / 1024 / 1024).toFixed(0)} MB.`,
        )
      }

      const filename = `${context.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`

      return {
        uri: result.uri,
        width: targetWidth,
        height: targetHeight,
        type: 'image/jpeg',
        name: filename,
        size: fileSize,
      }
    },
    [context, maxFileSize, quality],
  )

  const compressWithQuality = useCallback(
    async (
      sourceUri: string,
      targetWidth: number,
      targetHeight: number,
      currentQuality: number,
    ): Promise<ProcessedImage> => {
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        {
          compress: currentQuality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      )

      const fileSize = await getFileSize(result.uri)

      if (fileSize > maxFileSize && currentQuality > 0.3) {
        return compressWithQuality(sourceUri, targetWidth, targetHeight, currentQuality - 0.2)
      }

      if (fileSize > maxFileSize) {
        throw new Error(
          `La ${context.toLowerCase()} sigue siendo demasiado grande ` +
            `(${(fileSize / 1024 / 1024).toFixed(1)} MB).`,
        )
      }

      const filename = `${context.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`
      return {
        uri: result.uri,
        width: targetWidth,
        height: targetHeight,
        type: 'image/jpeg',
        name: filename,
        size: fileSize,
      }
    },
    [context, maxFileSize],
  )

  // ------------------------------------------------------------------
  // Procesar el resultado del editor (recortar + redimensionar + comprimir)
  // ------------------------------------------------------------------
  const handleEditorConfirm = useCallback(
    async (editorResult: ImageEditorResult) => {
      setIsLoading(true)
      try {
        // 1. Recortar según las coordenadas del Cropper.js
        const cropped = await ImageManipulator.manipulateAsync(
          editorResult.originalUri,
          [
            {
              crop: {
                originX: editorResult.cropData.x,
                originY: editorResult.cropData.y,
                width: editorResult.cropData.width,
                height: editorResult.cropData.height,
              },
            },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
        )

        // 2. Redimensionar al tamaño de salida + comprimir
        const processed = await compressImage(
          cropped.uri,
          editorResult.outputWidth,
          editorResult.outputHeight,
        )

        resolveRef.current?.(processed)
      } catch (e: any) {
        resolveRef.current?.(null)
        Alert.alert('Error', e?.message || 'Error al procesar la imagen')
      } finally {
        setPendingImageUri(null)
        setIsLoading(false)
      }
    },
    [compressImage],
  )

  const handleEditorCancel = useCallback(() => {
    resolveRef.current?.(null)
    setPendingImageUri(null)
  }, [])

  // ------------------------------------------------------------------
  // Permisos
  // ------------------------------------------------------------------
  const requestPermission = async (type: 'gallery' | 'camera'): Promise<boolean> => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.')
        return false
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.')
        return false
      }
    }
    return true
  }

  // ------------------------------------------------------------------
  // Orígenes (sin allowsEditing — la edición la hace nuestro modal)
  // ------------------------------------------------------------------
  const pickFromGallery = async (): Promise<string | null> => {
    const hasPermission = await requestPermission('gallery')
    if (!hasPermission) return null

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Nosotros manejamos la edición
      quality: 1,
    })

    if (result.canceled || !result.assets[0]) return null
    return result.assets[0].uri
  }

  const takePhoto = async (): Promise<string | null> => {
    const hasPermission = await requestPermission('camera')
    if (!hasPermission) return null

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })

    if (result.canceled || !result.assets[0]) return null
    return result.assets[0].uri
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  /**
   * Abre el selector (Galería / Cámara) y luego el editor de imagen.
   * Retorna la imagen procesada o null si el usuario cancela.
   */
  const pickImage = async (): Promise<ProcessedImage | null> => {
    const source = await new Promise<'gallery' | 'camera' | null>((resolve) => {
      Alert.alert('Seleccionar imagen', '', [
        { text: 'Galería', onPress: () => resolve('gallery') },
        { text: 'Cámara', onPress: () => resolve('camera') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ])
    })

    if (!source) return null

    const uri = source === 'gallery' ? await pickFromGallery() : await takePhoto()
    if (!uri) return null

    // Abrir el modal editor y esperar el resultado
    return new Promise<ProcessedImage | null>((resolve) => {
      resolveRef.current = resolve
      setPendingImageUri(uri)
    })
  }

  // ------------------------------------------------------------------
  // Modal component que el padre debe renderizar
  // ------------------------------------------------------------------
  const ImageEditorModalComponent = pendingImageUri ? (
    <ImageEditorModal
      visible
      imageUri={pendingImageUri}
      aspectRatio={aspectRatio}
      onConfirm={handleEditorConfirm}
      onCancel={handleEditorCancel}
    />
  ) : null

  return {
    pickImage,
    ImageEditorModal: ImageEditorModalComponent,
    isLoading,
  }
}
