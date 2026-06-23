import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { usePWA } from '../../src/lib/pwa'

export default function WebPWAInstallScreen() {
  const { canInstall, install } = usePWA()

  if (Platform.OS !== 'web' || !canInstall) return null

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#16213E', padding: 16, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between',
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Instala Fit App</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>Accede más rápido desde tu pantalla de inicio</Text>
      </View>
      <TouchableOpacity onPress={install}
        style={{ backgroundColor: '#A8D5BA', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: '#2D3436', fontWeight: '600' }}>Instalar</Text>
      </TouchableOpacity>
    </View>
  )
}
