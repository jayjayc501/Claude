// Film d'un match (13/11 au soir, préparation du mode en ligne).
//
// L'arbitre de match calcule une mi-temps et en produit le « film » : une
// image par pas de simulation (1/30 s de jeu), plus les événements et le bilan
// de la mi-temps. L'écran du match ne fait que lire ce film. Plus tard, un
// serveur calculera le match et enverra le même film aux téléphones.
//
// FORMAT (version 1) — tout est fait pour passer par le réseau tel quel :
//
//   EnTeteFilm   : envoyé une fois au début de la mi-temps (JSON).
//                  periode 0 = avant le coup d'envoi (une seule image), 1 ou 2 ;
//                  joueurs = les joueurs sur le terrain, dans l'ordre des
//                  positions de chaque image.
//   MorceauFilm  : les images, par morceaux, au fil du calcul. Un morceau
//                  couvre les images `premiere` à `premiere + n − 1` de la
//                  mi-temps. Colonnes de nombres (tableaux typés en mémoire,
//                  tableaux JSON sur le réseau : voir morceauVersJson) :
//     temps          n           temps de jeu simulé (s, depuis le coup d'envoi du match)
//     positions      n × 2J      x, y de chaque joueur (m ; J = nombre de joueurs)
//     ballon         n × 5       x, y (m), hauteur (0 au sol, 1 au sommet), vitesse x, y (m/s)
//     possessionS    n × 2       temps passé avec le ballon par chaque équipe (s)
//     lignes         n × 2       ligne défensive tenue par chaque équipe (m depuis son but ;
//                                NaN, ou null en JSON : l'équipe attaque)
//     etat           n × 12      entiers (voir ETAT) : porteur, dernier à avoir touché
//                                le ballon (indice du joueur, −1 : personne), score de
//                                chaque équipe, équipe qui a le ballon, phase de chaque
//                                équipe (1 attaque, 0 défense), drapeaux (1 : transition
//                                en cours, 2 : jeu arrêté), passes tentées de chaque
//                                équipe, puis passes réussies
//     evenements     liste       { image, texte, a } à chaque changement de l'événement
//                                de jeu affiché (but, faute, touche… ; a = son instant)
//     actions        liste       { image, joueur, style } : action réussie grâce au style
//                                du joueur (version 2, 14/11) ; l'écran fait briller
//                                son pictogramme
//   BilanMiTemps : envoyé à la fin de la mi-temps (JSON) : statistiques
//                  complètes, buteurs, notes et forme des joueurs.
//
// Les nombres sont gardés en double précision : l'écran voit exactement ce que
// voyait l'ancien écran, qui lisait le moteur directement.

import type { StatsBallon } from "../sim/ballon";
import type { Phase } from "../sim/types";

/** Version 2 (14/11) : actions des styles dans les morceaux. */
export const VERSION_FILM = 2;
/** Colonnes de `etat`. */
export const ETAT = { porteur: 0, dernier: 1, score0: 2, score1: 3, possession: 4, phase0: 5, phase1: 6, drapeaux: 7, passes0: 8, passes1: 9, reussies0: 10, reussies1: 11 } as const;
export const COLONNES_ETAT = 12;
export const COLONNES_BALLON = 5;
export const DRAPEAU_TRANSITION = 1;
export const DRAPEAU_ARRET = 2;

/** Un joueur sur le terrain pendant la mi-temps. */
export interface JoueurFilm {
  camp: 0 | 1;
  id: string;
  nom: string;
  /** Poste et case de son placement. */
  poste: string;
  cellule: number;
}

export interface EnTeteFilm {
  version: number;
  /** 0 : avant le coup d'envoi ; 1 ou 2 : mi-temps. */
  periode: 0 | 1 | 2;
  pasDeTempsS: number;
  /** Durée d'une mi-temps (temps de jeu simulé, s). */
  dureeS: number;
  joueurs: JoueurFilm[];
  /** 2e mi-temps : ton équipe a changé à la mi-temps (places ou remplaçants). */
  equipeChangee: boolean;
  /** Tactique de chaque équipe pendant la mi-temps. */
  tactiques: [string, string];
}

export interface MorceauFilm {
  premiere: number;
  n: number;
  temps: Float64Array;
  positions: Float64Array;
  ballon: Float64Array;
  possessionS: Float64Array;
  lignes: Float64Array;
  etat: Int32Array;
  evenements: EvenementFilm[];
  actions: ActionFilm[];
}

/** Action réussie grâce au style d'un joueur (tacle, interception, dribble, contre…). */
export interface ActionFilm {
  image: number;
  /** Indice du joueur dans l'en-tête. */
  joueur: number;
  style: string;
}

export interface EvenementFilm {
  image: number;
  /** null : plus d'événement affiché. */
  texte: string | null;
  a: number;
}

