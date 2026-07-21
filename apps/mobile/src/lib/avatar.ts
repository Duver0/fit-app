// ---------------------------------------------------------------------------
// DiceBear Avatar API — https://dicebear.com
// Free, no API key required, 35+ avatar styles, CDN via bunny.net
// ---------------------------------------------------------------------------

export const AVATAR_STYLES = [
  'avataaars',
  'lorelei',
  'adventurer',
  'adventurer-neutral',
  'bottts',
  'identicon',
  'micah',
  'persona',
  'fun-emoji',
  'thumbs',
] as const

export type AvatarStyle = (typeof AVATAR_STYLES)[number]

/** Estilos recomendados para perfiles de usuario (rostros humanos) */
export const USER_STYLES: AvatarStyle[] = ['avataaars', 'lorelei', 'adventurer', 'micah', 'persona', 'fun-emoji']

/** Estilos recomendados para grupos (abstractos/íconos) */
export const GROUP_STYLES: AvatarStyle[] = ['identicon', 'bottts', 'adventurer-neutral', 'thumbs']

export interface AvatarOptions {
  style?: AvatarStyle
  size?: number
  format?: 'png' | 'svg'
  seed?: string
}

/**
 * Genera una URL de avatar de DiceBear.
 * Ej: https://api.dicebear.com/10.x/avataaars/png?seed=John&size=200
 */
export function getAvatarUrl(options: AvatarOptions = {}): string {
  const style = options.style || 'avataaars'
  const format = options.format || 'png'
  const seed = options.seed || 'default'
  const size = options.size || 200
  return `https://api.dicebear.com/10.x/${style}/${format}?seed=${encodeURIComponent(seed)}&size=${size}`
}

/**
 * Genera un seed aleatorio de 8 caracteres.
 * Útil para obtener avatares distintos cada vez que se regenera.
 */
export function getRandomSeed(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Crea una lista de N URLs de avatar para mostrar en un grid.
 * Cada una con un seed distinto y el mismo style.
 */
export function getAvatarGrid(options: { style?: AvatarStyle; count?: number; size?: number } = {}): string[] {
  const count = options.count || 6
  const size = options.size || 120
  const urls: string[] = []
  for (let i = 0; i < count; i++) {
    urls.push(getAvatarUrl({ style: options.style, seed: getRandomSeed(), size }))
  }
  return urls
}
