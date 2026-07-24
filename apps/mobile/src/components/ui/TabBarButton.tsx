import { useRef, useCallback } from 'react'
import { TouchableOpacity, View, Text } from 'react-native'
import { router } from 'expo-router'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'

interface TabBarButtonProps extends BottomTabBarButtonProps {
  /** The href to navigate to on double-tap (root of the tab) */
  rootHref: string
}

export default function TabBarButton({ onPress, rootHref, children, ...rest }: TabBarButtonProps) {
  const lastPress = useRef(0)

  const handlePress = useCallback(
    (e: any) => {
      const now = Date.now()
      if (lastPress.current && now - lastPress.current < 300) {
        // Double-tap: go to root of this tab
        router.replace(rootHref as any)
      }
      lastPress.current = now
      onPress?.(e)
    },
    [onPress, rootHref],
  )

  return (
    <TouchableOpacity onPress={handlePress} {...(rest as any)}>
      {children}
    </TouchableOpacity>
  )
}
