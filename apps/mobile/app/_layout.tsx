import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ApolloProvider } from '@apollo/client'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import { client } from '../src/lib/apollo'

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ThemeProvider>
    </ApolloProvider>
  )
}
