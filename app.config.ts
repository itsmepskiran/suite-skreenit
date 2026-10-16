import type { ConfigContext, ExpoConfig } from 'expo/config';

// Set API_BASE_URL in the shell (or a local .env) for local testing, e.g. API_BASE_URL=http://127.0.0.1:8090
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.skreenit.com';

// Skreenit Suite is its own store app (docs/skreenit-suite/DESIGN.md in mac-skreenit), separate from the
// hiring app. No EAS project id / owner yet: run `eas init` once the store listing exists.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Skreenit Suite',
  slug: 'mobile-suite-skreenit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'skreenit-suite',
  userInterfaceStyle: 'light',
  ios: { bundleIdentifier: 'com.skreenit.suite' },
  android: {
    package: 'com.skreenit.suite',
    adaptiveIcon: {
      backgroundColor: '#F8FAFC',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ['expo-splash-screen', { backgroundColor: '#4F46E5', image: './assets/images/splash-icon.png', imageWidth: 160 }],
    'expo-status-bar',
  ],
  experiments: { typedRoutes: true },
  extra: { apiBaseUrl: API_BASE_URL },
});
