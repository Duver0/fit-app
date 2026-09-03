import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useTimerStore, RestMode } from '../../src/stores/timerStore'
import { useCoreTimer, TimerConfig, segmentLabel, allowedRestModes, normalizeRestMode } from '../../src/hooks/useCoreTimer'
import ConfirmModal from '../../src/components/ui/ConfirmModal'
import { showSuccessToast, showErrorToast } from '../../src/lib/toast'

// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function formatTotal(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

// ---------------------------------------------------------------------------
// Stepper reutilizable
// ---------------------------------------------------------------------------

interface StepperProps {
  label: string
  valueLabel: string
  onDecrement: () => void
  onIncrement: () => void
  disabled?: boolean
  color: string
}

function Stepper({ label, valueLabel, onDecrement, onIncrement, disabled, color }: StepperProps) {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={onDecrement}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Reducir ${label.toLowerCase()}`}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <Ionicons name="remove" size={20} color={color} />
        </TouchableOpacity>

        <Text style={{ fontSize: 26, fontWeight: '800', color: color, minWidth: 64, textAlign: 'center' }}>
          {valueLabel}
        </Text>

        <TouchableOpacity
          onPress={onIncrement}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label.toLowerCase()}`}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <Ionicons name="add" size={20} color={color} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export default function TimerScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const settings = useTimerStore((s) => s.settings)
  const setTotalSeconds = useTimerStore((s) => s.setTotalSeconds)
  const setWorkSeconds = useTimerStore((s) => s.setWorkSeconds)
  const setIntervalSeconds = useTimerStore((s) => s.setIntervalSeconds)
  const setRestMode = useTimerStore((s) => s.setRestMode)

  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  // Config del timer construida a partir del store
  const config: TimerConfig = useMemo(
    () => ({
      totalTime: settings.totalSeconds,
      workTime: settings.workSeconds,
      intervalTime: settings.intervalSeconds,
      restMode: settings.restMode,
      restTime: 30,
    }),
    [settings],
  )

  const timer = useCoreTimer(config)

  const totalMin = Math.floor(settings.totalSeconds / 60)

  // Modos de descanso permitidos para la duración base + autocorrección
  // silenciosa (sin toast) cuando la duración deja inválido el modo actual.
  const allowedModes = useMemo(
    () => allowedRestModes(settings.totalSeconds),
    [settings.totalSeconds],
  )

  useEffect(() => {
    const normalized = normalizeRestMode(settings.totalSeconds, settings.restMode)
    if (normalized !== settings.restMode) {
      setRestMode(normalized)
    }
  }, [settings.totalSeconds, settings.restMode, setRestMode])

  // Preview de sesión: base + descansos (los descansos alargan la sesión).
  const sessionTotal = useMemo(
    () => timer.segments.reduce((a, s) => a + s.duration, 0),
    [timer.segments],
  )

  // Función de color según fase
  const phaseColor =
    timer.currentSegment?.type === 'work'
      ? colors.primary
      : timer.currentSegment?.type === 'rest'
      ? colors.accent
      : colors.warning

  const handleChangeTotal = (delta: number) => {
    const next = Math.min(60, Math.max(1, totalMin + delta))
    setTotalSeconds(next * 60)
  }

  const handleStart = () => {
    // Validación mínima
    if (settings.totalSeconds <= 0) {
      showErrorToast('Configurá un tiempo total válido')
      return
    }
    if (settings.workSeconds <= 0) {
      showErrorToast('El tiempo de trabajo debe ser mayor a 0')
      return
    }
    timer.start()
    showSuccessToast('¡A entrenar! 💪')
  }

  const handleConfirmPause = () => {
    setShowPauseConfirm(false)
    timer.pauseAndLock()
  }

  const handleConfirmFinish = () => {
    setShowFinishConfirm(false)
    timer.reset()
  }

  // Modo inactivo: configuración (compacto, sin scroll en pantallas típicas)
  if (timer.status === 'idle') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 0 }}>
            Timer de Core
          </Text>

          {/* Preview del tiempo total (sesión = base + descansos) */}
          <View style={{
            alignSelf: 'center',
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: colors.surface,
            borderWidth: 5,
            borderColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
            marginBottom: 14,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 4,
          }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              TIEMPO TOTAL
            </Text>
            <Text style={{ color: colors.primary, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] as const, marginTop: 2 }}>
              {formatTotal(sessionTotal)}
            </Text>
          </View>

          {/* Configuradores */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            paddingTop: 14,
          }}>
            <Stepper
              label="Tiempo total (min)"
              valueLabel={`${totalMin}`}
              onDecrement={() => handleChangeTotal(-1)}
              onIncrement={() => handleChangeTotal(1)}
              color={colors.text}
            />

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stepper
                label="Trabajo (s)"
                valueLabel={`${settings.workSeconds}`}
                onDecrement={() => setWorkSeconds(Math.max(5, settings.workSeconds - 5))}
                onIncrement={() => setWorkSeconds(Math.min(60, settings.workSeconds + 5))}
                color={colors.primary}
              />
              <Stepper
                label="Intervalo (s)"
                valueLabel={`${settings.intervalSeconds}`}
                onDecrement={() => setIntervalSeconds(Math.max(3, settings.intervalSeconds - 1))}
                onIncrement={() => setIntervalSeconds(Math.min(15, settings.intervalSeconds + 1))}
                color={colors.warning}
              />
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

            <View style={{ gap: 8 }}>
              {(
                [
                  { key: 'none', label: 'Sin descansos', hint: 'Solo trabajo e intervalo', blockedHint: null },
                  { key: 'half', label: 'Mitad', hint: '1 descanso a la mitad de la sesión', blockedHint: 'Requiere 2 min o más' },
                  { key: 'thirds', label: 'Tercios', hint: '2 descansos repartiendo el tiempo en 3', blockedHint: 'Requiere 3 min o más' },
                ] as { key: RestMode; label: string; hint: string; blockedHint: string | null }[]
              ).map((opt) => {
                const active = settings.restMode === opt.key
                const enabled = allowedModes.includes(opt.key)
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => enabled && setRestMode(opt.key)}
                    disabled={!enabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled: !enabled }}
                    accessibilityLabel={opt.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? `${colors.accent}14` : colors.background,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      opacity: enabled ? 1 : 0.45,
                    }}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={active ? colors.accent : colors.textSecondary}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                        {opt.label}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                        {enabled ? opt.hint : opt.blockedHint}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Botón iniciar grande */}
          <TouchableOpacity
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Iniciar entrenamiento"
            style={{
              marginTop: 16,
              height: 62,
              borderRadius: 31,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 10,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Ionicons name="play" size={26} color="#1A1A1A" />
            <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '800' }}>
              INICIAR
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // Modo countdown (cuenta atrás de 3 antes de arrancar)
  if (timer.status === 'countdown') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: insets.top + 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          Preparate…
        </Text>

        <View style={{
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: colors.surface,
          borderWidth: 8,
          borderColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 28,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 14,
          elevation: 5,
        }}>
          <Text style={{ color: colors.primary, fontSize: 90, fontWeight: '800', fontVariant: ['tabular-nums'] as const }}>
            {timer.countdown}
          </Text>
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 20 }}>
          El ejercicio arranca en {timer.countdown}…
        </Text>
      </View>
    )
  }

  // Modo en progreso / pausado / finalizado
  const isPaused = timer.status === 'paused'
  const isFinished = timer.status === 'finished'

  // Muestra el progreso global como barra
  const progressPercent = Math.min(100, Math.max(0, timer.globalProgress * 100))

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: insets.top + 12 }}>
      {/* Encabezado de estado */}
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 0 }}>
        {isFinished
          ? '¡Rutina completada!'
          : isPaused
          ? 'ENTRENAMIENTO EN PAUSA'
          : 'ESFUERZATE 💪'}
      </Text>

      {/* Número de ejercicio / fase */}
      <Text style={{ fontSize: 20, fontWeight: '800', color: phaseColor, textAlign: 'center', marginTop: 6 }}>
        {timer.currentSegment
          ? timer.currentSegment.type === 'work'
            ? `EJERCICIO ${timer.currentSegment.exercise}`
            : segmentLabel(timer.currentSegment.type)
          : ''}
      </Text>

      {/* Timer grande (legible a distancia) */}
      <View style={{
        alignSelf: 'center',
        width: 330,
        height: 330,
        borderRadius: 165,
        maxWidth: '100%',
        backgroundColor: colors.surface,
        borderWidth: 10,
        borderColor: phaseColor,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
        elevation: 5,
      }}>
        <Text style={{
          color: phaseColor,
          fontSize: isFinished ? 56 : 80,
          fontWeight: '800',
          fontVariant: ['tabular-nums'] as const,
        }}>
          {isFinished ? '✓' : formatTime(timer.segRemaining)}
        </Text>
        {!isFinished && (
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6 }}>
            {timer.currentSegment?.type === 'work'
              ? `Quedan en este ejercicio`
              : `Quedan en este ${segmentLabel(timer.currentSegment?.type || 'interval').toLowerCase()}`}
          </Text>
        )}
      </View>

      {/* Barra de progreso global */}
      <View style={{
        marginTop: 20,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}>
        <View style={{
          width: `${progressPercent}%`,
          height: '100%',
          backgroundColor: colors.primary,
        }} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
        {timer.totalWorkSegments > 0 && timer.currentSegment?.type === 'work'
          ? `Ejercicio ${timer.currentSegment.exercise} de ${timer.totalWorkSegments}`
          : `Tiempo restante total: ${formatTotal(timer.globalRemaining)}`}
      </Text>

      {/* Controles */}
      {!isFinished && (
        <View style={{ marginTop: 20, gap: 12 }}>
          {isPaused ? (
            <TouchableOpacity
              onPress={timer.resume}
              accessibilityRole="button"
              accessibilityLabel="Reanudar entrenamiento"
              style={{
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.success,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Ionicons name="play" size={26} color="#1A1A1A" />
              <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '800' }}>REANUDAR</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowPauseConfirm(true)}
              accessibilityRole="button"
              accessibilityLabel="Pausar entrenamiento"
              style={{
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.warning,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Ionicons name="pause" size={26} color="#1A1A1A" />
              <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '800' }}>PAUSAR</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowFinishConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel="Finalizar entrenamiento"
            style={{
              height: 52,
              borderRadius: 26,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.error,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>
              Finalizar y salir
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isFinished && (
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            onPress={timer.reset}
            accessibilityRole="button"
            accessibilityLabel="Volver a configurar"
            style={{
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '800' }}>
              VOLVER A CONFIGURAR
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmación de pausa */}
      <ConfirmModal
        visible={showPauseConfirm}
        title="¿Pausar entrenamiento?"
        message="Podrás reanudar cuando quieras. Tu progreso no se perderá."
        confirmLabel="Pausar"
        cancelLabel="Seguir"
        onConfirm={handleConfirmPause}
        onCancel={() => setShowPauseConfirm(false)}
      />

      {/* Confirmación de finalizar (descarta progreso) */}
      <ConfirmModal
        visible={showFinishConfirm}
        title="¿Finalizar entrenamiento?"
        message="Se descartará el progreso y volverás a la configuración."
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        confirmDestructive
        onConfirm={handleConfirmFinish}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </View>
  )
}
