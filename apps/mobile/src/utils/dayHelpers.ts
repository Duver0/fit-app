/**
 * Day of week type (0 = Monday, 6 = Sunday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * Full day names in Spanish
 */
export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo',
}

/**
 * Short day names in Spanish (3 letters)
 */
export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mié',
  3: 'Jue',
  4: 'Vie',
  5: 'Sáb',
  6: 'Dom',
}

/**
 * Returns the CURRENT day of the week as a DayOfWeek (0 = Monday ... 6 = Sunday).
 *
 * The app stores days with 0 = Monday, but JS `Date.getDay()` returns
 * 0 = Sunday, so we shift by +6 mod 7 to align with the app's convention.
 */
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay() // 0 = Sunday ... 6 = Saturday
  return ((jsDay + 6) % 7) as DayOfWeek
}

/**
 * Checks if a day is a rest day.
 * @param dayOfWeek - Day of week (0 = Monday, 6 = Sunday)
 * @param userRestDay - Optional user-configured rest day (0-6). Defaults to 6 (Sunday) if not provided.
 */
export function isRestDay(dayOfWeek: DayOfWeek, userRestDay?: number): boolean {
  const restDay = userRestDay ?? 6
  return dayOfWeek === restDay
}

/**
 * Gets the display name for a day (custom name or default)
 */
export function getDayDisplayName(dayOfWeek: DayOfWeek, customName?: string | null): string {
  return customName || DAY_NAMES[dayOfWeek]
}

/**
 * Gets the short display name for a day (custom name or abbreviated)
 */
export function getDayShortName(dayOfWeek: DayOfWeek, customName?: string | null): string {
  return customName || DAY_NAMES_SHORT[dayOfWeek]
}