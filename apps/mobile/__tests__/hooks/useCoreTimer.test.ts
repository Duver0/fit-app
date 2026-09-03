import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'

// Mock expo-av — must be before any subject imports
vi.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: vi.fn(() => Promise.resolve({ sound: { unloadAsync: vi.fn(() => Promise.resolve()) } })),
    },
    setAudioModeAsync: vi.fn(() => Promise.resolve()),
  },
}))

// Mock del módulo que expone la fuente del beep, para que en el entorno de
// test de Node no se intente ejecutar el `require` del asset binario .wav.
// Vitest hace hoisting de este mock antes de importar el hook.
vi.mock('../../src/lib/sound', () => ({
  BEEP_SOURCE: 0,
}))

import {
  buildSegments,
  segmentLabel,
  restExerciseIndexes,
  useCoreTimer,
  type TimerConfig,
} from '../../src/hooks/useCoreTimer'

const base: TimerConfig = {
  totalTime: 180,
  workTime: 40,
  intervalTime: 10,
  restMode: 'none',
  restTime: 30,
}

describe('restExerciseIndexes', () => {
  it('half: un solo descanso a la mitad (redondeado hacia arriba)', () => {
    expect(restExerciseIndexes(6, 'half')).toEqual([3])
    expect(restExerciseIndexes(5, 'half')).toEqual([3])
    expect(restExerciseIndexes(1, 'half')).toEqual([1])
  })

  it('thirds: dos descansos partiendo en tercios', () => {
    expect(restExerciseIndexes(6, 'thirds')).toEqual([2, 4])
    expect(restExerciseIndexes(9, 'thirds')).toEqual([3, 6])
  })

  it('none: sin descansos', () => {
    expect(restExerciseIndexes(6, 'none')).toEqual([])
  })
})

describe('buildSegments', () => {
  it('alterna trabajo e intervalo respetando el tiempo total', () => {
    const segs = buildSegments(base)
    const total = segs.reduce((a, s) => a + s.duration, 0)
    expect(total).toBe(base.totalTime)
    expect(segs[0].type).toBe('work')
    expect(segs[1].type).toBe('interval')
  })

  it('en las fases de trabajo asigna número de ejercicio 1-based creciente', () => {
    const segs = buildSegments(base)
    const works = segs.filter((s) => s.type === 'work')
    expect(works.length).toBeGreaterThan(0)
    expect(works[0].exercise).toBe(1)
    works.forEach((w, i) => {
      expect(w.exercise).toBe(i + 1)
    })
  })

  it('no inserta descansos si restMode es none', () => {
    const segs = buildSegments(base)
    expect(segs.some((s) => s.type === 'rest')).toBe(false)
  })

  it('half: inserta un descanso de 30s al finalizar el ejercicio de la mitad', () => {
    // totalTime 300 + ciclo 50 => 6 ejercicios => descanso tras el ej. 3
    const cfg: TimerConfig = { ...base, totalTime: 300, restMode: 'half' }
    const segs = buildSegments(cfg)
    const rests = segs.filter((s) => s.type === 'rest')
    expect(rests).toHaveLength(1)
    expect(rests[0].duration).toBe(30)
    const restIndex = segs.findIndex((s) => s.type === 'rest')
    // Secuencia: trabajo(ej3) -> intervalo(ej3) -> descanso
    expect(segs[restIndex - 1].type).toBe('interval')
    expect(segs[restIndex - 1].exercise).toBe(3)
    expect(segs[restIndex - 2].type).toBe('work')
    expect(segs[restIndex - 2].exercise).toBe(3)
  })

  it('thirds: inserta dos descansos partiendo el trabajo en tercios', () => {
    // totalTime 300 => 6 ejercicios => descansos tras los ejercicios 2 y 4
    const cfg: TimerConfig = { ...base, totalTime: 300, restMode: 'thirds' }
    const segs = buildSegments(cfg)
    const restExercises = segs.filter((s) => s.type === 'rest').map((s) => s.exercise)
    expect(restExercises).toEqual([2, 4])
  })

  it('respeta el tiempo total aunque haya descansos (restos se toman del total)', () => {
    const cfg: TimerConfig = { totalTime: 300, workTime: 40, intervalTime: 10, restMode: 'half', restTime: 30 }
    const segs = buildSegments(cfg)
    const total = segs.reduce((a, s) => a + s.duration, 0)
    expect(total).toBe(300)
    expect(segs.some((s) => s.type === 'rest')).toBe(true)
  })

  it('devuelve vacío si el tiempo total es 0', () => {
    expect(buildSegments({ ...base, totalTime: 0 })).toEqual([])
  })

  it('trunca el último segmento si el tiempo total corta en medio', () => {
    const cfg: TimerConfig = { totalTime: 95, workTime: 40, intervalTime: 10, restMode: 'none', restTime: 30 }
    const segs = buildSegments(cfg)
    const total = segs.reduce((a, s) => a + s.duration, 0)
    expect(total).toBe(95)
  })
})

