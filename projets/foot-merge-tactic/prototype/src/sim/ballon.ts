// Ballon réel (mission 2) : le ballon a une position et une vitesse, il est
// porté par un joueur ou roule seul. Les joueurs le conduisent, le passent, le
// tirent ; l'adversaire l'intercepte ou le tacle. La possession est celle du
// dernier joueur qui l'a touché : plus de possession simulée.
//
// Tout reste déterministe (générateur à graine) et indépendant de l'affichage.
//
// Ce fichier ne garde que l'état du ballon, ce que le reste du jeu en lit, le
// pas de temps et les trois changements d'état élémentaires (posé pour une
// remise en jeu, donné à un joueur, lancé). Le jeu lui-même est dans ballon/
// (découpage du 17/11, prompt A1 ; comportement inchangé au bit près) :
//   decision.ts   ce que fait le porteur (tir, centre, repiquage, dribble, jeu long, passe…)
//   gestes.ts     comment le ballon part (précision, vitesse, dosage ; plongeon du gardien)
//   defense.ts    tacles et fautes, pressing, contre-pressing, lignes fermées, marquage
//   sansBallon.ts appels, montées des latéraux, second poteau, soutien
//   arrets.ts     engagement, touche, six mètres, corner, coup franc, penalty
//   physique.ts   conduite, roulement, sorties, buts, surface, hors-jeu
//   controle.ts   qui prend le ballon libre : interception, contre, arrêt, contrôle raté
//   stats.ts      statistiques d'équipe et de joueur, éclats de style
//   outils.ts     géométrie, avantages tirés des notes, lecture de la situation
// Chaque module reçoit le BallonReel et lit ou modifie son état : les champs
// ci-dessous sont donc ouverts, mais seuls ceux marqués « lu par le jeu » sont
// faits pour être lus hors de src/sim/.

import { Aleatoire } from "./rng";
import type { Camp, JoueurSim, MatchSim } from "./simulation";
import type { PointM } from "./types";
import { annulerEngagementLoin, attendreEngagement, placerPendantArret, placerPourEngagement, preparerEngagement } from "./ballon/arrets";
import { coursesBallonLibre, reprendre } from "./ballon/controle";
import { ciblePorteur, decider } from "./ballon/decision";
import { defendrePorteur, marquer, tacler } from "./ballon/defense";
import { suivrePlongeon } from "./ballon/gestes";
import { conduire, rouler } from "./ballon/physique";
import { jeuSansBallon, suivreMontee } from "./ballon/sansBallon";
import { type StatsBallon, type StatsJoueur, statsBallonVides } from "./ballon/stats";

export { type StatsBallon, type StatsJoueur, statsVides } from "./ballon/stats";

/** Coup de pied arrêté (ou remise en jeu) en attente. */
export type CoupArrete = "corner" | "penalty" | "engagement" | "sixMetres" | "coupFranc" | "touche";

export class BallonReel {
  // --- Lu par le jeu (simulation, film, écran, tests) ---------------------------
  vit: PointM = { x: 0, y: 0 };
  /** Joueur qui a le ballon aux pieds (null : ballon libre). Lu par le jeu. */
  porteur: JoueurSim | null = null;
  /** Dernier joueur à avoir touché le ballon. Lu par le jeu. */
  dernier: JoueurSim | null = null;
  /** Remise en jeu : seule cette équipe peut prendre le ballon jusqu'à cet instant. Lu par le jeu. */
  reserve: { camp: Camp; jusqua: number } | null = null;
  /** Dernier événement de jeu, pour l'affichage (« Corner », « Hors-jeu »…). Lu par le jeu. */
  evenement: { texte: string; a: number } | null = null;
  /** Après un but : chacun regagne son camp avant l'engagement. Lu par le jeu. */
  engagement: { camp: Camp; depuis: number; minS: number } | null = null;
  /** Buts du match, dans l'ordre : équipe qui marque, buteur, minute. Lu par le jeu. */
  buts: { camp: Camp; joueur: string | null; contreSonCamp: boolean; minute: number }[] = [];
  /** Statistiques d'équipe. Lu par le jeu. */
  readonly stats: StatsBallon = statsBallonVides();
  /** Statistiques de chaque joueur (13/11, pour la note de match), par « camp:id ». Lu par le jeu. */
  readonly statsJoueurs = new Map<string, StatsJoueur>();
  /** Actions réussies grâce à un style (14/11) : l'écran fait briller le pictogramme
   *  du joueur. Simple trace : elle ne change rien au jeu. Lu par le jeu. */
  readonly actionsStyle: { t: number; camp: Camp; id: string; style: string }[] = [];

