import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cleAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !cleAnon) {
  throw new Error(
    'Configuration manquante : copie mobile/.env.example en mobile/.env et remplis les valeurs Supabase.',
  );
}

export const supabase = createClient(url, cleAnon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Version web : la connexion arrive par le lien de l'e-mail, qui ramène sur l'app avec la session dans l'adresse.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** Adresse où le lien de connexion ramène (version web de l'app). */
export const URL_APP = process.env.EXPO_PUBLIC_URL_APP ?? '';

// Rafraîchit la session seulement quand l'app est au premier plan.
AppState.addEventListener('change', (etat) => {
  if (etat === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export type Phrase = {
  id: string;
  texte: string;
  scellee_le: string;
  jour: string; // AAAA-MM-JJ, heure de Paris
  revelee_le: string | null;
  lien: string | null;
};

export const URL_CARTE = process.env.EXPO_PUBLIC_URL_CARTE ?? '';

export function lienCarte(lien: string): string {
  return `${URL_CARTE}?c=${encodeURIComponent(lien)}`;
}
