import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { BulleCompteur } from '../../components/BulleCompteur';
import { Bouton } from '../../components/Bouton';
import { IconePersonne, IconeRetour } from '../../components/Icones';
import { formaterDate, joursDepuis } from '../../lib/dates';
import { COLONNES_PHRASE, lienCarte, supabase, type Phrase } from '../../lib/supabase';
import { ditA, nomTemoin, texteLien } from '../../lib/temoin';
import { couleurs, polices } from '../../lib/theme';
import { vibrerLeger, vibrerSucces } from '../../lib/vibration';

/** Aperçu de la preuve (personnalisée pour la personne à qui on l'avait dit), puis partage du lien. */
export default function Partage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [montrerLien, setMontrerLien] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [auteur, setAuteur] = useState('');

  useEffect(() => {
    supabase
      .from('jtlad_phrases')
      .select(COLONNES_PHRASE)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const p = data as Phrase | null;
        setPhrase(p);
        if (p) setMontrerLien(p.afficher_lien !== false);
      });
    supabase
      .from('jtlad_profils')
      .select('pseudo, prenom, nom')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        // Même règle que sur la carte : « Prénom N. », sinon le prénom, sinon le pseudo.
        setAuteur(
          data.prenom && data.nom
            ? `${data.prenom} ${data.nom.charAt(0).toUpperCase()}.`
            : data.prenom || data.pseudo,
        );
      });
  }, [id]);

  async function partager() {
    if (!phrase) return;
    setErreur(null);
    setEnvoi(true);
    // Crée (ou récupère) le lien public de la carte : c'est le moment où la phrase est « révélée ».
    // On enregistre au passage le choix d'afficher (ou non) le lien sur la carte.
    const { data: lien, error } = await supabase.rpc('jtlad_reveler_phrase', {
      p_id: phrase.id,
      ...(phrase.temoin_prenom ? { p_afficher_lien: montrerLien } : {}),
    });
    setEnvoi(false);
    if (error || !lien) {
      setErreur("Impossible de créer le lien. Réessaie dans un instant.");
      return;
    }
    vibrerSucces();
    const url = lienCarte(lien as string);
    const message = phrase.temoin_prenom
      ? `${phrase.temoin_prenom}, regarde. Je te l'avais dit. ${url}`
      : `Regarde. Je te l'avais dit. ${url}`;
    try {
      await Share.share({ message, url });
    } catch {
      // Navigateur sans menu de partage : on copie le lien.
      const presse = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } })
        .navigator?.clipboard;
      if (presse) {
        await presse.writeText(message);
        setInfo('Lien copié. Colle-le dans WhatsApp ou tes messages.');
      } else {
        setInfo(url);
      }
    }
  }

  if (!phrase) {
    return (
      <View style={[styles.page, styles.centre]}>
        <ActivityIndicator color={couleurs.vert} />
      </View>
    );
  }

  const jours = joursDepuis(phrase.jour);
  const prenom = phrase.temoin_prenom ?? '';
  const nom = nomTemoin(phrase.temoin_prenom, phrase.temoin_initiale);
  const lien = texteLien(phrase.temoin_lien, phrase.temoin_precision);
  const pastille = ditA(nom, montrerLien ? lien : '');

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.enTete}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.retour}>
            <IconeRetour couleur={couleurs.texte} />
          </Pressable>
          <Text style={styles.titre} accessibilityRole="header">envoie ta preuve.</Text>
        </View>

        <View style={styles.apercu}>
          <Text style={styles.intro}>
            {nom ? (
              <>
                <Text style={styles.introFort}>{nom}</Text>, {auteur || 'ton pote'} te l'avait dit il y a…
              </>
            ) : (
              <>
                <Text style={styles.introFort}>{auteur || 'Ton pote'}</Text> l'avait scellé il y a…
              </>
            )}
          </Text>
          <View style={styles.compteur}>
            <BulleCompteur valeur={jours} largeur={110} />
            <Text style={styles.compteurTexte}>{jours > 1 ? 'jours' : 'jour'}{'\n'}plus tard…</Text>
          </View>
          <View style={styles.carteRose}>
            <Text style={styles.phrase}>« {phrase.texte} »</Text>
            {pastille ? (
              <View style={styles.pastille}>
                <IconePersonne couleur={couleurs.vert} />
                <Text style={styles.pastilleTexte}>{pastille}</Text>
              </View>
            ) : null}
            <Text style={styles.date}>Scellée le {formaterDate(phrase.scellee_le, true)}</Text>
          </View>
          <Text style={styles.slogan}>
            {prenom ? `regarde, ${prenom.toLowerCase()}.` : 'regarde.'}
            {'\n'}je te l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
          </Text>
        </View>

        {nom && lien ? (
          <View style={styles.reglage}>
            <Avatar prenom={prenom} taille={34} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.reglageTitre} nativeID="montrer-lien">Montrer votre lien</Text>
              <Text style={styles.reglageTexte}>« {lien} » sur la carte</Text>
            </View>
            <Switch
              accessibilityLabelledBy="montrer-lien"
              accessibilityLabel={`Montrer « ${lien} » sur la carte`}
              value={montrerLien}
              onValueChange={(v) => {
                vibrerLeger();
                setMontrerLien(v);
              }}
              trackColor={{ false: couleurs.bordureForte, true: couleurs.vert }}
              thumbColor={montrerLien ? couleurs.fond : couleurs.texte}
              {...{ activeThumbColor: couleurs.fond }}
            />
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: 20 }} />
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        {info ? <Text style={styles.info} selectable>{info}</Text> : null}
        <Bouton titre={prenom ? `Envoyer à ${prenom}` : 'Partager'} onPress={partager} chargement={envoi} />
        <Text style={styles.note}>
          {prenom ? `${prenom} voit la carte sans installer l'app.` : "Ton pote voit la carte sans installer l'app."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  retour: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  titre: { fontFamily: polices.titre, fontSize: 24, color: couleurs.texte, letterSpacing: -0.8 },
  apercu: {
    marginTop: 24, borderColor: couleurs.bordure, borderWidth: 1, borderRadius: 28,
    padding: 18, gap: 12,
  },
  intro: { fontFamily: polices.moyen, fontSize: 14, lineHeight: 19, color: couleurs.texteDoux },
  introFort: { fontFamily: polices.gras, color: couleurs.texte },
  compteur: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  compteurTexte: { fontFamily: polices.titre, fontSize: 13, lineHeight: 15, color: couleurs.texte, paddingBottom: 14 },
  carteRose: { backgroundColor: couleurs.rose, borderRadius: 22, padding: 18, gap: 10, transform: [{ rotate: '-1.5deg' }] },
  phrase: { fontFamily: polices.tresGras, fontSize: 20, lineHeight: 26, color: couleurs.fond },
  pastille: {
    alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: couleurs.fond, borderRadius: 999, paddingVertical: 6, paddingLeft: 8, paddingRight: 12,
  },
  pastilleTexte: { flexShrink: 1, fontFamily: polices.gras, fontSize: 12, color: couleurs.texte },
  date: { fontFamily: polices.gras, fontSize: 12, color: couleurs.fond },
  slogan: { fontFamily: polices.titre, fontSize: 20, lineHeight: 22, color: couleurs.texte },
  reglage: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure, borderWidth: 1, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14,
  },
  reglageTitre: { fontFamily: polices.tresGras, fontSize: 14, color: couleurs.texte },
  reglageTexte: { fontFamily: polices.normal, fontSize: 12, color: couleurs.texteDoux },
  erreur: { marginBottom: 12, fontFamily: polices.moyen, fontSize: 14, color: couleurs.rose, textAlign: 'center' },
  info: { marginBottom: 12, fontFamily: polices.moyen, fontSize: 14, color: couleurs.vert, textAlign: 'center' },
  note: { marginTop: 12, fontFamily: polices.normal, fontSize: 13, color: couleurs.texteDoux, textAlign: 'center' },
});
