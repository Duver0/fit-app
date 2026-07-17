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
    favicon: './assets/favicon.png',
    output: 'single',
    name: 'Fit App',
    publicPath: BASE_URL,
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