  // --- État interne, partagé par les modules de ballon/ ---------------------------
  /** Destinataire de la passe en cours. */
  receveur: JoueurSim | null = null;
  tirEnCours = false;
  /** Instant du dernier contact (le même joueur ne retouche pas le ballon aussitôt). */
  dernierTemps = -Infinity;
  /** Coup de pied arrêté en attente : le premier joueur de l'équipe qui prend le ballon le joue. */
  arrete: CoupArrete | null = null;
  /** Joueur désigné pour la remise en jeu (le gardien sur un six mètres). */
  tireur: JoueurSim | null = null;
  /** Touche (13/11, « il y a double touche ») : le lanceur ne rejoue pas le
   *  ballon avant qu'un autre joueur l'ait touché. */
  lanceur: JoueurSim | null = null;
  /** Partenaire de l'engagement et sa place à côté du ballon. */
  placePartenaire: { joueur: JoueurSim; point: PointM; depuis: number } | null = null;
  /** Dernière perte de balle en jeu (pas sur une remise en jeu) : contre-pressing. */
  perte: { camp: Camp; a: number } | null = null;
  /** Instant de la prochaine décision du porteur. */
  decisionA = 0;
  /** Le porteur protège son ballon jusqu'à cet instant (tacles plus difficiles). */
  protegeJusqua = 0;
  /** Direction de conduite lissée : le ballon ne saute pas d'un côté à l'autre du joueur. */
  dir: PointM = { x: 0, y: 1 };
  /** Ballon aérien (centre, dégagement) : début du vol, et personne ne le touche avant la fin. */
  airDebut = 0;
  airJusqua = -Infinity;
  /** Le receveur de la passe en cours était hors-jeu au départ de la passe. */
  horsJeu = false;
  tirPenalty = false;
  /** Plongeon du gardien sur le tir en cours, et son issue tirée au sort. */
  plongeon: { gardien: JoueurSim; point: PointM } | null = null;
  arret: "?" | "oui" | "non" = "?";
  /** Défenseurs que le tir en cours a déjà passés sans les toucher. */
  tirEvite = new Set<JoueurSim>();
  /** Appel en profondeur en cours (jeu sans ballon), et dernier tirage au sort d'un appel. */
  appel: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  dernierTirageAppel = 0;
  /** Montée du latéral en cours (14/11), et dernier tirage au sort d'une montée. */
  montee: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  dernierTirageMontee = 0;
  /** Ailier qui repique balle au pied (14/11). */
  repique: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  /** Receveur d'une passe dans l'espace ou d'un ballon long (pour le Rapide). */
  espacePour: JoueurSim | null = null;
  /** Passeur d'une passe jouée sous pression (pour le Technicien). */
  sousPressionDe: JoueurSim | null = null;
  /** Dernière passe réussie (pour les passes décisives). */
  passeReussie: { de: JoueurSim; vers: JoueurSim; t: number } | null = null;
  /** Hasard du ballon, à part de celui des déplacements. */
  readonly rng: Aleatoire;

  constructor(readonly sim: MatchSim, graine: number) {
    this.rng = new Aleatoire((graine ^ 0x9e3779b9) >>> 0);
  }

  // --- Lectures -----------------------------------------------------------------

  /** Engagement à jouer (début de période ou après un but). */
  get enEngagement(): boolean {
    return this.engagement !== null || this.arrete === "engagement";
  }

  /** Jeu arrêté (remise en jeu, coup franc, corner, engagement à jouer). */
  get arretDeJeu(): boolean {
    return this.arrete !== null || this.engagement !== null;
  }

