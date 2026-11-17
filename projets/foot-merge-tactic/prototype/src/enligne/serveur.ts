// Serveur du 1 contre 1 en ligne (15/11) : la logique, sans rien de propre à
// Supabase. La fonction Supabase (serveur/fonction/index.ts) et le serveur local
// des tests (scripts/serveur-local.ts) n'y ajoutent que le stockage (Magasin).
//
// Déroulé d'une partie (états) :
//   attente  : l'hôte a créé la partie et envoyé le lien ; on attend l'ami.
//   equipes  : l'ami est arrivé ; chacun a 10 minutes pour faire son équipe et
//              l'envoyer (« Prêt »). À la fin du chrono, une équipe manquante est
//              faite automatiquement.
//   calcul1  : le serveur calcule la 1re mi-temps (un seul calcul, même si les
//              deux téléphones demandent en même temps : verrou par version).
//   mt1      : film de la 1re mi-temps disponible ; coup d'envoi à debutMt1 (heure
//              du serveur), les deux téléphones le regardent en même temps ; puis
//              1 minute de mi-temps pour les changements (plus tôt si les deux
//              sont prêts).
//   calcul2  : le serveur recalcule la 1re mi-temps (même graine, même match au
//              bit près), applique les changements des deux équipes et calcule la 2e.
//   mt2      : film de la 2e mi-temps disponible ; reprise à debutMt2.
//   fini     : le match est fini (score gardé).
// Les téléphones demandent l'état toutes les 1,5 s ; chaque demande fait avancer
// la partie si c'est l'heure (pas de minuterie côté serveur).
//
// Ménage (17/11, prompt A3) : l'action « menage », appelée toutes les heures par
// une tâche planifiée Supabase, supprime les parties sans mouvement depuis
// menageApresH heures (finies ou abandonnées) et leurs films. Création limitée à
// creationsParHeure parties par heure et par connexion (empreinte de l'adresse,
// jamais l'adresse elle-même).

import { VITESSE_LECTURE } from "../match/arbitre";
import { ArbitreLocal, planificateurImmediat } from "../match/arbitreLocal";
import { ETAT, type Film, COLONNES_ETAT } from "../match/film";
import { Partie, REGLES } from "../jeu/partie";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../sim/chargement";
import type { Donnees } from "../sim/donnees";
import type { Equipe, Reglages } from "../sim/types";
import { BANC_MAX, type ChoixEquipe, FUSIONS_MAX, equipeDepuisChoix, verifierChoix, verifierMiTemps } from "./equipes";
import { encoderFilm } from "./filmReseau";

export type EtatPartie = "attente" | "equipes" | "calcul1" | "mt1" | "calcul2" | "mt2" | "fini";
type Camp = 0 | 1;
type Paire<T> = [T, T];

/** Une partie, telle qu'elle est rangée (heures en millisecondes, horloge du serveur). */
export interface PartieEnLigne {
  id: string;
  /** Augmente à chaque écriture (deux demandes simultanées ne s'écrasent pas). */
  version: number;
  etat: EtatPartie;
  creeLe: number;
  majLe: number;
  /** Graine du match ; celles des drafts en découlent. */
  graine: number;
  jetons: [string, string | null];
  /** Partie secrète du nom des films. */
  secret: string;
  debutEquipes: number | null;
  finEquipes: number | null;
  equipes: Paire<ChoixEquipe | null>;
  /** Équipe faite par le serveur (rien reçu à temps). */
  auto: Paire<boolean>;
  debutMt1: number | null;
  /** Fin de la 1re mi-temps à l'écran (dernière image). */
  finMt1: number | null;
  /** Fin du temps de mi-temps pour les changements. */
  finMiTemps: number | null;
  miTemps: Paire<ChoixEquipe | null>;
  debutMt2: number | null;
  finMt2: number | null;
  scoreMiTemps: Paire<number> | null;
  score: Paire<number> | null;
  /** Empreinte de la connexion qui a créé la partie (limite de créations ; null : inconnue). */
  origine?: string | null;
}

