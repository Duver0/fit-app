import { useCallback, useEffect, useRef, useState } from 'react'
import { Audio } from 'expo-av'
import { BEEP_SOURCE, LONG_BEEP_SOURCE } from '../lib/sound'

export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished'

export type SegmentType = 'work' | 'interval' | 'rest'

export type RestMode = 'none' | 'half' | 'thirds'

export interface Segment {
  type: SegmentType
  /** Número de ejercicio (solo para 'work', 1-based) */
  exercise: number
  /** Duración del segmento en segundos */
  duration: number
}

export interface TimerConfig {
  totalTime: number // segundos
  workTime: number // segundos (máx 60)
  intervalTime: number // segundos (máx 15)
  restMode: RestMode
  restTime: number // 30s fijo por descanso
}

/** Número de ejercicio en el que se inserta cada descanso según el modo. */
export function restExerciseIndexes(totalExercises: number, mode: RestMode): number[] {
  if (mode === 'half') {
    // 1 descanso a la mitad (redondeado hacia arriba). Ej: 6 → 3, 5 → 3
    return [Math.ceil(totalExercises / 2)]
  }
  if (mode === 'thirds') {
    // 2 descansos que parten el tiempo en 3 bloques de ejercicios.
    return [Math.floor(totalExercises / 3), Math.floor((2 * totalExercises) / 3)]
  }
  return []
}

/** Minutos enteros de la base configurada. */
export function totalMinutes(totalSeconds: number): number {
  return Math.floor(Math.max(0, totalSeconds) / 60)
}

/**
 * Modos de descanso permitidos según la duración base.
 * - >= 3 min: none, half, thirds
 * - == 2 min: none, half (thirds requiere 3+)
 * - <= 1 min: solo none
 */
export function allowedRestModes(totalSeconds: number): RestMode[] {
  const m = totalMinutes(totalSeconds)
  if (m >= 3) return ['none', 'half', 'thirds']
  if (m === 2) return ['none', 'half']
  return ['none']
}

/**
 * Normaliza un modo de descanso a uno válido para la duración dada.
 * Si thirds no está permitido pero half sí, degrada a half;
 * en otro caso cae a none. Cambio silencioso (sin toast).
 */
export function normalizeRestMode(totalSeconds: number, mode: RestMode): RestMode {
  const allowed = allowedRestModes(totalSeconds)
  if (allowed.includes(mode)) return mode
  if (mode === 'thirds' && allowed.includes('half')) return 'half'
  return 'none'
}

/**
 * Construye la secuencia de segmentos de la rutina de core.
 * La base (trabajo + intervalos) se respeta íntegra hasta totalTime, salvo
 * los intervalos que un descanso reemplaza (ver abajo).
 * Cada descanso (30s) se SUMA a la sesión (alarga el total) y REEMPLAZA al
 * intervalo de ese ejercicio: un descanso nunca queda antes ni después de
 * un intervalo (siempre entre dos trabajos). Tampoco interrumpe un ejercicio
 * ni queda como último segmento de la sesión.
 */
export function buildSegments(cfg: TimerConfig): Segment[] {
  const effectiveMode = normalizeRestMode(cfg.totalTime, cfg.restMode)

  // 1. Base: trabajo + intervalos hasta completar totalTime (sin descansos).
  const base: Segment[] = []
  let t = 0
  let exercise = 0
  while (t < cfg.totalTime) {
    const workDur = Math.min(cfg.workTime, cfg.totalTime - t)
    if (workDur > 0) {
      exercise += 1
      base.push({ type: 'work', exercise, duration: workDur })
      t += workDur
    }
    if (t >= cfg.totalTime) break

    const intervalDur = Math.min(cfg.intervalTime, cfg.totalTime - t)
    if (intervalDur > 0) {
      base.push({ type: 'interval', exercise, duration: intervalDur })
      t += intervalDur
    }
    if (t >= cfg.totalTime) break
  }

  const totalExercises = base.filter((s) => s.type === 'work').length
  if (totalExercises === 0) return []
  const restAfter = new Set(restExerciseIndexes(totalExercises, effectiveMode))
  if (restAfter.size === 0) return base

  // 2. Reemplazar por un descanso completo el intervalo del ejercicio
  // marcado (el descanso queda entre dos trabajos, nunca junto a un
  // intervalo ni al final de la sesión).
  const segments: Segment[] = []
  for (let i = 0; i < base.length; i++) {
    const seg = base[i]
    if (
      seg.type === 'interval' &&
      restAfter.has(seg.exercise) &&
      i < base.length - 1
    ) {
      segments.push({ type: 'rest', exercise: seg.exercise, duration: cfg.restTime })
      continue
    }
    segments.push(seg)
  }

  return segments
}