describe('segmentLabel', () => {
  it('devuelve etiquetas en mayúsculas para cada tipo', () => {
    expect(segmentLabel('work')).toBe('EJERCICIO')
    expect(segmentLabel('interval')).toBe('INTERVALO')
    expect(segmentLabel('rest')).toBe('DESCANSO')
  })
})

describe('useCoreTimer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('arranca con cuenta atrás de 3 y luego pasa de trabajo a intervalo', async () => {
    vi.useFakeTimers()

    const cfg: TimerConfig = { totalTime: 100, workTime: 40, intervalTime: 10, restMode: 'none', restTime: 30 }
    const { result } = renderHook(() => useCoreTimer(cfg))

    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.start()
    })
    expect(result.current.status).toBe('countdown')
    expect(result.current.countdown).toBe(3)

    // Avanza la cuenta atrás de 3s → arranca el trabajo
    await act(async () => {
      vi.advanceTimersByTime(1000 * 3)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.currentSegment?.type).toBe('work')
    expect(result.current.segRemaining).toBe(40)

    // Avanza los 40s de trabajo → pasa a intervalo
    await act(async () => {
      vi.advanceTimersByTime(1000 * 40)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.currentSegment?.type).toBe('interval')
    expect(result.current.segRemaining).toBe(10)
  })

  it('pasa a finished al completar la secuencia completa', async () => {
    vi.useFakeTimers()

    // total = 1 trabajo de 5s (termina en 5)
    const cfg: TimerConfig = { totalTime: 5, workTime: 5, intervalTime: 5, restMode: 'none', restTime: 30 }
    const { result } = renderHook(() => useCoreTimer(cfg))

    act(() => {
      result.current.start()
    })
    await act(async () => {
      vi.advanceTimersByTime(1000 * 3)
    })
    expect(result.current.status).toBe('running')

    await act(async () => {
      vi.advanceTimersByTime(1000 * 5)
    })

    expect(result.current.status).toBe('finished')
  })

  it('pausa y reanuda preservando el progreso', async () => {
    vi.useFakeTimers()

    const cfg: TimerConfig = { totalTime: 100, workTime: 40, intervalTime: 10, restMode: 'none', restTime: 30 }
    const { result } = renderHook(() => useCoreTimer(cfg))

    act(() => {
      result.current.start()
    })
    await act(async () => {
      vi.advanceTimersByTime(1000 * 3)
    })
    await act(async () => {
      vi.advanceTimersByTime(1000 * 10)
    })
    expect(result.current.segRemaining).toBe(30)

    act(() => {
      result.current.pauseAndLock()
    })
    expect(result.current.status).toBe('paused')
    expect(result.current.segRemaining).toBe(30)

    // Avanzar mientras está pausado no debe cambiar nada
    await act(async () => {
      vi.advanceTimersByTime(1000 * 20)
    })
    expect(result.current.segRemaining).toBe(30)

    act(() => {
      result.current.resume()
    })
    expect(result.current.status).toBe('running')

    await act(async () => {
      vi.advanceTimersByTime(1000 * 30)
    })
    // 10 (avanzado) + 30 (después de reanudar) = 40 → pasa a intervalo
    expect(result.current.currentSegment?.type).toBe('interval')
  })
})
