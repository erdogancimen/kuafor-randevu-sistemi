import { Stack } from 'expo-router';
import { ThemeProvider } from '@/components/ThemeProvider';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback, useState } from 'react';
import * as Font from 'expo-font';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';

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
  const router = useRouter();
  const segments = useSegments();

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Kullanıcı rolünü kontrol et
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        // Sadece login sayfasındaysa yönlendir
        if (segments[0] === 'login' || segments[0] === '(auth)') {
          if (userData?.role === 'employee') {
            router.replace('/employee/profile');
          } else if (userData?.role === 'barber') {
            router.replace('/barber/profile');
          } else {
            router.replace('/');
          }
        }
      } else {
        // Kullanıcı giriş yapmamışsa ve korumalı bir sayfadaysa login sayfasına yönlendir
        const protectedRoutes = ['profile', 'barber/profile', 'employee/profile', 'profile/edit'];
        if (protectedRoutes.includes(segments[0])) {
          router.replace('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [segments]);

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
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="barber/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="barber/appointments" options={{ headerShown: false }} />
          <Stack.Screen name="barber/employees" options={{ headerShown: false }} />
          <Stack.Screen name="barber/profile" options={{ headerShown: false }} />
          <Stack.Screen name="barber/reviews" options={{ headerShown: false }} />
          <Stack.Screen name="employee/profile" options={{ headerShown: false }} />
          <Stack.Screen name="employee/appointments" options={{ headerShown: false }} />
          <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
