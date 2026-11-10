import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

type EtatSession = { session: Session | null; chargement: boolean };

const Contexte = createContext<EtatSession>({ session: null, chargement: true });

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ session: null, chargement: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEtat({ session: data.session, chargement: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_evenement, session) => {
      setEtat({ session, chargement: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <Contexte.Provider value={etat}>{children}</Contexte.Provider>;
}

export function useSession() {
  return useContext(Contexte);
}
