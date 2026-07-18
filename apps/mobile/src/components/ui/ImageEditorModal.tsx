/**
 * ImageEditorModal — base file for TypeScript resolution.
 * Metro will use the platform-specific version (.native.tsx or .web.tsx).
 *
 * We re-export the native version so TypeScript type-checks correctly.
 */
export type { CropData, ImageEditorResult } from './ImageEditorModal.native'
export { default } from './ImageEditorModal.native'
