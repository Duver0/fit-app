import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import BottomSheetModal from './BottomSheetModal'
import { NumberSpinner } from './NumberSpinner'

// ── Conversion helpers ────────────────────────────────────────────────
const KG_TO_LB = 2.20462

function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 100) / 100
}

function syncKgToLb(
  t: string,
  setKg: (v: string) => void,
  setLb: (v: string) => void,
) {
  const v = parseFloat(t)
  setKg(t)
  if (!isNaN(v) && v > 0) setLb(kgToLb(v).toString())
  else setLb('')
}

function syncLbToKg(
  t: string,
  setKg: (v: string) => void,
  setLb: (v: string) => void,
) {
  const v = parseFloat(t)
  setLb(t)
  if (!isNaN(v) && v > 0) setKg((v / KG_TO_LB).toString().substring(0, 6))
}

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'reps + peso',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

// ── Types ─────────────────────────────────────────────────────────────
export type UpsertMarkData =
  | { kind: 'REPS_AND_WEIGHT'; reps: number; weight: number }
  | { kind: 'KG'; value: number }
  | { kind: 'SIMPLE'; value: number }

type Props = {
  visible: boolean
  onClose: () => void
  onSave: (data: UpsertMarkData) => void
  unit: string
  exerciseName: string
  /** Existing values when editing (empty string = no value) */
  initialReps?: string
  initialWeight?: string
  initialWeightLb?: string
  initialValue?: string
  initialValueLb?: string
  isSaving?: boolean
}

// ── Component ─────────────────────────────────────────────────────────
export default function UpsertMarkModal({
  visible,
  onClose,
  onSave,
  unit,
  exerciseName,
  initialReps = '',
  initialWeight = '',
  initialWeightLb = '',
  initialValue = '',
  initialValueLb = '',
  isSaving = false,
}: Props) {
  const { colors } = useTheme()

  // Form state
  const [reps, setReps] = useState(initialReps)
  const [weight, setWeight] = useState(initialWeight)
  const [weightLb, setWeightLb] = useState(initialWeightLb)
  const [value, setValue] = useState(initialValue)
  const [valueLb, setValueLb] = useState(initialValueLb)

  // Focus state for kg/lb inputs
  const [kgFocused, setKgFocused] = useState(false)
  const [lbFocused, setLbFocused] = useState(false)
  const kgRef = useRef<TextInput>(null)
  const lbRef = useRef<TextInput>(null)

  const handleClose = () => {
    setReps('')
    setWeight('')
    setWeightLb('')
    setValue('')
    setValueLb('')
    onClose()
  }

  const handleSave = () => {
    if (unit === 'REPS_AND_WEIGHT') {
      const r = parseInt(reps, 10)
      const w = parseFloat(weight)
      if (isNaN(r) || isNaN(w) || r < 1 || w <= 0) return
      onSave({ kind: 'REPS_AND_WEIGHT', reps: r, weight: w })
    } else if (unit === 'KG') {
      let v = parseFloat(value)
      if (isNaN(v) || v <= 0) {
        const lb = parseFloat(valueLb)
        if (!isNaN(lb) && lb > 0) v = lb / KG_TO_LB
        else return
      }
      onSave({ kind: 'KG', value: v })
    } else {
      const v = parseFloat(value)
      if (isNaN(v) || v <= 0) return
      onSave({ kind: 'SIMPLE', value: v })
    }
    handleClose()
  }

  // ── Reusable kg/lb input row ─────────────────────────────────────
  const renderKgLbInputs = (
    kgValue: string,
    lbValue: string,
    onKgChange: (t: string) => void,
    onLbChange: (t: string) => void,
  ) => (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
      <Pressable
        onPress={() => kgRef.current?.focus()}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: kgFocused ? colors.primary : colors.border,
          overflow: 'hidden',
        }}
      >
        <TextInput
          ref={kgRef}
          value={kgValue}
          onChangeText={onKgChange}
          placeholder="50"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          maxLength={7}
          accessibilityLabel="Peso en kilogramos"
          onFocus={() => setKgFocused(true)}
          onBlur={() => setKgFocused(false)}
          underlineColorAndroid="transparent"
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 22,
            textAlign: 'center',
            paddingVertical: 14,
            minWidth: 0,
            // @ts-ignore — outlineStyle soportado por RN Web
            outlineStyle: 'none',
          }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '900', paddingRight: 4 }}>
          kg
        </Text>
      </Pressable>
      <Pressable
        onPress={() => lbRef.current?.focus()}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: lbFocused ? colors.primary : colors.border,
          overflow: 'hidden',
        }}
      >
        <TextInput
          ref={lbRef}
          value={lbValue}
          onChangeText={onLbChange}
          placeholder="110"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          maxLength={7}
          accessibilityLabel="Peso en libras"
          onFocus={() => setLbFocused(true)}
          onBlur={() => setLbFocused(false)}
          underlineColorAndroid="transparent"
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 22,
            textAlign: 'center',
            paddingVertical: 14,
            minWidth: 0,
            // @ts-ignore — outlineStyle soportado por RN Web
            outlineStyle: 'none',
          }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '900', paddingRight: 4 }}>
          lb
        </Text>
      </Pressable>
    </View>
  )

  // ── Render ────────────────────────────────────────────────────────
  return (
    <BottomSheetModal visible={visible} onClose={handleClose}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
        Actualizar marca
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20 }}>
        {exerciseName}
      </Text>

      {unit === 'REPS_AND_WEIGHT' ? (
        <>
          <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>
            Repeticiones
          </Text>
          <NumberSpinner
            value={reps}
            onChange={setReps}
            step={1}
            min={0}
            max={99}
            decimals={0}
            unit="reps"
            accessibilityLabel="Repeticiones"
          />
          <View style={{ height: 20 }} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
            Peso
          </Text>
          {renderKgLbInputs(
            weight,
            weightLb,
            (t) => syncKgToLb(t, setWeight, setWeightLb),
            (t) => syncLbToKg(t, setWeight, setWeightLb),
          )}
        </>
      ) : unit === 'KG' ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Valor (kg)
            </Text>
            <View style={{
              backgroundColor: colors.primary + '15',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
                kg
              </Text>
            </View>
          </View>
          {renderKgLbInputs(
            value,
            valueLb,
            (t) => syncKgToLb(t, setValue, setValueLb),
            (t) => syncLbToKg(t, setValue, setValueLb),
          )}
        </>
      ) : (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
            Valor ({UNIT_LABELS[unit] || unit})
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Tu marca"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderRadius: 12,
              padding: 16,
              fontSize: 18,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </>
      )}

      <TouchableOpacity
        onPress={handleSave}
        disabled={isSaving}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 24,
          padding: 16,
          alignItems: 'center',
          marginBottom: 8,
          opacity: isSaving ? 0.6 : 1,
        }}
      >
        {isSaving ? (
          <ActivityIndicator color="#1A1A1A" />
        ) : (
          <Text style={{ color: '#1A1A1A', fontWeight: '600', fontSize: 16 }}>
            Guardar marca
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleClose} style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
      </TouchableOpacity>
    </BottomSheetModal>
  )
}
