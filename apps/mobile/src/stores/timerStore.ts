import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RestMode } from '../hooks/useCoreTimer'

export type { RestMode }

export interface TimerSettings {
  totalSeconds: number
  workSeconds: number // máx 60
  intervalSeconds: number // máx 15
  restMode: RestMode
}

interface TimerState {
  settings: TimerSettings
  setTotalSeconds: (v: number) => void
  setWorkSeconds: (v: number) => void
  setIntervalSeconds: (v: number) => void
  setRestMode: (v: RestMode) => void
}

const DEFAULT_SETTINGS: TimerSettings = {
  totalSeconds: 300, // 5 min por defecto
  workSeconds: 40, // 40s de trabajo
  intervalSeconds: 10, // 10s de intervalo
  restMode: 'half',
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setTotalSeconds: (v) =>
        set((s) => ({ settings: { ...s.settings, totalSeconds: v } })),
      setWorkSeconds: (v) =>
        set((s) => ({ settings: { ...s.settings, workSeconds: v } })),
      setIntervalSeconds: (v) =>
        set((s) => ({ settings: { ...s.settings, intervalSeconds: v } })),
      setRestMode: (v) =>
        set((s) => ({ settings: { ...s.settings, restMode: v } })),
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
