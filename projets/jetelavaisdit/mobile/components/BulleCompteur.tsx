import { View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { couleurs, polices } from '../lib/theme';

type Props = {
  valeur: number | string;
  largeur?: number;
};

/** Élément signature : le logo devient le compteur de jours. Toujours vert, légèrement penché. */
export function BulleCompteur({ valeur, largeur = 120 }: Props) {
  const texte = String(valeur);
  const tailleTexte = texte.length > 3 ? 42 : 52;
  return (
    <View
      style={{ transform: [{ rotate: '-6deg' }] }}
      accessible
      accessibilityLabel={`${texte} jours`}
    >
      <Svg width={largeur} height={(largeur * 150) / 200} viewBox="0 0 200 150">
        <Path
          d="M72 44V30a28 28 0 0 1 56 0v14"
          stroke={couleurs.vert}
          strokeWidth={13}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M36 40h128a26 26 0 0 1 26 26v36a26 26 0 0 1-26 26H78l-30 22v-22H36a26 26 0 0 1-26-26V66a26 26 0 0 1 26-26z"
          fill={couleurs.vert}
        />
        <SvgText
          x={100}
          y={104}
          textAnchor="middle"
          fontFamily={polices.titre}
          fontSize={tailleTexte}
          letterSpacing={-2}
          fill={couleurs.fond}
        >
          {texte}
        </SvgText>
      </Svg>
    </View>
  );
}
