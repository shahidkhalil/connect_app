import { AppNotificationWatcher } from '@/components/AppNotificationWatcher';
import { AppTourOverlay } from '@/components/AppTourOverlay';
import { InAppToastHost } from '@/components/InAppToastHost';
import { TakeTourModal } from '@/components/TakeTourModal';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand } from '@/constants/Colors';
import { ensureNotificationPermissions } from '@/services/notifications';
import { useAuthStore } from '@/store/authStore';
import { useMediaOverlayStore } from '@/store/mediaViewerStore';
import { useNotificationStore } from '@/store/notificationStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const ConnectLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.primary,
    background: Brand.white,
    card: Brand.white,
    text: Brand.textPrimary,
    border: Brand.borderLight,
  },
};

const ConnectDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Brand.primary,
    background: Brand.scaffoldDark,
    card: Brand.bgGrey,
    text: Brand.white,
    border: Brand.bgGrey,
  },
};

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrateOverlays = useMediaOverlayStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SF-Pro-Display': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    hydrate();
    void hydrateOverlays();
    void hydrateNotifications();
    void ensureNotificationPermissions();
  }, [hydrate, hydrateOverlays, hydrateNotifications]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isHydrated]);

  if (!loaded || !isHydrated) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? ConnectDarkTheme : ConnectLightTheme}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
          <Stack.Screen name="chat" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
          <Stack.Screen name="profile" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
          <Stack.Screen name="notifications" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
        </Stack>
        <AppNotificationWatcher />
        <InAppToastHost />
        <TakeTourModal />
        <AppTourOverlay />
      </View>
    </ThemeProvider>
  );
}