export interface BilanMiTemps {
  stats: StatsBallon;
  buts: { camp: 0 | 1; joueur: string | null; contreSonCamp: boolean; minute: number }[];
  /** Notes de tous ceux qui ont joué, de la meilleure à la moins bonne. */
  notes: { camp: 0 | 1; id: string; nom: string; poste: string; note: number }[];
  /** Forme (sur 100) et note de chaque joueur sur le terrain à la fin de la mi-temps. */
  joueurs: { camp: 0 | 1; id: string; forme: number; note: number }[];
}

/** Film d'une mi-temps, rempli au fil du calcul (ou de la réception). */
export class Film {
  /** Nombre d'images reçues (de 0 à images − 1). */
  images = 0;
  /** Fin de la mi-temps : dernière image, et bilan. */
  bilan: BilanMiTemps | null = null;
  readonly evenements: EvenementFilm[] = [];
  readonly actions: ActionFilm[] = [];
  private capacite: number;
  temps: Float64Array;
  positions: Float64Array;
  ballon: Float64Array;
  possessionS: Float64Array;
  lignes: Float64Array;
  etat: Int32Array;
  private abonnes: (() => void)[] = [];

  constructor(readonly entete: EnTeteFilm) {
    this.capacite = entete.periode === 0 ? 1 : Math.ceil(entete.dureeS / entete.pasDeTempsS) + 2;
    const c = this.capacite;
    const nj = entete.joueurs.length;
    this.temps = new Float64Array(c);
    this.positions = new Float64Array(c * 2 * nj);
    this.ballon = new Float64Array(c * COLONNES_BALLON);
    this.possessionS = new Float64Array(c * 2);
    this.lignes = new Float64Array(c * 2);
    this.etat = new Int32Array(c * COLONNES_ETAT);
  }

  get complet(): boolean {
    return this.bilan !== null;
  }

  /** Ajoute un morceau (il doit suivre le précédent). */
  ajouter(m: MorceauFilm): void {
    if (m.premiere !== this.images) throw new Error(`Morceau ${m.premiere} reçu, ${this.images} attendu`);
    const fin = this.images + m.n;
    if (fin > this.capacite) this.agrandir(Math.max(fin, this.capacite * 2));
    const nj = this.entete.joueurs.length;
    const i = this.images;
    this.temps.set(m.temps.subarray(0, m.n), i);
    this.positions.set(m.positions.subarray(0, m.n * 2 * nj), i * 2 * nj);
    this.ballon.set(m.ballon.subarray(0, m.n * COLONNES_BALLON), i * COLONNES_BALLON);
    this.possessionS.set(m.possessionS.subarray(0, m.n * 2), i * 2);
    this.lignes.set(m.lignes.subarray(0, m.n * 2), i * 2);
    this.etat.set(m.etat.subarray(0, m.n * COLONNES_ETAT), i * COLONNES_ETAT);
    this.evenements.push(...m.evenements);
    this.actions.push(...m.actions);
    this.images = fin;
    this.prevenir();
  }

  /** Images `premiere` à `premiere + n − 1`, en morceau (pour les envoyer, par exemple). */
  morceau(premiere: number, n: number): MorceauFilm {
    const nj = this.entete.joueurs.length;
    n = Math.max(0, Math.min(n, this.images - premiere));
    return {
      premiere,
      n,
      temps: this.temps.slice(premiere, premiere + n),
      positions: this.positions.slice(premiere * 2 * nj, (premiere + n) * 2 * nj),
      ballon: this.ballon.slice(premiere * COLONNES_BALLON, (premiere + n) * COLONNES_BALLON),
      possessionS: this.possessionS.slice(premiere * 2, (premiere + n) * 2),
      lignes: this.lignes.slice(premiere * 2, (premiere + n) * 2),
      etat: this.etat.slice(premiere * COLONNES_ETAT, (premiere + n) * COLONNES_ETAT),
      evenements: this.evenements.filter((e) => e.image >= premiere && e.image < premiere + n).map((e) => ({ ...e })),
      actions: this.actions.filter((e) => e.image >= premiere && e.image < premiere + n).map((e) => ({ ...e })),
    };
  }

  /** Fin de la mi-temps. */
  terminer(bilan: BilanMiTemps): void {
    this.bilan = bilan;
    this.prevenir();
  }

  /** Appelé à chaque morceau reçu et à la fin. */
  suivre(f: () => void): void {
    this.abonnes.push(f);
  }

  private prevenir(): void {
    for (const f of this.abonnes) f();
  }

