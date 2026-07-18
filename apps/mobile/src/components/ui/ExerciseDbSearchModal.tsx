import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLazyQuery } from '@apollo/client'
import { useTheme } from '../../theme/ThemeProvider'
import { SEARCH_EXERCISES_QUERY } from '../../lib/graphql'
import { getImageUrl } from '../../lib/api'

interface WgerExercise {
  id: number
  name: string
  category?: string | null
  image?: string | null
  thumbnail?: string | null
  muscles?: string[] | null
  equipment?: string[] | null
  description?: string | null
}

interface ExerciseDbSearchModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (exercise: WgerExercise) => void
}

export function ExerciseDbSearchModal({
  visible,
  onClose,
  onSelect,
}: ExerciseDbSearchModalProps) {
  const { colors } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<TextInput>(null)

  const [searchExercises, { data, loading, error }] = useLazyQuery(SEARCH_EXERCISES_QUERY, {
    fetchPolicy: 'network-only',
  })

  // Debounce: esperar 400ms después de que el usuario deje de escribir
  useEffect(() => {
    if (!searchTerm.trim()) return
    const timer = setTimeout(() => {
      searchExercises({ variables: { name: searchTerm.trim(), limit: 30 } })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm, searchExercises])

  const handleSelect = useCallback(
    (item: WgerExercise) => {
      onSelect(item)
      setSearchTerm('')
      onClose()
    },
    [onSelect, onClose],
  )

  const handleClose = useCallback(() => {
    setSearchTerm('')
    onClose()
  }, [onClose])

  const exercises = data?.searchExercises?.items ?? []

  const renderItem = ({ item }: { item: WgerExercise }) => {
    const imageUri = getImageUrl(item.thumbnail || item.image || undefined)

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${item.name}`}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          marginBottom: 8,
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Image preview */}
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 56, height: 56, borderRadius: 8, marginRight: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              backgroundColor: colors.primary + '30',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700' }}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: 2 }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {item.category && (
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '500' }}>
                  {item.category}
                </Text>
              </View>
            )}
            {item.equipment && item.equipment.length > 0 && (
              <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                {item.equipment.slice(0, 2).join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Select button */}
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
          + Usar
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'ios' ? 60 : 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: colors.primary, fontSize: 16 }}>Cancelar</Text>
          </TouchableOpacity>

          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 18,
              fontWeight: '600',
            }}
          >
            Buscar ejercicio
          </Text>
        </View>

        {/* Search input */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <TextInput
            ref={inputRef}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Ej: bench press, squat, curl..."
            placeholderTextColor={colors.textSecondary}
            autoFocus
            style={{
              backgroundColor: colors.surface,
              color: colors.text,
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>

        {/* Results */}
        {loading && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
              Buscando ejercicios...
            </Text>
          </View>
        )}

        {error && (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
            <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}>
              Error al buscar ejercicios
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13, textAlign: 'center' }}>
              {error.message}
            </Text>
          </View>
        )}

        {!loading && !error && searchTerm.trim() && exercises.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              No se encontraron ejercicios
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              Probá con otro término de búsqueda
            </Text>
          </View>
        )}

        {!loading && !error && exercises.length > 0 && (
          <FlatList
            data={exercises}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Empty state when no search yet */}
        {!loading && !error && !searchTerm.trim() && (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
              Escribí el nombre de un ejercicio para buscar en el catálogo de wger
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Más de 800 ejercicios con imágenes disponibles
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}
