import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useSmartBack } from '../../../src/hooks/useSmartBack'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { useGroups } from '../../../src/hooks/useGroups'
import ScreenHeader from '../../../src/components/ui/ScreenHeader'

export default function CreateGroupScreen() {
  const { colors } = useTheme()
  const { createGroup, isCreating } = useGroups()
  const handleBack = useSmartBack('/(app)/groups')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('El nombre del grupo es obligatorio')
      return
    }
    try {
      setError('')
      await createGroup(name.trim(), description.trim() || undefined)
      handleBack()
    } catch (e: any) {
      setError(e.message || 'Error al crear grupo')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Crear Grupo" />

      <View style={{ padding: 24 }}>
        {error ? <Text style={{ color: colors.error, marginBottom: 12 }}>{error}</Text> : null}

        <TextInput placeholder="Nombre del grupo" placeholderTextColor={colors.textSecondary}
          value={name} onChangeText={setName}
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }} />

        <TextInput placeholder="Descripción (opcional)" placeholderTextColor={colors.textSecondary}
          value={description} onChangeText={setDescription} multiline numberOfLines={3}
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }} />

        <TouchableOpacity onPress={handleCreate} disabled={isCreating}
          style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', opacity: isCreating ? 0.6 : 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Crear grupo</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
