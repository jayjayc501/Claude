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
  contres: number;
  fautes: [number, number];
  penalties: [number, number];
  corners: [number, number];
  horsJeu: [number, number];
  dribbles: [number, number];
  dribblesReussis: [number, number];
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
  /** Dernière perte de balle en jeu (pas sur une remise en jeu) : contre-pressing. */
  perte: { camp: Camp; a: number } | null = null;
  readonly stats: StatsBallon = {
    passes: [0, 0],
    passesReussies: [0, 0],
    interceptions: [0, 0],
    tacles: [0, 0],
    tirs: [0, 0],
    contres: 0,
    fautes: [0, 0],
    penalties: [0, 0],
    corners: [0, 0],
    horsJeu: [0, 0],
    dribbles: [0, 0],
    dribblesReussis: [0, 0],
    arrets: [0, 0],
    sorties: 0,
  };

  private dernierTemps = -Infinity;
  /** Direction de conduite lissée : le ballon ne saute pas d'un côté à l'autre du joueur. */
  private dir: PointM = { x: 0, y: 1 };
  private decisionA = 0;
  private protegeJusqua = 0;
  /** Coup de pied arrêté en attente : le premier joueur de l'équipe qui prend le ballon le joue. */
  private arrete: "corner" | "penalty" | null = null;
  /** Le receveur de la passe en cours était hors-jeu au départ de la passe. */
  private horsJeu = false;
  private tirPenalty = false;
  /** Dernier événement de jeu, pour l'affichage (« Corner », « Hors-jeu »…). */
  evenement: { texte: string; a: number } | null = null;
  /** Après un but : chacun regagne son camp avant l'engagement. */
  engagement: { camp: Camp; depuis: number } | null = null;
  /** Joueur désigné pour la remise en jeu (le gardien sur un six mètres). */
  private tireur: JoueurSim | null = null;
  private arret: "?" | "oui" | "non" = "?";
  private rng: Aleatoire;

  constructor(private sim: MatchSim, graine: number) {
    this.rng = new Aleatoire((graine ^ 0x9e3779b9) >>> 0);
  }

  /** Coup d'envoi (ou remise au centre) : le ballon est posé, l'équipe va le chercher. */
  remettre(point: PointM, camp: Camp, arrete: "corner" | "penalty" | null = null, texte?: string, tireur: JoueurSim | null = null): void {
    const s = this.sim;
    this.tireur = tireur;
    this.arrete = arrete;
    this.horsJeu = false;
    this.tirPenalty = false;
    if (texte) this.evenement = { texte, a: s.temps };
    s.ballon = { ...point };
    this.vit = { x: 0, y: 0 };
    this.porteur = null;
    this.receveur = null;
    this.tirEnCours = false;
    this.dernier = null;
    this.perte = null;
    this.reserve = { camp, jusqua: s.temps + s.reglages.ballon.reserveRepriseS };
    s.prendrePossession(camp);
  }

  /** But : ballon au centre, les deux équipes regagnent leur camp ; l'engagement
   *  a lieu quand tout le monde y est (10 s au plus). */
  private preparerEngagement(camp: Camp, texte: string): void {
    const s = this.sim;
    this.remettre({ x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 }, camp, null, texte);
    this.reserve = null;
    this.engagement = { camp, depuis: s.temps };
  }

  pas(dt: number): void {
    if (this.engagement) {
      const s = this.sim;
      const L = s.donnees.longueurM;
      const enPlace = s.joueurs.every((j) => (j.camp === 0 ? j.pos.y <= L / 2 + 0.5 : j.pos.y >= L / 2 - 0.5) && dist(j.pos, j.depart) < 3);
      if ((enPlace && s.temps - this.engagement.depuis > 2) || s.temps - this.engagement.depuis > 10) {
        const camp = this.engagement.camp;
        this.engagement = null;
        this.remettre({ ...s.ballon }, camp, null, "Engagement");
      }
      return;
    }
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
      const f = this.sim.temps < this.protegeJusqua ? this.sim.reglages.ballon.protection.facteurTacle : 1;
      if (this.rng.suivant() < 1 - Math.exp(-t.parSeconde * f * dt)) {
        this.duelGagne(o);
        return;
      }
    }
  }

  /** Un défenseur gagne un duel sur le porteur : tacle propre, ou faute
   *  (coup franc, penalty si c'est dans sa surface). */
  private duelGagne(o: JoueurSim): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const p = this.porteur!;
    if (this.rng.suivant() >= r.fautes.proba) {
      this.stats.tacles[o.camp]++;
      this.donner(o);
      return;
    }
    this.stats.fautes[o.camp]++;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const deSonBut = o.camp === 0 ? p.pos.y : L - p.pos.y; // distance au but du fautif
    if (deSonBut <= r.surface.profondeurM && Math.abs(p.pos.x - W / 2) <= r.surface.demiLargeurM) {
      this.stats.penalties[p.camp]++;
      this.remettre({ x: W / 2, y: o.camp === 0 ? 11 : L - 11 }, p.camp, "penalty", "Penalty");
      return;
    }
    this.remettre({ x: Math.min(W - 1, Math.max(1, p.pos.x)), y: p.pos.y }, p.camp, null, "Faute");
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

    if (this.arrete === "penalty") {
      this.arrete = null;
      this.tirer({ x: but.x, y: but.y }, 3);
      this.tirPenalty = true;
      return;
    }
    if (this.arrete === "corner") {
      // Centre dans la surface, dosé pour arriver en un peu plus d'une seconde.
      this.arrete = null;
      const point = { x: W / 2 + this.rng.entre(-8, 8), y: but.y - sens * this.rng.entre(6, 12) };
      const k = r.frottementParS;
      const v = Math.min(r.vitessePasseMaxMS, (k * dist(p.pos, point)) / (1 - Math.exp(-k * 1.2)));
      const n = dist(p.pos, point) || 1;
      this.stats.passes[p.camp]++;
      this.lancer(((point.x - p.pos.x) / n) * v, ((point.y - p.pos.y) / n) * v);
      return;
    }

    // Tir : dans la surface, on tire toujours (jamais de passe en retrait) ;
    // plus loin mais à portée et pas trop excentré, on tire parfois.
    if (p.poste.id !== "G") {
      const dansSurface = Math.abs(sens === 1 ? L - p.pos.y : p.pos.y) <= r.surface.profondeurM && Math.abs(p.pos.x - W / 2) <= r.surface.demiLargeurM;
      if (dansSurface) {
        this.tirer(but);
        return;
      }
      if (dBut < r.tirDistanceM && Math.abs(p.pos.x - W / 2) < dBut * 0.8 && this.rng.suivant() < 0.06 + 0.3 * (1 - dBut / r.tirDistanceM)) {
        this.tirer(but);
        return;
      }
    }

    // Champ libre devant lui (aucun joueur de champ adverse dans un cône vers
    // le but) et pas pressé : il fonce vers le but et tire à portée, sans
    // passe en retrait.
    const libreDevant = !adverses.some((o) => {
      if (o.poste.id === "G") return false;
      const avant = (o.pos.y - p.pos.y) * sens;
      return avant > -1 && avant < 18 && Math.abs(o.pos.x - p.pos.x) < 3 + avant * 0.6;
    });
    if (p.poste.id !== "G" && libreDevant && pression >= r.pressionM && p.poste.ligneDefense !== "defense") {
      if (dBut < r.seulTirM) this.tirer(but);
      return;
    }

    // Dribble : face à un adversaire tout proche, un joueur offensif tente
    // parfois de l'éliminer plutôt que de passer.
    const db = r.dribble;
    const devant = adverses.find((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < db.distanceM && (o.pos.y - p.pos.y) * sens > -0.5);
    const tente = p.poste.ligneDefense === "defense" ? db.probaTentative * 0.25 : p.poste.ligneDefense === "gardien" ? 0 : db.probaTentative;
    if (devant && this.rng.suivant() < tente) {
      this.dribbler(devant, sens);
      return;
    }

    // Passes : on note chaque partenaire (progression, espace, distance, voie
    // libre), au pied ou dans l'espace devant lui, dans le sens du jeu.
    let meilleur: { q: JoueurSim; point: PointM | null } | null = null;
    let score = -Infinity;
    let fuite: JoueurSim | null = null;
    let avanceMax = -Infinity;
    const libre = (a: PointM, b: PointM) => !adverses.some((o) => distSegment(o.pos, a, b) < r.voieLibreM);
    for (const q of s.joueurs) {
      if (q === p || q.camp !== p.camp) continue;
      if (q.poste.id === "G" && p.poste.id !== "G") continue;
      if (this.estHorsJeu(q) && this.rng.suivant() > r.horsJeuVuProba) continue; // le passeur voit presque toujours le hors-jeu
      const d = dist(p.pos, q.pos);
      if (d < r.passeMinM || d > r.passeMaxM) continue;
      const avance = (q.pos.y - p.pos.y) * sens;
      if (avance > avanceMax) {
        avanceMax = avance;
        fuite = q;
      }
      const options: { point: PointM | null; vise: PointM }[] = [{ point: null, vise: q.pos }];
      const esp = { x: q.pos.x, y: q.pos.y + sens * r.passeEspace.avanceM };
      if (avance > 0 && q.vit.y * sens > r.passeEspace.courseMinMS && esp.y > 2 && esp.y < L - 2) {
        // L'espace est à lui s'il y arrive nettement avant tout adversaire.
        const vCourse = s.reglages.mouvement.vitesseMaxMS;
        const tLui = dist(q.pos, esp) / (vCourse * q.facteur);
        const tEux = Math.min(...adverses.map((o) => dist(o.pos, esp) / (vCourse * o.facteur)));
        if (tLui + r.passeEspace.avanceSurAdversaireS < tEux) options.push({ point: esp, vise: esp });
      }
      for (const o of options) {
        if (!libre(p.pos, o.vise)) continue;
        const ouvert = Math.min(8, Math.min(...adverses.map((a) => dist(a.pos, o.vise))));
        const gain = (o.vise.y - p.pos.y) * sens;
        const sc = gain * 0.5 + ouvert * 1.2 - dist(p.pos, o.vise) * 0.08 + this.rng.entre(-2, 2);
        if (sc > score) {
          score = sc;
          meilleur = { q, point: o.point };
        }
      }
    }
    const presse = pression < r.pressionM;
    if (meilleur && (p.poste.id === "G" || presse || score > r.seuilPasse)) {
      this.passer(meilleur.q, presse, meilleur.point);
      return;
    }
    if (!presse) return; // rien d'ouvert : il continue de conduire

    // Pressé sans solution sûre : dégagement dans son tiers, sinon il protège.
    const deSonBut = sens === 1 ? p.pos.y : L - p.pos.y;
    if (fuite && deSonBut < r.zoneDegagementM) {
      this.passer(fuite, presse); // dégagement
      return;
    }
    this.protegeJusqua = s.temps + r.protection.dureeS;
  }

  /** 1 contre 1 : réussi, l'adversaire est éliminé et le porteur accélère ;
   *  raté, l'adversaire prend le ballon ou le ballon part libre. */
  private dribbler(o: JoueurSim, sens: number): void {
    const s = this.sim;
    const db = s.reglages.ballon.dribble;
    const p = this.porteur!;
    this.stats.dribbles[p.camp]++;
    if (this.rng.suivant() < db.probaReussite) {
      this.stats.dribblesReussis[p.camp]++;
      o.freineJusqua = s.temps + db.eliminationS;
      p.sprintJusqua = Math.max(p.sprintJusqua, s.temps + db.eliminationS);
      return;
    }
    if (this.rng.suivant() < 0.5) {
      this.duelGagne(o);
    } else {
      const a = this.rng.entre(-Math.PI, Math.PI);
      this.lancer(Math.cos(a) * 5, Math.sin(a) * 5 + sens * 2);
    }
  }

  private lancer(vx: number, vy: number): void {
    this.dernier = this.porteur;
    this.dernierTemps = this.sim.temps;
    this.porteur = null;
    this.vit = { x: vx, y: vy };
    this.arret = "?";
  }

  private passer(q: JoueurSim, presse = false, point: PointM | null = null): void {
    const r = this.sim.reglages.ballon;
    const p = this.porteur!;
    const d = dist(p.pos, point ?? q.pos);
    let v = Math.min(r.vitessePasseMaxMS, r.vitessePasseMinMS + r.vitessePasseParMetre * d);
    if (point) {
      // Passe dans l'espace : dosée pour arriver au point quand le receveur y arrive.
      const k = r.frottementParS;
      const T = dist(q.pos, point) / (this.sim.reglages.mouvement.vitesseMaxMS * q.facteur) + 0.3;
      v = Math.max(8, Math.min(r.vitessePasseMaxMS, (k * d) / (1 - Math.exp(-k * T))));
    }
    const t = d / v;
    const cible = point ?? { x: q.pos.x + q.vit.x * t * 0.8, y: q.pos.y + q.vit.y * t * 0.8 };
    const dx = cible.x - this.sim.ballon.x;
    const dy = cible.y - this.sim.ballon.y;
    const n = Math.hypot(dx, dy) || 1;
    const gene = presse ? r.imprecision.sousPressionFacteur : 1; // passe jouée sous pression : moins précise
    const erreur = (((r.imprecision.baseDeg + r.imprecision.parMetreDeg * d) * gene * Math.PI) / 180) * this.rng.entre(-1, 1);
    const c = Math.cos(erreur);
    const si = Math.sin(erreur);
    this.stats.passes[p.camp]++;
    const horsJeu = this.estHorsJeu(q);
    this.lancer(((dx * c - dy * si) / n) * v, ((dx * si + dy * c) / n) * v);
    this.receveur = q;
    this.horsJeu = horsJeu;
  }

  /** Hors-jeu : dans le camp adverse, plus près du but adverse que le ballon et
   *  que l'avant-dernier adversaire, au moment de la passe. */
  private estHorsJeu(q: JoueurSim): boolean {
    const L = this.sim.donnees.longueurM;
    const prof = (y: number) => (q.camp === 0 ? y : L - y); // profondeur vers le but adverse
    const dq = prof(q.pos.y);
    if (dq <= L / 2 || dq <= prof(this.sim.ballon.y)) return false;
    const adv = this.sim.joueurs
      .filter((o) => o.camp !== q.camp)
      .map((o) => prof(o.pos.y))
      .sort((a, b) => b - a);
    return dq > (adv[1] ?? L) + this.sim.reglages.ballon.horsJeuToleranceM;
  }

  private tirer(but: PointM, dispersionM = 6.5): void {
    const r = this.sim.reglages.ballon;
    const p = this.porteur!;
    const cible = { x: but.x + this.rng.entre(-dispersionM, dispersionM), y: but.y };
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
        this.preparerEngagement(marqueur === 0 ? 1 : 0, "But !");
      } else {
        this.stats.sorties++;
        if (this.dernier && this.dernier.camp !== marqueur) {
          // dernier touché par un défenseur : corner
          this.stats.corners[marqueur]++;
          this.remettre({ x: x < W / 2 ? 0.5 : W - 0.5, y: y >= L ? L - 0.5 : 0.5 }, marqueur, "corner", "Corner");
        } else {
          // Six mètres : au coin de la surface de but, du côté de la sortie, joué par le gardien.
          const camp: Camp = marqueur === 0 ? 1 : 0;
          const gardien = s.joueurs.find((j) => j.camp === camp && j.poste.id === "G") ?? null;
          this.remettre({ x: x < W / 2 ? W / 2 - 9.16 : W / 2 + 9.16, y: y >= L ? L - 5.5 : 5.5 }, camp, null, "Six mètres", gardien);
        }
      }
      return;
    }
    if (x <= 0 || x >= W) {
      this.stats.sorties++;
      const camp: Camp = this.dernier ? (this.dernier.camp === 0 ? 1 : 0) : s.possession;
      this.remettre({ x: x <= 0 ? 0.5 : W - 0.5, y }, camp, null, "Touche");
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
      const rayon = j === this.receveur ? r.rayonReceveurM : gardienAdverse ? r.rayonGardienM + 1.4 : j.poste.id === "G" ? r.rayonGardienM : r.rayonControleM;
      const d = dist(j.pos, s.ballon);
      if (d > rayon) continue;
      const adverseDuTireur = this.dernier !== null && j.camp !== this.dernier.camp && j.poste.id !== "G";
      if (adverseDuTireur && !this.tirPenalty && vBalle > r.contre.vitesseMinMS && d <= r.rayonControleM) {
        // Ballon rapide qui arrive sur un adversaire : contrôlé, ou dévié (contre).
        if (vBalle > r.vitesseControleMaxMS || this.rng.suivant() > r.contre.probaControle) {
          this.devier(j, vBalle);
          return;
        }
      } else if (vBalle > r.vitesseControleMaxMS && j !== this.receveur && j.poste.id !== "G") continue;
      if (gardienAdverse) {
        if (this.arret === "?") this.arret = this.rng.suivant() < (this.tirPenalty ? r.fautes.arretPenaltyProba : r.arretProba) ? "oui" : "non";
        if (this.arret === "non") continue;
      }
      if (d < meilleurD) {
        meilleurD = d;
        gagnant = j;
      }
    }
    if (!gagnant) return;
    if (gagnant === this.receveur && this.horsJeu) {
      this.stats.horsJeu[gagnant.camp]++;
      const adv: Camp = gagnant.camp === 0 ? 1 : 0;
      this.remettre({ ...gagnant.pos }, adv, null, "Hors-jeu");
      return;
    }
    if (this.tirEnCours && gagnant.poste.id === "G") this.stats.arrets[gagnant.camp]++;
    if (gagnant === this.receveur) this.stats.passesReussies[gagnant.camp]++;
    else if (this.dernier && gagnant.camp !== this.dernier.camp) this.stats.interceptions[gagnant.camp]++;
    this.donner(gagnant);
  }

  private devier(j: JoueurSim, v: number): void {
    const c = this.sim.reglages.ballon.contre;
    const cote = this.rng.suivant() < 0.5 ? -1 : 1; // dévié franchement d'un côté ou de l'autre
    const a = Math.atan2(this.vit.y, this.vit.x) + (cote * this.rng.entre(c.angleMinDeg, c.angleMaxDeg) * Math.PI) / 180;
    const nv = v * c.perteVitesse;
    this.stats.contres++;
    this.vit = { x: Math.cos(a) * nv, y: Math.sin(a) * nv };
    this.dernier = j;
    this.dernierTemps = this.sim.temps;
    this.receveur = null;
    this.tirEnCours = false;
    this.horsJeu = false;
  }

  /** Le joueur prend le ballon aux pieds ; son équipe a la possession. */
  private donner(j: JoueurSim): void {
    const r = this.sim.reglages.ballon;
    const avant = this.sim.possession;
    if (j.camp !== avant) this.perte = { camp: avant, a: this.sim.temps };
    this.porteur = j;
    this.tireur = null;
    this.receveur = null;
    this.tirEnCours = false;
    this.tirPenalty = false;
    this.horsJeu = false;
    this.reserve = null;
    this.dernier = j;
    this.dernierTemps = this.sim.temps;
    this.decisionA = this.sim.temps + this.rng.entre(r.premiereDecisionS.min, r.premiereDecisionS.max);
    const L = this.sim.donnees.longueurM;
    const versBut = j.camp === 0 ? L - j.pos.y : j.pos.y;
    if (!this.arrete && j.poste.id !== "G" && versBut <= r.surface.profondeurM && Math.abs(j.pos.x - this.sim.donnees.largeurM / 2) <= r.surface.demiLargeurM)
      this.decisionA = this.sim.temps + 0.1; // dans la surface adverse : reprise immédiate
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

  /** Premier point de la trajectoire du ballon que ce joueur peut atteindre à temps. */
  private pointInterception(j: JoueurSim): PointM {
    const vMax = this.sim.reglages.mouvement.vitesseMaxMS * j.facteur;
    for (let t = 0; t <= 3; t += 1 / 15) {
      const b = this.pointArrivee(t);
      if (dist(j.pos, b) <= vMax * t + this.sim.reglages.ballon.rayonControleM) return b;
    }
    return this.pointArrivee(3);
  }

  /** Ajuste les cibles de course dues au ballon : le porteur avance, le
   *  destinataire va au ballon, les plus proches des deux équipes le disputent. */
  surcharger(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const vMax = s.reglages.mouvement.vitesseMaxMS;
    for (const x of s.joueurs) x.auBallon = false;
    if (this.engagement) {
      for (const j of s.joueurs) j.cible = { ...j.depart };
      return;
    }

    if (this.porteur) {
      const p = this.porteur;
      const sens = p.camp === 0 ? 1 : -1;
      p.auBallon = true;
      if (p.poste.id === "G") p.cible = { ...p.pos };
      else {
        const butAdv = { x: W / 2, y: sens === 1 ? L : 0 };
        const dBut = dist(p.pos, butAdv);
        p.cible =
          dBut < 35 // dernier tiers : droit vers le but
            ? { x: p.pos.x + ((butAdv.x - p.pos.x) / dBut) * r.dribbleAvanceM, y: p.pos.y + ((butAdv.y - p.pos.y) / dBut) * r.dribbleAvanceM }
            : { x: p.pos.x + (W / 2 - p.pos.x) * 0.2, y: Math.min(L - 3, Math.max(3, p.pos.y + sens * r.dribbleAvanceM)) };
      }
      const cp = r.contrePressing;
      const contre = this.perte !== null && this.perte.camp !== p.camp && s.temps - this.perte.a < cp.dureeS;
      if (contre) {
        // Contre-pressing (référence §4) : juste après la perte, les plus proches
        // attaquent le porteur en sprint : un presse, un ferme la passe vers
        // l'avant, un ferme l'intérieur. Sinon l'équipe se replie normalement.
        const fin = this.perte!.a + cp.dureeS;
        const vers = W / 2 - p.pos.x > 0 ? 1 : -1;
        const places = [
          { ...s.ballon },
          { x: s.ballon.x, y: s.ballon.y + sens * 5 },
          { x: s.ballon.x + vers * 5, y: s.ballon.y + sens * 2 },
        ];
        s.joueurs
          .filter((j) => j.camp !== p.camp && j.poste.id !== "G" && dist(j.pos, p.pos) < cp.rayonM)
          .sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))
          .slice(0, cp.joueurs)
          .forEach((j, i) => {
            j.cible = places[i] ?? places[0]!;
            j.auBallon = true;
            j.sprintJusqua = Math.max(j.sprintJusqua, fin);
          });
        return;
      }
      // Pressing normal (référence §4) : le plus proche presse le porteur, le
      // suivant couvre entre le porteur et le but ; les autres tiennent leur place.
      const presseurs = s.joueurs
        .filter((j) => j.camp !== p.camp && j.poste.id !== "G" && dist(j.pos, p.pos) < r.pressingM)
        .sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))
        .slice(0, 2);
      presseurs.forEach((j, i) => {
        j.auBallon = i === 0;
        j.cible = i === 0 ? { ...s.ballon } : { x: s.ballon.x + (W / 2 - s.ballon.x) * 0.2, y: s.ballon.y + sens * 6 };
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
      else if (this.reserve && this.tireur) {
        nombre = 0;
        this.tireur.cible = { ...s.ballon };
        this.tireur.auBallon = true;
      }
      if (this.receveur && camp === this.receveur.camp) {
        this.receveur.cible = this.pointInterception(this.receveur);
        this.receveur.auBallon = true;
      }
      for (const { j } of proches.slice(0, nombre)) {
        j.cible = this.pointInterception(j);
        j.auBallon = true;
      }
    }
  }
}
