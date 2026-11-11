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

/** Durée sur laquelle un joueur anticipe une collision (secondes). */
const HORIZON_EVITEMENT_S = 1;
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
      // Faux ballon : il circule par passes courtes entre les joueurs proches,
      // comme une vraie possession, au lieu de sauter d'un bout à l'autre.
      const candidats = this.joueurs
        .filter((j) => j.camp === this.possession && j.poste.id !== "G")
        .sort(
          (a, b) =>
            Math.hypot(a.pos.x - this.ballon.x, a.pos.y - this.ballon.y) -
            Math.hypot(b.pos.x - this.ballon.x, b.pos.y - this.ballon.y),
        )
        .slice(0, 4);
      const porteur = candidats[this.rng.entier(candidats.length)];
      if (porteur) {
        const sens = this.possession === 0 ? 1 : -1;
        const avance = this.rng.entre(-5, 8) * sens; // parfois une passe en retrait
        const cote = this.rng.entre(-4, 4);
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

  /** Ligne du hors-jeu pour un camp, dans son repère : le plus avancé entre le
   *  ballon et le dernier défenseur adverse (gardien exclu). */
  ligneHorsJeu(camp: Camp): number {
    const ballon = this.versRepere(camp, this.ballon).y;
    let dernier = 0;
    for (const o of this.joueurs) {
      if (o.camp === camp || o.poste.id === "G") continue;
      dernier = Math.max(dernier, this.versRepere(camp, o.pos).y);
    }
    return Math.max(ballon, dernier);
  }

  private calculerCibles(): void {
    const marge = this.reglages.projection.attaque.margeHorsJeuM / this.donnees.longueurM;
    const horsJeu: [number, number] = [this.ligneHorsJeu(0), this.ligneHorsJeu(1)];
    for (const j of this.joueurs) {
      const ballonRepere = this.versRepere(j.camp, this.ballon);
      const p = projeter(
        j.cellule.centre,
        j.poste,
        this.phases[j.camp],
        ballonRepere,
        this.reglages,
        this.donnees.longueurM,
        j.cellule.monteeAttaqueM,
      );
      // En attaque, personne n'attend derrière la défense adverse : on reste
      // au niveau de la ligne du hors-jeu (référence football, §3 et §8).
      if (this.phases[j.camp] === "attaque") p.y = Math.min(p.y, horsJeu[j.camp] - marge);
      j.cible = this.versAbsolu(j.camp, p);
    }
    for (const camp of [0, 1] as const) {
      if (this.phases[camp] === "defense") this.espacerLignes(camp);
    }
  }

  /** En défense, deux joueurs d'une même ligne ne se marchent pas dessus :
   *  on garde l'ordre gauche-droite et un écart minimal entre voisins
   *  (6 à 8 m chez les entraîneurs, voir docs/reference-football.md §3). */
  private espacerLignes(camp: Camp): void {
    const ecart = this.reglages.projection.defense.ecartMinDansLigneM;
    const W = this.donnees.largeurM;
    for (const ligne of ["defense", "milieu", "attaque"] as const) {
      const js = this.joueurs
        .filter((j) => j.camp === camp && j.poste.ligneDefense === ligne)
        .sort((a, b) => a.cible.x - b.cible.x || a.joueur.id.localeCompare(b.joueur.id));
      if (js.length < 2) continue;
      const avant = js.reduce((s, j) => s + j.cible.x, 0) / js.length;
      const xs = js.map((j) => j.cible.x);
      for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i]!, xs[i - 1]! + ecart);
      // Recentrer la ligne là où elle était, sans sortir du terrain.
      const apres = xs.reduce((s, x) => s + x, 0) / xs.length;
      let decalage = avant - apres;
      decalage = Math.max(decalage, 1 - xs[0]!);
      decalage = Math.min(decalage, W - 1 - xs[xs.length - 1]!);
      js.forEach((j, i) => {
        j.cible = { x: xs[i]! + decalage, y: j.cible.y };
      });
    }
  }

  private deplacerJoueurs(dt: number): void {
    const m = this.reglages.mouvement;
    const nouvelles: PointM[] = [];
    this.joueurs.forEach((j, i) => {
      // 1. Course : vers la cible, en freinant à l'approche, accélération limitée.
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

      // 2. Évitement : on anticipe le point où l'on passera le plus près de
      //    chaque autre joueur (dans la seconde qui vient) et on s'écarte tout
      //    de suite si ce sera trop près. Ce pas de côté n'attend pas
      //    l'accélération : un joueur ne traverse jamais un autre.
      this.joueurs.forEach((o, k) => {
        if (k === i) return;
        const px = j.pos.x - o.pos.x;
        const py = j.pos.y - o.pos.y;
        if (px * px + py * py > 100) return; // au-delà de 10 m, rien à craindre
        const rvx = j.vit.x - o.vit.x;
        const rvy = j.vit.y - o.vit.y;
        const rv2 = rvx * rvx + rvy * rvy;
        let t = rv2 > 1e-9 ? -(px * rvx + py * rvy) / rv2 : 0;
        t = Math.min(HORIZON_EVITEMENT_S, Math.max(0, t));
        let cx = px + rvx * t;
        let cy = py + rvy * t;
        let c = Math.hypot(cx, cy);
        if (c >= m.distanceMinM) return;
        if (c < 1e-6) {
          const angle = (i - k) * 2.399963; // côté déterministe si les trajectoires se rejoignent exactement
          cx = Math.cos(angle);
          cy = Math.sin(angle);
          c = 1;
        }
        const urgence = 1 - (0.5 * t) / HORIZON_EVITEMENT_S; // plus fort si le contact est imminent
        const force = ((m.distanceMinM - Math.min(c, m.distanceMinM)) / m.distanceMinM) * m.forceSeparation * urgence;
        nx += (cx / c) * force;
        ny += (cy / c) * force;
      });

      // 3. Jamais plus vite que la vitesse maximale.
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