  /** Hauteur relative du ballon aérien (0 au sol, 1 au sommet de sa trajectoire) : affichage. */
  get hauteur(): number {
    if (this.sim.temps >= this.airJusqua) return 0;
    const t = (this.sim.temps - this.airDebut) / Math.max(0.01, this.airJusqua - this.airDebut);
    return Math.max(0, 4 * t * (1 - t));
  }

  get enLAir(): boolean {
    return this.sim.temps < this.airJusqua;
  }

  // --- Commandes de la simulation ------------------------------------------------

  /** Coup d'envoi d'une nouvelle période (2e mi-temps) : comme après un but,
   *  chacun regagne sa place de départ, puis `camp` engage. */
  coupDEnvoi(camp: Camp, texte: string): void {
    preparerEngagement(this, camp, texte);
  }

  /** Mi-temps : des joueurs sortent du terrain, on oublie ceux qu'on suivait. */
  oublierJoueurs(): void {
    this.porteur = null;
    this.receveur = null;
    this.dernier = null;
    this.tireur = null;
    this.plongeon = null;
    this.perte = null;
    this.passeReussie = null;
    this.lanceur = null;
    this.tirEvite.clear();
  }

  /** Un pas de temps du ballon : attente de l'engagement, ballon aux pieds
   *  (conduite, tacles, décision du porteur) ou ballon libre (roulement, reprise). */
  pas(dt: number): void {
    if (this.engagement) {
      attendreEngagement(this);
      return;
    }
    if (this.porteur) {
      if (this.arrete) {
        // Remise en jeu : le tireur s'arrête, le ballon reste à sa place.
        this.porteur.vit = { x: 0, y: 0 };
        this.vit = { x: 0, y: 0 };
      } else {
        conduire(this);
        tacler(this, dt);
      } // remise en jeu pas encore jouée : ni conduite ni tacle
      if (this.porteur && this.sim.temps >= this.decisionA) decider(this);
    } else {
      rouler(this, dt);
      reprendre(this);
    }
  }

  /** Ajuste les cibles de course dues au ballon : le porteur avance, le
   *  destinataire va au ballon, les plus proches des deux équipes le disputent. */
  surcharger(): void {
    for (const x of this.sim.joueurs) x.auBallon = false;
    if (this.engagement) placerPourEngagement(this);
    else {
      suivrePlongeon(this);
      if (this.porteur) this.coursesAvecPorteur(this.porteur);
      else coursesBallonLibre(this);
    }
    suivreMontee(this);
    if (!this.engagement && !this.arrete) for (const camp of [0, 1] as const) marquer(this, camp);
  }

  /** Ballon aux pieds : course du porteur, placements d'une remise en jeu, ou
   *  jeu sans ballon de son équipe et pressing de l'adversaire. */
  private coursesAvecPorteur(p: JoueurSim): void {
    p.auBallon = true;
    annulerEngagementLoin(this, p);
    ciblePorteur(this, p);
    if (placerPendantArret(this, p)) return;
    jeuSansBallon(this, p);
    defendrePorteur(this, p);
  }

  // --- Les trois changements d'état du ballon ------------------------------------

  /** Remise en jeu (ou coup d'envoi) : le ballon est posé, l'équipe va le chercher. */
  remettre(point: PointM, camp: Camp, arrete: CoupArrete | null = null, texte?: string, tireur: JoueurSim | null = null): void {
    const s = this.sim;
    this.tireur = tireur;
    this.lanceur = null;
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

  /** Le joueur prend le ballon aux pieds ; son équipe a la possession. */
  donner(j: JoueurSim): void {
    const r = this.sim.reglages.ballon;
    if (j !== this.lanceur) this.lanceur = null;
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

  /** Le ballon quitte le pied du porteur avec cette vitesse : il devient libre. */
  lancer(vx: number, vy: number): void {
    this.airJusqua = -Infinity;
    this.dernier = this.porteur;
    this.dernierTemps = this.sim.temps;
    this.porteur = null;
    this.vit = { x: vx, y: vy };
    this.arret = "?";
  }
}
