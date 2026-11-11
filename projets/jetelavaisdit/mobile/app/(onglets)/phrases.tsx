import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BulleCompteur } from '../../components/BulleCompteur';
import { Bouton } from '../../components/Bouton';
import { IconeCoche } from '../../components/Icones';
import { Logo } from '../../components/Logo';
import { dateRelative, formaterDate, joursDepuis } from '../../lib/dates';
import { supabase, type Phrase } from '../../lib/supabase';
import { couleurs, polices } from '../../lib/theme';

type Filtre = 'toutes' | 'attente' | 'envoyees';

const FILTRES: { cle: Filtre; label: string }[] = [
  { cle: 'toutes', label: 'Toutes' },
  { cle: 'attente', label: 'En attente' },
  { cle: 'envoyees', label: 'Envoyées' },
];

export default function MesPhrases() {
  const router = useRouter();
  const [phrases, setPhrases] = useState<Phrase[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('toutes');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('phrases')
        .select('id, texte, scellee_le, jour, revelee_le, lien')
        .order('scellee_le', { ascending: false })
        .then(({ data }) => setPhrases((data as Phrase[]) ?? []));
    }, []),
  );

  const visibles = useMemo(() => {
    if (!phrases) return [];
    if (filtre === 'attente') return phrases.filter((p) => !p.lien);
    if (filtre === 'envoyees') return phrases.filter((p) => p.lien);
    return phrases;
  }, [phrases, filtre]);

  if (phrases === null) {
    return (
      <View style={[styles.page, styles.centre]}>
        <ActivityIndicator color={couleurs.vert} />
      </View>
    );
  }

  const envoyees = phrases.filter((p) => p.lien).length;

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <FlatList
        data={visibles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={styles.titre} accessibilityRole="header">mes phrases</Text>
            {phrases.length > 0 ? (
              <>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statNombre}>{phrases.length}</Text>
                    <Text style={styles.statLabel}>scellées</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statNombre, { color: couleurs.vert }]}>{envoyees}</Text>
                    <Text style={styles.statLabel}>« je te l'avais dit »</Text>
                  </View>
                </View>
                <View style={styles.filtres} accessibilityRole="tablist">
                  {FILTRES.map((f) => {
                    const actif = f.cle === filtre;
                    return (
                      <Pressable
                        key={f.cle}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: actif }}
                        onPress={() => setFiltre(f.cle)}
                        style={[styles.filtre, actif && styles.filtreActif]}
                      >
                        <Text style={[styles.filtreTexte, actif && { color: couleurs.fond }]}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          phrases.length === 0 ? (
            <View style={styles.vide}>
              <View style={{ transform: [{ rotate: '-6deg' }] }}>
                <Logo taille={132} couleur={couleurs.bordureForte} couleurPoint={couleurs.vert} pointilles />
              </View>
              <Text style={styles.videTitre}>Rien de scellé{'\n'}pour l'instant.</Text>
              <Text style={styles.videTexte}>Écris ta première prédiction. Dans quelques mois, tu te remercieras.</Text>
              <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                <Bouton titre="Ma première prédiction" onPress={() => router.navigate('/')} />
              </View>
            </View>
          ) : (
            <Text style={[styles.statLabel, { marginTop: 24, textAlign: 'center' }]}>Rien dans cette catégorie.</Text>
          )
        }
        renderItem={({ item }) => <CartePhrase phrase={item} onPartager={() => router.push(`/partage/${item.id}`)} />}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      />
    </SafeAreaView>
  );
}

function CartePhrase({ phrase, onPartager }: { phrase: Phrase; onPartager: () => void }) {
  const jours = joursDepuis(phrase.jour);

  if (phrase.lien) {
    // Rose = phrase révélée
    return (
      <Pressable onPress={onPartager} accessibilityRole="button" accessibilityHint="Partager à nouveau" style={[styles.carte, styles.carteRevelee]}>
        <Text style={[styles.date, { color: couleurs.fond }]}>
          {formaterDate(phrase.scellee_le)}
          {phrase.revelee_le ? ` · révélée le ${formaterDate(phrase.revelee_le)}` : ''}
        </Text>
        <Text style={[styles.phrase, { color: couleurs.fond }]}>« {phrase.texte} »</Text>
        <View style={styles.badgeEnvoyee}>
          <IconeCoche couleur={couleurs.vert} />
          <Text style={styles.badgeTexte}>Envoyée</Text>
        </View>
      </Pressable>
    );
  }

  // Gris = phrase en attente
  return (
    <View style={styles.carte}>
      <View style={styles.enTeteCarte}>
        <Text style={styles.date}>{dateRelative(phrase.scellee_le, phrase.jour)}</Text>
        {jours >= 1 ? (
          <View style={styles.compteur}>
            <BulleCompteur valeur={jours} largeur={52} />
            <Text style={styles.date}>{jours > 1 ? 'jours' : 'jour'}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.phrase}>« {phrase.texte} »</Text>
      <Bouton titre="Je te l'avais dit !" onPress={onPartager} petit variante={jours >= 1 ? 'vert' : 'contour'} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 },
  titre: { fontFamily: polices.titre, fontSize: 32, color: couleurs.texte, letterSpacing: -1 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1, backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14, gap: 2,
  },
  statNombre: { fontFamily: polices.titre, fontSize: 26, color: couleurs.texte },
  statLabel: { fontFamily: polices.normal, fontSize: 13, color: couleurs.texteDoux },
  filtres: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  filtre: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
  },
  filtreActif: { backgroundColor: couleurs.texte, borderColor: couleurs.texte },
  filtreTexte: { fontFamily: polices.gras, fontSize: 14, color: couleurs.texte },
  carte: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 28, paddingHorizontal: 20, paddingVertical: 18, gap: 12,
  },
  carteRevelee: { backgroundColor: couleurs.rose, borderColor: couleurs.rose },
  enTeteCarte: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.texteDoux },
  phrase: { fontFamily: polices.tresGras, fontSize: 19, lineHeight: 25, color: couleurs.texte },
  badgeEnvoyee: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: couleurs.fond, borderRadius: 999, paddingVertical: 6, paddingLeft: 8, paddingRight: 12,
  },
  badgeTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 40 },
  videTitre: { fontFamily: polices.titre, fontSize: 22, lineHeight: 26, color: couleurs.texte, textAlign: 'center' },
  videTexte: {
    maxWidth: 290, fontFamily: polices.normal, fontSize: 16, lineHeight: 23,
    color: couleurs.texteDoux, textAlign: 'center',
  },
});
