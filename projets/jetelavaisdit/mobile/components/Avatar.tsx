import { StyleSheet, Text, View } from 'react-native';
import { couleurs, polices } from '../lib/theme';

type Props = {
  nom: string;
  taille?: number;
  /** Couleur de fond (par défaut neutre : le vert et le rose gardent leur sens). */
  couleur?: string;
  couleurLettre?: string;
  lettre?: string;
};

/** Pastille ronde avec l'initiale (décorative : le nom est toujours écrit à côté). */
export function Avatar({ nom, taille = 26, couleur = couleurs.bordure, couleurLettre = couleurs.texte, lettre }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rond, { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur }]}
    >
      <Text style={[styles.lettre, { fontSize: Math.round(taille * 0.42), color: couleurLettre }]}>
        {lettre ?? (nom.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rond: { alignItems: 'center', justifyContent: 'center' },
  lettre: { fontFamily: polices.titre },
});
