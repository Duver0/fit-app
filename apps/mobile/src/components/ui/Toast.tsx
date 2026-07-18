import { useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useUIStore, Toast as ToastType } from '../../stores/uiStore'

const TOAST_DURATION = 4000
const ANIMATION_DURATION = 300

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastType
  onRemove: (id: string) => void
}) {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-80)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -80,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => onRemove(toast.id))
  }, [opacity, translateY, onRemove, toast.id])

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, TOAST_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss])

  const type = toast.type || 'info'
  const iconName = ICON_MAP[type] || 'information-circle'
  const bgColor =
    type === 'error'
      ? colors.error
      : type === 'success'
        ? colors.success
        : type === 'warning'
          ? colors.warning
          : colors.accent
  const textColor = type === 'warning' ? '#333' : '#fff'

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bgColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={toast.message}
    >
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.8}
        style={styles.content}
      >
        <Ionicons name={iconName} size={22} color={textColor} style={styles.icon} />
        <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
          {toast.message}
        </Text>
        <Ionicons name="close" size={18} color={textColor} style={styles.close} />
      </TouchableOpacity>
    </Animated.View>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // @ts-expect-error - 'fixed' is web-only but correct for this overlay
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingTop: Platform.OS === 'web' ? 60 : 50,
    paddingHorizontal: 16,
    gap: 8,
  },
  toast: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  close: {
    marginLeft: 10,
  },
})