/** Une partie à supprimer et les chemins de ses films. */
export interface PartieASupprimer {
  id: string;
  films: string[];
}

/** Le stockage : une table de parties et des fichiers (les films). */
export interface Magasin {
  lire(id: string): Promise<PartieEnLigne | null>;
  /** Crée la partie ; false si l'identifiant existe déjà. */
  creer(p: PartieEnLigne): Promise<boolean>;
  /** Écrit la partie si sa version rangée est encore `versionLue` (sinon false : quelqu'un est passé avant). */
  ecrire(p: PartieEnLigne, versionLue: number): Promise<boolean>;
  deposerFilm(chemin: string, octets: Uint8Array): Promise<void>;
  lireFilm(chemin: string): Promise<Uint8Array | null>;
  /** Nombre de parties créées par cette connexion depuis l'instant `depuis` (ms). */
  creationsDepuis(origine: string, depuis: number): Promise<number>;
  /** Parties sans mouvement depuis l'instant `avant` (ms), `max` au plus. */
  anciennes(avant: number, max: number): Promise<PartieASupprimer[]>;
  /** Supprime les films de la partie, puis la partie. */
  supprimer(p: PartieASupprimer): Promise<void>;
}

export interface Requete {
  action: "creer" | "rejoindre" | "etat" | "equipe" | "mitemps" | "film" | "menage";
  id?: string;
  jeton?: string;
  equipe?: unknown;
  /** Film demandé : 1 ou 2. */
  n?: number;
}

/** Ce qu'un joueur voit de la partie (ses données d'abord : [moi, l'autre]). */
export interface VuePartie {
  id: string;
  camp: Camp;
  etat: EtatPartie;
  /** Heure du serveur au moment de la réponse (pour caler l'horloge du téléphone). */
  maintenant: number;
  amiPresent: boolean;
  graineDraft: number;
  finEquipes: number | null;
  equipePrete: Paire<boolean>;
  auto: Paire<boolean>;
  /** Les deux équipes du coup d'envoi (après le calcul de la 1re mi-temps). */
  equipes: Paire<ChoixEquipe> | null;
  debutMt1: number | null;
  finMt1: number | null;
  finMiTemps: number | null;
  miTempsPret: Paire<boolean>;
  /** Les deux équipes de la 2e mi-temps (après son calcul). */
  equipesMt2: Paire<ChoixEquipe> | null;
  debutMt2: number | null;
  finMt2: number | null;
  films: { mt1: boolean; mt2: boolean };
  score: Paire<number> | null;
}

export type Reponse = { type: "json"; statut: number; corps: unknown } | { type: "octets"; corps: Uint8Array };

const EN_LIGNE = REGLES.enLigne;
/** Un calcul bloqué depuis plus longtemps est repris par la demande suivante. */
const CALCUL_PERDU_MS = 30_000;
const CHOIX_MATCH = { options: { tactiques: true, styles: true }, tactiques: [null, null] as [null, null] };

/** Le moteur, chargé une fois (plateau en hexagones, comme le jeu). */
export interface Contexte {
  donnees: Donnees;
  reglages: Reglages;
  planOrdi: { poste: string; cellule: number }[];
}

export function contexte(): Contexte {
  const donnees = chargerDonnees("hexagones");
  const { adversaire } = chargerEquipes(donnees);
  const planOrdi = [...adversaire.composition.filter((p) => p.poste !== "G"), ...adversaire.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));
  return { donnees, reglages: chargerReglages(), planOrdi };
}

/** Graine du draft de chaque joueur (tirage différent pour chacun, 15/11). */
export function graineDraft(graine: number, camp: Camp): number {
  return (Math.imul(graine ^ (camp === 0 ? 0x2545f491 : 0x6c8e9cf5), 0x9e3779b1) >>> 1) % 2 ** 31;
}

function hasard(n: number, alphabet = "abcdefghjkmnpqrstuvwxyz23456789"): string {
  const o = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(o, (x) => alphabet[x % alphabet.length]).join("");
}

const erreur = (texte: string, statut = 400): Reponse => ({ type: "json", statut, corps: { ok: false, erreur: texte } });
const json = (corps: unknown): Reponse => ({ type: "json", statut: 200, corps });

