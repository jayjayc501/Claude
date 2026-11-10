import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../components/Bouton';
import { Logo } from '../components/Logo';
import { connexionAvec, fournisseursActifs, type Fournisseur } from '../lib/fournisseurs';
import { supabase, URL_APP } from '../lib/supabase';
import { couleurs, polices } from '../lib/theme';

type Etape = 'choix' | 'email' | 'code';

/**
 * Connexion sans mot de passe :
 *  - Apple ou Google (recommandé) ;
 *  - lien / code par e-mail ;
 *  - compte invité pour essayer sans rien donner.
 */
export default function Connexion() {
  const [etape, setEtape] = useState<Etape>('choix');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actifs, setActifs] = useState<Record<Fournisseur, boolean>>({ google: true, apple: true });

  useEffect(() => {
    fournisseursActifs().then(setActifs);
  }, []);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function avecFournisseur(fournisseur: Fournisseur) {
    const nom = fournisseur === 'google' ? 'Google' : 'Apple';
    if (!actifs[fournisseur]) {
      setErreur(`La connexion avec ${nom} arrive bientôt.`);
      return;
    }
    setEnCours(fournisseur);
    setErreur(null);
    try {
      await connexionAvec(fournisseur);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setErreur(
        message.toLowerCase().includes('not enabled')
          ? `La connexion avec ${nom} arrive bientôt.`
          : `Connexion avec ${nom} impossible (${message}).`,
      );
    } finally {
      setEnCours(null);
    }
  }

  async function envoyerLien() {
    setEnCours('email');
    setErreur(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        // Le lien de l'e-mail ramène sur la version web de l'app, déjà connecté.
        emailRedirectTo: Platform.OS === 'web' && URL_APP ? URL_APP : undefined,
      },
    });
    setEnCours(null);
    if (error) {
      setErreur(messageEnvoi(error.message, error.status));
      return;
    }
    setEtape('code');
  }

  async function verifierCode() {
    setEnCours('code');
    setErreur(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setEnCours(null);
    if (error) setErreur('Code incorrect ou expiré.');
    // En cas de succès, la session change et la navigation bascule toute seule.
  }

  /** Compte invité : aucun e-mail envoyé. Le compte reste lié à cet appareil. */
  async function essayerSansCompte() {
    setEnCours('invite');
    setErreur(null);
    const { error } = await supabase.auth.signInAnonymously();
    setEnCours(null);
    if (error) {
      setErreur(
        error.message.toLowerCase().includes('disabled')
          ? "L'essai sans compte n'est pas encore activé."
          : `Connexion impossible (${error.message}).`,
      );
    }
  }

  function changerEtape(suivante: Etape) {
    setErreur(null);
    setEtape(suivante);
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <View style={styles.icone}>
            <Logo taille={48} />
          </View>
          <Text style={styles.titre} accessibilityRole="header">
            je l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
          </Text>
          <Text style={styles.sousTitre}>Scelle tes prédictions aujourd'hui.{'\n'}Prouve que t'avais raison demain.</Text>

          <View style={{ flex: 1, minHeight: 32 }} />

          {etape === 'choix' ? (
            <View style={styles.formulaire}>
              <Bouton
                titre="Continuer avec Apple"
                variante="blanc"
                onPress={() => avecFournisseur('apple')}
                chargement={enCours === 'apple'}
              />
              <Bouton
                titre="Continuer avec Google"
                variante="contour"
                onPress={() => avecFournisseur('google')}
                chargement={enCours === 'google'}
              />
              <Text style={styles.lien} onPress={() => changerEtape('email')} accessibilityRole="button">
                Continuer avec mon e-mail
              </Text>
              <Text style={styles.lienDoux} onPress={essayerSansCompte} accessibilityRole="button">
                {enCours === 'invite' ? 'Un instant…' : 'Juste essayer, sans compte'}
              </Text>
            </View>
          ) : null}

          {etape === 'email' ? (
            <View style={styles.formulaire}>
              <Text style={styles.etiquette} nativeID="etiquette-email">TON E-MAIL</Text>
              <TextInput
                accessibilityLabelledBy="etiquette-email"
                value={email}
                onChangeText={setEmail}
                placeholder="toi@exemple.fr"
                placeholderTextColor={couleurs.texteDoux}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={styles.champ}
              />
              <Bouton titre="Recevoir mon lien" onPress={envoyerLien} desactive={!emailValide} chargement={enCours === 'email'} />
              <Text style={styles.lien} onPress={() => changerEtape('choix')} accessibilityRole="button">
                Retour
              </Text>
            </View>
          ) : null}

          {etape === 'code' ? (
            <View style={styles.formulaire}>
              <View style={styles.encart}>
                <Text style={styles.encartTitre}>Regarde tes e-mails.</Text>
                <Text style={styles.encartTexte}>
                  On t'a envoyé un lien à {email.trim()}. Ouvre-le sur cet appareil : il te connecte directement.
                  Pense à vérifier les spams.
                </Text>
              </View>
              <Text style={styles.etiquette} nativeID="etiquette-code">OU TAPE LE CODE, SI TU EN AS REÇU UN</Text>
              <TextInput
                accessibilityLabelledBy="etiquette-code"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                placeholder="123456"
                placeholderTextColor={couleurs.texteDoux}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
                style={[styles.champ, styles.champCode]}
              />
              <Bouton titre="Valider" onPress={verifierCode} desactive={code.length < 6} chargement={enCours === 'code'} />
              <Text style={styles.lien} onPress={() => { setCode(''); changerEtape('choix'); }} accessibilityRole="button">
                Autre façon de me connecter
              </Text>
            </View>
          ) : null}

          {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}
          <Text style={styles.mentions}>En continuant, tu acceptes nos conditions d'utilisation.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Explique pourquoi l'e-mail n'a pas pu partir. */
function messageEnvoi(message: string, statut?: number): string {
  const m = message.toLowerCase();
  if (statut === 429 || m.includes('rate limit')) {
    return "Trop d'e-mails envoyés pour l'instant. Réessaie dans une heure, ou connecte-toi avec Google.";
  }
  if (m.includes('seconds') || m.includes('security purposes')) {
    return 'Attends une minute avant de redemander un lien.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return "Cette adresse e-mail n'est pas valide.";
  }
  return `Impossible d'envoyer l'e-mail (${message}).`;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  icone: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: couleurs.vert,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  titre: { fontFamily: polices.titre, fontSize: 44, lineHeight: 46, color: couleurs.texte, letterSpacing: -1.5 },
  sousTitre: { marginTop: 16, fontFamily: polices.normal, fontSize: 17, lineHeight: 25, color: couleurs.texteDoux },
  formulaire: { gap: 12 },
  etiquette: { fontFamily: polices.gras, fontSize: 12, letterSpacing: 1, color: couleurs.texteDoux },
  champ: {
    height: 58, borderRadius: 20, paddingHorizontal: 20, backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure, borderWidth: 1, color: couleurs.texte, fontFamily: polices.gras, fontSize: 17,
  },
  champCode: { fontFamily: polices.titre, fontSize: 24, letterSpacing: 6, textAlign: 'center' },
  encart: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 24, padding: 18, gap: 6, marginBottom: 8,
  },
  encartTitre: { fontFamily: polices.titre, fontSize: 18, color: couleurs.vert },
  encartTexte: { fontFamily: polices.normal, fontSize: 15, lineHeight: 21, color: couleurs.texte },
  lien: { textAlign: 'center', color: couleurs.vert, fontFamily: polices.gras, fontSize: 15, paddingVertical: 10 },
  lienDoux: { textAlign: 'center', color: couleurs.texteDoux, fontFamily: polices.moyen, fontSize: 14, paddingVertical: 6 },
  erreur: { marginTop: 12, color: couleurs.rose, fontFamily: polices.moyen, fontSize: 14, textAlign: 'center' },
  mentions: { marginTop: 16, color: couleurs.texteDoux, fontFamily: polices.normal, fontSize: 13, textAlign: 'center' },
});
