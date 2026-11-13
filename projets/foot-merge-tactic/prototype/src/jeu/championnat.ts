// Championnat (13/11, demande du concepteur : « simuler tout un championnat de
// 4 équipes, avec notre tour de mercato ») : chaque équipe rencontre les
// autres une fois (3 journées pour 4 équipes, ou 6 en aller-retour) ; 3 points
// pour une victoire, 1 pour un nul. Le match du joueur est regardé ; les autres
// sont simulés sans affichage. Indépendant de l'affichage : testable.

import type { Donnees } from "../sim/donnees";
import { MatchSim } from "../sim/simulation";
import type { Equipe, Reglages } from "../sim/types";

export interface Rencontre {
  a: number;
  b: number;
  score?: [number, number];
}

export interface Ligne {
  camp: number;
  nom: string;
  joues: number;
  gagnes: number;
  nuls: number;
  perdus: number;
  pour: number;
  contre: number;
  points: number;
}

/** Calendrier « toutes rondes » (méthode du cercle) : le camp 0 joue à chaque journée. */
export function calendrier(n: number, allerRetour = false): Rencontre[][] {
  const camps = Array.from({ length: n }, (_, i) => i);
  const journees: Rencontre[][] = [];
  const tournant = camps.slice(1);
  for (let j = 0; j < n - 1; j++) {
    const ordre = [0, ...tournant];
    const jour: Rencontre[] = [];
    for (let k = 0; k < n / 2; k++) jour.push({ a: ordre[k]!, b: ordre[n - 1 - k]! });
    journees.push(jour);
    tournant.unshift(tournant.pop()!);
  }
  if (allerRetour) journees.push(...journees.map((jour) => jour.map((r) => ({ a: r.b, b: r.a }))));
  return journees;
}

export class Championnat {
  readonly journees: Rencontre[][];
  journee = 0;

  constructor(
    readonly noms: string[],
    allerRetour = false,
  ) {
    this.journees = calendrier(noms.length, allerRetour);
  }

  get fini(): boolean {
    return this.journee >= this.journees.length;
  }

  /** Rencontres de la journée en cours. */
  get rencontres(): Rencontre[] {
    return this.journees[this.journee] ?? [];
  }

  /** Adversaire d'un camp à la journée en cours. */
  adversaire(camp = 0): number | null {
    const r = this.rencontres.find((x) => x.a === camp || x.b === camp);
    return r ? (r.a === camp ? r.b : r.a) : null;
  }

  /** Enregistre le score d'une rencontre de la journée (score du point de vue de `a` puis `b`). */
  enregistrer(a: number, b: number, score: [number, number]): void {
    const r = this.rencontres.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!r) throw new Error(`Pas de rencontre ${a}–${b} à cette journée`);
    r.score = r.a === a ? score : [score[1], score[0]];
  }

  /** Passe à la journée suivante (toutes les rencontres doivent avoir un score). */
  suivante(): void {
    if (this.rencontres.some((r) => !r.score)) throw new Error("Journée pas finie");
    this.journee++;
  }

  classement(): Ligne[] {
    const lignes: Ligne[] = this.noms.map((nom, camp) => ({ camp, nom, joues: 0, gagnes: 0, nuls: 0, perdus: 0, pour: 0, contre: 0, points: 0 }));
    for (const jour of this.journees)
      for (const r of jour) {
        if (!r.score) continue;
        const [sa, sb] = r.score;
        for (const [camp, p, c] of [
          [r.a, sa, sb],
          [r.b, sb, sa],
        ] as const) {
          const l = lignes[camp]!;
          l.joues++;
          l.pour += p;
          l.contre += c;
          if (p > c) {
            l.gagnes++;
            l.points += 3;
          } else if (p === c) {
            l.nuls++;
            l.points += 1;
          } else l.perdus++;
        }
      }
    return lignes.sort((x, y) => y.points - x.points || y.pour - y.contre - (x.pour - x.contre) || y.pour - x.pour || x.camp - y.camp);
  }
}

/** Joue un match complet sans affichage (deux mi-temps de 180 s simulées) et renvoie le score. */
export function jouerMatch(donnees: Donnees, reglages: Reglages, equipes: [Equipe, Equipe], graine: number, miTempsS = 180): [number, number] {
  const sim = new MatchSim(donnees, reglages, equipes, graine, true);
  sim.demarrer();
  sim.avancer(miTempsS);
  sim.commencerPeriode();
  sim.balle?.coupDEnvoi(1, "2e mi-temps");
  sim.avancer(miTempsS);
  return [sim.score[0], sim.score[1]];
}
