/**
 * Configuración global de imágenes para la app.
 * Todos los valores en bytes (salvo que se indique otra unidad).
 */
export const IMAGE_CONFIG = {
  /** Tamaño máximo permitido por imagen (2 MB) */
  MAX_FILE_SIZE: 2 * 1024 * 1024,
  /** Dimensión máxima del lado más largo después de redimensionar (px) */
  MAX_DIMENSION: 1200,
  /** Calidad de compresión JPEG/WebP (0-1) */
  COMPRESSION_QUALITY: 0.8,
  /** Formatos de imagen aceptados */
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  /** Formatos para mapear extensión a MIME */
  EXT_MAP: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  } as Record<string, string>,
} as const
