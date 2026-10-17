import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'KinMeet',
  slug: 'kinmeet',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kinmeet.app',
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.kinmeet.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: ['expo-secure-store'],
};

export default config;
