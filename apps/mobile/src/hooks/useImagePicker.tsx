/**
 * useImagePicker — base file for TypeScript resolution.
 * Metro/Webpack usa la versión platform-specific (.native.tsx o .web.tsx).
 *
 * Re-exportamos desde la versión native para que TypeScript
 * conozca las exportaciones correctas.
 */
export type { ProcessedImage, UseImagePickerOptions } from './useImagePicker.native'
export { useImagePicker } from './useImagePicker.native'