const SEGMENT_LABELS: Record<SegmentType, string> = {
  work: 'EJERCICIO',
  interval: 'INTERVALO',
  rest: 'DESCANSO',
}

export function segmentLabel(type: SegmentType): string {
  return SEGMENT_LABELS[type]
}

/**
 * Carga los beeps y expone helpers para reproducirlos.
 * - `playOnce`: pitido corto (avisos 3-2-1, inicio de ejercicio).
 * - `playDouble`: doble pitido LARGO (doble de duración que el normal)
 *   para marcar cambios de estado.
 */
function useBeep() {
  const soundRef = useRef<Audio.Sound | null>(null)
  const longSoundRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    let mounted = true
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    }).catch(() => {})
    Audio.Sound.createAsync(BEEP_SOURCE)
      .then(({ sound }) => {
        if (mounted) soundRef.current = sound
        else sound.unloadAsync().catch(() => {})
      })
      .catch(() => {})
    Audio.Sound.createAsync(LONG_BEEP_SOURCE)
      .then(({ sound }) => {
        if (mounted) longSoundRef.current = sound
        else sound.unloadAsync().catch(() => {})
      })
      .catch(() => {})
    return () => {
      mounted = false
      soundRef.current?.unloadAsync().catch(() => {})
      soundRef.current = null
      longSoundRef.current?.unloadAsync().catch(() => {})
      longSoundRef.current = null
    }
  }, [])

  const playOnce = useCallback(async () => {
    try {
      if (!soundRef.current) return
      await soundRef.current.setPositionAsync(0)
      await soundRef.current.replayAsync()
    } catch {
      // ignora errores de audio
    }
  }, [])

  const playLongOnce = useCallback(async () => {
    try {
      if (!longSoundRef.current) return
      await longSoundRef.current.setPositionAsync(0)
      await longSoundRef.current.replayAsync()
    } catch {
      // ignora errores de audio
    }
  }, [])

  const playDouble = useCallback(async () => {
    try {
      await playLongOnce()
      setTimeout(() => {
        playLongOnce()
      }, LONG_BEEP_GAP)
    } catch {
      // ignora errores de audio
    }
  }, [playLongOnce])

  return { playOnce, playDouble }
}

const COUNTDOWN_START = 3

/** Separación entre los dos pitidos largos del doble pitido (beep largo = 300ms). */
const LONG_BEEP_GAP = 350

