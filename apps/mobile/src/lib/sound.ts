/**
 * Fuente del sonido "beep" usado por el timer de core.
 * Se aísla en un módulo propio para poder mockearlo en los tests
 * sin que el `require` de un asset binario falle en el entorno Node.
 */
export const BEEP_SOURCE: number = require('../../assets/beep.wav')
