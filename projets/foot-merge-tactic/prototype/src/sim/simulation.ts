// Simulation du prototype 1 : 22 joueurs qui partent de leurs positions de
// coup d'envoi et se déplacent selon une possession simulée. Pas encore de
// passes, de duels ni de tirs : le « ballon » est un point qui se promène dans
// le camp de l'équipe qui a la possession, pour faire glisser les blocs.
//
// Pas de temps fixe et générateur aléatoire à graine : mêmes équipes + même
// graine = même déroulé. Aucune dépendance à l'affichage.

import type { Donnees } from "./donnees";
import { projeter } from "./projection";
import { Aleatoire } from "./rng";
import type { Cellule, Equipe, Joueur, Phase, Placement, PointM, PointNorm, Poste, Reglages } from "./types";

export type Camp = 0 | 1;
export type ModePossession = "auto" | "nous" | "eux";

export interface JoueurSim {
  camp: Camp;
  joueur: Joueur;
  placement: Placement;
  poste: Poste;
  cellule: Cellule;
  pos: PointM;
  vit: PointM;
  cible: PointM;
}

export class MatchSim {
  temps = 0;
  demarre = false;
  possession: Camp = 0;
  phases: [Phase, Phase] = ["defense", "defense"];
  mode: ModePossession = "auto";
  ballon: PointM;
  readonly joueurs: JoueurSim[];
  /** Plus grand déplacement d'un joueur pendant un pas (contrôle anti-téléportation). */
  maxDeplacementParPas = 0;

  private rng: Aleatoire;
  private basculeA: number | null = null;
  private prochainChangement = Infinity;
  private prochaineCible = 0;
  private cibleBallon: PointM;

  constructor(
    readonly donnees: Donnees,
    readonly reglages: Reglages,
    readonly equipes: [Equipe, Equipe],
    readonly graine: number,
  ) {
    this.rng = new Aleatoire(graine);
    this.ballon = this.centre();
    this.cibleBallon = this.centre();
    this.joueurs = [];
    equipes.forEach((equipe, i) => {
      const camp = i as Camp;
      for (const placement of equipe.composition) {
        const joueur = equipe.joueurs.find((j) => j.id === placement.joueurId);
        if (!joueur) throw new Error(`Joueur inconnu : ${placement.joueurId}`);
        const poste = donnees.poste(placement.poste);
        const cellule = donnees.cellule(placement.poste, placement.cellule);
        const pos = this.versAbsolu(camp, cellule.centre);
        this.joueurs.push({ camp, joueur, placement, poste, cellule, pos, vit: { x: 0, y: 0 }, cible: { ...pos } });
      }
    });
  }

  private centre(): PointM {
    return { x: this.donnees.largeurM / 2, y: this.donnees.longueurM / 2 };
  }

  /** Repère d'une équipe (normalisé) vers le terrain réel (mètres). Le camp 1 est symétrique. */
  versAbsolu(camp: Camp, p: PointNorm): PointM {
    const L = this.donnees.longueurM;
    const W = this.donnees.largeurM;
    return camp === 0 ? { x: p.x * W, y: p.y * L } : { x: (1 - p.x) * W, y: (1 - p.y) * L };
  }

  versRepere(camp: Camp, p: PointM): PointNorm {
    const L = this.donnees.longueurM;
    const W = this.donnees.largeurM;
    return camp === 0 ? { x: p.x / W, y: p.y / L } : { x: 1 - p.x / W, y: 1 - p.y / L };
  }

  /** Lance le jeu : l'équipe 0 a le ballon, les deux blocs basculent après le délai. */
  demarrer(): void {
    if (this.demarre) return;
    this.demarre = true;
    this.possession = 0;
    this.basculeA = this.temps + this.reglages.transition.delaiS;
    this.programmerChangement();
    this.prochaineCible = this.temps;
  }

  definirMode(mode: ModePossession): void {
    this.mode = mode;
  }

  /** Avance la simulation d'environ `secondes` (en pas fixes). */
  avancer(secondes: number): void {
    const n = Math.round(secondes / this.reglages.pasDeTempsS);
    for (let i = 0; i < n; i++) this.pas();
  }

  pas(): void {
    if (!this.demarre) return;
    const dt = this.reglages.pasDeTempsS;
    this.temps += dt;
    this.gererPossession();
    this.deplacerBallon(dt);
    this.calculerCibles();
    this.deplacerJoueurs(dt);
  }

  private programmerChangement(): void {
    const ps = this.reglages.possessionSimulee;
    this.prochainChangement = this.temps + this.rng.entre(ps.dureeMinS, ps.dureeMaxS);
  }