/** Durée de lecture d'un film à l'écran (ms) : ses images à la vitesse de lecture. */
export function dureeLectureMs(film: Film): number {
  return ((Math.max(0, film.images - 1) * film.entete.pasDeTempsS) / VITESSE_LECTURE) * 1000;
}

const cheminFilm = (p: { id: string; secret: string }, n: 1 | 2) => `${p.id}-${p.secret}/mt${n}.bin`;
/** Les deux films possibles d'une partie (le 2e n'existe pas toujours). */
export const cheminsFilms = (p: { id: string; secret: string }): string[] => [cheminFilm(p, 1), cheminFilm(p, 2)];
/** Parties supprimées au plus par ménage (le suivant reprend la suite). */
const MENAGE_MAX = 100;

function vue(p: PartieEnLigne, camp: Camp, maintenant: number): VuePartie {
  const a = camp;
  const b = (1 - camp) as Camp;
  const mes = <T>(x: Paire<T>): Paire<T> => [x[a], x[b]];
  const apres1 = p.etat === "mt1" || p.etat === "calcul2" || p.etat === "mt2" || p.etat === "fini";
  const apres2 = p.etat === "mt2" || p.etat === "fini";
  return {
    id: p.id,
    camp,
    etat: p.etat,
    maintenant,
    amiPresent: p.jetons[1] !== null,
    graineDraft: graineDraft(p.graine, camp),
    finEquipes: p.finEquipes,
    equipePrete: mes([p.equipes[0] !== null, p.equipes[1] !== null]),
    auto: mes(p.auto),
    equipes: apres1 && p.equipes[0] && p.equipes[1] ? mes([p.equipes[0], p.equipes[1]]) : null,
    debutMt1: p.debutMt1,
    finMt1: p.finMt1,
    finMiTemps: p.finMiTemps,
    miTempsPret: mes([p.miTemps[0] !== null, p.miTemps[1] !== null]),
    equipesMt2: apres2 && p.miTemps[0] && p.miTemps[1] ? mes([p.miTemps[0], p.miTemps[1]]) : null,
    debutMt2: p.debutMt2,
    finMt2: p.finMt2,
    films: { mt1: apres1 && p.etat !== "calcul1", mt2: apres2 },
    score: p.score ? mes(p.score) : null,
  };
}

/** Équipe faite par le serveur pour qui n'a rien envoyé (équipe automatique, avec sa graine de draft). */
function equipeAuto(ctx: Contexte, graine: number): ChoixEquipe {
  const partie = new Partie(ctx.donnees, graine, ctx.planOrdi);
  partie.equipeAuto(0, EN_LIGNE.qualiteAuto, BANC_MAX, FUSIONS_MAX);
  const c = partie.camps[0]!;
  return { effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((x) => ({ ...x })), tactique: "EQU" };
}

const NOMS: Paire<string> = ["Équipe 1", "Équipe 2"];
const equipesMoteur = (c: Paire<ChoixEquipe>): Paire<Equipe> => [equipeDepuisChoix(c[0], NOMS[0]), equipeDepuisChoix(c[1], NOMS[1])];

/** 1re mi-temps (et, si `miTemps` est donné, 2e mi-temps après les changements des deux équipes). */
export function calculerFilm(ctx: Contexte, equipes: Paire<ChoixEquipe>, graine: number, miTemps?: Paire<ChoixEquipe>): Film {
  const arbitre = new ArbitreLocal(ctx.donnees, ctx.reglages, planificateurImmediat);
  arbitre.nouveauMatch(equipesMoteur(equipes), graine);
  const mt1 = arbitre.premiereMiTemps(CHOIX_MATCH);
  if (!miTemps) return mt1;
  const [e0, e1] = equipesMoteur(miTemps);
  return arbitre.secondeMiTemps({ ...CHOIX_MATCH, equipe0: e0, equipe1: e1 });
}

