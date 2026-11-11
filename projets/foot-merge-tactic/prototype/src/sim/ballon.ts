// Ballon réel (mission 2) : le ballon a une position et une vitesse, il est
// porté par un joueur ou roule seul. Les joueurs le conduisent, le passent, le
// tirent ; l'adversaire l'intercepte ou le tacle. La possession est celle du
// dernier joueur qui l'a touché : plus de possession simulée.
//
// Tout reste déterministe (générateur à graine) et indépendant de l'affichage.

import { Aleatoire } from "./rng";
import type { Camp, JoueurSim, MatchSim } from "./simulation";
import type { PointM } from "./types";

const DEMI_BUT_M = 3.66;

function dist(a: PointM, b: PointM): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance d'un point au segment [a, b]. */
function distSegment(p: PointM, a: PointM, b: PointM): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export interface StatsBallon {
  passes: [number, number];
  passesReussies: [number, number];
  interceptions: [number, number];
  tacles: [number, number];
  tirs: [number, number];
  arrets: [number, number];
  sorties: number;
}

export class BallonReel {
  vit: PointM = { x: 0, y: 0 };
  /** Joueur qui a le ballon aux pieds (null : ballon libre). */
  porteur: JoueurSim | null = null;
  /** Destinataire de la passe en cours. */
  receveur: JoueurSim | null = null;
  tirEnCours = false;
  /** Dernier joueur à avoir touché le ballon. */
  dernier: JoueurSim | null = null;
  /** Remise en jeu : seule cette équipe peut prendre le ballon jusqu'à cet instant. */
  reserve: { camp: Camp; jusqua: number } | null = null;
  readonly stats: StatsBallon = {
    passes: [0, 0],
    passesReussies: [0, 0],
    interceptions: [0, 0],
    tacles: [0, 0],
    tirs: [0, 0],
    arrets: [0, 0],
    sorties: 0,
  };

  private dernierTemps = -Infinity;
  /** Direction de conduite lissée : le ballon ne saute pas d'un côté à l'autre du joueur. */
  private dir: PointM = { x: 0, y: 1 };
  private decisionA = 0;
  private arret: "?" | "oui" | "non" = "?";
  private rng: Aleatoire;

  constructor(private sim: MatchSim, graine: number) {
    this.rng = new Aleatoire((graine ^ 0x9e3779b9) >>> 0);
  }

  /** Coup d'envoi (ou remise au centre) : le ballon est posé, l'équipe va le chercher. */
  remettre(point: PointM, camp: Camp): void {
    const s = this.sim;
    s.ballon = { ...point };
    this.vit = { x: 0, y: 0 };
    this.porteur = null;
    this.receveur = null;
    this.tirEnCours = false;
    this.dernier = null;
    this.reserve = { camp, jusqua: s.temps + s.reglages.ballon.reserveRepriseS };
    s.prendrePossession(camp);
  }

  pas(dt: number): void {
    if (this.porteur) {
      this.conduire();
      this.tacler(dt);
      if (this.porteur && this.sim.temps >= this.decisionA) this.decider();
    } else {
      this.rouler(dt);
      this.reprendre();
    }
  }

  // --- Ballon aux pieds ---------------------------------------------------

  private conduire(): void {
    const p = this.porteur!;
    const sens = p.camp === 0 ? 1 : -1;
    const v = Math.hypot(p.vit.x, p.vit.y);
    const cible = v > 0.5 ? { x: p.vit.x / v, y: p.vit.y / v } : { x: 0, y: sens };
    const lx = this.dir.x * 0.85 + cible.x * 0.15;
    const ly = this.dir.y * 0.85 + cible.y * 0.15;
    const ln = Math.hypot(lx, ly) || 1;
    this.dir = { x: lx / ln, y: ly / ln };
    const dx = this.dir.x;
    const dy = this.dir.y;
    const L = this.sim.donnees.longueurM;
    const W = this.sim.donnees.largeurM;
    this.sim.ballon = {
      x: Math.min(W - 0.2, Math.max(0.2, p.pos.x + dx * 0.7)),
      y: Math.min(L - 0.2, Math.max(0.2, p.pos.y + dy * 0.7)),
    };
    this.vit = { ...p.vit };
  }

  private tacler(dt: number): void {
    const p = this.porteur!;
    const t = this.sim.reglages.ballon.tacle;
    for (const o of this.sim.joueurs) {
      if (o.camp === p.camp || o.poste.id === "G") continue;
      if (dist(o.pos, p.pos) > t.rayonM) continue;
      if (this.rng.suivant() < 1 - Math.exp(-t.parSeconde * dt)) {
        this.stats.tacles[o.camp]++;
        this.donner(o);
        return;
      }
    }
  }