export function useCoreTimer(cfg: TimerConfig) {
  const { playOnce, playDouble } = useBeep()

  const [status, setStatus] = useState<TimerStatus>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_START)
  const [segIndex, setSegIndex] = useState(0)
  const [segElapsed, setSegElapsed] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  // Índice de segmento mantenido en un ref para que el `tick` (que vive en un
  // intervalo capturado) siempre lea el valor actualizado sin depender del
  // closure de `segIndex`.
  const segIndexRef = useRef(0)
  const setSegIndexSync = useCallback((idx: number) => {
    segIndexRef.current = idx
    setSegIndex(idx)
  }, [])

  const segmentsRef = useRef<Segment[]>(buildSegments(cfg))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // En reposo usamos la secuencia calculada con el cfg actual (para el preview);
  // en ejecución/pausa/fin usamos la secuencia fijada al iniciar.
  const idleSegments = buildSegments(cfg)
  const segments: Segment[] = status === 'idle' ? idleSegments : segmentsRef.current
  const totalDuration =
    status === 'idle'
      ? idleSegments.reduce((a, s) => a + s.duration, 0)
      : sessionTotal

  const currentSegment: Segment | undefined = segments[segIndex]

  // Tiempo restante en el segmento actual
  const segRemaining = currentSegment
    ? Math.max(0, currentSegment.duration - segElapsed)
    : 0

  // Progreso global (fracción 0..1) basado en el tiempo transcurrido
  const elapsedAccum = segments
    .slice(0, segIndex)
    .reduce((acc, s) => acc + s.duration, 0)
  const globalElapsed = elapsedAccum + segElapsed
  const globalProgress = totalDuration > 0 ? globalElapsed / totalDuration : 0
  const globalRemaining = Math.max(0, totalDuration - globalElapsed)

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stopTicking()
    setStatus('idle')
    setCountdown(COUNTDOWN_START)
    setSegIndexSync(0)
    setSegElapsed(0)
    setSessionTotal(0)
    segmentsRef.current = buildSegments(cfg)
  }, [cfg, setSegIndexSync, stopTicking])

  useEffect(() => {
    reset()
  }, [])

  const tick = useCallback(() => {
    setSegElapsed((prev) => {
      const all = segmentsRef.current
      const idx = segIndexRef.current
      const cur: Segment | undefined = all[idx]
      if (!cur) {
        stopTicking()
        setStatus('finished')
        playDouble()
        return 0
      }
      const nextElapsed = prev + 1

      if (nextElapsed >= cur.duration) {
        // Fin del segmento actual: doble pitido marca el cambio de estado
        playDouble()
        const nextIdx = idx + 1
        if (nextIdx >= all.length) {
          stopTicking()
          setSegIndexSync(nextIdx)
          setStatus('finished')
          playDouble()
          return 0
        }
        setSegIndexSync(nextIdx)
        // La fase siguiente arranca justo después del doble pitido (sin beep extra)
        return 0
      }

      // Cuenta 3-2-1 antes de terminar cualquier segmento (trabajo, intervalo o descanso)
      const isCountdownBeep = ['work', 'interval', 'rest'].includes(cur.type)
      if (isCountdownBeep && nextElapsed >= cur.duration - COUNTDOWN_START) {
        playOnce()
      }

      return nextElapsed
    })
  }, [playOnce, playDouble, setSegIndexSync, stopTicking])

  const start = useCallback(() => {
    if (status === 'running' || status === 'countdown') return
    const segs = buildSegments(cfg)
    segmentsRef.current = segs
    setSessionTotal(segs.reduce((a, s) => a + s.duration, 0))
    setSegIndexSync(0)
    setSegElapsed(0)
    setCountdown(COUNTDOWN_START)
    setStatus('countdown')
    playOnce() // pitido al iniciar la cuenta
    stopTicking()
    let cd = COUNTDOWN_START
    intervalRef.current = setInterval(() => {
      cd -= 1
      if (cd <= 0) {
        stopTicking()
        setCountdown(0)
        setStatus('running')
        playDouble() // doble pitido: ¡ya!
        intervalRef.current = setInterval(tick, 1000)
      } else {
        setCountdown(cd)
        playOnce()
      }
    }, 1000)
  }, [cfg, playOnce, playDouble, setSegIndexSync, status, stopTicking, tick])

  const pauseAndLock = useCallback(() => {
    if (status !== 'running') return
    stopTicking()
    setStatus('paused')
  }, [status, stopTicking])

  const resume = useCallback(() => {
    if (status !== 'paused') return
    setStatus('running')
    playOnce()
    intervalRef.current = setInterval(tick, 1000)
  }, [status, playOnce, tick])

  // Limpieza al desmontar
  useEffect(() => {
    return () => stopTicking()
  }, [stopTicking])

  return {
    status,
    countdown,
    segments,
    currentSegment,
    segRemaining,
    totalWorkSegments: segments.filter((s) => s.type === 'work').length,
    globalRemaining,
    globalProgress,
    start,
    pauseAndLock,
    resume,
    reset,
    segmentTypeLabel: currentSegment ? segmentLabel(currentSegment.type) : '',
  }
}