function scoreFinal(film: Film): Paire<number> {
  const o = (film.images - 1) * COLONNES_ETAT;
  return [film.etat[o + ETAT.score0]!, film.etat[o + ETAT.score1]!];
}

/** Fait avancer la partie si c'est l'heure (calculs compris). Renvoie la partie à jour. */
async function avancer(m: Magasin, ctx: Contexte, p: PartieEnLigne, maintenant: number): Promise<PartieEnLigne> {
  const grace = EN_LIGNE.graceS * 1000;
  for (let essai = 0; essai < 4; essai++) {
    let suite: PartieEnLigne | null = null;
    if ((p.etat === "calcul1" || p.etat === "calcul2") && maintenant - p.majLe > CALCUL_PERDU_MS) {
      suite = { ...p, etat: p.etat === "calcul1" ? "equipes" : "mt1" };
    } else if (p.etat === "equipes" && ((p.equipes[0] && p.equipes[1]) || maintenant >= p.finEquipes! + grace)) {
      // Calcul de la 1re mi-temps : on prend le verrou, on calcule, on range.
      const verrou: PartieEnLigne = { ...p, etat: "calcul1", majLe: maintenant, version: p.version + 1 };
      if (await m.ecrire(verrou, p.version)) {
        const t0 = performance.now();
        const equipes: Paire<ChoixEquipe> = [p.equipes[0] ?? equipeAuto(ctx, graineDraft(p.graine, 0)), p.equipes[1] ?? equipeAuto(ctx, graineDraft(p.graine, 1))];
        const film = calculerFilm(ctx, equipes, p.graine);
        await m.deposerFilm(cheminFilm(p, 1), await encoderFilm(film));
        const fin = maintenant + Math.round(performance.now() - t0);
        const debut = fin + EN_LIGNE.margeDebutS * 1000;
        const finMt1 = debut + dureeLectureMs(film);
        const pret: PartieEnLigne = {
          ...verrou,
          etat: "mt1",
          majLe: fin,
          version: verrou.version + 1,
          equipes,
          auto: [!p.equipes[0], !p.equipes[1]],
          debutMt1: debut,
          finMt1,
          finMiTemps: finMt1 + EN_LIGNE.dureeMiTempsS * 1000,
          scoreMiTemps: scoreFinal(film),
        };
        if (await m.ecrire(pret, verrou.version)) return pret;
      }
    } else if (p.etat === "mt1" && maintenant >= p.finMt1! && ((p.miTemps[0] && p.miTemps[1]) || maintenant >= p.finMiTemps! + grace)) {
      const verrou: PartieEnLigne = { ...p, etat: "calcul2", majLe: maintenant, version: p.version + 1 };
      if (await m.ecrire(verrou, p.version)) {
        const t0 = performance.now();
        const equipes = p.equipes as Paire<ChoixEquipe>;
        const miTemps: Paire<ChoixEquipe> = [p.miTemps[0] ?? equipes[0], p.miTemps[1] ?? equipes[1]];
        const film = calculerFilm(ctx, equipes, p.graine, miTemps);
        await m.deposerFilm(cheminFilm(p, 2), await encoderFilm(film));
        const fin = maintenant + Math.round(performance.now() - t0);
        const debut = fin + EN_LIGNE.margeRepriseS * 1000;
        const pret: PartieEnLigne = { ...verrou, etat: "mt2", majLe: fin, version: verrou.version + 1, miTemps, debutMt2: debut, finMt2: debut + dureeLectureMs(film), score: scoreFinal(film) };
        if (await m.ecrire(pret, verrou.version)) return pret;
      }
    } else if (p.etat === "mt2" && maintenant >= p.finMt2!) {
      suite = { ...p, etat: "fini" };
    } else return p;
    if (suite) {
      const ecrite = { ...suite, majLe: maintenant, version: p.version + 1 };
      if (await m.ecrire(ecrite, p.version)) {
        p = ecrite;
        continue;
      }
    }
    // Quelqu'un est passé avant : on relit et on recommence.
    const relue = await m.lire(p.id);
    if (!relue) return p;
    p = relue;
  }
  return p;
}