  private decider(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const p = this.porteur!;
    const sens = p.camp === 0 ? 1 : -1;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const but = { x: W / 2, y: sens === 1 ? L : 0 };
    const dBut = dist(p.pos, but);
    const adverses = s.joueurs.filter((j) => j.camp !== p.camp);
    const pression = Math.min(...adverses.map((o) => dist(o.pos, p.pos)));
    this.decisionA = s.temps + this.rng.entre(r.decisionS.min, r.decisionS.max);

    // Tir : près du but et pas trop excentré.
    if (p.poste.id !== "G" && dBut < r.tirDistanceM && Math.abs(p.pos.x - W / 2) < dBut * 0.8) {
      if (this.rng.suivant() < 0.06 + 0.3 * (1 - dBut / r.tirDistanceM)) {
        this.tirer(but);
        return;
      }
    }

    // Passes : on note chaque partenaire (progression, espace, distance, voie libre).
    let meilleur: JoueurSim | null = null;
    let score = -Infinity;
    let fuite: JoueurSim | null = null;
    let avanceMax = -Infinity;
    for (const q of s.joueurs) {
      if (q === p || q.camp !== p.camp) continue;
      if (q.poste.id === "G" && p.poste.id !== "G") continue;
      const d = dist(p.pos, q.pos);
      if (d < r.passeMinM || d > r.passeMaxM) continue;
      const avance = (q.pos.y - p.pos.y) * sens;
      if (avance > avanceMax) {
        avanceMax = avance;
        fuite = q;
      }
      if (adverses.some((o) => distSegment(o.pos, p.pos, q.pos) < r.voieLibreM)) continue;
      const ouvert = Math.min(8, Math.min(...adverses.map((o) => dist(o.pos, q.pos))));
      const sc = avance * 0.5 + ouvert * 1.2 - d * 0.08 + this.rng.entre(-2, 2);
      if (sc > score) {
        score = sc;
        meilleur = q;
      }
    }
    const presse = pression < r.pressionM;
    if (meilleur && (p.poste.id === "G" || presse || score > r.seuilPasse)) {
      this.passer(meilleur);
    } else if (presse && fuite) {
      this.passer(fuite); // dégagement
    }
    // sinon il continue de conduire jusqu'à la prochaine décision
  }

  private lancer(vx: number, vy: number): void {
    this.dernier = this.porteur;
    this.dernierTemps = this.sim.temps;
    this.porteur = null;
    this.vit = { x: vx, y: vy };
    this.arret = "?";
  }

  private passer(q: JoueurSim): void {
    const r = this.sim.reglages.ballon;
    const p = this.porteur!;
    const d = dist(p.pos, q.pos);
    const v = Math.min(r.vitessePasseMaxMS, r.vitessePasseMinMS + r.vitessePasseParMetre * d);
    const t = d / v;
    const cible = { x: q.pos.x + q.vit.x * t * 0.8, y: q.pos.y + q.vit.y * t * 0.8 };
    const dx = cible.x - this.sim.ballon.x;
    const dy = cible.y - this.sim.ballon.y;
    const n = Math.hypot(dx, dy) || 1;
    const erreur = (((r.imprecision.baseDeg + r.imprecision.parMetreDeg * d) * Math.PI) / 180) * this.rng.entre(-1, 1);
    const c = Math.cos(erreur);
    const si = Math.sin(erreur);
    this.stats.passes[p.camp]++;
    this.lancer(((dx * c - dy * si) / n) * v, ((dx * si + dy * c) / n) * v);
    this.receveur = q;
  }

  private tirer(but: PointM): void {
    const r = this.sim.reglages.ballon;
    const p = this.porteur!;
    const cible = { x: but.x + this.rng.entre(-5.2, 5.2), y: but.y };
    const dx = cible.x - this.sim.ballon.x;
    const dy = cible.y - this.sim.ballon.y;
    const n = Math.hypot(dx, dy) || 1;
    this.stats.tirs[p.camp]++;
    this.lancer((dx / n) * r.vitesseTirMS, (dy / n) * r.vitesseTirMS);
    this.tirEnCours = true;
  }

  // --- Ballon libre -------------------------------------------------------

  private rouler(dt: number): void {
    const s = this.sim;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const x = s.ballon.x + this.vit.x * dt;
    const y = s.ballon.y + this.vit.y * dt;
    const f = Math.exp(-s.reglages.ballon.frottementParS * dt);
    this.vit = { x: this.vit.x * f, y: this.vit.y * f };
    if (Math.hypot(this.vit.x, this.vit.y) < 0.2) this.vit = { x: 0, y: 0 };

    if (y <= 0 || y >= L) {
      const marqueur: Camp = y >= L ? 0 : 1;
      if (Math.abs(x - W / 2) <= DEMI_BUT_M) {
        s.score[marqueur]++;
        this.remettre({ x: W / 2, y: L / 2 }, marqueur === 0 ? 1 : 0);
      } else {
        this.stats.sorties++;
        this.remettre({ x: W / 2, y: y >= L ? L - 5.5 : 5.5 }, marqueur === 0 ? 1 : 0); // sortie de but
      }
      return;
    }
    if (x <= 0 || x >= W) {
      this.stats.sorties++;
      const camp: Camp = this.dernier ? (this.dernier.camp === 0 ? 1 : 0) : s.possession;
      this.remettre({ x: x <= 0 ? 0.5 : W - 0.5, y }, camp); // touche
      return;
    }
    s.ballon = { x, y };
  }

