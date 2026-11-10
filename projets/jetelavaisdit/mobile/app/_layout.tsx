import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FournisseurSession, useSession } from '../lib/session';
import { couleurs } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

export default function Racine() {
  const [policesPretes] = useFonts({
    Unbounded_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <FournisseurSession>
        <Navigation policesPretes={policesPretes} />
      </FournisseurSession>
    </SafeAreaProvider>
  );
}

function Navigation({ policesPretes }: { policesPretes: boolean }) {
  const { session, chargement } = useSession();
  const pret = policesPretes && !chargement;

  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);

  if (!pret) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
        {/* Écrans accessibles une fois connecté */}
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(onglets)" />
          <Stack.Screen name="scellee" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="partage/[id]" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        {/* Écran de connexion */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="connexion" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
