
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../../components/Bouton';
import { IconeCadenas, IconeInterdit } from '../../components/Icones';
import { aujourdhuiParis, avantMinuitParis, dateRelative } from '../../lib/dates';
import { lireErreur } from '../../lib/erreurs';
import { vibrerAppui, vibrerErreur, vibrerSucces } from '../../lib/vibration';
import { supabase, type Phrase } from '../../lib/supabase';
import { couleurs, polices } from '../../lib/theme';

const LONGUEUR_MAX = 200;

const IDEES: { label: string; debut: string }[] = [
  { label: 'Potes', debut: 'Je te parie que ' },
  { label: 'Amours', debut: 'Ces deux-là vont ' },
  { label: 'Famille', debut: 'À Noël, tonton va encore ' },
  { label: 'Sport', debut: 'Ce week-end, ' },
  { label: 'Boulot', debut: 'Le prochain pot de départ, ce sera celui de ' },
];

// Exemples affichés dans la zone de saisie (un au hasard à chaque ouverture).
const EXEMPLES = [
  'Thomas va encore oublier mon anniversaire.',
  'Le groupe WhatsApp de la famille va exploser avant le réveillon.',
  'Mon coloc ne fera pas la vaisselle de toute la semaine.',
  'Léa va adopter un chat. Puis un deuxième.',
  'Papa va s\'endormir devant le film avant la 10e minute.',
  'Il va pleuvoir pile le jour du barbecue.',
  'Le prof va nous coller un contrôle surprise lundi.',
  'Ces deux-là vont finir ensemble avant l\'été.',
];