  private agrandir(c: number): void {
    const nj = this.entete.joueurs.length;
    const plus = <T extends Float64Array | Int32Array>(a: T, k: number): T => {
      const b = new (a.constructor as new (n: number) => T)(c * k);
      b.set(a);
      return b;
    };
    this.temps = plus(this.temps, 1);
    this.positions = plus(this.positions, 2 * nj);
    this.ballon = plus(this.ballon, COLONNES_BALLON);
    this.possessionS = plus(this.possessionS, 2);
    this.lignes = plus(this.lignes, 2);
    this.etat = plus(this.etat, COLONNES_ETAT);
    this.capacite = c;
  }
}

// ---- Réseau : un morceau en JSON, et retour -------------------------------------

export interface MorceauJson {
  premiere: number;
  n: number;
  temps: number[];
  positions: number[];
  ballon: number[];
  possessionS: number[];
  lignes: (number | null)[];
  etat: number[];
  evenements: EvenementFilm[];
  actions: ActionFilm[];
}

export function morceauVersJson(m: MorceauFilm): MorceauJson {
  const nj = m.n ? m.positions.length / m.n / 2 : 0;
  return {
    premiere: m.premiere,
    n: m.n,
    temps: Array.from(m.temps.subarray(0, m.n)),
    positions: Array.from(m.positions.subarray(0, m.n * 2 * nj)),
    ballon: Array.from(m.ballon.subarray(0, m.n * COLONNES_BALLON)),
    possessionS: Array.from(m.possessionS.subarray(0, m.n * 2)),
    lignes: Array.from(m.lignes.subarray(0, m.n * 2), (x) => (Number.isNaN(x) ? null : x)),
    etat: Array.from(m.etat.subarray(0, m.n * COLONNES_ETAT)),
    evenements: m.evenements.map((e) => ({ ...e })),
    actions: m.actions.map((e) => ({ ...e })),
  };
}

export function morceauDepuisJson(j: MorceauJson): MorceauFilm {
  return {
    premiere: j.premiere,
    n: j.n,
    temps: Float64Array.from(j.temps),
    positions: Float64Array.from(j.positions),
    ballon: Float64Array.from(j.ballon),
    possessionS: Float64Array.from(j.possessionS),
    lignes: Float64Array.from(j.lignes, (x) => (x === null ? Number.NaN : x)),
    etat: Int32Array.from(j.etat),
    evenements: j.evenements.map((e) => ({ ...e })),
    actions: (j.actions ?? []).map((e) => ({ ...e })),
  };
}

// ---- Lecture : ce que l'écran voit à une image donnée ---------------------------

/** Un joueur tel que l'écran le voit (même forme que celle qu'il lisait dans le moteur). */
export interface JoueurVu {
  camp: 0 | 1;
  joueur: { id: string; nom: string };
  poste: { id: string };
  placement: { poste: string; cellule: number };
  pos: { x: number; y: number };
}

/** L'état du match à une image. */
export interface VueMatch {
  demarre: boolean;
  temps: number;
  joueurs: JoueurVu[];
  ballon: { x: number; y: number };
  score: [number, number];
  tempsPossession: [number, number];
  possession: 0 | 1;
  enTransition: boolean;
  phases: [Phase, Phase];
  lignesDef: [number | null, number | null];
  balle: {
    porteur: JoueurVu | null;
    dernier: JoueurVu | null;
    evenement: { texte: string; a: number } | null;
    hauteur: number;
    vit: { x: number; y: number };
    arretDeJeu: boolean;
    passes: [number, number];
    passesReussies: [number, number];
  };
}

/** Lit un film image par image dans une vue réutilisée. Un même joueur garde
 *  le même objet d'une mi-temps à l'autre (l'écran s'en sert pour suivre le porteur). */
export class LecteurFilm {
  readonly vue: VueMatch = {
    demarre: false,
    temps: 0,
    joueurs: [],
    ballon: { x: 0, y: 0 },
    score: [0, 0],
    tempsPossession: [0, 0],
    possession: 0,
    enTransition: false,
    phases: ["defense", "defense"],
    lignesDef: [null, null],
    balle: { porteur: null, dernier: null, evenement: null, hauteur: 0, vit: { x: 0, y: 0 }, arretDeJeu: false, passes: [0, 0], passesReussies: [0, 0] },
  };
  film: Film | null = null;
  /** Image affichée. */
  image = 0;
  private connus = new Map<string, JoueurVu>();
  private evenementsVus: { texte: string; a: number } | null = null;
  private evenementIndex = -1;
  /** Actions de style passées depuis la dernière lecture (l'écran les fait briller). */
  private actionsLues = 0;
  private actionsEnAttente: { joueur: JoueurVu; style: string }[] = [];

  /** Actions de style vues depuis le dernier appel (14/11). */
  prendreActions(): { joueur: JoueurVu; style: string }[] {
    const a = this.actionsEnAttente;
    this.actionsEnAttente = [];
    return a;
  }

  /** Nouveau match : on oublie les joueurs du précédent. */
  nouveauMatch(): void {
    this.connus = new Map();
  }

