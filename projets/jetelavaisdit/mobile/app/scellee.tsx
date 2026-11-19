import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../components/Bouton';
import { IconeCoche, IconePersonne } from '../components/Icones';
import { Logo } from '../components/Logo';
import { PadSignature, TraceSignature } from '../components/Signature';
import { formaterDateCourte, formaterHeure } from '../lib/dates';
import { lireErreur } from '../lib/erreurs';
import { supabase } from '../lib/supabase';
import { ditA, type CodeLien } from '../lib/temoin';
import { couleurs, polices } from '../lib/theme';
import { vibrerAppui, vibrerErreur, vibrerLeger, vibrerSucces } from '../lib/vibration';

/**
 * Célébration après le scellement (maquette 06) : fond vert, la bulle-cadenas qui « tombe » en place.
 * En dessous, facultatif : la personne à qui on l'a dit signe du doigt, sur place.
 */
export default function Scellee() {
  const router = useRouter();
  const { texte, scellee_le, temoin, temoin_lien, id } = useLocalSearchParams<{
    texte: string;
    scellee_le: string;
    temoin?: string;
    temoin_lien?: string;
    id?: string;
  }>();
  const nom = (temoin ?? '').trim();
  const pastille = ditA(nom, (temoin_lien || null) as CodeLien | null);

  const [signature, setSignature] = useState('');
  const [dessin, setDessin] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [signeeLe, setSigneeLe] = useState<string | null>(null);

  const arrivee = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(arrivee, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [arrivee]);
  const echelle = arrivee.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] });
  const rotation = arrivee.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '-8deg'] });

  async function valider() {
    if (!id || !signature) return;
    setErreur(null);
    setEnvoi(true);
    vibrerAppui();
    const { data, error } = await supabase.rpc('jtlad_signer_phrase', { p_id: id, p_signature: signature });
    setEnvoi(false);
    if (error) {
      vibrerErreur();
      setErreur(lireErreur(error.message).message);
      return;
    }
    vibrerSucces();
    setSigneeLe((data as string) ?? new Date().toISOString());
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        // Pendant la signature, la page ne doit pas défiler sous le doigt.
        scrollEnabled={!dessin}
      >
        <View style={styles.enTete}>
          <Animated.View style={{ marginLeft: -10, opacity: arrivee, transform: [{ scale: echelle }, { rotate: rotation }] }}>
            <Logo taille={72} couleur={couleurs.fond} couleurPoint={couleurs.vert} />
          </Animated.View>
          <Text style={styles.titre} accessibilityRole="header">c'est{'\n'}scellé.</Text>
        </View>
        <Text style={styles.sousTitre}>Plus personne ne peut y toucher. Même pas toi.</Text>

        <View style={styles.carte}>
          <Text style={styles.phrase}>« {texte} »</Text>
          <View style={styles.puces}>
            {scellee_le ? (
              <View style={styles.puce}><Text style={styles.puceTexte}>{formaterDateCourte(scellee_le)}</Text></View>
            ) : null}
            {pastille ? (
              <View style={[styles.puce, styles.puceTemoin]}>
                <IconePersonne couleur={couleurs.vert} taille={14} />
                <Text style={styles.puceTexte}>{pastille}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {nom && !signeeLe ? (
          // Facultatif : la personne est là, elle signe sur ce téléphone.
          <View style={styles.signer}>
            <View style={styles.signerEnTete}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.facultatif}>FACULTATIF</Text>
                <Text style={styles.signerTitre}>Tu veux faire signer {nom} ?</Text>
              </View>
              {signature ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    vibrerLeger();
                    setSignature('');
                    setErreur(null);
                  }}
                  style={styles.effacer}
                >
                  <Text style={styles.effacerTexte}>Effacer</Text>
                </Pressable>
              ) : null}
            </View>
            <PadSignature
              chemin={signature}
              onChange={(c) => {
                setErreur(null);
                setSignature(c);
              }}
              onDessin={setDessin}
              invitation={`Passe le téléphone à ${nom}, signature au doigt`}
            />
            {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}
            {signature ? (
              <Bouton titre="Valider la signature" onPress={valider} chargement={envoi} variante="noir" petit />
            ) : null}
          </View>
        ) : null}

        {signeeLe ? (
          <View style={styles.signee}>
            <TraceSignature chemin={signature} largeur={110} label={`Signature de ${nom}`} />
            <View style={{ flexShrink: 1, gap: 2 }}>
              <View style={styles.signeeLigne}>
                <IconeCoche couleur={couleurs.vert} />
                <Text style={styles.signeeTitre}>Signée par {nom}</Text>
              </View>
              <Text style={styles.signeeDate}>sur place, à {formaterHeure(signeeLe)}</Text>
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: 24 }} />
        <Bouton titre="Voir mes phrases" variante="noir" onPress={() => router.replace('/phrases')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.vert },
  contenu: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titre: { fontFamily: polices.titre, fontSize: 38, lineHeight: 40, letterSpacing: -1.4, color: couleurs.fond },
  sousTitre: { marginTop: 12, fontFamily: polices.moyen, fontSize: 16, lineHeight: 22, color: couleurs.fond },
  carte: { marginTop: 18, backgroundColor: couleurs.fond, borderRadius: 26, padding: 18, gap: 12 },
  phrase: { fontFamily: polices.tresGras, fontSize: 19, lineHeight: 25, color: couleurs.texte },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { backgroundColor: couleurs.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  puceTemoin: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, maxWidth: '100%' },
  puceTexte: { flexShrink: 1, fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  signer: { marginTop: 34, gap: 10 },
  signerEnTete: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  facultatif: { fontFamily: polices.tresGras, fontSize: 11, letterSpacing: 1, color: couleurs.fond, opacity: 0.65 },
  signerTitre: { fontFamily: polices.tresGras, fontSize: 16, lineHeight: 21, color: couleurs.fond },
  effacer: {
    height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(13,12,18,0.4)',
  },
  effacerTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.fond },
  erreur: { fontFamily: polices.gras, fontSize: 14, lineHeight: 19, color: couleurs.fond },
  signee: {
    marginTop: 34, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: 20, backgroundColor: couleurs.fond,
  },
  signeeLigne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signeeTitre: { fontFamily: polices.tresGras, fontSize: 14, color: couleurs.vert },
  signeeDate: { fontFamily: polices.normal, fontSize: 12, color: couleurs.texteDoux },
});
