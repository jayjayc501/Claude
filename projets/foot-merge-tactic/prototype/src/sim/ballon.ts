// Ballon réel (mission 2) : le ballon a une position et une vitesse, il est
// porté par un joueur ou roule seul. Les joueurs le conduisent, le passent, le
// tirent ; l'adversaire l'intercepte ou le tacle. La possession est celle du
// dernier joueur qui l'a touché : plus de possession simulée.
//
// Tout reste déterministe (générateur à graine) et indépendant de l'affichage.

import { PARAMETRES_NOTES as PN, decaler } from "./notes";
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
  /** Somme des longueurs de passe (m), passes vers l'avant (5 m gagnés ou plus), passes longues (25 m ou plus). */
  distancePasses: [number, number];
  /** Somme des mètres gagnés vers le but adverse par les passes. */
  gainPasses: [number, number];
  passesAvant: [number, number];
  passesLongues: [number, number];
  interceptions: [number, number];
  tacles: [number, number];
  tirs: [number, number];
  contres: number;
  touches: number;
  centres: [number, number];
  degagements: [number, number];
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
  /** Partenaire de l'engagement et sa place à côté du ballon. */
  private placePartenaire: { joueur: JoueurSim; point: PointM; depuis: number } | null = null;
  /** Dernière perte de balle en jeu (pas sur une remise en jeu) : contre-pressing. */
  perte: { camp: Camp; a: number } | null = null;
  readonly stats: StatsBallon = {
    passes: [0, 0],
    passesReussies: [0, 0],
    distancePasses: [0, 0],
    gainPasses: [0, 0],
    passesAvant: [0, 0],
    passesLongues: [0, 0],
    interceptions: [0, 0],
    tacles: [0, 0],
    tirs: [0, 0],
    contres: 0,
    touches: 0,
    centres: [0, 0],
    degagements: [0, 0],
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
  /** Appel en profondeur en cours (jeu sans ballon). */
  private appel: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  /** Dernier instant où l'on a tiré au sort un appel. */
  private dernierTirageAppel = 0;
  private protegeJusqua = 0;
  /** Coup de pied arrêté en attente : le premier joueur de l'équipe qui prend le ballon le joue. */
  private arrete: "corner" | "penalty" | "engagement" | "sixMetres" | "coupFranc" | "touche" | null = null;
  /** Plongeon du gardien sur le tir en cours. */
  private plongeon: { gardien: JoueurSim; point: PointM } | null = null;
  /** Ballon aérien (centre, dégagement) : personne ne le touche avant cet instant. */
  private airJusqua = -Infinity;

  /** Engagement à jouer (début de période ou après un but). */
  get enEngagement(): boolean {
    return this.engagement !== null || this.arrete === "engagement";
  }

  /** Jeu arrêté (remise en jeu, coup franc, corner, engagement à jouer). */
  get arretDeJeu(): boolean {
    return this.arrete !== null || this.engagement !== null;
  }

  /** Début du vol du ballon aérien en cours (pour sa hauteur à l'écran). */
  private airDebut = 0;
  /** Hauteur relative du ballon aérien (0 au sol, 1 au sommet de sa trajectoire) : affichage. */
  get hauteur(): number {
    if (this.sim.temps >= this.airJusqua) return 0;
    const t = (this.sim.temps - this.airDebut) / Math.max(0.01, this.airJusqua - this.airDebut);
    return Math.max(0, 4 * t * (1 - t));
  }

  get enLAir(): boolean {
    return this.sim.temps < this.airJusqua;
  }
  /** Le receveur de la passe en cours était hors-jeu au départ de la passe. */
  private horsJeu = false;
  private tirPenalty = false;
  /** Dernier événement de jeu, pour l'affichage (« Corner », « Hors-jeu »…). */
  evenement: { texte: string; a: number } | null = null;
  /** Après un but : chacun regagne son camp avant l'engagement. */
  engagement: { camp: Camp; depuis: number; minS: number } | null = null;
  /** Buts du match, dans l'ordre : équipe qui marque, buteur, minute. */
  buts: { camp: Camp; joueur: string | null; contreSonCamp: boolean; minute: number }[] = [];
  /** Défenseurs que le tir en cours a déjà passés sans les toucher. */
  private tirEvite = new Set<JoueurSim>();
  /** Joueur désigné pour la remise en jeu (le gardien sur un six mètres). */
  private tireur: JoueurSim | null = null;
  private arret: "?" | "oui" | "non" = "?";
  private rng: Aleatoire;

  constructor(private sim: MatchSim, graine: number) {
    this.rng = new Aleatoire((graine ^ 0x9e3779b9) >>> 0);
  }

  /** Coup d'envoi (ou remise au centre) : le ballon est posé, l'équipe va le chercher. */
  remettre(point: PointM, camp: Camp, arrete: "corner" | "penalty" | "engagement" | "sixMetres" | "coupFranc" | "touche" | null = null, texte?: string, tireur: JoueurSim | null = null): void {
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
    // Engagement : l'équipe a tout son temps pour venir jouer le ballon.
    this.reserve = { camp, jusqua: s.temps + (arrete === "engagement" ? 8 : s.reglages.ballon.reserveRepriseS) };
    s.prendrePossession(camp);
  }

  /** Coup d'envoi d'une nouvelle période (2e mi-temps) : comme après un but,
   *  chacun regagne sa place de départ, puis `camp` engage. */
  coupDEnvoi(camp: Camp, texte: string): void {
    this.preparerEngagement(camp, texte);
  }

  /** But : ballon au centre, les deux équipes regagnent leur camp ; l'engagement
   *  a lieu quand tout le monde y est (10 s au plus). */
  private preparerEngagement(camp: Camp, texte: string): void {
    const s = this.sim;
    this.remettre({ x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 }, camp, null, texte);
    this.reserve = null;
    // Après un but, on laisse le temps à l'annonce (et à la joie) avant de réengager.
    this.engagement = { camp, depuis: s.temps, minS: texte === "But !" ? s.reglages.ballon.attenteButS : 2 };
  }

  /** Le point est-il dans la surface de réparation que défend ce camp ? */
  private dansSurface(pt: PointM, campDefenseur: Camp): boolean {
    const r = this.sim.reglages.ballon;
    const W = this.sim.donnees.largeurM;
    const L = this.sim.donnees.longueurM;
    const deSonBut = campDefenseur === 0 ? pt.y : L - pt.y;
    return deSonBut <= r.surface.profondeurM && Math.abs(pt.x - W / 2) <= r.surface.demiLargeurM;
  }

  /** Six mètres : les adversaires sortent de la surface. */
  private viderSurface(camp: Camp): void {
    const L = this.sim.donnees.longueurM;
    const bord = this.sim.reglages.ballon.surface.profondeurM + 1.5;
    for (const o of this.sim.joueurs) {
      if (o.camp === camp) continue;
      if (this.dansSurface(o.cible, camp)) o.cible = { x: o.cible.x, y: camp === 0 ? bord : L - bord };
    }
  }

  /** Coup franc : les adversaires se tiennent à 9,15 m du ballon. */
  private eloigner(camp: Camp): void {
    const b = this.sim.ballon;
    for (const o of this.sim.joueurs) {
      if (o.camp === camp) continue;
      const d = dist(o.cible, b);
      if (d >= 9.5) continue;
      const ux = d > 0.1 ? (o.cible.x - b.x) / d : 0;
      const uy = d > 0.1 ? (o.cible.y - b.y) / d : camp === 0 ? 1 : -1;
      o.cible = { x: b.x + ux * 9.5, y: b.y + uy * 9.5 };
    }
  }

  /** Coup d'envoi : les adversaires restent dans leur moitié, hors du rond central. */
  private eloignerEngagement(camp: Camp): void {
    const s = this.sim;
    const b = s.ballon;
    const L = s.donnees.longueurM;
    const sens = camp === 0 ? 1 : -1; // côté de la moitié adverse
    for (const o of s.joueurs) {
      if (o.camp === camp) continue;
      let c = { x: o.cible.x, y: sens > 0 ? Math.max(o.cible.y, L / 2 + 0.5) : Math.min(o.cible.y, L / 2 - 0.5) };
      const d = dist(c, b);
      if (d < 9.5) {
        const ux = d > 0.1 ? (c.x - b.x) / d : 0;
        const uy = Math.max(0.3, Math.abs(d > 0.1 ? (c.y - b.y) / d : 1)) * sens;
        const n = Math.hypot(ux, uy);
        c = { x: b.x + (ux / n) * 9.5, y: b.y + (uy / n) * 9.5 };
      }
      o.cible = c;
    }
  }

  /** Joueur qui engage : le joueur de champ de l'équipe le plus proche du centre. */
  private engageur(): JoueurSim {
    const s = this.sim;
    const camp = this.engagement!.camp;
    return s.joueurs
      .filter((j) => j.camp === camp && j.poste.id !== "G")
      .reduce((a, b) => (dist(a.depart, s.ballon) <= dist(b.depart, s.ballon) ? a : b));
  }

  /** Coéquipier qui se place à côté du ballon pour l'engagement (12/11 :
   *  « les engagements sont nuls : une passe en arrière à personne »). */
  private partenaire(camp: Camp, kicker: JoueurSim): JoueurSim | undefined {
    const s = this.sim;
    const centre = { x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 };
    return s.joueurs
      .filter((j) => j.camp === camp && j !== kicker && j.poste.id !== "G")
      .sort((a, b) => dist(a.depart, centre) - dist(b.depart, centre))[0];
  }

  /** Place du partenaire : 4 m à côté du ballon, un pas dans son camp. */
  private placerPartenaire(camp: Camp, kicker: JoueurSim): void {
    const s = this.sim;
    const q = this.partenaire(camp, kicker);
    if (!q) return;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const cote = q.depart.x < W / 2 ? -1 : 1;
    q.cible = { x: W / 2 + cote * 4, y: L / 2 + (camp === 0 ? -1.5 : 1.5) };
    q.auBallon = true;
    const depuis = this.placePartenaire?.joueur === q ? this.placePartenaire.depuis : s.temps;
    this.placePartenaire = { joueur: q, point: { ...q.cible }, depuis };
  }

  pas(dt: number): void {
    if (this.engagement) {
      const s = this.sim;
      const L = s.donnees.longueurM;
      const kicker = this.engageur();
      const partenaire = this.partenaire(this.engagement.camp, kicker);
      const enPlace =
        dist(kicker.pos, s.ballon) < 1.5 &&
        s.joueurs.every((j) => j === kicker || j === partenaire || ((j.camp === 0 ? j.pos.y <= L / 2 + 0.5 : j.pos.y >= L / 2 - 0.5) && dist(j.pos, j.depart) < 3));
      if ((enPlace && s.temps - this.engagement.depuis > this.engagement.minS) || s.temps - this.engagement.depuis > 10) {
        const camp = this.engagement.camp;
        this.engagement = null;
        this.remettre({ ...s.ballon }, camp, "engagement", "Engagement");
      }
      return;
    }
    if (this.porteur) {
      if (this.arrete) {
        // Remise en jeu : le tireur s'arrête, le ballon reste à sa place.
        this.porteur.vit = { x: 0, y: 0 };
        this.vit = { x: 0, y: 0 };
      } else {
        this.conduire();
        this.tacler(dt);
      } // remise en jeu pas encore jouée : ni conduite ni tacle
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
    const s = this.sim;
    for (const o of s.joueurs) {
      if (o.camp === p.camp || o.poste.id === "G") continue;
      const t = s.reg(o.camp).ballon.tacle;
      if (dist(o.pos, p.pos) > t.rayonM) continue;
      const f = s.temps < this.protegeJusqua ? s.reg(p.camp).ballon.protection.facteurTacle * p.effet.protection : 1;
      // Contre-pressing : juste après la perte, on va au duel plus franchement.
      const cp = s.reg(o.camp).ballon.contrePressing;
      const contre = this.perte !== null && this.perte.camp === o.camp && s.temps - this.perte.a < cp.dureeS ? cp.tacleFois : 1;
      // Notes : duel du défenseur contre dribble du porteur.
      const n = Math.exp((o.notes.duel - p.notes.dribble) * PN.physique.tacleParPoint);
      if (this.rng.suivant() < 1 - Math.exp(-t.parSeconde * o.effet.tacle * f * contre * n * dt)) {
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
    // Un défenseur dépassé (duel sous le dribble du porteur) fait plus de fautes.
    const n = Math.exp(-(o.notes.duel - p.notes.dribble) * PN.physique.fautesParPoint);
    if (this.rng.suivant() >= s.reg(o.camp).ballon.fautes.proba * o.effet.fautes * n) {
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
    this.remettre({ x: Math.min(W - 1, Math.max(1, p.pos.x)), y: p.pos.y }, p.camp, "coupFranc", "Faute");
  }

  private decider(): void {
    const s = this.sim;
    const p = this.porteur!;
    const r = s.reg(p.camp).ballon; // décisions selon la tactique de son équipe
    const sens = p.camp === 0 ? 1 : -1;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const but = { x: W / 2, y: sens === 1 ? L : 0 };
    const dBut = dist(p.pos, but);
    const adverses = s.joueurs.filter((j) => j.camp !== p.camp);
    const pression = Math.min(...adverses.filter((o) => (o.pos.y - p.pos.y) * sens > -1.5).map((o) => dist(o.pos, p.pos)));
    this.decisionA = s.temps + this.rng.entre(r.decisionS.min, r.decisionS.max) * this.contrePresse(p).precipite;
    // Contre-attaque : juste après la récupération, on cherche l'avant.
    const poidsProgression = r.poidsProgression + (this.depuisRecuperation(p.camp) < r.contreAttaque.dureeS ? r.contreAttaque.bonusProgression : 0);

    if (this.arrete === "touche") {
      // Touche : passe (à la main) vers le coéquipier le plus libre, à moins de 22 m.
      this.arrete = null;
      let choix: JoueurSim | null = null;
      let mieux = -Infinity;
      for (const q of s.joueurs) {
        if (q === p || q.camp !== p.camp || q.poste.id === "G") continue;
        const d = dist(p.pos, q.pos);
        if (d < 4 || d > 22) continue;
        const ouvert = Math.min(8, Math.min(...adverses.map((a) => dist(a.pos, q.pos))));
        const sc = ouvert - d * 0.1 + this.rng.entre(-1.5, 1.5);
        if (sc > mieux) {
          mieux = sc;
          choix = q;
        }
      }
      if (choix) {
        this.passer(choix, false, null, false);
        return;
      }
    }
    if (this.arrete === "coupFranc") this.arrete = null; // le tireur joue normalement (passe, tir à portée)
    if (this.arrete === "sixMetres") {
      // Six mètres : on attend que les adversaires soient sortis de la surface (5 s au plus).
      const encore = adverses.some((o) => this.dansSurface(o.pos, p.camp));
      if (encore && this.evenement && s.temps - this.evenement.a < 5) {
        this.decisionA = s.temps + 0.2;
        return;
      }
      this.arrete = null;
    }
    if (this.arrete === "engagement" && dist(p.pos, { x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 }) > 4) {
      this.arrete = null; // loin du point central : ce n'est plus un engagement
      this.placePartenaire = null;
    }
    if (this.arrete === "engagement") {
      // Engagement : on attend que le partenaire soit à côté du ballon et les
      // adversaires hors du rond (6 s au plus), puis passe au partenaire ou en retrait.
      const pp = this.placePartenaire?.joueur.camp === p.camp ? this.placePartenaire : null;
      const rondOccupe = adverses.some((o) => dist(o.pos, p.pos) < 9);
      if (pp && (dist(pp.joueur.pos, pp.point) > 1.5 || rondOccupe) && s.temps - pp.depuis < 6) {
        this.decisionA = s.temps + 0.2;
        return;
      }
      this.arrete = null;
      this.placePartenaire = null;
      // Le plus souvent au partenaire placé à côté, sinon à un milieu en retrait.
      let choix: JoueurSim | undefined = pp && dist(pp.joueur.pos, p.pos) < 8 && this.rng.suivant() < 0.85 ? pp.joueur : undefined;
      if (!choix) {
        const options = s.joueurs
          .filter((q) => q !== p && q.camp === p.camp && q.poste.id !== "G")
          .map((q) => ({ q, d: dist(p.pos, q.pos), recul: (p.pos.y - q.pos.y) * sens }))
          .filter((o) => o.d > 2 && o.d < 28 && o.recul > 1)
          .sort((a, b) => a.d - b.d);
        choix = options[0]?.q;
      }
      if (choix) {
        this.passer(choix, false, null, false); // dans ses pieds
        return;
      }
    }
    if (this.arrete === "penalty") {
      this.arrete = null;
      this.tirer(but, true);
      return;
    }
    if (this.arrete === "corner") {
      this.arrete = null;
      this.centrer(but, sens);
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
      if (dBut < r.tirDistanceM && Math.abs(p.pos.x - W / 2) < dBut * 0.8 && this.rng.suivant() < r.tirLoin.probaBase + r.tirLoin.probaMax * (1 - dBut / r.tirDistanceM)) {
        this.tirer(but);
        return;
      }
    }

    // Seul devant le but (aucun joueur de champ adverse entre lui et le but,
    // 12/11 : avant, un cône de 18 m suffisait et on fonçait de trop loin) et
    // pas pressé : il fonce vers le but et tire à portée, sans passe en retrait.
    const libreDevant = !adverses.some((o) => {
      if (o.poste.id === "G") return false;
      const avant = (o.pos.y - p.pos.y) * sens;
      return avant > 0.5 && avant < dBut && Math.abs(o.pos.x - p.pos.x) < 4 + avant * 0.3;
    });
    if (p.poste.id !== "G" && libreDevant && pression >= r.pressionM) {
      if (dBut < r.seulTirM) this.tirer(but);
      else this.decisionA = Math.min(this.decisionA, s.temps + 0.3); // il lève la tête souvent : tir dès qu'il est à portée
      return;
    }

    // Sur l'aile près de la ligne de but, avec un coéquipier dans la surface : centre.
    const c = r.centre;
    const versLigne = sens === 1 ? L - p.pos.y : p.pos.y;
    if (p.poste.id !== "G" && versLigne < c.zoneProfondeurM && Math.abs(p.pos.x - W / 2) > c.ecartAxeM && this.rng.suivant() < c.proba) {
      if (s.joueurs.some((q) => q.camp === p.camp && q !== p && this.dansSurface(q.pos, q.camp === 0 ? 1 : 0))) {
        this.centrer(but, sens);
        return;
      }
    }

    // Dribble : face à un adversaire tout proche, un joueur offensif tente
    // parfois de l'éliminer plutôt que de passer.
    const db = r.dribble;
    const devant = adverses.find((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < db.distanceM && (o.pos.y - p.pos.y) * sens > -0.5);
    const tente = p.poste.ligneDefense === "defense" ? db.probaTentative * 0.25 : p.poste.ligneDefense === "gardien" ? 0 : db.probaTentative;
    // Notes : on tente plus souvent le 1 contre 1 quand on a l'avantage (dribble et accélération).
    if (devant && this.rng.suivant() < (tente > 0 ? decaler(tente, this.avantage1c1(p, devant) * PN.unContreUn.poidsTentative) : 0)) {
      this.dribbler(devant, sens);
      return;
    }

    // Jeu long (12/11) : depuis sa moitié ou le milieu, ballon aérien vers un
    // attaquant lancé ou libre, là où il arrivera avant les défenseurs.
    const jl = r.jeuLong;
    const deSonButJL = sens === 1 ? p.pos.y : L - p.pos.y;
    const probaJL = this.depuisRecuperation(p.camp) < r.contreAttaque.dureeS ? jl.probaContre : jl.proba;
    if (p.poste.id !== "G" && deSonButJL < jl.profondeurMaxM && probaJL > 0 && this.rng.suivant() < probaJL) {
      let choixJL: { q: JoueurSim; point: PointM; gain: number } | null = null;
      for (const q of s.joueurs) {
        if (q === p || q.camp !== p.camp || q.poste.id === "G") continue;
        if (this.estHorsJeu(q)) continue;
        const d0 = dist(p.pos, q.pos);
        const T = d0 / jl.vitesseMS + 0.4;
        const point = { x: Math.min(W - 2, Math.max(2, q.pos.x + q.vit.x * T)), y: Math.min(L - 3, Math.max(3, q.pos.y + q.vit.y * T)) };
        const d = dist(p.pos, point);
        const gain = (point.y - p.pos.y) * sens;
        if (d < jl.distanceMinM || d > jl.distanceMaxM || gain < jl.gainMinM) continue;
        const tLui = dist(q.pos, point) / (s.reglages.mouvement.vitesseMaxMS * q.vitesseF);
        const tEux = Math.min(...adverses.map((o) => dist(o.pos, point) / (s.reglages.mouvement.vitesseMaxMS * o.vitesseF)));
        if (tLui + jl.avanceS > Math.max(tEux, T * 0.8)) continue;
        if (!choixJL || gain > choixJL.gain) choixJL = { q, point, gain };
      }
      if (choixJL) {
        this.jouerLong(choixJL.q, choixJL.point);
        return;
      }
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
      // Joueur en appel : l'espace est dans le sens de sa course (diagonale).
      const vq = Math.hypot(q.vit.x, q.vit.y) || 1;
      const enAppel = this.appel?.joueur === q;
      const esp = enAppel
        ? { x: q.pos.x + (q.vit.x / vq) * r.passeEspace.avanceM * 1.3, y: q.pos.y + (q.vit.y / vq) * r.passeEspace.avanceM * 1.3 }
        : { x: q.pos.x, y: q.pos.y + sens * r.passeEspace.avanceM };
      if (avance > 0 && q.vit.y * sens > r.passeEspace.courseMinMS && esp.y > 2 && esp.y < L - 2) {
        // L'espace est à lui s'il y arrive nettement avant tout adversaire.
        const vCourse = s.reglages.mouvement.vitesseMaxMS;
        const tLui = dist(q.pos, esp) / (vCourse * q.vitesseF);
        const tEux = Math.min(...adverses.map((o) => dist(o.pos, esp) / (vCourse * o.vitesseF)));
        if (tLui + r.passeEspace.avanceSurAdversaireS < tEux) options.push({ point: esp, vise: esp });
      }
      const adv: Camp = p.camp === 0 ? 1 : 0;
      for (const o of options) {
        // Passe dans la surface adverse (12/11, « les actions finissent trop
        // vite en tir ») : seulement vers un joueur vraiment libre, par une voie
        // bien dégagée, et moins tentante qu'une passe qui garde le ballon.
        const versSurface = this.dansSurface(o.vise, adv);
        if (!libre(p.pos, o.vise)) continue;
        const ouvert = Math.min(8, Math.min(...adverses.map((a) => dist(a.pos, o.vise))));
        if (versSurface && (ouvert < r.construction.surfaceOuvertM || adverses.some((a) => distSegment(a.pos, p.pos, o.vise) < r.voieLibreM * r.construction.surfaceVoieFacteur))) continue;
        const gain = (o.vise.y - p.pos.y) * sens;
        const large = Math.abs(o.vise.x - W / 2) > r.construction.largeurM && (o.vise.y - L / 2) * sens > -10 ? r.construction.bonusLargeur : 0;
        // Notes : on cherche le coéquipier plus rapide que son adversaire direct (passe vers l'avant).
        const vitesse = gain > 0 ? this.avantageVitesse(q, o.vise, adverses) * PN.vitesse.choixPasseParPoint : 0;
        const sc = gain * poidsProgression + ouvert * r.poidsEspace - dist(p.pos, o.vise) * 0.08 + large - (versSurface ? r.construction.surfaceMalus : 0) + vitesse + this.rng.entre(-2, 2);
        if (sc > score) {
          score = sc;
          meilleur = { q, point: o.point };
        }
      }
    }
    const presse = pression < r.pressionM;
    // Avant bouché (adversaire proche dans le cône) : il fait tourner le ballon
    // (passe latérale ou en retrait) plutôt que de foncer dans le bloc.
    const bouche = this.avantBouche(p);
    const seuil = bouche ? r.seuilPasse - r.construction.baisseSeuil : r.seuilPasse;
    if (meilleur && (p.poste.id === "G" || presse || score > seuil)) {
      this.passer(meilleur.q, presse, meilleur.point);
      return;
    }
    if (!presse) return; // rien d'ouvert : il continue de conduire

    // Pressé sans solution sûre : dégagement dans son tiers, sinon il protège.
    const deSonBut = sens === 1 ? p.pos.y : L - p.pos.y;
    if (deSonBut < r.degagement.zoneM && p.poste.id !== "G") {
      this.degager(sens);
      return;
    }
    if (fuite && deSonBut < r.zoneDegagementM) {
      this.passer(fuite, presse); // dégagement
      return;
    }
    this.protegeJusqua = s.temps + r.protection.dureeS;
  }

  /** Ballon aérien vers un point, dosé pour y arriver en T secondes. */
  private lober(point: PointM, T: number, angleErreurDeg = 0): void {
    const r = this.sim.reglages.ballon;
    const b = this.sim.ballon;
    const d = dist(b, point) || 1;
    const k = r.frottementParS;
    const v = Math.min(30, (k * d) / (1 - Math.exp(-k * T)));
    const e = (this.rng.entre(-1, 1) * angleErreurDeg * this.precisionPasse(this.porteur) * Math.PI) / 180;
    const ux = (point.x - b.x) / d;
    const uy = (point.y - b.y) / d;
    this.lancer((ux * Math.cos(e) - uy * Math.sin(e)) * v, (ux * Math.sin(e) + uy * Math.cos(e)) * v);
    this.airDebut = this.sim.temps;
    this.airJusqua = this.sim.temps + T * r.centre.partEnLAir;
  }

  /** Ballon long aérien vers un coéquipier (jeu long, contre-attaque). */
  private jouerLong(q: JoueurSim, point: PointM): void {
    const s = this.sim;
    const p = this.porteur!;
    const jl = s.reg(p.camp).ballon.jeuLong;
    const d = dist(p.pos, point);
    this.stats.passes[p.camp]++;
    this.stats.distancePasses[p.camp] += d;
    this.stats.passesLongues[p.camp]++;
    const gainPasse = (point.y - p.pos.y) * (p.camp === 0 ? 1 : -1);
    this.stats.gainPasses[p.camp] += gainPasse;
    if (gainPasse >= 5) this.stats.passesAvant[p.camp]++;
    const horsJeu = this.estHorsJeu(q);
    this.lober(point, d / jl.vitesseMS + 0.4, jl.erreurDeg);
    this.receveur = q;
    this.horsJeu = horsJeu;
  }

  /** Centre aérien vers un coéquipier de la surface (ou le point de penalty). */
  private centrer(but: PointM, sens: number): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const p = this.porteur!;
    const cibles = s.joueurs.filter((q) => q.camp === p.camp && q !== p && q.poste.id !== "G" && this.dansSurface(q.pos, q.camp === 0 ? 1 : 0));
    const q = cibles.length ? cibles[this.rng.entier(cibles.length)]! : null;
    const point = q
      ? { x: q.pos.x + this.rng.entre(-2, 2), y: q.pos.y + this.rng.entre(-2, 2) }
      : { x: but.x + this.rng.entre(-6, 6), y: but.y - sens * this.rng.entre(6, 12) };
    this.stats.centres[p.camp]++;
    this.stats.passes[p.camp]++;
    this.lober(point, r.centre.dureeS, r.centre.erreurDeg);
    this.receveur = q;
  }

  /** Dégagement : long ballon aérien vers l'avant et le côté. */
  private degager(sens: number): void {
    const s = this.sim;
    const g = s.reglages.ballon.degagement;
    const p = this.porteur!;
    const W = s.donnees.largeurM;
    const cote = p.pos.x < W / 2 ? 1 : -1;
    const x = cote === 1 ? this.rng.entre(1, 18) : W - this.rng.entre(1, 18);
    const y = p.pos.y + sens * this.rng.entre(g.longueurMinM, g.longueurMaxM);
    this.stats.degagements[p.camp]++;
    this.lober({ x, y }, g.dureeS, g.erreurDeg);
  }

  /** 1 contre 1 : réussi, l'adversaire est éliminé et le porteur accélère ;
   *  raté, l'adversaire prend le ballon ou le ballon part libre. */
  private dribbler(o: JoueurSim, sens: number): void {
    const s = this.sim;
    const p = this.porteur!;
    const db = s.reg(p.camp).ballon.dribble;
    this.stats.dribbles[p.camp]++;
    // Notes : dribble et accélération du porteur contre duel et accélération du défenseur.
    if (this.rng.suivant() < decaler(Math.min(0.95, db.probaReussite * p.effet.dribble), this.avantage1c1(p, o))) {
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
    this.airJusqua = -Infinity;
    this.dernier = this.porteur;
    this.dernierTemps = this.sim.temps;
    this.porteur = null;
    this.vit = { x: vx, y: vy };
    this.arret = "?";
  }

  private passer(q: JoueurSim, presse = false, point: PointM | null = null, anticipe = true): void {
    const p = this.porteur!;
    const r = this.sim.reg(p.camp).ballon;
    const d = dist(p.pos, point ?? q.pos);
    let v = Math.min(r.vitessePasseMaxMS, r.vitessePasseMinMS + r.vitessePasseParMetre * d);
    if (point) {
      // Passe dans l'espace : dosée pour arriver au point quand le receveur y arrive.
      const k = r.frottementParS;
      const T = dist(q.pos, point) / (this.sim.reglages.mouvement.vitesseMaxMS * q.vitesseF) + 0.3;
      v = Math.max(8, Math.min(r.vitessePasseMaxMS, (k * d) / (1 - Math.exp(-k * T))));
    }
    const t = d / v;
    const a = anticipe ? t * 0.8 : 0;
    const cible = point ?? { x: q.pos.x + q.vit.x * a, y: q.pos.y + q.vit.y * a };
    const dx = cible.x - this.sim.ballon.x;
    const dy = cible.y - this.sim.ballon.y;
    const n = Math.hypot(dx, dy) || 1;
    // Passe jouée sous pression : moins précise ; une équipe qui presse gêne de plus loin.
    const g = this.sim.reg(p.camp === 0 ? 1 : 0).ballon.gene;
    const dAdv = Math.min(...this.sim.joueurs.filter((o) => o.camp !== p.camp && o.poste.id !== "G").map((o) => dist(o.pos, p.pos)));
    const gene = (presse ? r.imprecision.sousPressionFacteur : 1) * (dAdv < g.rayonM ? g.facteur : 1) * this.contrePresse(p).gene;
    const erreur = (((r.imprecision.baseDeg + r.imprecision.parMetreDeg * d) * gene * p.effet.imprecision * this.precisionPasse(p) * Math.PI) / 180) * this.rng.entre(-1, 1);
    const c = Math.cos(erreur);
    const si = Math.sin(erreur);
    this.stats.passes[p.camp]++;
    this.stats.distancePasses[p.camp] += d;
    const gainPasse = ((point ?? q.pos).y - p.pos.y) * (p.camp === 0 ? 1 : -1);
    this.stats.gainPasses[p.camp] += gainPasse;
    if (gainPasse >= 5) this.stats.passesAvant[p.camp]++;
    if (d >= 25) this.stats.passesLongues[p.camp]++;
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

  /** Tir : vise un coin, loin du gardien ; l'erreur grandit avec la distance.
   *  Le gardien plonge vers le point où le ballon passe à sa hauteur ; il a
   *  d'autant plus de chances d'arrêter que ce point est proche de lui. */
  private tirer(but: PointM, penalty = false): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const t = r.tir;
    const p = this.porteur!;
    const gardien = s.joueurs.find((j) => j.camp !== p.camp && j.poste.id === "G");
    const cote = gardien ? (gardien.pos.x > but.x ? -1 : 1) : this.rng.suivant() < 0.5 ? -1 : 1;
    const vise = but.x + cote * this.rng.entre(t.viseMinM, t.viseMaxM);
    // Notes : la précision réduit l'erreur de visée, la puissance accélère le tir.
    const ecartPrecision = p.notes.precision - PN.reference;
    const precision = ecartPrecision === 0 ? 1 : Math.exp(-ecartPrecision * PN.tir.erreurParPoint);
    const erreur = (penalty ? t.erreurPenaltyM : t.erreurBaseM + t.erreurParMetre * dist(p.pos, but)) * precision;
    const cible = { x: vise + this.rng.entre(-erreur, erreur), y: but.y };
    const dx = cible.x - s.ballon.x;
    const dy = cible.y - s.ballon.y;
    const n = Math.hypot(dx, dy) || 1;
    const vTir = r.vitesseTirMS * (1 + (p.notes.puissance - PN.reference) * PN.tir.puissanceParPoint);
    this.stats.tirs[p.camp]++;
    this.lancer((dx / n) * vTir, (dy / n) * vTir);
    this.tirEnCours = true;
    this.tirEvite.clear();
    this.tirPenalty = penalty;
    this.plongeon = null;
    if (!gardien) return;
    // Point de passage du ballon à la hauteur du gardien.
    const k = Math.abs(dy) > 1e-6 ? (gardien.pos.y - s.ballon.y) / dy : 0;
    const point = { x: s.ballon.x + dx * Math.max(0, Math.min(1, k)), y: gardien.pos.y };
    const g = gardien.notes;
    const pg = PN.gardien;
    // Placement (13/11) : un gardien bien placé ferme l'angle, il a moins à couvrir.
    const ecart = Math.abs(point.x - gardien.pos.x) * Math.max(0.6, Math.min(1.4, 1 - (g.placement - PN.reference) * pg.placementParPoint));
    const distTir = dist(s.ballon, but);
    const loin = t.arretParMetreDistance * Math.max(0, distTir - 11); // de loin, le gardien a le temps
    const base = penalty ? r.fautes.arretPenaltyProba : Math.max(t.arretMin, Math.min(0.95, t.arretMax - t.arretParMetre * Math.max(0, ecart - 0.5) + loin));
    // Notes : réflexes du gardien contre la puissance du tireur ; de près (face-à-face),
    // ses sorties contre le dribble du tireur (13/11).
    let ecartNotes = (g.reflexes - p.notes.puissance) * PN.tir.poidsPuissanceArret * pg.poidsReflexes;
    if (!penalty && distTir < pg.sortiesDistanceM) ecartNotes += (g.sorties - p.notes.dribble) * pg.poidsSorties;
    const proba = decaler(base, ecartNotes);
    this.arret = Math.abs(cible.x - but.x) > DEMI_BUT_M ? "non" : this.rng.suivant() < proba ? "oui" : "non";
    this.plongeon = { gardien, point };
    gardien.plongeJusqua = s.temps + t.plongeonDureeS;
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
        // Buteur (13/11) : le dernier à avoir touché le ballon ; contre son camp s'il est de l'autre équipe.
        const m = s.minutesJouees();
        this.buts.push({
          camp: marqueur,
          joueur: this.dernier?.joueur.nom ?? null,
          contreSonCamp: !!this.dernier && this.dernier.camp !== marqueur,
          minute: Math.min(s.debutPeriode > 0 ? 90 : 45, Math.floor(m.affilee) + 1 + (s.debutPeriode > 0 ? 45 : 0)),
        });
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
          this.remettre({ x: x < W / 2 ? W / 2 - 9.16 : W / 2 + 9.16, y: y >= L ? L - 5.5 : 5.5 }, camp, "sixMetres", "Six mètres", gardien);
        }
      }
      return;
    }
    if (x <= 0 || x >= W) {
      this.stats.sorties++;
      const camp: Camp = this.dernier ? (this.dernier.camp === 0 ? 1 : 0) : s.possession;
      this.stats.touches++;
      this.remettre({ x: x <= 0 ? 0.5 : W - 0.5, y }, camp, "touche", "Touche");
      return;
    }
    s.ballon = { x, y };
  }

  private reprendre(): void {
    const s = this.sim;
    if (s.temps < this.airJusqua) return; // ballon en l'air
    const r = s.reglages.ballon;
    const vBalle = Math.hypot(this.vit.x, this.vit.y);
    let gagnant: JoueurSim | null = null;
    let meilleurD = Infinity;
    for (const j of s.joueurs) {
      if (this.reserve && s.temps < this.reserve.jusqua && j.camp !== this.reserve.camp) continue;
      if (j === this.dernier && s.temps - this.dernierTemps < r.recontactS) continue;
      const gardienAdverse = j.poste.id === "G" && this.tirEnCours && this.dernier !== null && j.camp !== this.dernier.camp;
      // Notes : le duel donne la portée sur le ballon (interceptions, ballons disputés, têtes).
      let portee = this.portee(j);
      // Passe bien dosée (note de passe du passeur) : plus dure à intercepter.
      if (this.receveur && this.dernier && j.camp !== this.dernier.camp && j.poste.id !== "G" && this.dernier.notes.passe !== PN.reference)
        portee *= 1 - (this.dernier.notes.passe - PN.reference) * PN.technique.interceptionParPoint;
      const rayon = j === this.receveur ? r.rayonReceveurM : gardienAdverse ? r.tir.rayonPlongeonM : j.poste.id === "G" ? r.rayonGardienM : r.rayonControleM * portee;
      const d = dist(j.pos, s.ballon);
      if (d > rayon) continue;
      const adverseDuTireur = this.dernier !== null && j.camp !== this.dernier.camp && j.poste.id !== "G";
      if (adverseDuTireur && !this.tirPenalty && vBalle > r.contre.vitesseMinMS && d <= r.rayonControleM * portee) {
        // Tir (12/11, « pas assez de buts » : 41 % des tirs étaient contrés) : un défenseur
        // sur la trajectoire ne touche le ballon qu'une fois sur deux ; sinon le tir passe.
        if (this.tirEnCours) {
          if (this.tirEvite.has(j)) continue;
          if (this.rng.suivant() > r.tir.contreProba) {
            this.tirEvite.add(j);
            continue;
          }
        }
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
      if (d / portee < meilleurD) {
        meilleurD = d / portee;
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
    if (this.tirEnCours && gagnant.poste.id === "G") {
      this.stats.arrets[gagnant.camp]++;
      this.evenement = { texte: "Arrêt", a: s.temps };
      // Réflexes (13/11) : un bon gardien bloque plus souvent au lieu de repousser.
      if (this.rng.suivant() < decaler(r.tir.paradeProba, -(gagnant.notes.reflexes - PN.reference) * PN.gardien.poidsCaptage)) {
        // Parade : le gardien repousse le ballon sur le côté, derrière sa ligne (corner).
        const versLigne = gagnant.camp === 0 ? -1 : 1;
        const cote = s.ballon.x < s.donnees.largeurM / 2 ? -1 : 1;
        this.vit = { x: cote * this.rng.entre(9, 13), y: versLigne * this.rng.entre(2.5, 4) }; // surtout de côté : sort hors du cadre
        this.dernier = gagnant;
        this.dernierTemps = s.temps;
        this.tirEnCours = false;
        this.plongeon = null;
        return;
      }
    }
    if (gagnant === this.receveur && !this.tirEnCours) {
      // Receveur serré par un adversaire : contrôle parfois raté (pressing, 12/11).
      const g = s.reg(gagnant.camp === 0 ? 1 : 0).ballon.gene;
      // Notes : dribble du receveur (contrôle sous pression) contre duel de l'adversaire le plus proche.
      let serre: JoueurSim | null = null;
      for (const o of s.joueurs) {
        if (o.camp === gagnant.camp || o.poste.id === "G" || dist(o.pos, gagnant.pos) >= g.controleRayonM) continue;
        if (!serre || dist(o.pos, gagnant.pos) < dist(serre.pos, gagnant.pos)) serre = o;
      }
      if (serre && this.rng.suivant() < decaler(g.controleRate, serre.notes.duel - gagnant.notes.dribble)) {
        const a = this.rng.entre(-Math.PI, Math.PI);
        this.vit = { x: Math.cos(a) * 4, y: Math.sin(a) * 4 };
        this.dernier = gagnant;
        this.dernierTemps = s.temps;
        this.receveur = null;
        this.horsJeu = false;
        return;
      }
    }
    if (gagnant === this.receveur) this.stats.passesReussies[gagnant.camp]++;
    else if (this.dernier && gagnant.camp !== this.dernier.camp) this.stats.interceptions[gagnant.camp]++;
    this.donner(gagnant);
  }

  /** Avantage du porteur en 1 contre 1, en points de notes : dribble contre duel,
   *  plus une part de l'écart d'accélération (la vitesse fait passer). */
  private avantage1c1(p: JoueurSim, o: JoueurSim): number {
    return p.notes.dribble - o.notes.duel + PN.unContreUn.poidsVitesse * (p.notes.acceleration - o.notes.acceleration);
  }

  /** Avance de vitesse de pointe (points de notes, 0 au mieux) d'un joueur sur l'adversaire le plus proche d'un point. */
  private avantageVitesse(q: JoueurSim, point: PointM, adverses: JoueurSim[]): number {
    let o: JoueurSim | null = null;
    for (const a of adverses) if (a.poste.id !== "G" && (!o || dist(a.pos, point) < dist(o.pos, point))) o = a;
    return o ? Math.max(0, q.notes.pointe - o.notes.pointe) : 0;
  }

  /** Note de passe : multiplicateur de l'imprécision (1 à la référence). */
  private precisionPasse(j: JoueurSim | null): number {
    const e = j ? j.notes.passe - PN.reference : 0;
    return e === 0 ? 1 : Math.exp(-e * PN.technique.imprecisionPasseParPoint);
  }

  /** Note de duel : portée sur le ballon (1 à la référence ; gardien : toujours 1). */
  private portee(j: JoueurSim): number {
    return j.poste.id === "G" ? 1 : 1 + (j.notes.duel - PN.reference) * PN.physique.porteeParPoint;
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
    this.airJusqua = -Infinity;
    this.tireur = null;
    this.plongeon = null;
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
    // Remise en jeu : petite pause avant de jouer (le tireur se place).
    if (this.arrete) this.decisionA = this.sim.temps + this.rng.entre(r.pauseArretS.min, r.pauseArretS.max);
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
    const vMax = this.sim.reglages.mouvement.vitesseMaxMS * j.vitesseF;
    for (let t = 0; t <= 3; t += 1 / 15) {
      const b = this.pointArrivee(t);
      if (dist(j.pos, b) <= vMax * t + this.sim.reglages.ballon.rayonControleM) return b;
    }
    return this.pointArrivee(3);
  }

  /** Ajuste les cibles de course dues au ballon : le porteur avance, le
   *  destinataire va au ballon, les plus proches des deux équipes le disputent. */
  surcharger(): void {
    this.surchargerBallon();
    if (!this.engagement && !this.arrete) for (const camp of [0, 1] as const) this.marquer(camp);
  }

  /** Jeu sans ballon de l'équipe qui attaque (référence §5 ; 12/11, « plus
   *  réaliste dans les mouvements ») :
   *  - appel en profondeur : quand le porteur a du temps, un attaquant part
   *    dans le dos de la défense, en diagonale ; le porteur lève la tête
   *    (décision avancée) ; le défenseur le plus proche le suit, côté but ;
   *  - soutien : les deux coéquipiers les plus proches, si un adversaire coupe
   *    leur ligne de passe, font un pas de côté ou décrochent pour l'ouvrir.
   *  Ces décalages dépendent des adversaires, mais restent bornés autour de la
   *  place donnée par la projection (pas de dérive, référence §9.2 règle 6). */
  /** Un adversaire (hors gardien) devant le porteur, dans un cône de
   *  construction.boucheM : l'avant est bouché, on ne fonce pas dedans. */
  private avantBouche(p: JoueurSim): boolean {
    const s = this.sim;
    const sens = p.camp === 0 ? 1 : -1;
    const b = s.reg(p.camp).ballon.construction.boucheM;
    return s.joueurs.some((o) => {
      if (o.camp === p.camp || o.poste.id === "G") return false;
      const avant = (o.pos.y - p.pos.y) * sens;
      return avant > 0 && avant < b && Math.abs(o.pos.x - p.pos.x) < 2 + avant * 0.6;
    });
  }

  /** Effets du contre-pressing adverse sur ce porteur (neutres hors de la fenêtre de contre-pressing). */
  private contrePresse(p: JoueurSim): { precipite: number; gene: number } {
    const adv: Camp = p.camp === 0 ? 1 : 0;
    const cp = this.sim.reg(adv).ballon.contrePressing;
    const actif = this.perte !== null && this.perte.camp === adv && this.sim.temps - this.perte.a < cp.dureeS;
    return actif ? { precipite: cp.precipite, gene: cp.gene } : { precipite: 1, gene: 1 };
  }

  /** Secondes depuis que l'équipe `camp` a récupéré le ballon (Infinity : pas de récupération connue). */
  private depuisRecuperation(camp: Camp): number {
    return this.perte && this.perte.camp !== camp ? this.sim.temps - this.perte.a : Infinity;
  }

  private jeuSansBallon(p: JoueurSim): void {
    const s = this.sim;
    const sb = s.reg(p.camp).ballon.sansBallon;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const sens = p.camp === 0 ? 1 : -1;
    const prof = (y: number) => (sens === 1 ? y : L - y); // profondeur vers le but adverse
    const adverses = s.joueurs.filter((o) => o.camp !== p.camp);
    const ap = sb.appel;

    // Fin de l'appel : temps écoulé, autre porteur d'une autre équipe, ou hors-jeu sans ballon.
    if (this.appel && (s.temps > this.appel.fin || this.appel.joueur.camp !== p.camp || this.appel.joueur === p)) this.appel = null;
    const avantDernier = adverses.map((o) => prof(o.pos.y)).sort((a, b) => b - a)[1] ?? L;
    if (this.appel && prof(this.appel.joueur.pos.y) > avantDernier + 2 && this.receveur !== this.appel.joueur) this.appel = null;

    // Nouvel appel : le porteur a du temps, dans la moitié de terrain qui compte.
    const enContre = this.depuisRecuperation(p.camp) < s.reg(p.camp).ballon.contreAttaque.dureeS;
    const pressé = !enContre && adverses.some((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < s.reglages.ballon.pressionM * 1.5);
    const frequence = ap.parSeconde * (enContre ? s.reg(p.camp).ballon.contreAttaque.appelsFois : 1);
    const dt = s.temps - this.dernierTirageAppel;
    this.dernierTirageAppel = s.temps;
    if (!this.appel && !pressé && !this.arrete && p.poste.id !== "G" && prof(p.pos.y) > ap.zoneM && L - prof(p.pos.y) > 20 && this.rng.suivant() < frequence * dt) {
      const candidats = s.joueurs.filter((q) => {
        if (q.camp !== p.camp || q === p || q.poste.id === "G" || q.auBallon) return false;
        if (q.poste.ligneDefense !== "attaque" && !(q.poste.id === "AG" || q.poste.id === "AD" || q.poste.id === "MC")) return false;
        const ecart = avantDernier - prof(q.pos.y);
        return ecart >= ap.ecartMinM && ecart <= ap.ecartMaxM && prof(q.pos.y) - prof(p.pos.y) >= ap.avanceBallonM;
      });
      // Le plus libre (le plus loin de son adversaire le plus proche), et le plus
      // rapide face à son adversaire (notes, 12/11 : « la vitesse, c'est super important »).
      const libreDe = (q: JoueurSim) => Math.min(...adverses.map((o) => dist(o.pos, q.pos))) + this.avantageVitesse(q, q.pos, adverses) * PN.vitesse.appelParPoint;
      const q = candidats.sort((a, b) => libreDe(b) - libreDe(a))[0];
      if (q) {
        const yBut = sens === 1 ? L : 0;
        const profPoint = Math.min(avantDernier + ap.profondeurM, L - 6);
        const point = { x: Math.min(W - 3, Math.max(3, q.pos.x + (W / 2 - q.pos.x) * ap.diagonale)), y: yBut - sens * (L - profPoint) };
        this.appel = { joueur: q, fin: s.temps + ap.dureeS, point };
        this.decisionA = Math.min(this.decisionA, s.temps + 0.35); // le porteur lève la tête
      }
    }
    if (this.appel && this.receveur !== this.appel.joueur) {
      const q = this.appel.joueur;
      q.cible = { ...this.appel.point };
      q.sprintJusqua = Math.max(q.sprintJusqua, this.appel.fin);
      // Le défenseur le plus proche suit l'appel, côté but.
      const suiveur = adverses
        .filter((o) => o.poste.ligneDefense === "defense" && !o.auBallon && dist(o.pos, q.pos) < ap.suivreRayonM)
        .sort((a, b) => dist(a.pos, q.pos) - dist(b.pos, q.pos))[0];
      if (suiveur) {
        suiveur.cible = { x: q.pos.x + (W / 2 - q.pos.x) * 0.15, y: q.pos.y + sens * 2.5 };
        suiveur.auBallon = true;
        suiveur.sprintJusqua = Math.max(suiveur.sprintJusqua, this.appel.fin);
      }
    }

    // Soutien : ouvrir une ligne de passe pour les plus proches.
    const so = sb.soutien;
    const libre = (a: PointM, b: PointM) => !adverses.some((o) => distSegment(o.pos, a, b) < s.reglages.ballon.voieLibreM + 0.5);
    const proches = s.joueurs
      .filter((q) => q.camp === p.camp && q !== p && q.poste.id !== "G" && !q.auBallon && this.appel?.joueur !== q && dist(q.cible, p.pos) < so.rayonM)
      .sort((a, b) => dist(a.cible, p.pos) - dist(b.cible, p.pos))
      .slice(0, so.joueurs);
    for (const q of proches) {
      // Triangles : le soutien se rapproche du porteur (sans le coller).
      const dq = dist(q.cible, p.pos);
      if (dq > so.distanceM) {
        const k = Math.min(so.rapprochementMaxM, dq - so.distanceM) / dq;
        q.cible = { x: q.cible.x + (p.pos.x - q.cible.x) * k, y: q.cible.y + (p.pos.y - q.cible.y) * k };
      }
      if (libre(p.pos, q.cible)) continue;
      const dx = q.cible.x - p.pos.x;
      const dy = q.cible.y - p.pos.y;
      const n = Math.hypot(dx, dy) || 1;
      const px = -dy / n;
      const py = dx / n;
      const essais = [...so.decalagesM.map((k) => ({ x: q.cible.x + px * k, y: q.cible.y + py * k })), { x: q.cible.x, y: q.cible.y - sens * so.reculM }];
      const bon = essais.find((e) => e.x > 2 && e.x < W - 2 && libre(p.pos, e) && Math.min(...adverses.map((o) => dist(o.pos, e))) > 3);
      if (bon) q.cible = bon;
    }
  }

  /** Défense de la surface : quand le ballon approche de son but, chaque
   *  défenseur libre suit un attaquant dangereux, côté but, à 1,5 m. */
  private marquer(campDef: Camp): void {
    const s = this.sim;
    const m = s.reg(campDef).ballon.marquage;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const but = { x: W / 2, y: campDef === 0 ? 0 : L };
    if (dist(s.ballon, but) > m.declenchementM) {
      this.fermerLignes(campDef, m.zonePressingM, m.rayonM);
      return;
    }
    const dangereux = s.joueurs
      .filter((a) => a.camp !== campDef && a.poste.id !== "G" && a !== this.porteur && dist(a.pos, but) < m.zoneM && Math.abs(a.pos.x - W / 2) < m.demiLargeurM)
      .sort((a, b) => dist(a.pos, but) - dist(b.pos, but));
    const libres = s.joueurs.filter((d) => d.camp === campDef && !d.auBallon && (d.poste.ligneDefense === "defense" || (m.milieux && d.poste.ligneDefense === "milieu")));
    for (const a of dangereux) {
      let meilleur: JoueurSim | null = null;
      for (const d of libres) if (dist(d.pos, a.pos) < m.rayonM && (!meilleur || dist(d.pos, a.pos) < dist(meilleur.pos, a.pos))) meilleur = d;
      if (!meilleur) continue;
      libres.splice(libres.indexOf(meilleur), 1);
      const n = dist(a.pos, but) || 1;
      meilleur.cible = { x: a.pos.x + ((but.x - a.pos.x) / n) * m.distanceM, y: a.pos.y + ((but.y - a.pos.y) / n) * m.distanceM };
      meilleur.auBallon = true; // il colle son attaquant (évitement réduit)
    }
  }

  /** Pressing (référence §4) : pendant qu'un joueur presse le porteur, les
   *  milieux et attaquants libres ferment les lignes de passe en se plaçant
   *  entre le ballon et les adversaires proches. Inactif si zone = 0. */
  private fermerLignes(campDef: Camp, zoneM: number, rayonM: number): void {
    const s = this.sim;
    const p = this.porteur;
    if (zoneM <= 0 || !p || p.camp === campDef) return;
    const solutions = s.joueurs
      .filter((a) => a.camp !== campDef && a !== p && a.poste.id !== "G" && dist(a.pos, s.ballon) < zoneM)
      .sort((a, b) => dist(a.pos, s.ballon) - dist(b.pos, s.ballon));
    const libres = s.joueurs.filter((d) => d.camp === campDef && !d.auBallon && (d.poste.ligneDefense === "milieu" || d.poste.ligneDefense === "attaque"));
    for (const a of solutions) {
      let meilleur: JoueurSim | null = null;
      for (const d of libres) if (dist(d.pos, a.pos) < rayonM && (!meilleur || dist(d.pos, a.pos) < dist(meilleur.pos, a.pos))) meilleur = d;
      if (!meilleur) continue;
      libres.splice(libres.indexOf(meilleur), 1);
      const n = dist(a.pos, s.ballon) || 1;
      meilleur.cible = { x: a.pos.x + ((s.ballon.x - a.pos.x) / n) * 2, y: a.pos.y + ((s.ballon.y - a.pos.y) / n) * 2 };
      meilleur.auBallon = true;
    }
  }

  private surchargerBallon(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const vMax = s.reglages.mouvement.vitesseMaxMS;
    for (const x of s.joueurs) x.auBallon = false;
    if (this.engagement) {
      for (const j of s.joueurs) j.cible = { ...j.depart };
      const kicker = this.engageur();
      kicker.cible = { x: s.ballon.x, y: s.ballon.y - (kicker.camp === 0 ? 0.8 : -0.8) };
      this.placerPartenaire(this.engagement.camp, kicker);
      this.eloignerEngagement(this.engagement.camp); // adversaires dans leur moitié, hors du rond
      return;
    }
    if (this.tirEnCours && this.plongeon) {
      this.plongeon.gardien.cible = { ...this.plongeon.point };
      this.plongeon.gardien.auBallon = true;
    }

    if (this.porteur) {
      const p = this.porteur;
      const sens = p.camp === 0 ? 1 : -1;
      p.auBallon = true;
      // Un engagement se joue au point central : loin du centre, ce n'en est plus un.
      if (this.arrete === "engagement" && dist(p.pos, { x: W / 2, y: L / 2 }) > 4) {
        this.arrete = null;
        this.placePartenaire = null;
      }
      if (p.poste.id === "G" || this.arrete) p.cible = { ...p.pos }; // remise en jeu : il attend sur place
      else {
        const butAdv = { x: W / 2, y: sens === 1 ? L : 0 };
        const dBut = dist(p.pos, butAdv);
        // Avant bouché (12/11, « les actions finissent trop vite en tir ») : il
        // ne fonce plus dans le bloc, il temporise et cherche une passe : il
        // s'écarte de côté de l'adversaire le plus proche (il protège le ballon).
        const bouche = this.avantBouche(p);
        const avance = bouche ? s.reg(p.camp).ballon.construction.temporiseM : r.dribbleAvanceM;
        p.cible =
          dBut < 35 // dernier tiers : droit vers le but
            ? { x: p.pos.x + ((butAdv.x - p.pos.x) / dBut) * avance, y: p.pos.y + ((butAdv.y - p.pos.y) / dBut) * avance }
            : { x: p.pos.x + (W / 2 - p.pos.x) * 0.2, y: Math.min(L - 3, Math.max(3, p.pos.y + sens * avance)) };
        if (bouche) {
          const proche = s.joueurs
            .filter((o) => o.camp !== p.camp && o.poste.id !== "G")
            .reduce((a, o) => (dist(o.pos, p.pos) < dist(a.pos, p.pos) ? o : a));
          const cote = proche.pos.x > p.pos.x ? -1 : 1;
          const ecart = s.reg(p.camp).ballon.construction.ecartM;
          p.cible = { x: Math.min(W - 2, Math.max(2, p.cible.x + cote * ecart)), y: p.cible.y };
        }
        // Un adversaire arrive sur lui : il décide tout de suite (passe avant le tacle).
        const rp = s.reg(p.camp).ballon;
        if (this.decisionA > s.temps + rp.reactionPressionS && s.joueurs.some((o) => o.camp !== p.camp && o.poste.id !== "G" && dist(o.pos, p.pos) < rp.pressionM)) {
          this.decisionA = s.temps + rp.reactionPressionS;
        }
      }
      if (this.arrete === "engagement") {
        this.placerPartenaire(p.camp, p); // un coéquipier à côté pour recevoir l'engagement
        this.eloignerEngagement(p.camp); // adversaires hors du rond (9,15 m) tant que l'engagement n'est pas joué
        return;
      }
      if (this.arrete === "sixMetres") {
        this.viderSurface(p.camp);
        return;
      }
      if (this.arrete === "coupFranc") {
        this.eloigner(p.camp);
        return;
      }
      this.jeuSansBallon(p);
      const defense: Camp = p.camp === 0 ? 1 : 0;
      const rd = s.reg(defense).ballon; // pressing selon la tactique de l'équipe qui défend
      const cp = rd.contrePressing;
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
          { x: s.ballon.x - vers * 5, y: s.ballon.y + sens * 2 }, // contre-pressing renforcé : ferme l'extérieur
          { x: s.ballon.x, y: s.ballon.y + sens * 10 }, // et la passe longue vers l'avant
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
        .filter((j) => {
          if (j.camp === p.camp || j.poste.id === "G") return false;
          // Un défenseur central sort sur le porteur dans l'axe devant lui (duel, référence §6).
          const sortie = j.poste.id === "DC" && Math.abs(p.pos.x - W / 2) < rd.sortieDC.axeM ? rd.sortieDC.distanceM : 0;
          return dist(j.pos, p.pos) < Math.max(rd.pressingM, sortie) * j.effet.pressing;
        })
        .sort((a, b) => dist(a.pos, p.pos) - dist(b.pos, p.pos))
        .slice(0, rd.presseurs);
      // 1er : sur le porteur ; 2e : couvre vers le but ; 3e (pressing haut) : ferme la passe vers l'intérieur.
      const vers = W / 2 - s.ballon.x > 0 ? 1 : -1;
      presseurs.forEach((j, i) => {
        j.auBallon = i === 0;
        j.cible =
          i === 0 ? { ...s.ballon }
          : i === 1 ? { x: s.ballon.x + (W / 2 - s.ballon.x) * 0.2, y: s.ballon.y + sens * 6 }
          : { x: s.ballon.x + vers * 7, y: s.ballon.y + sens * 3 };
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
      else if (this.reserve && this.reserve.camp !== camp) {
        nombre = 0;
        if (this.arrete === "coupFranc") this.eloigner(this.reserve.camp);
        if (this.arrete === "engagement") this.eloignerEngagement(this.reserve.camp);
      }
      else if (this.reserve && this.tireur) {
        nombre = 0;
        if (this.arrete === "sixMetres") this.viderSurface(this.tireur.camp);
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
      // Coup d'envoi : pendant que l'un va au ballon, un coéquipier se place à côté.
      if (this.arrete === "engagement" && this.reserve?.camp === camp && proches[0]) this.placerPartenaire(camp, proches[0].j);
    }
  }
}