export default function Ecrire() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [prenom, setPrenom] = useState('');
  const [exemple] = useState(() => EXEMPLES[Math.floor(Math.random() * EXEMPLES.length)]);
  const [phraseDuJour, setPhraseDuJour] = useState<Phrase | null>(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [profil, duJour] = await Promise.all([
      supabase.from('profils').select('pseudo, prenom').maybeSingle(),
      supabase
        .from('phrases')
        .select('id, texte, scellee_le, jour, revelee_le, lien')
        .eq('jour', aujourdhuiParis())
        .maybeSingle(),
    ]);
    setPrenom(profil.data?.prenom || profil.data?.pseudo || '');
    setPhraseDuJour((duJour.data as Phrase | null) ?? null);
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function sceller() {
    setErreur(null);
    setEnvoi(true);
    vibrerAppui();
    const { data, error } = await supabase.rpc('sceller_phrase', { p_texte: texte });
    setEnvoi(false);

    if (error) {
      const e = lireErreur(error.message);
      if (e.moderation) {
        vibrerErreur();
        setRefus(e.message);
      } else if (e.dejaScelle) {
        charger();
      } else {
        setErreur(e.message);
      }
      return;
    }

    vibrerSucces();
    const phrase = data as Phrase;
    setTexte('');
    setPhraseDuJour(phrase);
    router.push({ pathname: '/scellee', params: { texte: phrase.texte, scellee_le: phrase.scellee_le } });
  }

  if (chargement) {
    return (
      <View style={[styles.page, styles.centre]}>
        <ActivityIndicator color={couleurs.vert} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <EnTete prenom={prenom} disponible={!phraseDuJour} />

          {phraseDuJour ? (
            <DejaScelle phrase={phraseDuJour} />
          ) : refus ? (
            <Refus message={refus} texte={texte} onReformuler={() => setRefus(null)} />
          ) : (
            <>
              <Text style={styles.titre} accessibilityRole="header">Tu sens venir quoi ?</Text>

              <View style={styles.carte}>
                <Text style={styles.etiquette} nativeID="etiquette-prediction">TA PRÉDICTION</Text>
                <TextInput
                  accessibilityLabelledBy="etiquette-prediction"
                  value={texte}
                  onChangeText={setTexte}
                  placeholder={exemple}
                  placeholderTextColor={couleurs.bordureForte}
                  multiline
                  maxLength={LONGUEUR_MAX}
                  style={styles.saisie}
                />
                <Text style={styles.compteur}>{texte.length} / {LONGUEUR_MAX}</Text>
              </View>

              <View style={styles.idees}>
                {IDEES.map((idee) => (
                  <Pressable
                    key={idee.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Idée : ${idee.label}`}
                    onPress={() => setTexte(idee.debut)}
                    style={styles.puce}
                  >
                    <Text style={styles.puceTexte}>{idee.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.info}>
                <IconeCadenas couleur={couleurs.texteDoux} />
                <Text style={styles.infoTexte}>
                  Une fois scellée, ta phrase ne bouge plus. Elle reste privée jusqu'à ce que tu l'envoies.
                </Text>
              </View>

              {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}

              <View style={{ flex: 1, minHeight: 24 }} />
              <Bouton
                titre="Sceller"
                onPress={sceller}
                chargement={envoi}
                desactive={texte.trim().length < 3}
                icone={<IconeCadenas couleur={texte.trim().length < 3 ? couleurs.texteDoux : couleurs.fond} />}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EnTete({ prenom, disponible }: { prenom: string; disponible: boolean }) {
  return (
    <View style={styles.enTete}>
      <View style={styles.salut}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.avatarTexte}>{(prenom[0] ?? '?').toUpperCase()}</Text>
        </View>
        <Text style={styles.salutTexte}>Salut {prenom}</Text>
      </View>
      <View style={[styles.dispo, !disponible && styles.dispoVide]}>
        <Text style={[styles.dispoTexte, !disponible && { color: couleurs.texteDoux }]}>
          {disponible ? "1 dispo aujourd'hui" : "0 dispo aujourd'hui"}
        </Text>
      </View>
    </View>
  );
}

/** Écran « reviens demain » avec compte à rebours jusqu'à minuit (heure de Paris). */
function DejaScelle({ phrase }: { phrase: Phrase }) {
  const [reste, setReste] = useState(avantMinuitParis());
  useEffect(() => {
    const minuteur = setInterval(() => setReste(avantMinuitParis()), 30_000);
    return () => clearInterval(minuteur);
  }, []);

  return (
    <>
      <Text style={[styles.titre, { marginTop: 24 }]} accessibilityRole="header">reviens{'\n'}demain.</Text>
      <View style={{ gap: 4 }}>
        <Text style={styles.petitDoux}>Prochaine prédiction dans</Text>
        <Text style={styles.decompte}>{reste.heures} h {String(reste.minutes).padStart(2, '0')} min</Text>
      </View>
      <View style={styles.carte}>
        <View style={styles.ligne}>
          <IconeCadenas couleur={couleurs.texteDoux} taille={16} />
          <Text style={styles.petitDoux}>Ta prédiction du jour · {dateRelative(phrase.scellee_le, phrase.jour).replace("Aujourd'hui · ", '')}</Text>
        </View>
        <Text style={styles.phrase}>« {phrase.texte} »</Text>
      </View>
      <Text style={styles.infoTexte}>Une seule par jour : c'est ce qui rend chaque prédiction précieuse.</Text>
    </>
  );
}

function Refus({ message, texte, onReformuler }: { message: string; texte: string; onReformuler: () => void }) {
  return (
    <>
      <View style={styles.pastilleRose}>
        <IconeInterdit couleur={couleurs.fond} />
      </View>
      <Text style={styles.titre} accessibilityRole="header">Oups. On ne peut pas sceller ça.</Text>
      <Text style={styles.infoTexte}>{message}</Text>
      <View style={[styles.carte, styles.carteBarree]}>
        <Text style={[styles.phrase, { color: couleurs.texteDoux }]}>« {texte} »</Text>
      </View>
      <View style={styles.idees}>
        {['Insultes', 'Harcèlement', 'Menaces', 'Adresses et numéros'].map((r) => (
          <View key={r} style={styles.puce}>
            <Text style={styles.puceTexte}>{r}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minHeight: 24 }} />
      <Text style={[styles.petitDoux, { textAlign: 'center' }]}>
        Pas de panique : ta prédiction du jour n'est pas perdue.
      </Text>
      <Bouton titre="Reformuler" onPress={onReformuler} />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, gap: 20 },
  enTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salut: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: couleurs.rose,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTexte: { fontFamily: polices.titre, fontSize: 16, color: couleurs.fond },
  salutTexte: { fontFamily: polices.gras, fontSize: 16, color: couleurs.texte },
  dispo: { backgroundColor: couleurs.vert, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  dispoVide: { backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure },
  dispoTexte: { fontFamily: polices.tresGras, fontSize: 13, color: couleurs.fond },
  titre: { fontFamily: polices.titre, fontSize: 30, lineHeight: 34, color: couleurs.texte, letterSpacing: -0.8, marginTop: 8 },
  carte: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 28, padding: 20, gap: 10,
  },
  carteBarree: { borderStyle: 'dashed', borderColor: couleurs.bordureForte },
  etiquette: { fontFamily: polices.gras, fontSize: 12, letterSpacing: 1, color: couleurs.texteDoux },
  saisie: {
    minHeight: 120, fontFamily: polices.tresGras, fontSize: 24, lineHeight: 30, color: couleurs.texte,
    textAlignVertical: 'top', padding: 0,
  },
  compteur: { alignSelf: 'flex-end', fontFamily: polices.normal, fontSize: 13, color: couleurs.texteDoux },
  idees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  puceTexte: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.texte },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoTexte: { flex: 1, fontFamily: polices.normal, fontSize: 14, lineHeight: 20, color: couleurs.texteDoux },
  erreur: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.rose },
  petitDoux: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.texteDoux },
  decompte: { fontFamily: polices.titre, fontSize: 40, color: couleurs.vert, letterSpacing: -1.5 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phrase: { fontFamily: polices.tresGras, fontSize: 20, lineHeight: 26, color: couleurs.texte },
  pastilleRose: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: couleurs.rose,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
});