/** Change la partie avec `f` (relue et réessayée si une autre demande écrit en même temps). */
async function modifier(m: Magasin, p: PartieEnLigne, maintenant: number, f: (p: PartieEnLigne) => PartieEnLigne | string): Promise<PartieEnLigne | string> {
  for (let essai = 0; essai < 5; essai++) {
    const r = f(p);
    if (typeof r === "string") return r;
    const ecrite = { ...r, majLe: maintenant, version: p.version + 1 };
    if (await m.ecrire(ecrite, p.version)) return ecrite;
    const relue = await m.lire(p.id);
    if (!relue) return "Partie introuvable.";
    p = relue;
  }
  return "Serveur occupé, réessaie.";
}

/** Ménage : supprime les parties sans mouvement depuis menageApresH heures et leurs films. */
async function menage(m: Magasin, maintenant: number): Promise<number> {
  const vieilles = await m.anciennes(maintenant - EN_LIGNE.menageApresH * 3600_000, MENAGE_MAX);
  for (const v of vieilles) await m.supprimer(v);
  return vieilles.length;
}

/** Traite une demande d'un téléphone (ou de la tâche planifiée pour le ménage).
 *  `origine` : empreinte de la connexion (null : inconnue, pas de limite de créations). */
export async function traiter(r: Requete, m: Magasin, ctx: Contexte, maintenant = Date.now(), origine: string | null = null): Promise<Reponse> {
  if (r.action === "menage") return json({ ok: true, supprimees: await menage(m, maintenant) });

  if (r.action === "creer") {
    if (origine && (await m.creationsDepuis(origine, maintenant - 3600_000)) >= EN_LIGNE.creationsParHeure)
      return erreur("Trop de parties créées depuis cette connexion : réessaie dans une heure.", 429);
    for (let essai = 0; essai < 5; essai++) {
      const p: PartieEnLigne = {
        id: hasard(8),
        version: 1,
        etat: "attente",
        creeLe: maintenant,
        majLe: maintenant,
        graine: crypto.getRandomValues(new Uint32Array(1))[0]! % 2 ** 31,
        jetons: [hasard(24, "abcdefghijklmnopqrstuvwxyz0123456789"), null],
        secret: hasard(16),
        debutEquipes: null,
        finEquipes: null,
        equipes: [null, null],
        auto: [false, false],
        debutMt1: null,
        finMt1: null,
        finMiTemps: null,
        miTemps: [null, null],
        debutMt2: null,
        finMt2: null,
        scoreMiTemps: null,
        score: null,
        origine,
      };
      if (await m.creer(p)) return json({ ok: true, jeton: p.jetons[0], partie: vue(p, 0, maintenant) });
    }
    return erreur("Impossible de créer la partie.", 500);
  }

  const id = String(r.id ?? "").toLowerCase();
  const lue = id ? await m.lire(id) : null;
  if (!lue) return erreur("Partie introuvable : le lien est peut-être incomplet.", 404);

  if (r.action === "rejoindre") {
    // Déjà dans la partie (page rouverte) : on garde sa place.
    const deja = r.jeton ? lue.jetons.indexOf(r.jeton) : -1;
    if (deja === 0 || deja === 1) return json({ ok: true, jeton: r.jeton, partie: vue(await avancer(m, ctx, lue, maintenant), deja as Camp, maintenant) });
    if (lue.etat === "attente" && maintenant - lue.creeLe > EN_LIGNE.attenteAmiH * 3600_000) return erreur("Cette partie a expiré : demande un nouveau lien.", 410);
    const jeton = hasard(24, "abcdefghijklmnopqrstuvwxyz0123456789");
    const p = await modifier(m, lue, maintenant, (x) => {
      if (x.jetons[1] !== null) return "Cette partie a déjà deux joueurs.";
      return { ...x, jetons: [x.jetons[0], jeton], etat: "equipes", debutEquipes: maintenant, finEquipes: maintenant + EN_LIGNE.dureeEquipesS * 1000 };
    });
    if (typeof p === "string") return erreur(p, 409);
    return json({ ok: true, jeton, partie: vue(p, 1, maintenant) });
  }

  const camp = r.jeton ? lue.jetons.indexOf(r.jeton) : -1;
  if (camp !== 0 && camp !== 1) return erreur("Tu ne fais pas partie de cette partie.", 403);
  const c = camp as Camp;

  if (r.action === "etat") return json({ ok: true, partie: vue(await avancer(m, ctx, lue, maintenant), c, maintenant) });

  if (r.action === "equipe") {
    const v = verifierChoix(ctx.donnees, r.equipe);
    if (!v.ok) return erreur(v.erreur);
    const p = await modifier(m, lue, maintenant, (x) => {
      if (x.etat !== "equipes" || maintenant > x.finEquipes! + EN_LIGNE.graceS * 1000) return "Trop tard : le temps pour faire l'équipe est fini.";
      if (x.equipes[c]) return "Équipe déjà envoyée.";
      const equipes: Paire<ChoixEquipe | null> = [...x.equipes];
      equipes[c] = v.choix;
      return { ...x, equipes };
    });
    if (typeof p === "string") return erreur(p, 409);
    return json({ ok: true, partie: vue(await avancer(m, ctx, p, maintenant), c, maintenant) });
  }

  if (r.action === "mitemps") {
    if (lue.etat !== "mt1" || !lue.equipes[c]) return erreur("Ce n'est pas la mi-temps.", 409);
    const v = verifierMiTemps(ctx.donnees, lue.equipes[c]!, r.equipe);
    if (!v.ok) return erreur(v.erreur);
    const p = await modifier(m, lue, maintenant, (x) => {
      if (x.etat !== "mt1" || maintenant > x.finMiTemps! + EN_LIGNE.graceS * 1000) return "Trop tard : la 2e mi-temps est lancée.";
      if (x.miTemps[c]) return "Changements déjà envoyés.";
      const miTemps: Paire<ChoixEquipe | null> = [...x.miTemps];
      miTemps[c] = v.choix;
      return { ...x, miTemps };
    });
    if (typeof p === "string") return erreur(p, 409);
    return json({ ok: true, partie: vue(await avancer(m, ctx, p, maintenant), c, maintenant) });
  }

  if (r.action === "film") {
    const n = r.n === 2 ? 2 : 1;
    const v = vue(lue, c, maintenant);
    if (!(n === 1 ? v.films.mt1 : v.films.mt2)) return erreur("Film pas encore prêt.", 409);
    const octets = await m.lireFilm(cheminFilm(lue, n));
    if (!octets) return erreur("Film introuvable.", 404);
    return { type: "octets", corps: octets };
  }

  return erreur("Demande inconnue.");
}