  private gererPossession(): void {
    let voulu: Camp = this.possession;
    if (this.mode === "nous") voulu = 0;
    else if (this.mode === "eux") voulu = 1;
    else if (this.temps >= this.prochainChangement) voulu = this.possession === 0 ? 1 : 0;

    if (voulu !== this.possession) {
      this.possession = voulu;
      this.basculeA = this.temps + this.reglages.transition.delaiS;
      this.programmerChangement();
      this.prochaineCible = this.temps;
    }
    if (this.basculeA !== null && this.temps >= this.basculeA) {
      this.phases = this.possession === 0 ? ["attaque", "defense"] : ["defense", "attaque"];
      this.basculeA = null;
    }
  }

  /** Vrai entre la perte (ou la récupération) du ballon et la bascule des blocs. */
  get enTransition(): boolean {
    return this.basculeA !== null;
  }

  private deplacerBallon(dt: number): void {
    const ps = this.reglages.possessionSimulee;
    if (this.temps >= this.prochaineCible) {
      const candidats = this.joueurs.filter((j) => j.camp === this.possession && j.poste.id !== "G");
      const porteur = candidats[this.rng.entier(candidats.length)];
      if (porteur) {
        const sens = this.possession === 0 ? 1 : -1;
        const avance = this.rng.entre(4, 12) * sens;
        const cote = this.rng.entre(-5, 5);
        this.cibleBallon = {
          x: Math.min(this.donnees.largeurM - 2, Math.max(2, porteur.pos.x + cote)),
          y: Math.min(this.donnees.longueurM - 4, Math.max(4, porteur.pos.y + avance)),
        };
      }
      this.prochaineCible = this.temps + this.rng.entre(ps.ciblePeriodeMinS, ps.ciblePeriodeMaxS);
    }
    const dx = this.cibleBallon.x - this.ballon.x;
    const dy = this.cibleBallon.y - this.ballon.y;
    const d = Math.hypot(dx, dy);
    const v = ps.ballonVitesseMS * dt;
    if (d <= v) this.ballon = { ...this.cibleBallon };
    else this.ballon = { x: this.ballon.x + (dx / d) * v, y: this.ballon.y + (dy / d) * v };
  }

  private calculerCibles(): void {
    for (const j of this.joueurs) {
      const ballonRepere = this.versRepere(j.camp, this.ballon);
      const p = projeter(j.cellule.centre, j.poste, this.phases[j.camp], ballonRepere, this.reglages, this.donnees.longueurM);
      j.cible = this.versAbsolu(j.camp, p);
    }
  }

  private deplacerJoueurs(dt: number): void {
    const m = this.reglages.mouvement;
    const nouvelles: PointM[] = [];
    this.joueurs.forEach((j, i) => {
      // Vitesse souhaitée : vers la cible, en freinant à l'approche.
      const dx = j.cible.x - j.pos.x;
      const dy = j.cible.y - j.pos.y;
      const d = Math.hypot(dx, dy);
      let vx = 0;
      let vy = 0;
      if (d > 1e-6) {
        const vitesse = m.vitesseMaxMS * Math.min(1, d / m.distanceFreinageM);
        vx = (dx / d) * vitesse;
        vy = (dy / d) * vitesse;
      }
      // Séparation : on s'écarte des joueurs trop proches (les deux équipes).
      this.joueurs.forEach((o, k) => {
        if (k === i) return;
        const ex = j.pos.x - o.pos.x;
        const ey = j.pos.y - o.pos.y;
        const e = Math.hypot(ex, ey);
        if (e >= m.distanceMinM) return;
        const force = ((m.distanceMinM - e) / m.distanceMinM) * m.forceSeparation;
        if (e > 1e-6) {
          vx += (ex / e) * force;
          vy += (ey / e) * force;
        } else {
          const angle = (i - k) * 2.399963; // décalage déterministe si deux joueurs sont au même point
          vx += Math.cos(angle) * force;
          vy += Math.sin(angle) * force;
        }
      });
      // Accélération limitée, puis vitesse limitée.
      let ax = vx - j.vit.x;
      let ay = vy - j.vit.y;
      const a = Math.hypot(ax, ay);
      const aMax = m.accelerationMS2 * dt;
      if (a > aMax) {
        ax = (ax / a) * aMax;
        ay = (ay / a) * aMax;
      }
      let nx = j.vit.x + ax;
      let ny = j.vit.y + ay;
      const v = Math.hypot(nx, ny);
      if (v > m.vitesseMaxMS) {
        nx = (nx / v) * m.vitesseMaxMS;
        ny = (ny / v) * m.vitesseMaxMS;
      }
      nouvelles.push({ x: nx, y: ny });
    });
    this.joueurs.forEach((j, i) => {
      const v = nouvelles[i]!;
      j.vit = v;
      const avant = j.pos;
      const x = Math.min(this.donnees.largeurM - 0.5, Math.max(0.5, j.pos.x + v.x * dt));
      const y = Math.min(this.donnees.longueurM - 0.5, Math.max(0.5, j.pos.y + v.y * dt));
      j.pos = { x, y };
      this.maxDeplacementParPas = Math.max(this.maxDeplacementParPas, Math.hypot(x - avant.x, y - avant.y));
    });
  }
}
