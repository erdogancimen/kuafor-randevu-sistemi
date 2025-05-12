import { Stack } from 'expo-router';
import { ThemeProvider } from '@/components/ThemeProvider';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback, useState } from 'react';
import * as Font from 'expo-font';
import { View } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyCxn28upfPJbYRljb1k8d1AvJe_FmcyGVU",
  authDomain: "kufaor-randevu.firebaseapp.com",
  projectId: "kufaor-randevu",
  storageBucket: "kufaor-randevu.firebasestorage.app",
  messagingSenderId: "458781052508",
  appId: "1:458781052508:web:6f63c8dc3373aa15d2a099",
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter: require('@/assets/fonts/Inter-Regular.ttf'),
        });
      } catch (e) {
        // font yüklenemezse hata bastır
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
