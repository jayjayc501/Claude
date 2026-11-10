import Svg, { Path, Rect } from 'react-native-svg';

type Props = { couleur: string; taille?: number };

const trait = { fill: 'none', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function IconeCadenas({ couleur, taille = 20 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Rect x={4} y={11} width={16} height={10} rx={3} stroke={couleur} {...trait} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={couleur} {...trait} />
    </Svg>
  );
}

export function IconeCrayon({ couleur, taille = 20 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M4 20h4L19 9l-4-4L4 16z" stroke={couleur} {...trait} />
      <Path d="M13 7l4 4" stroke={couleur} {...trait} />
    </Svg>
  );
}

export function IconeListe({ couleur, taille = 20 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke={couleur} {...trait} />
    </Svg>
  );
}

export function IconeRetour({ couleur, taille = 22 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" stroke={couleur} {...trait} />
    </Svg>
  );
}

export function IconeCoche({ couleur, taille = 16 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M5 12l5 5 9-10" stroke={couleur} {...trait} strokeWidth={3} />
    </Svg>
  );
}

export function IconeInterdit({ couleur, taille = 36 }: Props) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM6 6l12 12" stroke={couleur} {...trait} strokeWidth={2.6} />
    </Svg>
  );
}
