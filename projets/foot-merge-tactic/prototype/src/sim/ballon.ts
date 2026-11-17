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
import { DEMI_BUT_M, avantBouche, avantage1c1, avantageVitesse, contrePresse, depuisRecuperation, dist, distSegment, fusions, portee, precisionPasse } from "./ballon/outils";
import { conduire, dansSurface, estHorsJeu, rouler } from "./ballon/physique";
import { pointInterception, reprendre } from "./ballon/controle";
import { attendreEngagement, eloigner, eloignerEngagement, jouerRemiseEnJeu, placerPartenaire, placerPendantArret, placerPourEngagement, preparerEngagement, viderSurface } from "./ballon/arrets";
import { defendrePorteur, marquer, tacler } from "./ballon/defense";
import { centrer, degager, dribbler, jouerLong, passer, suivrePlongeon, tirer } from "./ballon/gestes";
import { type StatsBallon, type StatsJoueur, noterStyle, statsBallonVides, statsJoueur } from "./ballon/stats";

export { type StatsBallon, type StatsJoueur, statsVides } from "./ballon/stats";

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
  placePartenaire: { joueur: JoueurSim; point: PointM; depuis: number } | null = null;
  /** Dernière perte de balle en jeu (pas sur une remise en jeu) : contre-pressing. */
  perte: { camp: Camp; a: number } | null = null;
  readonly stats: StatsBallon = statsBallonVides();

  dernierTemps = -Infinity;
  /** Direction de conduite lissée : le ballon ne saute pas d'un côté à l'autre du joueur. */
  dir: PointM = { x: 0, y: 1 };
  decisionA = 0;
  /** Appel en profondeur en cours (jeu sans ballon). */
  appel: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  /** Dernier instant où l'on a tiré au sort un appel. */
  dernierTirageAppel = 0;
  /** Montée du latéral en cours (14/11). */
  montee: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  dernierTirageMontee = 0;
  /** Ailier qui repique balle au pied (14/11). */
  repique: { joueur: JoueurSim; fin: number; point: PointM } | null = null;
  protegeJusqua = 0;
  /** Coup de pied arrêté en attente : le premier joueur de l'équipe qui prend le ballon le joue. */
  arrete: "corner" | "penalty" | "engagement" | "sixMetres" | "coupFranc" | "touche" | null = null;
  /** Plongeon du gardien sur le tir en cours. */
  plongeon: { gardien: JoueurSim; point: PointM } | null = null;
  /** Ballon aérien (centre, dégagement) : personne ne le touche avant cet instant. */
  airJusqua = -Infinity;

  /** Statistiques de chaque joueur (13/11, pour la note de match), par « camp:id ». */
  readonly statsJoueurs = new Map<string, StatsJoueur>();
  /** Actions réussies grâce à un style (14/11) : l'écran fait briller le pictogramme
   *  du joueur. Simple trace : elle ne change rien au jeu. */
  readonly actionsStyle: { t: number; camp: Camp; id: string; style: string }[] = [];
  /** Receveur d'une passe dans l'espace ou d'un ballon long (pour le Rapide). */
  espacePour: JoueurSim | null = null;
  /** Passeur d'une passe jouée sous pression (pour le Technicien). */
  sousPressionDe: JoueurSim | null = null;
  /** Touche (13/11, « il y a double touche ») : le lanceur ne rejoue pas le
   *  ballon avant qu'un autre joueur l'ait touché. */
  lanceur: JoueurSim | null = null;
  /** Dernière passe réussie (pour les passes décisives). */
  passeReussie: { de: JoueurSim; vers: JoueurSim; t: number } | null = null;

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

  /** Engagement à jouer (début de période ou après un but). */
  get enEngagement(): boolean {
    return this.engagement !== null || this.arrete === "engagement";
  }

  /** Jeu arrêté (remise en jeu, coup franc, corner, engagement à jouer). */
  get arretDeJeu(): boolean {
    return this.arrete !== null || this.engagement !== null;
  }

  /** Début du vol du ballon aérien en cours (pour sa hauteur à l'écran). */
  airDebut = 0;
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
  horsJeu = false;
  tirPenalty = false;
  /** Dernier événement de jeu, pour l'affichage (« Corner », « Hors-jeu »…). */
  evenement: { texte: string; a: number } | null = null;
  /** Après un but : chacun regagne son camp avant l'engagement. */
  engagement: { camp: Camp; depuis: number; minS: number } | null = null;
  /** Buts du match, dans l'ordre : équipe qui marque, buteur, minute. */
  buts: { camp: Camp; joueur: string | null; contreSonCamp: boolean; minute: number }[] = [];
  /** Défenseurs que le tir en cours a déjà passés sans les toucher. */
  tirEvite = new Set<JoueurSim>();
  /** Joueur désigné pour la remise en jeu (le gardien sur un six mètres). */
  tireur: JoueurSim | null = null;
  arret: "?" | "oui" | "non" = "?";
  readonly rng: Aleatoire;

  constructor(readonly sim: MatchSim, graine: number) {
    this.rng = new Aleatoire((graine ^ 0x9e3779b9) >>> 0);
  }

  /** Coup d'envoi (ou remise au centre) : le ballon est posé, l'équipe va le chercher. */
  remettre(point: PointM, camp: Camp, arrete: "corner" | "penalty" | "engagement" | "sixMetres" | "coupFranc" | "touche" | null = null, texte?: string, tireur: JoueurSim | null = null): void {
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

  /** Coup d'envoi d'une nouvelle période (2e mi-temps) : comme après un but,
   *  chacun regagne sa place de départ, puis `camp` engage. */
  coupDEnvoi(camp: Camp, texte: string): void {
    preparerEngagement(this, camp, texte);
  }

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
      if (this.porteur && this.sim.temps >= this.decisionA) this.decider();
    } else {
      rouler(this, dt);
      reprendre(this);
    }
  }

  // --- Ballon aux pieds ---------------------------------------------------

  decider(): void {
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
    this.decisionA = s.temps + this.rng.entre(r.decisionS.min, r.decisionS.max) * contrePresse(this, p).precipite;
    // Contre-attaque : juste après la récupération, on cherche l'avant.
    const poidsProgression = r.poidsProgression + (depuisRecuperation(this, p.camp) < r.contreAttaque.dureeS ? r.contreAttaque.bonusProgression : 0);

    if (jouerRemiseEnJeu(this, adverses, but, sens)) return;

    // Tir : dans la surface, on tire toujours (jamais de passe en retrait) ;
    // plus loin mais à portée et pas trop excentré, on tire parfois.
    if (p.poste.id !== "G") {
      const dansSurface = Math.abs(sens === 1 ? L - p.pos.y : p.pos.y) <= r.surface.profondeurM && Math.abs(p.pos.x - W / 2) <= r.surface.demiLargeurM;
      if (dansSurface) {
        tirer(this, but);
        return;
      }
      // Un joueur fusionné (14/11) ose plus (× 1 sans fusion : inchangé).
      const oseTir = 1 + fusions(p) * s.influences.fusion.tirLoinParNiveau;
      if (dBut < r.tirDistanceM && Math.abs(p.pos.x - W / 2) < dBut * 0.8 && this.rng.suivant() < (r.tirLoin.probaBase + r.tirLoin.probaMax * (1 - dBut / r.tirDistanceM)) * oseTir) {
        tirer(this, but);
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
      if (dBut < r.seulTirM) tirer(this, but);
      else this.decisionA = Math.min(this.decisionA, s.temps + 0.3); // il lève la tête souvent : tir dès qu'il est à portée
      return;
    }

    // Sur l'aile près de la ligne de but, avec un coéquipier dans la surface : centre.
    const c = r.centre;
    const versLigne = sens === 1 ? L - p.pos.y : p.pos.y;
    if (p.poste.id !== "G" && versLigne < c.zoneProfondeurM && Math.abs(p.pos.x - W / 2) > c.ecartAxeM && this.rng.suivant() < c.proba) {
      if (s.joueurs.some((q) => q.camp === p.camp && q !== p && dansSurface(this, q.pos, q.camp === 0 ? 1 : 0))) {
        centrer(this, but, sens);
        return;
      }
    }

    // Repiquage (14/11, « les ailiers jamais repiquent au centre pour aller
    // marquer ») : sur son côté, l'ailier rentre parfois dans l'axe balle au
    // pied, si l'intérieur est libre, pour tirer ou combiner ; le latéral de son
    // côté prend alors le couloir.
    const rq = r.repiquer;
    const profP = sens === 1 ? p.pos.y : L - p.pos.y;
    const enRepique = this.repique?.joueur === p && s.temps < this.repique.fin;
    if ((p.poste.id === "AG" || p.poste.id === "AD") && !enRepique && profP > rq.zoneProfM && versLigne > rq.versLigneMinM && Math.abs(p.pos.x - W / 2) > rq.ecartAxeM && this.rng.suivant() < rq.proba) {
      const cote = Math.sign(p.pos.x - W / 2);
      const point = { x: p.pos.x - cote * rq.rentreeM, y: p.pos.y + sens * rq.avanceM };
      if (!adverses.some((o) => o.poste.id !== "G" && distSegment(o.pos, p.pos, point) < rq.libreM)) {
        this.repique = { joueur: p, fin: s.temps + rq.dureeS, point };
        this.stats.repiquages[p.camp]++;
        this.decisionA = s.temps + rq.dureeS * 0.8;
        this.lancerMontee(p.camp, cote, true);
        return;
      }
    }

    // Dribble : face à un adversaire tout proche, un joueur offensif tente
    // parfois de l'éliminer plutôt que de passer.
    const db = r.dribble;
    const devant = adverses.find((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < db.distanceM && (o.pos.y - p.pos.y) * sens > -0.5);
    const tente = (p.poste.ligneDefense === "defense" ? db.probaTentative * 0.25 : p.poste.ligneDefense === "gardien" ? 0 : db.probaTentative) * (1 + fusions(p) * s.influences.fusion.tentativeParNiveau);
    // Notes : on tente plus souvent le 1 contre 1 quand on a l'avantage (dribble et accélération).
    if (devant && this.rng.suivant() < (tente > 0 ? decaler(tente, avantage1c1(p, devant) * PN.unContreUn.poidsTentative) : 0)) {
      dribbler(this, devant, sens);
      return;
    }

    // Jeu long (12/11) : depuis sa moitié ou le milieu, ballon aérien vers un
    // attaquant lancé ou libre, là où il arrivera avant les défenseurs.
    const jl = r.jeuLong;
    const deSonButJL = sens === 1 ? p.pos.y : L - p.pos.y;
    const probaJL = depuisRecuperation(this, p.camp) < r.contreAttaque.dureeS ? jl.probaContre : jl.proba;
    if (p.poste.id !== "G" && deSonButJL < jl.profondeurMaxM && probaJL > 0 && this.rng.suivant() < probaJL) {
      let choixJL: { q: JoueurSim; point: PointM; gain: number } | null = null;
      for (const q of s.joueurs) {
        if (q === p || q.camp !== p.camp || q.poste.id === "G") continue;
        if (estHorsJeu(this, q)) continue;
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
        jouerLong(this, choixJL.q, choixJL.point);
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
      if (estHorsJeu(this, q) && this.rng.suivant() > r.horsJeuVuProba) continue; // le passeur voit presque toujours le hors-jeu
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
      const enAppel = this.appel?.joueur === q || this.montee?.joueur === q; // 14/11 : le latéral qui monte aussi
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
        const versSurface = dansSurface(this, o.vise, adv);
        if (!libre(p.pos, o.vise)) continue;
        const ouvert = Math.min(8, Math.min(...adverses.map((a) => dist(a.pos, o.vise))));
        if (versSurface && (ouvert < r.construction.surfaceOuvertM || adverses.some((a) => distSegment(a.pos, p.pos, o.vise) < r.voieLibreM * r.construction.surfaceVoieFacteur))) continue;
        const gain = (o.vise.y - p.pos.y) * sens;
        const large = Math.abs(o.vise.x - W / 2) > r.construction.largeurM && (o.vise.y - L / 2) * sens > -10 ? r.construction.bonusLargeur : 0;
        // Notes : on cherche le coéquipier plus rapide que son adversaire direct (passe vers l'avant).
        const vitesse = gain > 0 ? avantageVitesse(q, o.vise, adverses) * PN.vitesse.choixPasseParPoint : 0;
        // Fusions (14/11) : on cherche davantage le joueur fusionné (+ 0 sans fusion).
        const vedette = fusions(q) * s.influences.fusion.passeVersLuiParNiveau;
        // Latéral qui monte devant le ballon (14/11) : le porteur le cherche (+ 0 sinon).
        const dedouble = this.montee?.joueur === q && gain > 0 ? r.sansBallon.montee.bonusPasse : 0;
        const sc = gain * poidsProgression + ouvert * r.poidsEspace - dist(p.pos, o.vise) * 0.08 + large - (versSurface ? r.construction.surfaceMalus : 0) + vitesse + vedette + dedouble + this.rng.entre(-2, 2);
        if (sc > score) {
          score = sc;
          meilleur = { q, point: o.point };
        }
      }
    }
    const presse = pression < r.pressionM;
    // Avant bouché (adversaire proche dans le cône) : il fait tourner le ballon
    // (passe latérale ou en retrait) plutôt que de foncer dans le bloc.
    const bouche = avantBouche(this, p);
    const seuil = bouche ? r.seuilPasse - r.construction.baisseSeuil : r.seuilPasse;
    if (meilleur && (p.poste.id === "G" || presse || score > seuil)) {
      passer(this, meilleur.q, presse, meilleur.point);
      return;
    }
    if (!presse) return; // rien d'ouvert : il continue de conduire

    // Pressé sans solution sûre : dégagement dans son tiers, sinon il protège.
    const deSonBut = sens === 1 ? p.pos.y : L - p.pos.y;
    if (deSonBut < r.degagement.zoneM && p.poste.id !== "G") {
      degager(this, sens);
      return;
    }
    if (fuite && deSonBut < r.zoneDegagementM) {
      passer(this, fuite, presse); // dégagement
      return;
    }
    this.protegeJusqua = s.temps + r.protection.dureeS;
  }

  lancer(vx: number, vy: number): void {
    this.airJusqua = -Infinity;
    this.dernier = this.porteur;
    this.dernierTemps = this.sim.temps;
    this.porteur = null;
    this.vit = { x: vx, y: vy };
    this.arret = "?";
  }

  // --- Ballon libre -------------------------------------------------------

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

  // --- Cibles de course ---------------------------------------------------

  /** Ajuste les cibles de course dues au ballon : le porteur avance, le
   *  destinataire va au ballon, les plus proches des deux équipes le disputent. */
  surcharger(): void {
    this.surchargerBallon();
    this.suivreMontee();
    if (!this.engagement && !this.arrete) for (const camp of [0, 1] as const) marquer(this, camp);
  }

  jeuSansBallon(p: JoueurSim): void {
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
    const enContre = depuisRecuperation(this, p.camp) < s.reg(p.camp).ballon.contreAttaque.dureeS;
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
      const libreDe = (q: JoueurSim) => Math.min(...adverses.map((o) => dist(o.pos, q.pos))) + avantageVitesse(q, q.pos, adverses) * PN.vitesse.appelParPoint;
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

    // Montée du latéral (14/11, « les latéraux ne montent jamais ») : quand on
    // attaque d'un côté dans la moitié adverse, le latéral de ce côté passe à
    // l'extérieur du porteur. Un seul à la fois ; à la perte du ballon, il revient
    // au sprint (transition), c'est le prix à payer (référence §6).
    const mo = sb.montee;
    if (this.montee && (s.temps > this.montee.fin || this.montee.joueur.camp !== p.camp || this.montee.joueur === p)) this.montee = null;
    const dtM = s.temps - this.dernierTirageMontee;
    this.dernierTirageMontee = s.temps;
    if (!this.montee && !this.arrete && p.poste.id !== "G" && prof(p.pos.y) > mo.zoneProfM && Math.abs(p.pos.x - W / 2) > mo.ecartAxeM) {
      const lat = this.lateralDuCote(p.camp, Math.sign(p.pos.x - W / 2));
      if (lat && this.rng.suivant() < mo.parSeconde * dtM * (1 + mo.bonusPlaceHaut * this.hauteurCase(lat))) this.lancerMontee(p.camp, Math.sign(p.pos.x - W / 2), false);
    }

    // Appel au second poteau (14/11, « les ailiers ont leur couloir, c'est trop
    // robotisé ») : ballon sur un côté du dernier tiers, l'ailier opposé rentre
    // vers le second poteau, sans se mettre hors-jeu.
    const sp = sb.secondPoteau;
    if (!this.arrete && prof(p.pos.y) > sp.zoneProfM && Math.abs(p.pos.x - W / 2) > sp.ecartAxeM) {
      const coteBallon = Math.sign(p.pos.x - W / 2);
      const profPoint = Math.min(L - sp.devantButM, avantDernier - 0.5);
      for (const q of s.joueurs) {
        if (q.camp !== p.camp || q === p || q.auBallon || this.appel?.joueur === q || this.montee?.joueur === q) continue;
        if ((q.poste.id !== "AG" && q.poste.id !== "AD") || Math.sign(q.cible.x - W / 2) === coteBallon) continue;
        if (prof(q.cible.y) > profPoint) continue;
        q.cible = { x: W / 2 - coteBallon * sp.poteauM, y: sens === 1 ? profPoint : L - profPoint };
      }
    }

    // Soutien : ouvrir une ligne de passe pour les plus proches.
    const so = sb.soutien;
    const libre = (a: PointM, b: PointM) => !adverses.some((o) => distSegment(o.pos, a, b) < s.reglages.ballon.voieLibreM + 0.5);
    const proches = s.joueurs
      .filter((q) => q.camp === p.camp && q !== p && q.poste.id !== "G" && !q.auBallon && this.appel?.joueur !== q && this.montee?.joueur !== q && dist(q.cible, p.pos) < so.rayonM)
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

  /** Le latéral qui monte garde sa course tant que son équipe a le ballon,
   *  passes comprises (sinon, ballon en l'air, il revenait vers sa place). */
  suivreMontee(): void {
    const mo = this.montee;
    if (!mo) return;
    const s = this.sim;
    if (this.engagement || this.arrete || s.temps > mo.fin || s.possession !== mo.joueur.camp) {
      this.montee = null;
      return;
    }
    if (this.porteur === mo.joueur || this.receveur === mo.joueur) return;
    mo.joueur.cible = { ...mo.point };
    mo.joueur.sprintJusqua = Math.max(mo.joueur.sprintJusqua, mo.fin);
  }

  /** Latéral (DG ou DD) d'une équipe du côté `cote` (signe de x − largeur/2). */
  lateralDuCote(camp: Camp, cote: number): JoueurSim | undefined {
    const W = this.sim.donnees.largeurM;
    return this.sim.joueurs.find((q) => q.camp === camp && (q.poste.id === "DG" || q.poste.id === "DD") && Math.sign(q.cible.x - W / 2) === cote && q !== this.porteur);
  }

  /** Hauteur de la case d'un joueur parmi celles de son poste : 0 la plus basse, 1 la plus haute. */
  hauteurCase(j: JoueurSim): number {
    const ys = j.poste.cases.map((c) => c.centre.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    return max > min ? (j.cellule.centre.y - min) / (max - min) : 0;
  }

  /** Lance la montée du latéral du côté `cote` (14/11). Sur un repiquage de
   *  l'ailier, il prend le couloir le plus souvent (surRepiqueProba). */
  lancerMontee(camp: Camp, cote: number, surRepique: boolean): void {
    const s = this.sim;
    const mo = s.reg(camp).ballon.sansBallon.montee;
    if (this.montee || !this.porteur) return;
    if (surRepique && this.rng.suivant() > mo.surRepiqueProba) return;
    const lat = this.lateralDuCote(camp, cote);
    if (!lat) return;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const sens = camp === 0 ? 1 : -1;
    const y = Math.min(L - 6, Math.max(6, this.porteur.pos.y + sens * mo.avanceM));
    this.montee = { joueur: lat, fin: s.temps + mo.dureeS, point: { x: cote > 0 ? W - mo.bordM : mo.bordM, y } };
    this.stats.montees[camp]++;
  }

  surchargerBallon(): void {
    const s = this.sim;
    const r = s.reglages.ballon;
    const W = s.donnees.largeurM;
    const L = s.donnees.longueurM;
    const vMax = s.reglages.mouvement.vitesseMaxMS;
    for (const x of s.joueurs) x.auBallon = false;
    if (this.engagement) {
      placerPourEngagement(this);
      return;
    }
    suivrePlongeon(this);

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
        const bouche = avantBouche(this, p);
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
        // Ailier qui repique (14/11) : il rentre dans l'axe balle au pied.
        if (this.repique?.joueur === p && s.temps < this.repique.fin) p.cible = { ...this.repique.point };
        // Un adversaire arrive sur lui : il décide tout de suite (passe avant le tacle).
        const rp = s.reg(p.camp).ballon;
        if (this.decisionA > s.temps + rp.reactionPressionS && s.joueurs.some((o) => o.camp !== p.camp && o.poste.id !== "G" && dist(o.pos, p.pos) < rp.pressionM)) {
          this.decisionA = s.temps + rp.reactionPressionS;
        }
      }
      if (placerPendantArret(this, p)) return;
      this.jeuSansBallon(p);
      defendrePorteur(this, p);
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
        if (this.arrete === "coupFranc") eloigner(this, this.reserve.camp);
        if (this.arrete === "touche") eloigner(this, this.reserve.camp, 2.5);
        if (this.arrete === "engagement") eloignerEngagement(this, this.reserve.camp);
      }
      else if (this.reserve && this.tireur) {
        nombre = 0;
        if (this.arrete === "sixMetres") viderSurface(this, this.tireur.camp);
        this.tireur.cible = { ...s.ballon };
        this.tireur.auBallon = true;
      }
      if (this.receveur && camp === this.receveur.camp) {
        this.receveur.cible = pointInterception(this, this.receveur);
        this.receveur.auBallon = true;
      }
      for (const { j } of proches.slice(0, nombre)) {
        j.cible = pointInterception(this, j);
        j.auBallon = true;
      }
      // Coup d'envoi : pendant que l'un va au ballon, un coéquipier se place à côté.
      if (this.arrete === "engagement" && this.reserve?.camp === camp && proches[0]) placerPartenaire(this, camp, proches[0].j);
    }
  }
}
