// « À qui tu l'as dit » : le témoin d'une certitude.
// Une case à cocher (le lien) et un texte libre (« Sarah », « ma petite sœur »…), tous deux facultatifs.
// Mêmes règles que la base (migration 20261119120000_temoin.sql).
// Règle d'écriture : on ne connaît pas le genre de la personne, donc aucun « il » ni « elle ».

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

/** Quand seule la case est cochée : « Dit à un pote ». */
const SANS_NOM: Record<CodeLien, string> = {
  pote: 'un pote',
  best: 'son best',
  crush: 'son crush',
  famille: 'sa famille',
  coloc: 'son coloc',
  collegue: 'un collègue',
  prof: 'un prof',
  ex: 'son ex',
};

export const TEMOIN_MAX = 30;

export type Temoin = { nom: string; lien: CodeLien | null };

export const TEMOIN_VIDE: Temoin = { nom: '', lien: null };

/** Champs témoin tels que lus dans `jtlad_phrases`. */
export type ColonnesTemoin = { temoin: string | null; temoin_lien: CodeLien | null };

export function labelLien(code: CodeLien | null | undefined): string {
  return LIENS.find((l) => l.code === code)?.label ?? '';
}

/** « Dit à Léa · famille », « Dit à Léa », « Dit à un pote », ou rien. */
export function ditA(nom: string | null | undefined, lien: CodeLien | null | undefined): string {
  const n = (nom ?? '').trim();
  const l = labelLien(lien).toLowerCase();
  if (n) return l ? `Dit à ${n} · ${l}` : `Dit à ${n}`;
  return lien ? `Dit à ${SANS_NOM[lien]}` : '';
}

/** « regarde, léa. » si on sait à qui, sinon « regarde. » */
export function regarde(nom: string | null | undefined): string {
  const n = (nom ?? '').trim();
  return n ? `regarde, ${n.toLowerCase()}.` : 'regarde.';
}

/** Première lettre en majuscule (début de phrase : « Ma petite sœur, Jules te l'avait dit »). */
export function majuscule(texte: string): string {
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : texte;
}

/** Clé d'une personne : le texte « à qui », sans tenir compte des majuscules ni des espaces. */
export function clePersonne(nom: string | null | undefined): string {
  return (nom ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export type Personne = { cle: string; nom: string; lien: CodeLien | null; nombre: number };

/**
 * Les personnes déjà citées, de la plus récente à la plus ancienne, avec le dernier lien coché.
 * `phrases` doit être triée de la plus récente à la plus ancienne.
 */
export function personnesDepuis(phrases: ColonnesTemoin[]): Personne[] {
  const parCle = new Map<string, Personne>();
  for (const p of phrases) {
    const nom = (p.temoin ?? '').trim();
    if (!nom) continue;
    const cle = clePersonne(nom);
    const deja = parCle.get(cle);
    if (deja) deja.nombre += 1;
    else parCle.set(cle, { cle, nom, lien: p.temoin_lien, nombre: 1 });
  }
  return [...parCle.values()];
}
