import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../components/Bouton';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { couleurs, polices } from '../lib/theme';

/**
 * Connexion sans mot de passe : on reçoit un code par e-mail.
 * (La connexion Apple / Google sera ajoutée avant la publication sur les stores.)
 */
export default function Connexion() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function envoyerCode() {
    setChargement(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setChargement(false);
    if (error) {
      setErreur("Impossible d'envoyer le code. Vérifie l'adresse et réessaie.");
      return;
    }
    setEtape('code');
  }

  async function verifierCode() {
    setChargement(true);
    setErreur(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setChargement(false);
    if (error) setErreur('Code incorrect ou expiré.');
    // En cas de succès, la session change et la navigation bascule toute seule.
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.contenu} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.icone}>
          <Logo taille={48} />
        </View>
        <Text style={styles.titre} accessibilityRole="header">
          je l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
        </Text>
        <Text style={styles.sousTitre}>Scelle tes prédictions aujourd'hui.{'\n'}Prouve que t'avais raison demain.</Text>

        <View style={{ flex: 1 }} />

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
            <Bouton titre="Recevoir mon code" onPress={envoyerCode} desactive={!emailValide} chargement={chargement} />
          </View>
        ) : (
          <View style={styles.formulaire}>
            <Text style={styles.etiquette} nativeID="etiquette-code">CODE REÇU PAR E-MAIL</Text>
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
            <Bouton titre="Valider" onPress={verifierCode} desactive={code.length < 6} chargement={chargement} />
            <Text style={styles.lien} onPress={() => { setEtape('email'); setCode(''); }} accessibilityRole="link">
              Changer d'adresse
            </Text>
          </View>
        )}
        {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}
        <Text style={styles.mentions}>En continuant, tu acceptes nos conditions d'utilisation.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
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
  lien: { textAlign: 'center', color: couleurs.vert, fontFamily: polices.moyen, fontSize: 14, paddingVertical: 8 },
  erreur: { marginTop: 12, color: couleurs.rose, fontFamily: polices.moyen, fontSize: 14, textAlign: 'center' },
  mentions: { marginTop: 16, color: couleurs.texteDoux, fontFamily: polices.normal, fontSize: 13, textAlign: 'center' },
});
