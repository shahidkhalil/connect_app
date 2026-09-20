import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Black under every auth screen so fade never flashes theme white/red
        contentStyle: { backgroundColor: '#000000' },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="splash-video"
        options={{ animation: 'none', contentStyle: { backgroundColor: '#000000' } }}
      />
      <Stack.Screen
        name="walkthrough"
        options={{ animation: 'fade', contentStyle: { backgroundColor: '#000000' } }}
      />
      <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
      <Stack.Screen name="register" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
    </Stack>
  );
}
