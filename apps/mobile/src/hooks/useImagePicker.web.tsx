/**
 * useImagePicker — versión web.
 *
 * No usa expo-image-manipulator ni expo-file-system porque no tienen
 * runtime real en web. En su lugar usa Canvas API del browser para
 * comprimir y redimensionar.
 */
import { useState, useRef, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { IMAGE_CONFIG } from '../lib/imageConfig'

export interface ProcessedImage {
  uri: string
  width: number
  height: number
  type: string
  name: string
  size: number
}

export interface UseImagePickerOptions {
  context?: string
  maxFileSize?: number
  maxDimension?: number
  quality?: number
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9'
}

/**
 * Comprime una imagen en web usando Canvas API.
 */
async function compressOnWeb(
  imageUri: string,
  targetWidth: number,
  targetHeight: number,
  quality: number,
  maxFileSize: number,
  context: string,
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        // Intentar con la calidad solicitada
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, 'image/jpeg', quality),
        )

        if (!blob) {
          reject(new Error('No se pudo comprimir la imagen'))
          return
        }

        let finalBlob = blob
        let currentQuality = quality

        // Si excede el tamaño máximo, reducir calidad progresivamente
        while (finalBlob.size > maxFileSize && currentQuality > 0.3) {
          currentQuality = Math.max(currentQuality - 0.2, 0.3)
          finalBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/jpeg', currentQuality),
          ) ?? finalBlob
        }

        if (finalBlob.size > maxFileSize) {
          reject(
            new Error(
              `La ${context.toLowerCase()} sigue siendo demasiado grande ` +
                `(${(finalBlob.size / 1024 / 1024).toFixed(1)} MB). ` +
                `El máximo permitido es ${(maxFileSize / 1024 / 1024).toFixed(0)} MB.`,
            ),
          )
          return
        }

        const objectUrl = URL.createObjectURL(finalBlob)
        const filename = `${context.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`

        resolve({
          uri: objectUrl,
          width: targetWidth,
          height: targetHeight,
          type: 'image/jpeg',
          name: filename,
          size: finalBlob.size,
        })
      } catch (e: any) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = imageUri
  })
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    context = 'Imagen',
    maxFileSize = IMAGE_CONFIG.MAX_FILE_SIZE,
    maxDimension = IMAGE_CONFIG.MAX_DIMENSION,
    quality = IMAGE_CONFIG.COMPRESSION_QUALITY,
  } = options

  const pickFromGallery = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.')
      return null
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })

    if (result.canceled || !result.assets[0]) return null
    return result.assets[0].uri
  }

  const pickImage = async (): Promise<ProcessedImage | null> => {
    setIsLoading(true)
    try {
      const source = await new Promise<'gallery' | 'camera' | null>((resolve) => {
        Alert.alert('Seleccionar imagen', '', [
          { text: 'Galería', onPress: () => resolve('gallery') },
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
        ])
      })

      if (!source) return null

      const uri = await pickFromGallery()
      if (!uri) return null

      // Cargar la imagen para obtener sus dimensiones originales
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('No se pudo cargar la imagen'))
        el.src = uri
      })

      const srcWidth = img.naturalWidth
      const srcHeight = img.naturalHeight

      // Calcular dimensiones objetivo manteniendo aspect ratio
      let targetWidth = srcWidth
      let targetHeight = srcHeight

      if (srcWidth > maxDimension || srcHeight > maxDimension) {
        const ratio = Math.min(maxDimension / srcWidth, maxDimension / srcHeight)
        targetWidth = Math.round(srcWidth * ratio)
        targetHeight = Math.round(srcHeight * ratio)
      }

      // Comprimir con Canvas API
      const processed = await compressOnWeb(
        uri,
        targetWidth,
        targetHeight,
        quality,
        maxFileSize,
        context,
      )

      return processed
    } finally {
      setIsLoading(false)
    }
  }

  return {
    pickImage,
    ImageEditorModal: null, // Sin editor interactivo en web
    isLoading,
  }
}