/** Magasin en mémoire (tests et serveur local). */
export class MagasinMemoire implements Magasin {
  readonly parties = new Map<string, PartieEnLigne>();
  readonly films = new Map<string, Uint8Array>();
  async lire(id: string) {
    const p = this.parties.get(id);
    return p ? structuredClone(p) : null;
  }
  async creer(p: PartieEnLigne) {
    if (this.parties.has(p.id)) return false;
    this.parties.set(p.id, structuredClone(p));
    return true;
  }
  async ecrire(p: PartieEnLigne, versionLue: number) {
    const avant = this.parties.get(p.id);
    if (!avant || avant.version !== versionLue) return false;
    this.parties.set(p.id, structuredClone(p));
    return true;
  }
  async deposerFilm(chemin: string, octets: Uint8Array) {
    this.films.set(chemin, octets);
  }
  async lireFilm(chemin: string) {
    return this.films.get(chemin) ?? null;
  }
  async creationsDepuis(origine: string, depuis: number) {
    return [...this.parties.values()].filter((p) => p.origine === origine && p.creeLe > depuis).length;
  }
  async anciennes(avant: number, max: number) {
    return [...this.parties.values()].filter((p) => p.majLe < avant).slice(0, max).map((p) => ({ id: p.id, films: cheminsFilms(p) }));
  }
  async supprimer(p: PartieASupprimer) {
    for (const c of p.films) this.films.delete(c);
    this.parties.delete(p.id);
  }
}

