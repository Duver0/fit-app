const { EXPO_PUBLIC_BASE_URL } = process.env
const BASE_URL = EXPO_PUBLIC_BASE_URL || '/'

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Fit App',
  slug: 'fit-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'fit-app',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#FFF8F0',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fitapp.mobile',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FFF8F0',
    },
    package: 'com.fitapp.mobile',
  },
  web: {
    bundler: 'metro',
    favicon: './assets/icon.png',
    output: 'single',
    name: 'Fit App',
    shortName: 'Fit App',
    description: 'Tu ranking de gimnasio',
    publicPath: BASE_URL,
    backgroundColor: '#FFF8F0',
    themeColor: '#FF6B35',
    barStyle: 'default',
    orientation: 'portrait',
    display: 'standalone',
    lang: 'es-ES',
    scope: BASE_URL,
    startUrl: BASE_URL,
    appleTouchIcon: './assets/icon.png',
    splash: {
      backgroundColor: '#FFF8F0',
      resizeMode: 'contain',
    },
  },
  extra: {
    router: {
      origin: `${BASE_URL === '/' ? 'https://duver0.github.io' : 'https://duver0.github.io/fit-app'}`,
    },
  },
  plugins: [
    ['expo-router', {
      origin: `${BASE_URL === '/' ? 'https://duver0.github.io' : 'https://duver0.github.io/fit-app'}`,
    }],
  ],
  experiments: {
    typedRoutes: true,
  },
}
