import { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, Image, ScrollView, ActivityIndicator } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { getAvatarUrl, getRandomSeed, USER_STYLES, GROUP_STYLES, type AvatarStyle } from '../../lib/avatar'

export type PickerContext = 'user' | 'group'

interface AvatarOption {
  seed: string
  url: string
}

interface Props {
  visible: boolean
  context?: PickerContext
  /** Estilo inicial (opcional, por defecto 'avataaars' para user, 'identicon' para group) */
  initialStyle?: AvatarStyle
  onSelect: (avatarUrl: string) => void
  onCancel: () => void
}

const GRID_COUNT = 8

export default function AvatarPickerModal({ visible, context = 'user', initialStyle, onSelect, onCancel }: Props) {
  const { colors } = useTheme()

  const styles = context === 'group' ? GROUP_STYLES : USER_STYLES
  const defaultStyle = initialStyle || (context === 'group' ? 'identicon' : 'avataaars')

  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(defaultStyle)
  const [options, setOptions] = useState<AvatarOption[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  // Genera opciones con seeds aleatorios para el estilo actual
  const generateOptions = useCallback((style: AvatarStyle) => {
    const newOptions: AvatarOption[] = []
    for (let i = 0; i < GRID_COUNT; i++) {
      const seed = getRandomSeed()
      newOptions.push({ seed, url: getAvatarUrl({ style, seed, size: 120 }) })
    }
    setOptions(newOptions)
    setSelectedUrl(null)
  }, [])

  // Al abrirse, generar opciones iniciales
  useEffect(() => {
    if (visible) {
      setSelectedStyle(initialStyle || (context === 'group' ? 'identicon' : 'avataaars'))
      setSelectedUrl(null)
      generateOptions(initialStyle || (context === 'group' ? 'identicon' : 'avataaars'))
    }
  }, [visible, initialStyle, context, generateOptions])

  // Cambiar estilo
  const handleStyleChange = (style: AvatarStyle) => {
    setSelectedStyle(style)
    generateOptions(style)
  }

  // Confirmar selección
  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl)
    }
  }

  const handleRefresh = () => {
    generateOptions(selectedStyle)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 40,
          maxHeight: '80%',
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

          <Text style={{ color: colors.textSecondary, fontSize: 13, paddingHorizontal: 20, marginBottom: 12 }}>
            Tus datos no se envían a ningún servidor. Los avatares se generan con DiceBear.
          </Text>

          {/* Style selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 16, gap: 8 }}
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
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {options.map((opt, idx) => (
                <TouchableOpacity
                  key={opt.seed}
                  onPress={() => setSelectedUrl(opt.url)}
                  style={{
                    width: '23%',
                    aspectRatio: 1,
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    borderWidth: selectedUrl === opt.url ? 3 : 1,
                    borderColor: selectedUrl === opt.url ? colors.primary : 'transparent',
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
          </View>

          {/* Action buttons */}
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
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
              <Text style={{ color: selectedUrl ? colors.text : colors.textSecondary, fontWeight: '600', fontSize: 16 }}>
                Usar este avatar
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
