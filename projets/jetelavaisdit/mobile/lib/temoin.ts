// « À qui tu l'as dit » : le témoin d'une prédiction (prénom, initiale, lien).
// Mêmes règles que la base (migration 20261119120000_temoin.sql).
import { couleurs } from './theme';

export type CodeLien = 'pote' | 'best' | 'crush' | 'famille' | 'coloc' | 'collegue' | 'prof' | 'ex';

/** Les cases à cocher, dans l'ordre d'affichage. */
export const LIENS: { code: CodeLien; label: string }[] = [
  { code: 'pote', label: 'Pote' },
  { code: 'best', label: 'Best' },
  { code: 'crush', label: 'Crush' },
  { code: 'famille', label: 'Famille' },
  { code: 'coloc', label: 'Coloc' },
  { code: 'collegue', label: 'Collègue' },
  { code: 'prof', label: 'Prof' },
  { code: 'ex', label: 'Ex' },
];

/** Liens gardés pour soi par défaut au moment d'envoyer la carte. */
export const LIENS_DISCRETS: CodeLien[] = ['crush', 'ex'];

export const PRENOM_MAX = 20;
export const PRECISION_MAX = 30;

export type Temoin = {
  prenom: string;
  initiale: string;
  lien: CodeLien | null;
  precision: string;
};

export const TEMOIN_VIDE: Temoin = { prenom: '', initiale: '', lien: null, precision: '' };

/** Champs témoin tels que lus dans `jtlad_phrases`. */
export type ColonnesTemoin = {
  temoin_prenom: string | null;
  temoin_initiale: string | null;
  temoin_lien: CodeLien | null;
  temoin_precision: string | null;
};

export function labelLien(code: CodeLien | null | undefined): string {
  return LIENS.find((l) => l.code === code)?.label ?? '';
}

/** « Léa M. », sinon « Léa ». */
export function nomTemoin(prenom: string | null | undefined, initiale?: string | null): string {
  const p = (prenom ?? '').trim();
  if (!p) return '';
  const i = (initiale ?? '').trim();
  return i ? `${p} ${i}.` : p;
}

/** Le texte libre s'il existe, sinon le nom de la case cochée (en minuscules). */
export function texteLien(lien: CodeLien | null | undefined, precision?: string | null): string {
  const p = (precision ?? '').trim();
  return p || labelLien(lien).toLowerCase();
}

/** « Dit à Léa M. · petite sœur ». */
export function ditA(nom: string, lien: string): string {
  if (!nom) return '';
  return lien ? `Dit à ${nom} · ${lien}` : `Dit à ${nom}`;
}

// Lettres latines, accents compris (sans \p{L}, que le moteur JavaScript d'Android ne gère pas partout).
const LETTRE = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F';
const NON_LETTRES = new RegExp(`[^${LETTRE}]`, 'g');
const PRENOM = new RegExp(`^[${LETTRE}][${LETTRE}' \u2019-]*$`);

/** Garde la dernière lettre tapée, en majuscule (pour le champ « 1re lettre du nom »). */
export function nettoyerInitiale(saisie: string): string {
  const lettres = saisie.replace(NON_LETTRES, '');
  return lettres.slice(-1).toUpperCase();
}

/** Lettres, espaces, tirets et apostrophes, comme côté serveur. */
export function prenomValide(prenom: string): boolean {
  const p = prenom.trim();
  return p.length > 0 && p.length <= PRENOM_MAX && PRENOM.test(p);
}

/** Effet « je te l'avais dit » : 1 = phrase seule, 2 = avec prénom, 3 = avec prénom et lien. */
export function niveauPiquant(t: Temoin): 1 | 2 | 3 {
  if (!t.prenom.trim()) return 1;
  return texteLien(t.lien, t.precision) ? 3 : 2;
}

export function messagePiquant(t: Temoin): { titre: string; texte: string } {
  switch (niveauPiquant(t)) {
    case 1:
      return { titre: 'Tiède.', texte: 'Une carte sans destinataire, ça pique moins.' };
    case 2:
      return { titre: 'Ça chauffe.', texte: 'Ajoute votre lien pour finir le travail.' };
    default:
      return { titre: 'Brûlant.', texte: `${t.prenom.trim()} ne va pas s'en remettre.` };
  }
}

/** Couleur d'avatar stable pour un prénom. */
export function couleurAvatar(prenom: string): string {
  const palette = [couleurs.rose, couleurs.vert, couleurs.texte, '#C8C5D6'];
  let somme = 0;
  for (const c of prenom.trim().toLowerCase()) somme = (somme * 31 + c.charCodeAt(0)) % 9973;
  return palette[somme % palette.length];
}

/** Clé d'une personne : même prénom et même initiale = même personne. */
export function clePersonne(prenom: string | null | undefined, initiale?: string | null): string {
  return `${(prenom ?? '').trim().toLowerCase()}|${(initiale ?? '').trim().toLowerCase()}`;
}

export type Personne = Temoin & { cle: string; nom: string; nombre: number };

/**
 * Les personnes déjà citées, de la plus récente à la plus ancienne, avec le dernier lien utilisé.
 * `phrases` doit être triée de la plus récente à la plus ancienne.
 */
export function personnesDepuis(phrases: ColonnesTemoin[]): Personne[] {
  const parCle = new Map<string, Personne>();
  for (const p of phrases) {
    if (!p.temoin_prenom) continue;
    const cle = clePersonne(p.temoin_prenom, p.temoin_initiale);
    const deja = parCle.get(cle);
    if (deja) {
      deja.nombre += 1;
    } else {
      parCle.set(cle, {
        cle,
        nom: nomTemoin(p.temoin_prenom, p.temoin_initiale),
        prenom: p.temoin_prenom,
        initiale: p.temoin_initiale ?? '',
        lien: p.temoin_lien,
        precision: p.temoin_precision ?? '',
        nombre: 1,
      });
    }
  }
  return [...parCle.values()];
}
