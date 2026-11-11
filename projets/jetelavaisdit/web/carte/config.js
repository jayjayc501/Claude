// Configuration de la page web de la carte.
// La clé « anon » de Supabase est publique par conception : elle peut figurer ici.
// La sécurité repose sur la base (RLS) : cette page ne peut lire que la carte demandée.
window.CONFIG_CARTE = {
  supabaseUrl: 'https://joqzrjjgrntbyutytpnr.supabase.co',
  supabaseCleAnon: 'sb_publishable_Of4QFRmBGSZzaPU4w2xsYQ_gcUshBAr',
  lienAppStore: '',     // à remplir après la publication
  lienGooglePlay: '',   // à remplir après la publication
  emailSignalement: '', // adresse qui reçoit les signalements
};
