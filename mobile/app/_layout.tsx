import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Suppress auth errors on initial load to prevent crashes
    const suppressAuthErrors = async () => {
      try {
        // Attempt to get session, but don't crash if it fails
        await supabase.auth.getSession();
      } catch (error: any) {
        console.warn('Session restoration failed (expected on first launch):', error.message);
        // Clear any corrupted session data
        await supabase.auth.signOut().catch(() => { });
      }
    };

    suppressAuthErrors();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="rep" options={{ headerShown: false }} />
        <Stack.Screen name="storekeeper" options={{ headerShown: false }} />
        <Stack.Screen name="salesman" options={{ headerShown: false }} />
        <Stack.Screen name="shop-owner" options={{ headerShown: false }} />
        <Stack.Screen name="shops" options={{ headerShown: false }} />
        <Stack.Screen name="requests" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: ' Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
