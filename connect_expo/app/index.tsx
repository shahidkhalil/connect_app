import { Brand } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  // Flutter: SplashVideo → SplashScreen (walkthrough) when logged out
  return <Redirect href="/(auth)/splash-video" />;
}
