// Toutes les dates sont exprimées à l'heure de Paris, comme côté serveur.
const PARIS = 'Europe/Paris';

function morceaux(date: Date, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: PARIS, ...options }).formatToParts(date);
  const valeur = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return valeur;
}

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function aujourdhuiParis(maintenant = new Date()): string {
  const v = morceaux(maintenant, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** Nombre de jours entre deux dates AAAA-MM-JJ. */
export function joursEntre(debut: string, fin: string): number {
  const ms = Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Jours écoulés depuis une date AAAA-MM-JJ jusqu'à aujourd'hui (Paris). */
export function joursDepuis(jour: string): number {
  return joursEntre(jour, aujourdhuiParis());
}

/** Temps restant avant minuit à Paris (prochaine prédiction possible). */
export function avantMinuitParis(maintenant = new Date()): { heures: number; minutes: number } {
  const v = morceaux(maintenant, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const ecoule = Number(v('hour')) * 3600 + Number(v('minute')) * 60 + Number(v('second'));
  const restant = Math.max(0, 86_400 - ecoule);
  return { heures: Math.floor(restant / 3600), minutes: Math.floor((restant % 3600) / 60) };
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 14 mars 2026 » ou « 14 mars 2026 · 22h47 ». */
export function formaterDate(iso: string, avecHeure = false): string {
  const v = morceaux(new Date(iso), {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const date = `${Number(v('day'))} ${MOIS[Number(v('month')) - 1]} ${v('year')}`;
  return avecHeure ? `${date} · ${v('hour')}h${v('minute')}` : date;
}

/** « Aujourd'hui · 12h21 », « Hier », ou la date complète. */
export function dateRelative(iso: string, jour: string): string {
  const ecart = joursDepuis(jour);
  const v = morceaux(new Date(iso), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  if (ecart === 0) return `Aujourd'hui · ${v('hour')}h${v('minute')}`;
  if (ecart === 1) return 'Hier';
  return formaterDate(iso);
}
