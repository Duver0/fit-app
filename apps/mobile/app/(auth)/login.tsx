import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuth } from '../../src/hooks/useAuth'

export default function LoginScreen() {
  const { colors } = useTheme()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setError('')
      await login(email, password)
      router.replace('/(app)/(tabs)/groups')
    } catch (e: any) {
      setError(e.message || 'Error al iniciar sesión')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
        Fit App
      </Text>
      <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        Tu ranking de gimnasio
      </Text>

      {error ? (
        <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
      ) : null}

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 24,
          padding: 16,
          alignItems: 'center',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            Iniciar sesión
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          ¿No tienes cuenta? Regístrate
        </Text>
      </TouchableOpacity>
    </View>
  )
}
