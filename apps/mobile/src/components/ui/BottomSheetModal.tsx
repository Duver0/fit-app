import React from 'react'
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useTheme } from '../../lib/theme'

interface BottomSheetModalProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  /** Altura máxima del contenido en % del la pantalla. Default: 90 */
  maxHeightPercent?: number
  /** Si debe evitar el teclado (default: true) */
  avoidKeyboard?: boolean
  /** Si se puede hacer scroll interno (default: true) */
  scrollable?: boolean
}

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  maxHeightPercent = 90,
  avoidKeyboard = true,
  scrollable = true,
}: BottomSheetModalProps) {
  const { colors } = useTheme()
  const { height: screenHeight } = useWindowDimensions()
  const maxHeight = (screenHeight * maxHeightPercent) / 100

  const content = (
    <Pressable
      style={styles.backdrop}
      onPress={onClose}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()} // stop propagation to backdrop
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            maxHeight,
          },
        ]}
      >
        {scrollable ? (
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </Pressable>
    </Pressable>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
})
