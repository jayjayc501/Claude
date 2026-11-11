import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { couleurs } from '../lib/theme';

type Props = {
  taille?: number;
  /** Couleur de la bulle et du cadenas. */
  couleur?: string;
  /** Couleur du « ! ». */
  couleurPoint?: string;
  /** Version en pointillés (liste vide). */
  pointilles?: boolean;
};

/** La « bulle scellée » : bulle de parole fermée par un cadenas, avec un « ! ». */
export function Logo({ taille = 48, couleur = couleurs.fond, couleurPoint = couleurs.vert, pointilles = false }: Props) {
  const bulle =
    'M28 38h44a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H46l-14 11v-11h-4a12 12 0 0 1-12-12V50a12 12 0 0 1 12-12z';
  return (
    <Svg width={taille} height={taille} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d="M36 40V30a14 14 0 0 1 28 0v10"
        stroke={couleur}
        strokeWidth={pointilles ? 6 : 9}
        fill="none"
        strokeLinecap="round"
      />
      {pointilles ? (
        <Path d={bulle} fill="none" stroke={couleur} strokeWidth={4} strokeDasharray="6 5" strokeLinejoin="round" />
      ) : (
        <Path d={bulle} fill={couleur} />
      )}
      <Rect x={46} y={46} width={8} height={18} rx={4} fill={couleurPoint} />
      <Circle cx={50} cy={71.5} r={4.5} fill={couleurPoint} />
    </Svg>
  );
}
