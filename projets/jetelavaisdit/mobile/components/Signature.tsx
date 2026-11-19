import { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { couleurs, polices } from '../lib/theme';

// La signature est un tracé SVG (« M x y L x y … ») dans un cadre fixe de 300 × 150,
// quelle que soit la taille de l'écran. Même format que la base (temoin_signature).
export const LARGEUR_SIGNATURE = 300;
export const HAUTEUR_SIGNATURE = 150;
const LONGUEUR_MAX = 19000;

/** Affiche une signature déjà faite. */
export function TraceSignature({
  chemin, couleur = couleurs.texte, largeur = 104, epaisseur = 7, label,
}: { chemin: string; couleur?: string; largeur?: number; epaisseur?: number; label?: string }) {
  return (
    <Svg
      width={largeur}
      height={(largeur * HAUTEUR_SIGNATURE) / LARGEUR_SIGNATURE}
      viewBox={`0 0 ${LARGEUR_SIGNATURE} ${HAUTEUR_SIGNATURE}`}
      accessibilityLabel={label}
      accessible={!!label}
    >
      <Path d={chemin} stroke={couleur} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = {
  chemin: string;
  onChange: (chemin: string) => void;
  /** Prévient le parent pendant le dessin (pour bloquer le défilement de la page). */
  onDessin?: (enCours: boolean) => void;
  invitation?: string;
};

/** Zone noire où le témoin signe du doigt (trait blanc). */
export function PadSignature({ chemin, onChange, onDessin, invitation = 'Signature au doigt' }: Props) {
  const taille = useRef({ largeur: 1, hauteur: 1 });
  const courant = useRef(chemin);
  courant.current = chemin;
  const dernier = useRef<{ x: number; y: number } | null>(null);
  // Le geste est créé une seule fois : il lit toujours les dernières fonctions reçues.
  const rappels = useRef({ onChange, onDessin });
  rappels.current = { onChange, onDessin };

  const point = (x: number, y: number) => ({
    x: Math.max(0, Math.min(LARGEUR_SIGNATURE, Math.round((x * LARGEUR_SIGNATURE) / taille.current.largeur))),
    y: Math.max(0, Math.min(HAUTEUR_SIGNATURE, Math.round((y * HAUTEUR_SIGNATURE) / taille.current.hauteur))),
  });

  const geste = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        rappels.current.onDessin?.(true);
        const p = point(e.nativeEvent.locationX, e.nativeEvent.locationY);
        dernier.current = p;
        const debut = courant.current ? `${courant.current} ` : '';
        // Un simple appui laisse un point visible.
        courant.current = `${debut}M${p.x} ${p.y} L${p.x + 1} ${p.y}`;
        rappels.current.onChange(courant.current);
      },
      onPanResponderMove: (e) => {
        const p = point(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const d = dernier.current;
        // On ne garde que les points qui bougent vraiment (signature légère).
        if (d && Math.abs(p.x - d.x) + Math.abs(p.y - d.y) < 2) return;
        if (courant.current.length > LONGUEUR_MAX) return;
        dernier.current = p;
        // Mis à jour tout de suite : les mouvements rapides arrivent avant le prochain affichage.
        courant.current = `${courant.current} L${p.x} ${p.y}`;
        rappels.current.onChange(courant.current);
      },
      onPanResponderRelease: () => {
        dernier.current = null;
        rappels.current.onDessin?.(false);
      },
      onPanResponderTerminate: () => {
        dernier.current = null;
        rappels.current.onDessin?.(false);
      },
    }),
  ).current;

  function mesurer(e: LayoutChangeEvent) {
    taille.current = { largeur: e.nativeEvent.layout.width, hauteur: e.nativeEvent.layout.height };
  }

  return (
    <View style={styles.cadre} onLayout={mesurer} {...geste.panHandlers} accessibilityHint="Zone de signature">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${LARGEUR_SIGNATURE} ${HAUTEUR_SIGNATURE}`}>
        {chemin ? (
          <Path d={chemin} stroke={couleurs.texte} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>
      </View>
      {!chemin ? (
        <View pointerEvents="none">
          <Text style={styles.invitation}>{invitation}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    width: '100%', aspectRatio: LARGEUR_SIGNATURE / HAUTEUR_SIGNATURE, borderRadius: 22,
    backgroundColor: couleurs.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  invitation: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.bordureForte, textAlign: 'center', paddingHorizontal: 16 },
});
