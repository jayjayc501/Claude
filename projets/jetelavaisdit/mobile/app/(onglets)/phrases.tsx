import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { BulleCompteur } from '../../components/BulleCompteur';
import { Bouton } from '../../components/Bouton';
import { IconeCoche } from '../../components/Icones';
import { Logo } from '../../components/Logo';
import { dateRelative, formaterDate, joursDepuis } from '../../lib/dates';
import { COLONNES_PHRASE, supabase, type Phrase } from '../../lib/supabase';
import { clePersonne, ditA, labelLien, personnesDepuis } from '../../lib/temoin';
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
  const [personne, setPersonne] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('jtlad_phrases')
        .select(COLONNES_PHRASE)
        .order('scellee_le', { ascending: false })
        .then(({ data }) => setPhrases((data as Phrase[]) ?? []));
    }, []),
  );

  const personnes = useMemo(() => personnesDepuis(phrases ?? []), [phrases]);

  const visibles = useMemo(() => {
    if (!phrases) return [];
    let liste = phrases;
    if (personne) liste = liste.filter((p) => clePersonne(p.temoin) === personne);
    if (filtre === 'attente') return liste.filter((p) => !p.lien);
    if (filtre === 'envoyees') return liste.filter((p) => p.lien);
    return liste;
  }, [phrases, filtre, personne]);

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
                    <Text style={styles.statLabel}>envoyées</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statNombre, { color: couleurs.rose }]}>{personnes.length}</Text>
                    <Text style={styles.statLabel}>{personnes.length > 1 ? 'témoins' : 'témoin'}</Text>
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
                {personnes.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.personnes}
                    accessibilityLabel="Filtrer par personne"
                  >
                    {[{ cle: null, nom: 'Tous', nombre: phrases.length }, ...personnes].map((p) => {
                      const actif = personne === p.cle;
                      return (
                        <Pressable
                          key={p.cle ?? 'tous'}
                          accessibilityRole="button"
                          accessibilityState={{ selected: actif }}
                          accessibilityLabel={`${p.nom}, ${p.nombre} ${p.nombre > 1 ? 'certitudes' : 'certitude'}`}
                          onPress={() => setPersonne(p.cle)}
                          style={[styles.personne, actif && styles.filtreActif]}
                        >
                          {p.cle ? (
                            <Avatar nom={p.nom} />
                          ) : (
                            <Avatar nom="" lettre="★" />
                          )}
                          <Text style={[styles.filtreTexte, { fontSize: 13 }, actif && { color: couleurs.fond }]}>{p.nom}</Text>
                          <Text style={[styles.personneNombre, actif && { color: couleurs.fond }]}>{p.nombre}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
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
              <Text style={styles.videTexte}>Écris ta première certitude. Dans quelques mois, tu te remercieras.</Text>
              <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                <Bouton titre="Ma première certitude" onPress={() => router.navigate('/')} />
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
  const nom = (phrase.temoin ?? '').trim();
  const lien = labelLien(phrase.temoin_lien).toLowerCase();
  // Le bouton parle à la personne si son nom est court : « Je te l'avais dit, Léa ! ».
  const titreBouton = nom && nom.length <= 14 ? `Je te l'avais dit, ${nom} !` : "Je te l'avais dit !";

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
          <Text style={styles.badgeTexte}>{nom ? `Envoyée à ${nom}` : 'Envoyée'}</Text>
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
      {nom || lien ? (
        <View style={styles.temoin}>
          {nom ? <Avatar nom={nom} taille={22} /> : null}
          <Text style={[styles.date, { flexShrink: 1 }]} numberOfLines={1}>
            {nom ? (
              <>
                Dit à <Text style={{ color: couleurs.texte, fontFamily: polices.gras }}>{nom}</Text>
                {lien ? ` · ${lien}` : ''}
              </>
            ) : (
              ditA(nom, phrase.temoin_lien)
            )}
          </Text>
          {phrase.temoin_signature ? (
            <View style={styles.signee} accessibilityLabel={`Signée par ${nom}`}>
              <IconeCoche couleur={couleurs.vert} taille={12} />
              <Text style={styles.signeeTexte}>signée</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <Bouton
        titre={titreBouton}
        onPress={onPartager}
        petit
        variante={jours >= 1 ? 'vert' : 'contour'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 },
  titre: { fontFamily: polices.titre, fontSize: 32, color: couleurs.texte, letterSpacing: -1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1, backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, gap: 2,
  },
  statNombre: { fontFamily: polices.titre, fontSize: 22, color: couleurs.texte },
  statLabel: { fontFamily: polices.normal, fontSize: 13, color: couleurs.texteDoux },
  filtres: { flexDirection: 'row', gap: 8 },
  filtre: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
  },
  filtreActif: { backgroundColor: couleurs.texte, borderColor: couleurs.texte },
  filtreTexte: { fontFamily: polices.gras, fontSize: 14, color: couleurs.texte },
  personnes: { gap: 8, paddingRight: 8, marginBottom: 4 },
  personne: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 5, paddingRight: 12,
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1, borderRadius: 999,
  },
  personneNombre: { fontFamily: polices.gras, fontSize: 12, color: couleurs.texteDoux },
  temoin: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signee: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', borderRadius: 999,
    borderWidth: 1, borderColor: couleurs.bordureForte, paddingHorizontal: 8, paddingVertical: 2,
  },
  signeeTexte: { fontFamily: polices.gras, fontSize: 12, color: couleurs.texte },
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
