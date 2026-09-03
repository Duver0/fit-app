/**
 * Fuentes de sonido usadas por el timer de core.
 * Se aíslan en un módulo propio para poder mockearlas en los tests
 * sin que el `require` de un asset binario falle en el entorno Node.
 */
export const BEEP_SOURCE: number = require('../../assets/beep.wav')

/** Pitido largo (doble de duración que el normal) para el doble pitido. */
export const LONG_BEEP_SOURCE: number = require('../../assets/beep_long.wav')
