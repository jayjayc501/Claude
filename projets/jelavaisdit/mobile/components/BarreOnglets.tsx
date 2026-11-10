import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, polices } from '../lib/theme';
import { IconeCrayon, IconeListe } from './Icones';

/** Barre de navigation flottante en forme de pilule. */
export function BarreOnglets({ state, descriptors, navigation }: BottomTabBarProps) {
  const marges = useSafeAreaInsets();
  return (
    <View style={[styles.conteneur, { marginBottom: Math.max(marges.bottom, 16) }]}>
      {state.routes.map((route, index) => {
        const actif = state.index === index;
        const titre = descriptors[route.key].options.title ?? route.name;
        const couleur = actif ? couleurs.fond : couleurs.texteDoux;
        const Icone = route.name === 'index' ? IconeCrayon : IconeListe;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            onPress={() => {
              const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!actif && !evenement.defaultPrevented) navigation.navigate(route.name);
            }}
            style={[styles.onglet, actif && styles.ongletActif]}
          >
            <Icone couleur={couleur} />
            <Text style={[styles.texte, { color: couleur }]}>{titre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 24,
    padding: 6,
    backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure,
    borderWidth: 1,
    borderRadius: 999,
  },
  onglet: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ongletActif: { backgroundColor: couleurs.texte },
  texte: { fontFamily: polices.gras, fontSize: 14 },
});
