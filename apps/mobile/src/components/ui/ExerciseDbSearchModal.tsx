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
  ScrollView,
} from 'react-native'
import { useLazyQuery } from '@apollo/client'
import { useTheme } from '../../theme/ThemeProvider'
import { SEARCH_EXERCISES_QUERY, SEARCH_STOCK_IMAGES_QUERY } from '../../lib/graphql'
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

interface StockImage {
  id: string
  provider: string
  url: string
  thumbnail: string
  author: string
  attributionUrl: string
  width?: number
  height?: number
}

type Tab = 'wger' | 'stock'

interface ExerciseDbSearchModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (exercise: WgerExercise) => void
  onSelectImage?: (imageUrl: string, author: string, provider: string) => void
}

export function ExerciseDbSearchModal({
  visible,
  onClose,
  onSelect,
  onSelectImage,
}: ExerciseDbSearchModalProps) {
  const { colors } = useTheme()

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<Tab>('wger')

  // --- Wger state ---
  const [wgerTerm, setWgerTerm] = useState('')
  const inputRef = useRef<TextInput>(null)

  const [searchExercises, { data: wgerData, loading: wgerLoading, error: wgerError }] = useLazyQuery(SEARCH_EXERCISES_QUERY, {
    fetchPolicy: 'network-only',
  })

  // Debounce wger search (400ms)
  useEffect(() => {
    if (!wgerTerm.trim()) return
    const timer = setTimeout(() => {
      searchExercises({ variables: { name: wgerTerm.trim(), limit: 30 } })
    }, 400)
    return () => clearTimeout(timer)
  }, [wgerTerm, searchExercises])

  // --- Stock photo state ---
  const [stockQuery, setStockQuery] = useState('')
  const [stockResults, setStockResults] = useState<StockImage[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockSelected, setStockSelected] = useState<StockImage | null>(null)
  const [hasSearchedStock, setHasSearchedStock] = useState(false)
  const stockTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [searchStock] = useLazyQuery(SEARCH_STOCK_IMAGES_QUERY, {
    fetchPolicy: 'network-only',
  })

  // Debounce stock search (400ms)
  useEffect(() => {
    if (!stockQuery.trim()) {
      setStockResults([])
      setHasSearchedStock(false)
      setStockError(null)
      return
    }

    if (stockTimeoutRef.current) clearTimeout(stockTimeoutRef.current)

    stockTimeoutRef.current = setTimeout(async () => {
      setHasSearchedStock(true)
      setStockLoading(true)
      setStockError(null)
      try {
        const result = await searchStock({ variables: { query: stockQuery.trim(), limit: 30 } })
        const images = result.data?.searchGroupImages ?? []
        setStockResults(images)
        if (images.length === 0) {
          setStockError('No se encontraron imágenes para esta búsqueda')
        }
      } catch (e: any) {
        setStockError(e?.message || 'Error al buscar imágenes')
        setStockResults([])
      } finally {
        setStockLoading(false)
      }
    }, 400)

    return () => {
      if (stockTimeoutRef.current) clearTimeout(stockTimeoutRef.current)
    }
  }, [stockQuery, searchStock])

  // Reset on open
  useEffect(() => {
    if (visible) {
      setWgerTerm('')
      setStockQuery('')
      setStockResults([])
      setStockSelected(null)
      setStockError(null)
      setHasSearchedStock(false)
      setActiveTab('wger')
    }
  }, [visible])

  // --- Handlers ---
  const handleSelectWger = useCallback(
    (item: WgerExercise) => {
      onSelect(item)
      onClose()
    },
    [onSelect, onClose],
  )

  const handleSelectStock = useCallback(
    (img: StockImage) => {
      if (onSelectImage) {
        onSelectImage(img.url, img.author, img.provider)
        onClose()
      }
    },
    [onSelectImage, onClose],
  )

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const wgerExercises = wgerData?.searchExercises?.items ?? []

  // --- Render wger item ---
  const renderWgerItem = ({ item }: { item: WgerExercise }) => {
    const imageUri = getImageUrl(item.thumbnail || item.image || undefined)

    return (
      <TouchableOpacity
        onPress={() => handleSelectWger(item)}
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
            Imagen del ejercicio
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('wger')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: activeTab === 'wger' ? colors.primary : colors.background,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: activeTab === 'wger' ? colors.text : colors.textSecondary,
              fontWeight: '600',
              fontSize: 14,
            }}>
              Catálogo wger
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('stock')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: activeTab === 'stock' ? colors.primary : colors.background,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: activeTab === 'stock' ? colors.text : colors.textSecondary,
              fontWeight: '600',
              fontSize: 14,
            }}>
              📷 Fotos reales
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- WGER TAB --- */}
        {activeTab === 'wger' && (
          <>
            {/* Search input */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <TextInput
                ref={inputRef}
                value={wgerTerm}
                onChangeText={setWgerTerm}
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

            {/* Loading */}
            {wgerLoading && (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
                  Buscando ejercicios...
                </Text>
              </View>
            )}

            {/* Error */}
            {wgerError && (
              <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
                <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}>
                  Error al buscar ejercicios
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13, textAlign: 'center' }}>
                  {wgerError.message}
                </Text>
              </View>
            )}

            {/* Empty results */}
            {!wgerLoading && !wgerError && wgerTerm.trim() && wgerExercises.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                  No se encontraron ejercicios
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                  Probá con otro término de búsqueda
                </Text>
              </View>
            )}

            {/* Results */}
            {!wgerLoading && !wgerError && wgerExercises.length > 0 && (
              <FlatList
                data={wgerExercises}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderWgerItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Empty state (no search yet) */}
            {!wgerLoading && !wgerError && !wgerTerm.trim() && (
              <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
                  Escribí el nombre de un ejercicio para buscar en el catálogo de wger
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                  Más de 800 ejercicios con imágenes disponibles
                </Text>
              </View>
            )}
          </>
        )}

        {/* --- STOCK PHOTOS TAB --- */}
        {activeTab === 'stock' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 8 }}>
              Buscá fotos reales para tu ejercicio en Unsplash, Pexels y Pixabay.
            </Text>

            {/* Search input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              marginBottom: 16,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={stockQuery}
                onChangeText={setStockQuery}
                placeholder="Buscar fotos (ej: press banca, gym...)"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 15,
                  paddingVertical: 14,
                }}
              />
              {stockLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            {/* Loading */}
            {stockLoading && stockResults.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
                  Buscando imágenes…
                </Text>
              </View>
            )}

            {/* Error */}
            {stockError && stockResults.length === 0 && !stockLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 4 }}>📭</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{stockError}</Text>
              </View>
            )}

            {/* Results grid */}
            {stockResults.length > 0 && (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                  {stockResults.length} resultado{stockResults.length !== 1 ? 's' : ''} • Tocá una foto para usarla
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {stockResults.map((img) => (
                    <TouchableOpacity
                      key={img.id}
                      onPress={() => {
                        setStockSelected(img)
                        handleSelectStock(img)
                      }}
                      activeOpacity={0.7}
                      style={{
                        width: '48%',
                        borderRadius: 12,
                        overflow: 'hidden',
                        backgroundColor: colors.surface,
                        borderWidth: stockSelected?.id === img.id ? 3 : 1,
                        borderColor: stockSelected?.id === img.id ? colors.primary : colors.border,
                        marginBottom: 12,
                      }}
                    >
                      <Image
                        source={{ uri: img.thumbnail || img.url }}
                        style={{ width: '100%', aspectRatio: 1 }}
                        resizeMode="cover"
                      />
                      <View style={{ padding: 6 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }} numberOfLines={1}>
                          📷 {img.author}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 9 }}>
                          {img.provider}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Attribution */}
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 16,
                }}>
                  Fotos vía Unsplash, Pexels y Pixabay
                </Text>
              </>
            )}

            {/* Empty (no search yet) */}
            {!stockLoading && !stockError && !stockQuery.trim() && !hasSearchedStock && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 40, marginBottom: 12 }}>🏋️</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  Escribí algo arriba para buscar fotos{'\n'}para tu ejercicio
                </Text>
              </View>
            )}

            {/* No results after search */}
            {hasSearchedStock && !stockLoading && stockResults.length === 0 && stockError && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 4 }}>📭</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{stockError}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}