  /** Change de film (avant le coup d'envoi, 1re ou 2e mi-temps) et montre sa première image. */
  charger(film: Film): void {
    this.film = film;
    this.vue.demarre = film.entete.periode > 0;
    this.vue.joueurs = film.entete.joueurs.map((j) => {
      const cle = `${j.camp}:${j.id}`;
      let v = this.connus.get(cle);
      if (!v) {
        v = { camp: j.camp, joueur: { id: j.id, nom: j.nom }, poste: { id: j.poste }, placement: { poste: j.poste, cellule: j.cellule }, pos: { x: 0, y: 0 } };
        this.connus.set(cle, v);
      }
      v.poste = { id: j.poste };
      v.placement = { poste: j.poste, cellule: j.cellule };
      return v;
    });
    this.evenementIndex = -1;
    this.evenementsVus = null;
    this.actionsLues = 0;
    this.actionsEnAttente = [];
    this.image = 0;
    this.lire(0);
  }

  /** Images disponibles après l'image affichée ? */
  disponible(k: number): boolean {
    return !!this.film && k < this.film.images;
  }

  /** Dernière image de la mi-temps (connue quand le film est complet). */
  get derniere(): number | null {
    return this.film?.complet ? this.film.images - 1 : null;
  }

  /** Montre l'image k. */
  lire(k: number): void {
    const f = this.film;
    if (!f || k >= f.images) return;
    // Actions de style entre l'image affichée et celle-ci (en arrière : aucune).
    if (k < this.image) this.actionsLues = f.actions.filter((a) => a.image <= k).length;
    while (this.actionsLues < f.actions.length && f.actions[this.actionsLues]!.image <= k) {
      const a = f.actions[this.actionsLues++]!;
      const j = this.vue.joueurs[a.joueur];
      if (j) this.actionsEnAttente.push({ joueur: j, style: a.style });
    }
    this.image = k;
    const v = this.vue;
    const nj = v.joueurs.length;
    v.temps = f.temps[k]!;
    for (let i = 0; i < nj; i++) {
      const p = v.joueurs[i]!.pos;
      p.x = f.positions[(k * nj + i) * 2]!;
      p.y = f.positions[(k * nj + i) * 2 + 1]!;
    }
    const b = k * COLONNES_BALLON;
    v.ballon.x = f.ballon[b]!;
    v.ballon.y = f.ballon[b + 1]!;
    v.balle.hauteur = f.ballon[b + 2]!;
    v.balle.vit.x = f.ballon[b + 3]!;
    v.balle.vit.y = f.ballon[b + 4]!;
    v.tempsPossession[0] = f.possessionS[k * 2]!;
    v.tempsPossession[1] = f.possessionS[k * 2 + 1]!;
    const l0 = f.lignes[k * 2]!;
    const l1 = f.lignes[k * 2 + 1]!;
    v.lignesDef[0] = Number.isNaN(l0) ? null : l0;
    v.lignesDef[1] = Number.isNaN(l1) ? null : l1;
    const e = k * COLONNES_ETAT;
    const et = f.etat;
    v.balle.porteur = et[e + ETAT.porteur]! >= 0 ? v.joueurs[et[e + ETAT.porteur]!]! : null;
    v.balle.dernier = et[e + ETAT.dernier]! >= 0 ? v.joueurs[et[e + ETAT.dernier]!]! : null;
    v.score[0] = et[e + ETAT.score0]!;
    v.score[1] = et[e + ETAT.score1]!;
    v.possession = et[e + ETAT.possession] as 0 | 1;
    v.phases[0] = et[e + ETAT.phase0] ? "attaque" : "defense";
    v.phases[1] = et[e + ETAT.phase1] ? "attaque" : "defense";
    v.enTransition = (et[e + ETAT.drapeaux]! & DRAPEAU_TRANSITION) !== 0;
    v.balle.arretDeJeu = (et[e + ETAT.drapeaux]! & DRAPEAU_ARRET) !== 0;
    v.balle.passes[0] = et[e + ETAT.passes0]!;
    v.balle.passes[1] = et[e + ETAT.passes1]!;
    v.balle.passesReussies[0] = et[e + ETAT.reussies0]!;
    v.balle.passesReussies[1] = et[e + ETAT.reussies1]!;
    // Événement affiché : le dernier changement à cette image ou avant.
    const evs = f.evenements;
    let i = this.evenementIndex;
    if (i >= 0 && evs[i]!.image > k) i = -1;
    while (i + 1 < evs.length && evs[i + 1]!.image <= k) i++;
    if (i !== this.evenementIndex) {
      this.evenementIndex = i;
      const ev = i >= 0 ? evs[i]! : null;
      this.evenementsVus = ev && ev.texte !== null ? { texte: ev.texte, a: ev.a } : null;
    }
    v.balle.evenement = this.evenementsVus;
  }
}
