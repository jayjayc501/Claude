import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase, URL_APP } from './supabase';

export type Fournisseur = 'google' | 'apple';

// Termine proprement la fenêtre de connexion sur téléphone.
WebBrowser.maybeCompleteAuthSession();

/** Indique quels fournisseurs (Google, Apple) sont activés dans Supabase. */
export async function fournisseursActifs(): Promise<Record<Fournisseur, boolean>> {
  try {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const cle = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const reponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: cle } });
    const reglages = (await reponse.json()) as { external?: Record<string, boolean> };
    return { google: !!reglages.external?.google, apple: !!reglages.external?.apple };
  } catch {
    // En cas de doute, on affiche les boutons : l'erreur éventuelle sera expliquée au clic.
    return { google: true, apple: true };
  }
}

/** Connexion avec Google ou Apple. Lève une erreur lisible en cas d'échec. */
export async function connexionAvec(fournisseur: Fournisseur): Promise<void> {
  if (Platform.OS === 'web') {
    // Version web : la page part chez Google / Apple puis revient sur l'app, déjà connectée.
    const retour = URL_APP || (typeof window !== 'undefined' ? window.location.href : undefined);
    const { error } = await supabase.auth.signInWithOAuth({ provider: fournisseur, options: { redirectTo: retour } });
    if (error) throw new Error(error.message);
    return;
  }

  // Téléphone (Expo) : on ouvre une fenêtre de connexion puis on récupère la session au retour.
  const retour = Linking.createURL('connexion');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: fournisseur,
    options: { redirectTo: retour, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw new Error(error?.message ?? 'Connexion impossible');

  const resultat = await WebBrowser.openAuthSessionAsync(data.url, retour);
  if (resultat.type !== 'success') return; // fenêtre fermée par l'utilisateur

  const parametres = new URLSearchParams(resultat.url.split('#')[1] ?? resultat.url.split('?')[1] ?? '');
  const accessToken = parametres.get('access_token');
  const refreshToken = parametres.get('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error(parametres.get('error_description') ?? 'Connexion interrompue');
  }
  const { error: erreurSession } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (erreurSession) throw new Error(erreurSession.message);
}
