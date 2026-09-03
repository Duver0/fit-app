import { useCallback, useEffect, useRef, useState } from 'react'
import { Audio } from 'expo-av'
import { BEEP_SOURCE } from '../lib/sound'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export type SegmentType = 'work' | 'interval' | 'rest'

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
  restEnabled: boolean
  restTime: number // 30s fijo
}

/**
 * Construye la secuencia de segmentos de la rutina de core.
 * Siempre respeta el tiempo total (suma de duraciones === total).
 * El descanso (30s) se inserta después del ejercicio 3, 6, 9... (máx 1 cada 3
 * ejercicios) sólo si restEnabled.
 */
export function buildSegments(cfg: TimerConfig): Segment[] {
  const segments: Segment[] = []
  let t = 0
  let exercise = 0

  while (t < cfg.totalTime) {
    // 1. Trabajo
    const workDur = Math.min(cfg.workTime, cfg.totalTime - t)
    if (workDur > 0) {
      exercise += 1
      segments.push({ type: 'work', exercise, duration: workDur })
      t += workDur
    }
    if (t >= cfg.totalTime) break

    // 2. Intervalo (tiempo para acomodarse al siguiente ejercicio)
    const intervalDur = Math.min(cfg.intervalTime, cfg.totalTime - t)
    if (intervalDur > 0) {
      segments.push({ type: 'interval', exercise, duration: intervalDur })
      t += intervalDur
    }
    if (t >= cfg.totalTime) break

    // 3. Descanso opcional, cada 3 ejercicios (máx 1 por cada 3)
    if (cfg.restEnabled && exercise > 0 && exercise % 3 === 0) {
      const restDur = Math.min(cfg.restTime, cfg.totalTime - t)
      if (restDur > 0) {
        segments.push({ type: 'rest', exercise, duration: restDur })
        t += restDur
      }
    }
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

/** Carga un único beep y expone helpers para reproducirlo 1 o 2 veces. */
function useBeep() {
  const soundRef = useRef<Audio.Sound | null>(null)

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
    return () => {
      mounted = false
      soundRef.current?.unloadAsync().catch(() => {})
      soundRef.current = null
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

  const playDouble = useCallback(async () => {
    try {
      await playOnce()
      setTimeout(() => {
        playOnce()
      }, 180)
    } catch {
      // ignora errores de audio
    }
  }, [playOnce])

  return { playOnce, playDouble }
}

export function useCoreTimer(cfg: TimerConfig) {
  const { playOnce, playDouble } = useBeep()

  const [status, setStatus] = useState<TimerStatus>('idle')
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
        // Fin del segmento actual
        if (cur.type === 'work') {
          playDouble() // doble pitido al finalizar el ejercicio (llegó a cero)
        }
        const nextIdx = idx + 1
        if (nextIdx >= all.length) {
          stopTicking()
          setSegIndexSync(nextIdx)
          setStatus('finished')
          playDouble()
          return 0
        }
        setSegIndexSync(nextIdx)
        // Pitido al iniciar el siguiente ejercicio
        if (all[nextIdx].type === 'work') {
          playOnce()
        }
        return 0
      }

      // Aviso: 3s antes de terminar el trabajo
      if (cur.type === 'work' && nextElapsed === cur.duration - 3) {
        playOnce()
      }

      return nextElapsed
    })
  }, [playOnce, playDouble, setSegIndexSync, stopTicking])

  const start = useCallback(() => {
    if (status === 'running') return
    const segs = buildSegments(cfg)
    segmentsRef.current = segs
    setSessionTotal(segs.reduce((a, s) => a + s.duration, 0))
    setSegIndexSync(0)
    setSegElapsed(0)
    setStatus('running')
    playOnce() // pitido de inicio
    stopTicking()
    intervalRef.current = setInterval(tick, 1000)
  }, [cfg, playOnce, setSegIndexSync, status, stopTicking, tick])

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
