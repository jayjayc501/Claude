import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { couleurs, polices } from '../lib/theme';

type Variante = 'vert' | 'noir' | 'blanc' | 'contour';

type Props = {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  icone?: ReactNode;
  desactive?: boolean;
  chargement?: boolean;
  petit?: boolean;
};

const styles_variantes: Record<Variante, { fond: string; texte: string; bordure?: string }> = {
  vert: { fond: couleurs.vert, texte: couleurs.fond },
  noir: { fond: couleurs.fond, texte: couleurs.texte },
  blanc: { fond: couleurs.texte, texte: couleurs.fond },
  contour: { fond: 'transparent', texte: couleurs.texte, bordure: couleurs.bordureForte },
};

export function Bouton({ titre, onPress, variante = 'vert', icone, desactive, chargement, petit }: Props) {
  const v = desactive
    ? { fond: couleurs.surface, texte: couleurs.texteDoux, bordure: couleurs.bordure }
    : styles_variantes[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desactive, busy: !!chargement }}
      disabled={desactive || chargement}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        petit ? styles.petit : styles.grand,
        { backgroundColor: v.fond, borderColor: v.bordure ?? v.fond, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={v.texte} />
      ) : (
        <View style={styles.contenu}>
          {icone}
          <Text style={[petit ? styles.textePetit : styles.texte, { color: v.texte }]}>{titre}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grand: { height: 60, paddingHorizontal: 24 },
  petit: { height: 44, paddingHorizontal: 18, alignSelf: 'flex-start' },
  contenu: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  texte: { fontFamily: polices.titre, fontSize: 17 },
  textePetit: { fontFamily: polices.titre, fontSize: 13 },
});
