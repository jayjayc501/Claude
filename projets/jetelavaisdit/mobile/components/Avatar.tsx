import { StyleSheet, Text, View } from 'react-native';
import { couleurAvatar } from '../lib/temoin';
import { couleurs, polices } from '../lib/theme';

type Props = {
  prenom: string;
  taille?: number;
  /** Couleur imposée (sinon : couleur stable tirée du prénom). */
  couleur?: string;
  lettre?: string;
};

/** Pastille ronde avec l'initiale du prénom (décorative : le prénom est toujours écrit à côté). */
export function Avatar({ prenom, taille = 26, couleur, lettre }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.rond,
        { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur ?? couleurAvatar(prenom) },
      ]}
    >
      <Text style={[styles.lettre, { fontSize: Math.round(taille * 0.42) }]}>
        {lettre ?? (prenom.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rond: { alignItems: 'center', justifyContent: 'center' },
  lettre: { fontFamily: polices.titre, color: couleurs.fond },
});
