// Simulation du prototype 1 : 22 joueurs qui partent de leurs positions de
// coup d'envoi et se déplacent selon une possession simulée. Pas encore de
// passes, de duels ni de tirs : le « ballon » est un point qui se promène dans
// le camp de l'équipe qui a la possession, pour faire glisser les blocs.
//
// Pas de temps fixe et générateur aléatoire à graine : mêmes équipes + même
// graine = même déroulé. Aucune dépendance à l'affichage.

import type { Donnees } from "./donnees";
import { hauteurLigneDefensiveM, lignesAttaqueM, projeter, type LignesTenues } from "./projection";
import { BallonReel } from "./ballon";
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
  /** Forme que suit ce joueur : chacun bascule à son propre instant. */
  phase: Phase;
  /** Instant où il réagira au dernier changement de possession (null : c'est fait). */
  reagitA: number | null;
  /** Fin de sa course de transition (sprint de repli ou de projection). */
  sprintJusqua: number;
  /** Éliminé par un dribble : très ralenti jusqu'à cet instant. */
  freineJusqua: number;
  /** Joue le ballon (porteur, receveur, presseur, joueur qui va au ballon) : peut approcher un adversaire. */
  auBallon: boolean;
  /** Position de coup d'envoi (sa case du plateau, dans son camp). */
  depart: PointM;
  /** Écart individuel de vitesse et d'accélération, en attendant l'attribut
   *  « vitesse » : deux joueurs ne courent jamais exactement pareil. */
  facteur: number;
  /** Part fixe de son temps de perception du ballon (secondes). */
  perceptionS: number;
}

export class MatchSim {
  temps = 0;
  demarre = false;
  possession: Camp = 0;
  phases: [Phase, Phase] = ["defense", "defense"];
  mode: ModePossession = "auto";
  ballon: PointM;
  /** Buts marqués par camp (ballon réel seulement). */
  score: [number, number] = [0, 0];
  /** Ballon réel ; null : ballon simulé (anciens tests de projection). */
  readonly balle: BallonReel | null;
  readonly joueurs: JoueurSim[];
  /** Hauteur de la ligne défensive que tient chaque équipe quand elle défend
   *  (mètres depuis son but ; null quand elle attaque). Elle suit le ballon à
   *  vitesse limitée : à la perte du ballon, elle part de la hauteur des
   *  défenseurs en attaque et recule progressivement, le temps que le milieu
   *  revienne. L'équipe reste groupée (retour du concepteur, 12/11). */
  lignesDef: [number | null, number | null] = [null, null];
  /** Plus grand déplacement d'un joueur pendant un pas (contrôle anti-téléportation). */
  maxDeplacementParPas = 0;

  private rng: Aleatoire;
  private prochainChangement = Infinity;
  private prochaineCible = 0;
  private cibleBallon: PointM;
  /** Ballon et lignes tenues des derniers instants (un relevé par pas), pour
   *  que chacun voie le jeu avec son propre petit retard. */
  private historique: { ballon: PointM; lignesDef: [number | null, number | null] }[] = [];

