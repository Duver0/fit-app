import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView, Image } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { ME_QUERY, GROUP_QUERY, UPDATE_GROUP_MUTATION, DELETE_GROUP_MUTATION, CREATE_EXERCISE_MUTATION } from '../../../../src/lib/graphql'
import { getImageUrl } from '../../../../src/lib/api'
import { showSuccessToast, showErrorToast } from '../../../../src/lib/toast'
import ScreenHeader from '../../../../src/components/ui/ScreenHeader'
import AvatarPickerModal from '../../../../src/components/ui/AvatarPickerModal'
import BottomSheetModal from '../../../../src/components/ui/BottomSheetModal'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const

export default function GroupSettingsScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()

  const { data: meData, loading: meLoading } = useQuery(ME_QUERY)
  const { data: groupData, loading: groupLoading, refetch } = useQuery(GROUP_QUERY, {
    variables: { id: groupId },
  })

  const [updateGroup, { loading: updating }] = useMutation(UPDATE_GROUP_MUTATION)
  const [deleteGroup, { loading: deleting }] = useMutation(DELETE_GROUP_MUTATION)
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  const [initialized, setInitialized] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false)

  const group = groupData?.group
  const me = meData?.me
  const isOwner = me?.id && group?.owner?.id === me.id
  const isLoading = meLoading || groupLoading

  const displayAvatar = avatarUrl || getImageUrl(group?.avatarUrl)

  if (!initialized && group) {
    setName(group.name || '')
    setDescription(group.description || '')
    setAvatarUrl(null)
    setInitialized(true)
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!isOwner) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
          No tienes permisos
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          Solo el dueño del grupo puede acceder a la configuración.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleAvatarSelected = (url: string) => {
    setAvatarUrl(url)
    setAvatarPickerVisible(false)
  }

  const handleSave = async () => {
    try {
      await updateGroup({
        variables: { id: groupId, input: { name, description, ...(avatarUrl ? { avatarUrl } : {}) } },
      })
      showSuccessToast('Cambios guardados correctamente')
    } catch (e: any) {
      showErrorToast(e?.message || 'Error al guardar los cambios')
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Eliminar grupo',
      '¿Estás seguro de que querés eliminar este grupo? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup({ variables: { id: groupId } })
              showSuccessToast('Grupo eliminado')
              router.replace('/(app)/groups')
            } catch (e: any) {
              showErrorToast(e?.message || 'Error al eliminar el grupo')
            }
          },
        },
      ],
    )
  }

  const handleCreateExercise = async () => {
    if (!exerciseName) return
    try {
      await createExercise({
        variables: { input: { groupId, name: exerciseName, unit: exerciseUnit } },
      })
      setShowExerciseModal(false)
      setExerciseName('')
      setExerciseUnit('KG')
      showSuccessToast('Ejercicio creado')
    } catch (e: any) {
      showErrorToast(e?.message || 'Error al crear el ejercicio')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Configuración" />

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>

        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre del grupo"
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 20,
            borderWidth: 1, borderColor: colors.border, fontSize: 16,
          }}
        />

        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>Descripción</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del grupo"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 24,
            borderWidth: 1, borderColor: colors.border, fontSize: 16, minHeight: 100,
          }}
        />

        {/* Group photo */}
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>Foto del grupo</Text>
        <TouchableOpacity onPress={() => setAvatarPickerVisible(true)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <ImageWithFallback
            source={{ uri: displayAvatar }}
            style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 8 }}
            fallback={
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 40, fontWeight: 'bold', color: colors.text }}>
                  {group?.name?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
            }
          />
          <Text style={{ color: colors.primary, fontSize: 14 }}>Cambiar foto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={updating}
          style={{
            backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 32,
            opacity: updating ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
            {updating ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </TouchableOpacity>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 32, marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Ejercicios</Text>

          <TouchableOpacity
            onPress={() => setShowExerciseModal(true)}
            style={{
              backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center',
              borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>+ Crear ejercicio</Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.danger, marginBottom: 16 }}>Zona de peligro</Text>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{
              backgroundColor: colors.danger, borderRadius: 12, padding: 16, alignItems: 'center',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              {deleting ? 'Eliminando…' : 'Eliminar grupo'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AvatarPickerModal
        visible={avatarPickerVisible}
        context="group"
        onSelect={handleAvatarSelected}
        onCancel={() => setAvatarPickerVisible(false)}
      />

      <BottomSheetModal visible={showExerciseModal} onClose={() => setShowExerciseModal(false)}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Crear ejercicio</Text>

        <TextInput
          value={exerciseName}
          onChangeText={setExerciseName}
          placeholder="Nombre del ejercicio"
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
            borderWidth: 1, borderColor: colors.border, fontSize: 16,
          }}
        />

        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Unidad</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {UNITS.map((unit) => (
            <TouchableOpacity
              key={unit}
              onPress={() => setExerciseUnit(unit)}
              style={{
                backgroundColor: exerciseUnit === unit ? colors.primary : colors.background,
                borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
                borderWidth: 1, borderColor: exerciseUnit === unit ? colors.primary : colors.border,
              }}
            >
              <Text style={{
                color: exerciseUnit === unit ? colors.text : colors.textSecondary,
                fontWeight: exerciseUnit === unit ? '600' : '400',
              }}>
                {unit === 'KG' ? 'kg' : unit === 'REPS' ? 'reps' : unit === 'MIN' ? 'min' : unit === 'SEC' ? 'seg' : 'm'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleCreateExercise}
          disabled={!exerciseName || creating}
          style={{
            backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
            opacity: (!exerciseName || creating) ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {creating ? 'Creando…' : 'Crear ejercicio'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowExerciseModal(false)} style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </View>
  )
}