  private reprendre(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const vBalle = Math.hypot(this.vit.x, this.vit.y);
    let gagnant: JoueurSim | null = null;
    let meilleurD = Infinity;
    for (const j of s.joueurs) {
      if (this.reserve && s.temps < this.reserve.jusqua && j.camp !== this.reserve.camp) continue;
      if (j === this.dernier && s.temps - this.dernierTemps < r.recontactS) continue;
      const gardienAdverse = j.poste.id === "G" && this.tirEnCours && this.dernier !== null && j.camp !== this.dernier.camp;
      const rayon = j === this.receveur ? r.rayonReceveurM : j.poste.id === "G" ? r.rayonGardienM : r.rayonControleM;
      const d = dist(j.pos, s.ballon);
      if (d > rayon) continue;
      if (vBalle > r.vitesseControleMaxMS && j !== this.receveur && j.poste.id !== "G") continue;
      if (gardienAdverse) {
        if (this.arret === "?") this.arret = this.rng.suivant() < r.arretProba ? "oui" : "non";
        if (this.arret === "non") continue;
      }
      if (d < meilleurD) {
        meilleurD = d;
        gagnant = j;
      }
    }
    if (!gagnant) return;
    if (this.tirEnCours && gagnant.poste.id === "G") this.stats.arrets[gagnant.camp]++;
    if (gagnant === this.receveur) this.stats.passesReussies[gagnant.camp]++;
    else if (this.dernier && gagnant.camp !== this.dernier.camp) this.stats.interceptions[gagnant.camp]++;
    this.donner(gagnant);
  }

  /** Le joueur prend le ballon aux pieds ; son équipe a la possession. */
  private donner(j: JoueurSim): void {
    const r = this.sim.reglages.ballon;
    this.porteur = j;
    this.receveur = null;
    this.tirEnCours = false;
    this.reserve = null;
    this.dernier = j;
    this.dernierTemps = this.sim.temps;
    this.decisionA = this.sim.temps + this.rng.entre(r.premiereDecisionS.min, r.premiereDecisionS.max);
    this.sim.prendrePossession(j.camp);
  }

  // --- Cibles de course ---------------------------------------------------

  /** Où va le ballon si personne ne le touche (pour que les joueurs anticipent). */
  private pointArrivee(tS: number): PointM {
    const k = this.sim.reglages.ballon.frottementParS;
    const g = (1 - Math.exp(-k * tS)) / k;
    const W = this.sim.donnees.largeurM;
    const L = this.sim.donnees.longueurM;
    return {
      x: Math.min(W - 1, Math.max(1, this.sim.ballon.x + this.vit.x * g)),
      y: Math.min(L - 1, Math.max(1, this.sim.ballon.y + this.vit.y * g)),
    };
  }

  /** Ajuste les cibles de course dues au ballon : le porteur avance, le
   *  destinataire va au ballon, les plus proches des deux équipes le disputent. */
  surcharger(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const vMax = s.reglages.mouvement.vitesseMaxMS;

    if (this.porteur) {
      const p = this.porteur;
      const sens = p.camp === 0 ? 1 : -1;
      if (p.poste.id === "G") p.cible = { ...p.pos };
      else
        p.cible = {
          x: p.pos.x + (W / 2 - p.pos.x) * 0.2,
          y: Math.min(L - 3, Math.max(3, p.pos.y + sens * r.dribbleAvanceM)),
        };
      // Pressing : les deux défenseurs les plus proches du porteur vont au ballon.
      const presseurs = s.joueurs
        .filter((j) => j.camp !== p.camp && j.poste.id !== "G" && dist(j.pos, p.pos) < r.pressingM)
        .sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))
        .slice(0, 2);
      presseurs.forEach((j, i) => {
        j.cible = i === 0 ? { ...s.ballon } : { x: s.ballon.x, y: s.ballon.y - sens * 3 };
      });
      return;
    }

    for (const camp of [0, 1] as const) {
      const equipe = s.joueurs.filter((j) => j.camp === camp);
      const proches = equipe
        .filter((j) => j.poste.id !== "G" || dist(j.pos, s.ballon) < 12)
        .map((j) => ({ j, t: dist(j.pos, s.ballon) / vMax }))
        .sort((a, b) => a.t - b.t);
      let nombre = 1;
      if (this.receveur) nombre = camp === this.receveur.camp ? 0 : 2;
      else if (this.reserve && this.reserve.camp !== camp) nombre = 0;
      if (this.receveur && camp === this.receveur.camp) {
        const t = dist(this.receveur.pos, s.ballon) / vMax;
        this.receveur.cible = this.pointArrivee(Math.min(t, 2));
      }
      for (const { j, t } of proches.slice(0, nombre)) j.cible = this.pointArrivee(Math.min(t, 2));
    }
  }
}
