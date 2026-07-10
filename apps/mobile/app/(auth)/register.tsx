import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuth } from '../../src/hooks/useAuth'

export default function RegisterScreen() {
  const { colors } = useTheme()
  const { register, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Todos los campos obligatorios deben completarse')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    try {
      setError('')
      await register(email, password, name, phone || undefined)
      router.replace('/(app)/(tabs)/groups')
    } catch (e: any) {
      setError(e.message || 'Error al registrarse')
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 24 }}>
          Crear cuenta
        </Text>

        {error ? (
          <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        ) : null}

        <TextInput placeholder="Nombre" placeholderTextColor={colors.textSecondary} value={name}
          onChangeText={setName}
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }} />

        <TextInput placeholder="Email" placeholderTextColor={colors.textSecondary} value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }} />

        <TextInput placeholder="Celular (opcional)" placeholderTextColor={colors.textSecondary} value={phone}
          onChangeText={setPhone} keyboardType="phone-pad"
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }} />

        <TextInput placeholder="Contraseña" placeholderTextColor={colors.textSecondary} value={password}
          onChangeText={setPassword} secureTextEntry
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }} />

        <TouchableOpacity onPress={handleRegister} disabled={isLoading}
          style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', opacity: isLoading ? 0.6 : 1 }}>
          {isLoading ? <ActivityIndicator color={colors.text} /> :
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Crear cuenta</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
