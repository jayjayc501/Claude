import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BulleCompteur } from '../../components/BulleCompteur';
import { Bouton } from '../../components/Bouton';
import { IconeRetour } from '../../components/Icones';
import { formaterDate, joursDepuis } from '../../lib/dates';
import { lienCarte, supabase, type Phrase } from '../../lib/supabase';
import { couleurs, polices } from '../../lib/theme';

/** Aperçu de la preuve puis partage du lien de la carte. */
export default function Partage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('phrases')
      .select('id, texte, scellee_le, jour, revelee_le, lien')
      .eq('id', id)
      .single()
      .then(({ data }) => setPhrase(data as Phrase));
  }, [id]);

  async function partager() {
    if (!phrase) return;
    setErreur(null);
    setEnvoi(true);
    // Crée (ou récupère) le lien public de la carte : c'est le moment où la phrase est « révélée ».
    const { data: lien, error } = await supabase.rpc('reveler_phrase', { p_id: phrase.id });
    setEnvoi(false);
    if (error || !lien) {
      setErreur("Impossible de créer le lien. Réessaie dans un instant.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const url = lienCarte(lien as string);
    await Share.share({ message: `Regarde. Je l'avais dit. ${url}`, url });
  }

  if (!phrase) {
    return (
      <View style={[styles.page, styles.centre]}>
        <ActivityIndicator color={couleurs.vert} />
      </View>
    );
  }

  const jours = joursDepuis(phrase.jour);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.contenu}>
        <View style={styles.enTete}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.retour}>
            <IconeRetour couleur={couleurs.texte} />
          </Pressable>
          <Text style={styles.titre} accessibilityRole="header">envoie ta preuve.</Text>
        </View>

        <View style={styles.apercu}>
          <View style={styles.compteur}>
            <BulleCompteur valeur={jours} largeur={110} />
            <Text style={styles.compteurTexte}>{jours > 1 ? 'jours' : 'jour'}{'\n'}plus tard…</Text>
          </View>
          <View style={styles.carteRose}>
            <Text style={styles.phrase}>« {phrase.texte} »</Text>
            <Text style={styles.date}>Scellée le {formaterDate(phrase.scellee_le, true)}</Text>
          </View>
          <Text style={styles.slogan}>
            regarde.{'\n'}je l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        <Bouton titre="Partager" onPress={partager} chargement={envoi} />
        <Text style={styles.note}>Ton pote voit la carte sans installer l'app.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  retour: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  titre: { fontFamily: polices.titre, fontSize: 24, color: couleurs.texte, letterSpacing: -0.8 },
  apercu: {
    marginTop: 28, borderColor: couleurs.bordure, borderWidth: 1, borderRadius: 28,
    padding: 18, gap: 14,
  },
  compteur: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  compteurTexte: { fontFamily: polices.titre, fontSize: 13, lineHeight: 15, color: couleurs.texte, paddingBottom: 14 },
  carteRose: { backgroundColor: couleurs.rose, borderRadius: 22, padding: 18, gap: 10, transform: [{ rotate: '-1.5deg' }] },
  phrase: { fontFamily: polices.tresGras, fontSize: 20, lineHeight: 26, color: couleurs.fond },
  date: { fontFamily: polices.gras, fontSize: 12, color: couleurs.fond },
  slogan: { fontFamily: polices.titre, fontSize: 20, lineHeight: 22, color: couleurs.texte },
  erreur: { marginBottom: 12, fontFamily: polices.moyen, fontSize: 14, color: couleurs.rose, textAlign: 'center' },
  note: { marginTop: 12, fontFamily: polices.normal, fontSize: 13, color: couleurs.texteDoux, textAlign: 'center' },
});
