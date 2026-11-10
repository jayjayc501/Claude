import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton } from '../components/Bouton';
import { Logo } from '../components/Logo';
import { formaterDate } from '../lib/dates';
import { couleurs, polices } from '../lib/theme';

/** Célébration après le scellement : fond vert, la bulle-cadenas qui « tombe » en place. */
export default function Scellee() {
  const router = useRouter();
  const { texte, scellee_le } = useLocalSearchParams<{ texte: string; scellee_le: string }>();
  const arrivee = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(arrivee, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [arrivee]);

  const echelle = arrivee.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] });
  const rotation = arrivee.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '-8deg'] });

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.contenu}>
        <Animated.View style={{ alignSelf: 'flex-start', marginLeft: -14, opacity: arrivee, transform: [{ scale: echelle }, { rotate: rotation }] }}>
          <Logo taille={120} couleur={couleurs.fond} couleurPoint={couleurs.vert} />
        </Animated.View>

        <Text style={styles.titre} accessibilityRole="header">c'est{'\n'}scellé.</Text>
        <Text style={styles.sousTitre}>Plus personne ne peut y toucher. Même pas toi.</Text>

        <View style={styles.carte}>
          <Text style={styles.phrase}>« {texte} »</Text>
          <View style={styles.puces}>
            {scellee_le ? (
              <View style={styles.puce}><Text style={styles.puceTexte}>{formaterDate(scellee_le, true)}</Text></View>
            ) : null}
            <View style={styles.puce}><Text style={[styles.puceTexte, { color: '#C8C5D6' }]}>Privée</Text></View>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Text style={styles.note}>Rendez-vous quand ça arrive.{'\n'}Prochaine prédiction demain.</Text>
        <Bouton titre="Voir mes phrases" variante="noir" onPress={() => router.replace('/phrases')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.vert },
  contenu: { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  titre: { marginTop: 28, fontFamily: polices.titre, fontSize: 48, lineHeight: 50, letterSpacing: -1.5, color: couleurs.fond },
  sousTitre: { marginTop: 14, fontFamily: polices.moyen, fontSize: 18, lineHeight: 25, color: couleurs.fond },
  carte: { marginTop: 36, backgroundColor: couleurs.fond, borderRadius: 28, padding: 22, gap: 14 },
  phrase: { fontFamily: polices.tresGras, fontSize: 22, lineHeight: 28, color: couleurs.texte },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { backgroundColor: couleurs.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  puceTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  note: { marginBottom: 16, textAlign: 'center', fontFamily: polices.moyen, fontSize: 15, lineHeight: 21, color: couleurs.fond },
});
