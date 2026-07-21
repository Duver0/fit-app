import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, Modal, FlatList, Image, ScrollView,
  ActivityIndicator, TextInput,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { getAvatarUrl, getRandomSeed, USER_STYLES, GROUP_STYLES, type AvatarStyle } from '../../lib/avatar'
import { useGroupImages, type GroupImage } from '../../hooks/useGroupImages'

export type PickerContext = 'user' | 'group'
type Tab = 'avatars' | 'stock'

interface AvatarOption {
  seed: string
  url: string
}

interface Props {
  visible: boolean
  context?: PickerContext
  /** Estilo inicial (opcional, por defecto 'avataars' para user, 'identicon' para group) */
  initialStyle?: AvatarStyle
  onSelect: (avatarUrl: string) => void
  onCancel: () => void
}

const GRID_COUNT = 8

export default function AvatarPickerModal({ visible, context = 'user', initialStyle, onSelect, onCancel }: Props) {
  const { colors } = useTheme()
  const { searchImages, searchLoading } = useGroupImages()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const styles = context === 'group' ? GROUP_STYLES : USER_STYLES
  const defaultStyle = initialStyle || (context === 'group' ? 'identicon' : 'avataaars')

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<Tab>('avatars')

  // --- DiceBear state ---
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(defaultStyle)
  const [options, setOptions] = useState<AvatarOption[]>([])
  const [dicebearSelectedUrl, setDicebearSelectedUrl] = useState<string | null>(null)

  // --- Stock photo state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [stockResults, setStockResults] = useState<GroupImage[]>([])
  const [stockSelected, setStockSelected] = useState<GroupImage | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Genera opciones DiceBear con seeds aleatorios para el estilo actual
  const generateOptions = useCallback((style: AvatarStyle) => {
    const newOptions: AvatarOption[] = []
    for (let i = 0; i < GRID_COUNT; i++) {
      const seed = getRandomSeed()
      newOptions.push({ seed, url: getAvatarUrl({ style, seed, size: 120 }) })
    }
    setOptions(newOptions)
    setDicebearSelectedUrl(null)
  }, [])

  // Al abrirse, resetear todo
  useEffect(() => {
    if (visible) {
      setActiveTab('avatars')
      setSelectedStyle(initialStyle || (context === 'group' ? 'identicon' : 'avataaars'))
      setDicebearSelectedUrl(null)
      generateOptions(initialStyle || (context === 'group' ? 'identicon' : 'avataaars'))
      // Reset stock
      setSearchQuery('')
      setStockResults([])
      setStockSelected(null)
      setStockError(null)
      setHasSearched(false)
    }
  }, [visible, initialStyle, context, generateOptions])

  // --- DiceBear handlers ---
  const handleStyleChange = (style: AvatarStyle) => {
    setSelectedStyle(style)
    generateOptions(style)
  }

  const handleRefresh = () => {
    generateOptions(selectedStyle)
  }

  // --- Stock photo handlers ---
  const handleSearch = (text: string) => {
    setSearchQuery(text)
    setStockSelected(null)
    setStockError(null)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (text.trim().length < 2) {
      setStockResults([])
      setHasSearched(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setHasSearched(true)
      try {
        const results = await searchImages(text.trim(), 12)
        setStockResults(results)
        if (results.length === 0) {
          setStockError('No se encontraron imágenes para esta búsqueda')
        }
      } catch (e: any) {
        setStockError(e?.message || 'Error al buscar imágenes')
        setStockResults([])
      }
    }, 400)
  }

  // --- Confirm ---
  const handleConfirm = () => {
    if (activeTab === 'avatars' && dicebearSelectedUrl) {
      onSelect(dicebearSelectedUrl)
    } else if (activeTab === 'stock' && stockSelected) {
      onSelect(stockSelected.url)
    }
  }

  // --- Selected URL (for button enabled state) ---
  const selectedUrl = activeTab === 'avatars' ? dicebearSelectedUrl : stockSelected?.url || null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 40,
          maxHeight: '85%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            paddingBottom: 8,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
              {context === 'group' ? 'Elegir avatar del grupo' : 'Elegir foto de perfil'}
            </Text>
            <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
            <TouchableOpacity
              onPress={() => { setActiveTab('avatars'); setDicebearSelectedUrl(null) }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: activeTab === 'avatars' ? colors.primary : colors.background,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: activeTab === 'avatars' ? colors.text : colors.textSecondary,
                fontWeight: '600',
                fontSize: 14,
              }}>
                🎨 Avatares
              </Text>
            </TouchableOpacity>
            {context === 'group' && (
              <TouchableOpacity
                onPress={() => { setActiveTab('stock'); setStockSelected(null) }}
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
            )}
          </View>

          {/* Tab content */}
          <ScrollView
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'avatars' ? (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  Tus datos no se envían a ningún servidor. Los avatares se generan con DiceBear.
                </Text>

                {/* Style selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ marginBottom: 16, gap: 8 }}
                >
                  {styles.map((style) => (
                    <TouchableOpacity
                      key={style}
                      onPress={() => handleStyleChange(style)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selectedStyle === style ? colors.primary : colors.background,
                        borderWidth: 1,
                        borderColor: selectedStyle === style ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{
                        color: selectedStyle === style ? colors.text : colors.textSecondary,
                        fontWeight: selectedStyle === style ? '600' : '400',
                        fontSize: 13,
                      }}>
                        {capitalizeStyle(style)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Avatar grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {options.map((opt) => (
                    <TouchableOpacity
                      key={opt.seed}
                      onPress={() => setDicebearSelectedUrl(opt.url)}
                      style={{
                        width: '23%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        backgroundColor: colors.background,
                        borderWidth: dicebearSelectedUrl === opt.url ? 3 : 1,
                        borderColor: dicebearSelectedUrl === opt.url ? colors.primary : 'transparent',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: opt.url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Regenerate button */}
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={{
                    alignSelf: 'center',
                    marginTop: 16,
                    marginBottom: 20,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14 }}>
                    Generar más opciones
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* --- Stock photo tab --- */
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  Buscá fotos de stock relacionadas con tu grupo en Unsplash, Pexels y Pixabay.
                </Text>

                {/* Search input */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  marginBottom: 16,
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 8 }}>🔍</Text>
                  <TextInput
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="Ej: running, yoga, fútbol..."
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
                  {searchLoading && (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                </View>

                {/* Stock results */}
                {hasSearched && searchLoading && stockResults.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
                      Buscando imágenes…
                    </Text>
                  </View>
                ) : stockError && stockResults.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 4 }}>📭</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{stockError}</Text>
                  </View>
                ) : stockResults.length > 0 ? (
                  <>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                      {stockResults.length} resultado{stockResults.length !== 1 ? 's' : ''} • Tocá una foto para seleccionarla
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      {stockResults.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          onPress={() => setStockSelected(img)}
                          style={{
                            width: '30%',
                            borderRadius: 16,
                            overflow: 'hidden',
                            backgroundColor: colors.background,
                            borderWidth: stockSelected?.id === img.id ? 3 : 1,
                            borderColor: stockSelected?.id === img.id ? colors.primary : 'transparent',
                          }}
                        >
                          <Image
                            source={{ uri: img.thumbnail || img.url }}
                            style={{ width: '100%', aspectRatio: 1 }}
                            resizeMode="cover"
                          />
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 10,
                              textAlign: 'center',
                              paddingVertical: 4,
                              paddingHorizontal: 4,
                            }}
                            numberOfLines={1}
                          >
                            📷 {img.author}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Attribution notice */}
                    <Text style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      textAlign: 'center',
                      marginTop: 16,
                      marginBottom: 8,
                      lineHeight: 16,
                    }}>
                      Fotos de {stockSelected?.author || 'autores'} vía {stockSelected?.provider || 'Unsplash, Pexels y Pixabay'}
                    </Text>
                  </>
                ) : !hasSearched ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 40, marginBottom: 8 }}>🖼️</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                    Escribí algo arriba para buscar fotos de stock{'\n'}para tu grupo
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selectedUrl}
              style={{
                backgroundColor: selectedUrl ? colors.primary : colors.border,
                borderRadius: 24,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: selectedUrl ? colors.text : colors.textSecondary,
                fontWeight: '600',
                fontSize: 16,
              }}>
                {activeTab === 'stock' && stockSelected
                  ? `Usar foto de ${stockSelected.author}`
                  : 'Usar este avatar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function capitalizeStyle(style: string): string {
  return style
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
