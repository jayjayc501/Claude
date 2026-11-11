import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../components/Bouton';
import { Logo } from '../components/Logo';
import { connexionAvec, fournisseursActifs } from '../lib/fournisseurs';
import { couleurs, polices } from '../lib/theme';

/** Connexion avec Google uniquement : un bouton, pas de mot de passe, pas d'e-mail à confirmer. */
export default function Connexion() {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function avecGoogle() {
    setEnCours(true);
    setErreur(null);
    try {
      // Évite d'atterrir sur une page d'erreur de Supabase si Google n'est pas encore activé.
      const actifs = await fournisseursActifs();
      if (!actifs.google) throw new Error('not enabled');
      await connexionAvec('google');
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setErreur(
        message.toLowerCase().includes('not enabled')
          ? "La connexion avec Google n'est pas encore activée."
          : `Connexion avec Google impossible (${message}).`,
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.icone}>
          <Logo taille={48} />
        </View>
        <Text style={styles.titre} accessibilityRole="header">
          je te l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
        </Text>
        <Text style={styles.sousTitre}>Scelle tes prédictions aujourd'hui.{'\n'}Prouve que t'avais raison demain.</Text>

        <View style={{ flex: 1, minHeight: 32 }} />

        <Bouton titre="Continuer avec Google" variante="blanc" onPress={avecGoogle} chargement={enCours} />
        {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}
        <Text style={styles.mentions}>En continuant, tu acceptes nos conditions d'utilisation.</Text>
      </ScrollView>
    </SafeAreaView>
  );
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
  erreur: { marginTop: 14, color: couleurs.rose, fontFamily: polices.moyen, fontSize: 14, textAlign: 'center' },
  mentions: { marginTop: 16, color: couleurs.texteDoux, fontFamily: polices.normal, fontSize: 13, textAlign: 'center' },
});