  constructor(
    readonly donnees: Donnees,
    readonly reglages: Reglages,
    readonly equipes: [Equipe, Equipe],
    readonly graine: number,
    ballonReel = false,
  ) {
    this.rng = new Aleatoire(graine);
    this.balle = ballonReel ? new BallonReel(this, graine) : null;
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
        const v = reglages.mouvement.variationIndividuelle;
        this.joueurs.push({
          camp,
          joueur,
          placement,
          poste,
          cellule,
          pos,
          vit: { x: 0, y: 0 },
          cible: { ...pos },
          phase: "defense",
          reagitA: null,
          sprintJusqua: 0,
          freineJusqua: 0,
          auBallon: false,
          depart: { ...pos },
          facteur: 1 + this.rng.entre(-v, v),
          perceptionS: this.rng.entre(reglages.mouvement.perception.minS, reglages.mouvement.perception.maxS),
        });
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

  /** Lance le jeu : l'équipe 0 a le ballon, chaque joueur bascule à son tour. */
  demarrer(): void {
    if (this.demarre) return;
    this.demarre = true;
    this.possession = 0;
    this.declencherReactions();
    this.programmerChangement();
    this.prochaineCible = this.temps;
    this.balle?.remettre(this.centre(), 0, "engagement");
  }

  /** Une équipe prend la possession (ballon réel) : chacun réagit à son tour. */
  prendrePossession(camp: Camp): void {
    if (camp === this.possession) return;
    this.possession = camp;
    this.declencherReactions();
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
    if (this.balle) this.balle.pas(dt);
    else this.deplacerBallon(dt);
    this.tenirLignes(dt);
    this.historique.push({ ballon: { ...this.ballon }, lignesDef: [...this.lignesDef] });
    if (this.historique.length > Math.ceil(1 / dt)) this.historique.shift();
    this.calculerCibles();
    this.deplacerJoueurs(dt);
  }

  private programmerChangement(): void {
    const ps = this.reglages.possessionSimulee;
    this.prochainChangement = this.temps + this.rng.entre(ps.dureeMinS, ps.dureeMaxS);
  }

  private gererPossession(): void {
    let voulu: Camp = this.possession;
    if (this.balle) voulu = this.possession;
    else if (this.mode === "nous") voulu = 0;
    else if (this.mode === "eux") voulu = 1;
    else if (this.temps >= this.prochainChangement) voulu = this.possession === 0 ? 1 : 0;

    if (voulu !== this.possession) {
      this.possession = voulu;
      this.declencherReactions();
      this.programmerChangement();
      this.prochaineCible = this.temps;
    }
    // Chaque joueur bascule quand il a réagi, puis part en course de transition.
    const sprint = this.reglages.transition.sprint;
    for (const j of this.joueurs) {
      if (j.reagitA === null || this.temps < j.reagitA) continue;
      j.phase = j.camp === this.possession ? "attaque" : "defense";
      j.reagitA = null;
      j.sprintJusqua = this.temps + sprint.dureeMaxS;
    }
    // La forme de l'équipe change dès que son premier joueur a réagi.
    for (const camp of [0, 1] as const) {
      const voulue: Phase = camp === this.possession ? "attaque" : "defense";
      if (this.joueurs.some((j) => j.camp === camp && j.phase === voulue)) this.phases[camp] = voulue;
    }
  }

  /** Temps de réaction à un changement de possession : pas tous au même
   *  instant. Les plus proches du ballon réagissent d'abord, les plus loin
   *  ensuite, avec un petit écart propre à chacun (référence football §9.3). */
  private declencherReactions(): void {
    const r = this.reglages.transition.reaction;
    for (const j of this.joueurs) {
      const distance = Math.hypot(j.pos.x - this.ballon.x, j.pos.y - this.ballon.y);
      j.reagitA = this.temps + r.minS + r.parMetreS * distance + this.rng.entre(0, r.aleaS);
    }
  }

  /** Vrai entre le changement de possession et la réaction du dernier joueur. */
  get enTransition(): boolean {
    return this.joueurs.some((j) => j.reagitA !== null);
  }

  private deplacerBallon(dt: number): void {
    const ps = this.reglages.possessionSimulee;
    if (this.temps >= this.prochaineCible) {
      // Faux ballon : il circule par passes courtes entre les joueurs proches,
      // comme une vraie possession, au lieu de sauter d'un bout à l'autre.
      // Une possession progresse : on joue plus souvent vers un partenaire
      // placé devant ; près de la surface adverse, on fait circuler en retrait.
      const sens = this.possession === 0 ? 1 : -1;
      const candidats = this.joueurs
        .filter((j) => j.camp === this.possession && j.poste.id !== "G")
        .sort(
          (a, b) =>
            Math.hypot(a.pos.x - this.ballon.x, a.pos.y - this.ballon.y) -
            Math.hypot(b.pos.x - this.ballon.x, b.pos.y - this.ballon.y),
        )
        .slice(0, 4);
      const poids = candidats.map((j) => ((j.pos.y - this.ballon.y) * sens > 0 ? 1.5 : 1));
      let tirage = this.rng.entre(0, poids.reduce((a, b) => a + b, 0));
      const porteur = candidats.find((_, i) => (tirage -= poids[i]!) < 0) ?? candidats[0];
      if (porteur) {
        const profondeur = this.versRepere(this.possession, this.ballon).y * this.donnees.longueurM;
        const avance = (profondeur > 75 ? this.rng.entre(-8, 4) : this.rng.entre(-5, 8)) * sens;
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

  /** Hauteur de la ligne défensive de chaque équipe qui défend : elle va vers
   *  celle que donne le ballon, sans reculer ni monter plus vite que les
   *  vitesses du réglage. Ne dépend que du ballon et du temps, jamais des
   *  positions des joueurs (pas de boucle). */
  private tenirLignes(dt: number): void {
    const l = this.reglages.projection.defense.ligneDefensive;
    const L = this.donnees.longueurM;
    for (const camp of [0, 1] as const) {
      const defend = this.joueurs.filter((j) => j.camp === camp && j.phase === "defense").length;
      if (defend === 0) {
        this.lignesDef[camp] = null;
        continue;
      }
      const ballon = this.versRepere(camp, this.ballon);
      const voulue = hauteurLigneDefensiveM(ballon, this.reglages, L);
      let h = this.lignesDef[camp];
      if (h === null) {
        // Elle vient de perdre le ballon : sa ligne part de la hauteur où
        // jouaient ses défenseurs (forme d'attaque), sinon de sa place.
        const attaquait = defend < this.joueurs.filter((j) => j.camp === camp).length;
        h = attaquait ? lignesAttaqueM(ballon, this.reglages, L).arriereM : voulue;
      }
      this.lignesDef[camp] = voulue < h ? Math.max(voulue, h - l.vitesseReculMS * dt) : Math.min(voulue, h + l.vitesseMonteeMS * dt);
    }
  }

  /** Lignes tenues vues par une équipe : sa ligne défensive, et celle de
   *  l'adversaire dans son repère (pour ne pas être hors-jeu). */
  lignesTenues(camp: Camp, lignesDef: [number | null, number | null] = this.lignesDef): LignesTenues {
    const nous = lignesDef[camp];
    const eux = lignesDef[camp === 0 ? 1 : 0];
    return {
      ligneDefM: nous ?? undefined,
      ligneAdverseM: eux === null ? undefined : this.donnees.longueurM - eux,
    };
  }

  /** Le jeu tel que ce joueur le voit : ballon et lignes avec un petit
   *  retard, le sien, plus long s'il est loin du ballon. Les joueurs ne
   *  bougent donc pas tous au même instant (retour du concepteur, 12/11 :
   *  mouvements « robots », synchronisés à la seconde près). */
  private jeuPercu(j: JoueurSim): { ballon: PointM; lignesDef: [number | null, number | null] } {
    const h = this.historique;
    if (h.length === 0) return { ballon: this.ballon, lignesDef: this.lignesDef };
    const distance = Math.hypot(j.pos.x - this.ballon.x, j.pos.y - this.ballon.y);
    const retardS = j.perceptionS + this.reglages.mouvement.perception.parMetreS * distance;
    const pas = Math.min(h.length - 1, Math.round(retardS / this.reglages.pasDeTempsS));
    const vu = h[h.length - 1 - pas]!;
    // Une ligne qui n'existait pas encore à cet instant (bascule récente) : on prend l'actuelle.
    return {
      ballon: vu.ballon,
      lignesDef: [vu.lignesDef[0] ?? this.lignesDef[0], vu.lignesDef[1] ?? this.lignesDef[1]],
    };
  }

  private calculerCibles(): void {
    // Les cibles ne dépendent que du ballon (tel que chacun le perçoit), du
    // placement et des lignes tenues, jamais des positions du moment : pas de
    // boucle où un joueur bousculé entraîne les autres (la ligne adverse qui
    // s'enfonçait dans sa surface, 11/11).
    for (const j of this.joueurs) {
      const vu = this.jeuPercu(j);
      const ballonRepere = this.versRepere(j.camp, vu.ballon);
      const p = projeter(j.cellule.centre, j.poste, j.phase, ballonRepere, this.reglages, this.donnees.longueurM, this.lignesTenues(j.camp, vu.lignesDef));
      j.cible = this.versAbsolu(j.camp, p);
    }
    for (const camp of [0, 1] as const) this.espacerLignes(camp);
    this.balle?.surcharger();
  }

  /** En défense, deux joueurs d'une même ligne ne se marchent pas dessus :
   *  on garde l'ordre gauche-droite et un écart minimal entre voisins
   *  (6 à 8 m chez les entraîneurs, voir docs/reference-football.md §3). */
  private espacerLignes(camp: Camp): void {
    const ecart = this.reglages.projection.defense.ecartMinDansLigneM;
    const bornes = this.reglages.projection.defense.largeurLigneBornesM;
    const W = this.donnees.largeurM;
    for (const ligne of ["defense", "milieu", "attaque"] as const) {
      const js = this.joueurs
        .filter((j) => j.camp === camp && j.phase === "defense" && j.poste.ligneDefense === ligne)
        .sort((a, b) => a.cible.x - b.cible.x || a.joueur.id.localeCompare(b.joueur.id));
      if (js.length < 2) continue;
      const avant = js.reduce((s, j) => s + j.cible.x, 0) / js.length;
      const xs = js.map((j) => j.cible.x);
      for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i]!, xs[i - 1]! + ecart);
      // Une ligne de 3 joueurs ou plus tient la largeur de la surface : on
      // l'étire ou la resserre autour de son centre, en gardant les écarts relatifs.
      if (ligne !== "attaque" && xs.length >= 3) {
        const largeur = xs[xs.length - 1]! - xs[0]!;
        const voulue = Math.min(bornes.max, Math.max(bornes.min, largeur));
        if (largeur > 1e-6 && voulue !== largeur) {
          const milieu = (xs[0]! + xs[xs.length - 1]!) / 2;
          for (let i = 0; i < xs.length; i++) xs[i] = milieu + (xs[i]! - milieu) * (voulue / largeur);
        }
      }
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
      // Course de transition (sprint) juste après la réaction, sinon course normale.
      const conduit = (this.balle?.porteur === j ? this.reglages.ballon.dribbleFacteur : 1) * (this.temps < j.freineJusqua ? 0.3 : 1);
      const vMax = (this.temps < j.sprintJusqua ? this.reglages.transition.sprint.vitesseMS : m.vitesseMaxMS) * j.facteur * conduit;
      // 1. Course : vers la cible, en freinant à l'approche, accélération limitée.
      const dx = j.cible.x - j.pos.x;
      const dy = j.cible.y - j.pos.y;
      const d = Math.hypot(dx, dy);
      let vx = 0;
      let vy = 0;
      if (d > 1e-6) {
        const vitesse = vMax * Math.min(1, d / m.distanceFreinageM);
        vx = (dx / d) * vitesse;
        vy = (dy / d) * vitesse;
      }
      let ax = vx - j.vit.x;
      let ay = vy - j.vit.y;
      const a = Math.hypot(ax, ay);
      const aMax = m.accelerationMS2 * j.facteur * dt;
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
        const dMin = o.camp === j.camp ? m.distanceMinM : j.auBallon || o.auBallon ? 1 : m.distanceMinAdversaireM;
        if (c >= dMin) return;
        if (c < 1e-6) {
          const angle = (i - k) * 2.399963; // côté déterministe si les trajectoires se rejoignent exactement
          cx = Math.cos(angle);
          cy = Math.sin(angle);
          c = 1;
        }
        const urgence = 1 - (0.5 * t) / HORIZON_EVITEMENT_S; // plus fort si le contact est imminent
        const force = ((dMin - Math.min(c, dMin)) / dMin) * m.forceSeparation * urgence;
        nx += (cx / c) * force;
        ny += (cy / c) * force;
      });

      // 3. Jamais plus vite que sa vitesse maximale.
      const v = Math.hypot(nx, ny);
      if (v > vMax) {
        nx = (nx / v) * vMax;
        ny = (ny / v) * vMax;
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
