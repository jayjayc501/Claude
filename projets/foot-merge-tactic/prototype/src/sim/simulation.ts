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
import { type EffetJoueur, type Influences, type OptionsInfluences, chargerInfluences, effetJoueur, paliersAtteints, reglagesEquipe } from "./influences";
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
  /** Plongeon du gardien : très rapide, sans limite d'accélération, jusqu'à cet instant. */
  plongeJusqua: number;
  /** Écart individuel de vitesse et d'accélération, en attendant l'attribut
   *  « vitesse » : deux joueurs ne courent jamais exactement pareil. */
  facteur: number;
  /** Part fixe de son temps de perception du ballon (secondes). */
  perceptionS: number;
  /** Effet individuel de son style (vitesse, pressing, tacle…) ; neutre sans style. */
  effet: EffetJoueur;
  /** Cible du pas précédent et vitesse lissée de sa cible (allures). */
  ciblePrec: PointM;
  vitCible: PointM;
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
  /** Temps passé avec le ballon par chaque camp (secondes). */
  tempsPossession: [number, number] = [0, 0];
  /** Tactique de chaque équipe (modifiable en plein match). */
  tactiques: [string, string];
  /** Tactiques et styles actifs ou non (pour comparer). */
  options: OptionsInfluences = { tactiques: true, styles: true };
  readonly influences: Influences;
  /** Réglages de chaque équipe : base + tactique + paliers de styles. */
  private regs: [Reglages, Reglages];

  private rng: Aleatoire;
  private prochainChangement = Infinity;
  private prochaineCible = 0;
  private cibleBallon: PointM;
  /** Ballon et lignes tenues des derniers instants (un relevé par pas), pour
   *  que chacun voie le jeu avec son propre petit retard. */
  private historique: { ballon: PointM; formes: [PointM, PointM]; lignesDef: [number | null, number | null] }[] = [];
  /** Repère de la forme de chaque équipe (12/11, mouvements plus réalistes) :
   *  il suit le ballon à vitesse limitée. Le bloc coulisse et monte avec le
   *  jeu sans sauter à chaque passe ; le porteur, le receveur et les presseurs
   *  jouent toujours le vrai ballon. Fonction du ballon et du temps seulement. */
  formes: [PointM, PointM];
  private ballonAvant: PointM;

  constructor(
    readonly donnees: Donnees,
    readonly reglages: Reglages,
    readonly equipes: [Equipe, Equipe],
    readonly graine: number,
    ballonReel = false,
  ) {
    this.rng = new Aleatoire(graine);
    this.influences = chargerInfluences();
    this.tactiques = [equipes[0].tactique ?? "EQU", equipes[1].tactique ?? "EQU"];
    this.regs = [reglages, reglages];
    this.balle = ballonReel ? new BallonReel(this, graine) : null;
    this.ballon = this.centre();
    this.formes = [this.centre(), this.centre()];
    this.ballonAvant = this.centre();
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
          plongeJusqua: 0,
          facteur: 1 + this.rng.entre(-v, v),
          perceptionS: this.rng.entre(reglages.mouvement.perception.minS, reglages.mouvement.perception.maxS),
          effet: effetJoueur(joueur, this.influences, this.options),
          ciblePrec: { ...pos },
          vitCible: { x: 0, y: 0 },
        });
      }
    });
    this.recalculerInfluences();
  }

  /** Réglages de l'équipe `camp` (tactique et paliers de styles compris). */
  reg(camp: Camp): Reglages {
    return this.regs[camp];
  }

  /** Change la tactique d'une équipe, même en plein match. */
  definirTactique(camp: Camp, tactique: string): void {
    this.tactiques[camp] = tactique;
    this.recalculerInfluences();
  }

  /** Active ou coupe les tactiques et les styles (pour mesurer leur effet). */
  definirOptions(options: Partial<OptionsInfluences>): void {
    this.options = { ...this.options, ...options };
    this.recalculerInfluences();
  }

  /** Styles dont le palier est atteint par une équipe (vide si les styles sont coupés). */
  paliers(camp: Camp): string[] {
    return this.options.styles ? paliersAtteints(this.equipes[camp], this.equipes[camp].composition, this.influences) : [];
  }

  private recalculerInfluences(): void {
    for (const camp of [0, 1] as const) this.regs[camp] = reglagesEquipe(this.reglages, this.equipes[camp], this.tactiques[camp], this.influences, this.options);
    for (const j of this.joueurs) j.effet = effetJoueur(j.joueur, this.influences, this.options);
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
    this.tempsPossession[this.possession] += dt;
    this.gererPossession();
    if (this.balle) this.balle.pas(dt);
    else this.deplacerBallon(dt);
    this.tenirLignes(dt);
    this.suivreFormes(dt);
    this.historique.push({ ballon: { ...this.ballon }, formes: [{ ...this.formes[0] }, { ...this.formes[1] }], lignesDef: [...this.lignesDef] });
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
    for (const j of this.joueurs) {
      if (j.reagitA === null || this.temps < j.reagitA) continue;
      j.phase = j.camp === this.possession ? "attaque" : "defense";
      j.reagitA = null;
      j.sprintJusqua = this.temps + this.reg(j.camp).transition.sprint.dureeMaxS;
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
    const L = this.donnees.longueurM;
    for (const camp of [0, 1] as const) {
      const R = this.reg(camp);
      const l = R.projection.defense.ligneDefensive;
      const defend = this.joueurs.filter((j) => j.camp === camp && j.phase === "defense").length;
      if (defend === 0) {
        this.lignesDef[camp] = null;
        continue;
      }
      const ballon = this.versRepere(camp, this.ballon);
      const voulue = hauteurLigneDefensiveM(ballon, R, L);
      let h = this.lignesDef[camp];
      if (h === null) {
        // Elle vient de perdre le ballon : sa ligne part de la hauteur où
        // jouaient ses défenseurs (forme d'attaque), sinon de sa place.
        const attaquait = defend < this.joueurs.filter((j) => j.camp === camp).length;
        h = attaquait ? lignesAttaqueM(ballon, R, L).arriereM : voulue;
      }
      // Ballon qui arrive sur la ligne : elle recule vite (les défenseurs se
      // retournent et courent), sinon pas à pas (transitions groupées).
      const recul = ballon.y * L - h < l.dangerM ? l.vitesseReculDangerMS : l.vitesseReculMS;
      this.lignesDef[camp] = voulue < h ? Math.max(voulue, h - recul * dt) : Math.min(voulue, h + l.vitesseMonteeMS * dt);
    }
  }

  /** Le repère de forme de chaque équipe va vers le ballon, sans dépasser
   *  ses vitesses (en largeur, en profondeur). Ballon replacé (engagement,
   *  remise en jeu lointaine) : le repère y saute. */
  private suivreFormes(dt: number): void {
    // Jeu arrêté : les équipes se replacent autour du ballon (le repère y va tout de suite).
    const saut = Math.hypot(this.ballon.x - this.ballonAvant.x, this.ballon.y - this.ballonAvant.y) > 4 || !!this.balle?.arretDeJeu;
    this.ballonAvant = { ...this.ballon };
    for (const camp of [0, 1] as const) {
      const f = this.reg(camp).mouvement.forme;
      const p = this.formes[camp];
      if (saut || f.vitesseXMS <= 0) {
        this.formes[camp] = { ...this.ballon };
        continue;
      }
      const dx = Math.max(-f.vitesseXMS * dt, Math.min(f.vitesseXMS * dt, this.ballon.x - p.x));
      // L'équipe monte pas à pas, mais revient vite soutenir un ballon joué en arrière.
      const sens = camp === 0 ? 1 : -1;
      const vy = (this.ballon.y - p.y) * sens > 0 ? f.vitesseYMS : f.vitesseReculYMS;
      const dy = Math.max(-vy * dt, Math.min(vy * dt, this.ballon.y - p.y));
      this.formes[camp] = { x: p.x + dx, y: p.y + dy };
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
  private jeuPercu(j: JoueurSim): { ballon: PointM; vrai: PointM; lignesDef: [number | null, number | null] } {
    const h = this.historique;
    if (h.length === 0) return { ballon: this.formes[j.camp], vrai: this.ballon, lignesDef: this.lignesDef };
    const distance = Math.hypot(j.pos.x - this.ballon.x, j.pos.y - this.ballon.y);
    const retardS = j.perceptionS + this.reglages.mouvement.perception.parMetreS * distance;
    const pas = Math.min(h.length - 1, Math.round(retardS / this.reglages.pasDeTempsS));
    const vu = h[h.length - 1 - pas]!;
    // Une ligne qui n'existait pas encore à cet instant (bascule récente) : on prend l'actuelle.
    return {
      ballon: vu.formes[j.camp],
      vrai: vu.ballon,
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
      const p = projeter(j.cellule.centre, j.poste, j.phase, ballonRepere, this.reg(j.camp), this.donnees.longueurM, this.lignesTenues(j.camp, vu.lignesDef), this.versRepere(j.camp, vu.vrai));
      j.cible = this.versAbsolu(j.camp, p);
      // Respiration (12/11, « encore de la robotisation ») : en attaque, chacun
      // bouge un peu autour de sa place, à son propre rythme (fonction du temps
      // et de constantes du joueur : rejouable, sans dépendre des autres).
      const rs = this.reg(j.camp).mouvement.respiration;
      // Pas pendant une transition : là, on court droit vers sa place.
      if (j.phase === "attaque" && j.poste.id !== "G" && rs.amplitudeM > 0 && j.reagitA === null && this.temps >= j.sprintJusqua) {
        const periode = rs.periodeMinS + (rs.periodeMaxS - rs.periodeMinS) * ((j.perceptionS * 97.13) % 1);
        const w = (2 * Math.PI) / periode;
        const phase = j.facteur * 61.7;
        j.cible = {
          x: j.cible.x + rs.amplitudeM * Math.sin(this.temps * w + phase),
          // Surtout sur le côté : en profondeur, la ligne du hors-jeu et le soutien derrière le ballon priment.
          y: j.cible.y + rs.amplitudeM * 0.25 * Math.sin(this.temps * w * 0.73 + phase * 1.3),
        };
      }
    }
    for (const camp of [0, 1] as const) this.espacerLignes(camp);
    this.balle?.surcharger();
  }

  /** En défense, deux joueurs d'une même ligne ne se marchent pas dessus :
   *  on garde l'ordre gauche-droite et un écart minimal entre voisins
   *  (6 à 8 m chez les entraîneurs, voir docs/reference-football.md §3). */
  private espacerLignes(camp: Camp): void {
    const ecart = this.reg(camp).projection.defense.ecartMinDansLigneM;
    const bornes = this.reg(camp).projection.defense.largeurLigneBornesM;
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
        if (largeur > 1e-6 && voulue > largeur) {
          // Trop étroite : seuls les joueurs des bouts s'écartent (latéraux,
          // côtés) ; ceux de l'axe gardent leur place (12/11 : les défenseurs
          // centraux étaient « trop décalés à droite et à gauche »).
          xs[0] = xs[0]! - (voulue - largeur) / 2;
          xs[xs.length - 1] = xs[xs.length - 1]! + (voulue - largeur) / 2;
        } else if (largeur > 1e-6 && voulue < largeur) {
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
      const plonge = this.temps < j.plongeJusqua;
      const vMax = plonge
        ? this.reglages.ballon.tir.plongeonVitesseMS
        : (this.temps < j.sprintJusqua ? this.reg(j.camp).transition.sprint.vitesseMS : m.vitesseMaxMS) * j.facteur * j.effet.vitesse * conduit;
      // 1. Course vers la cible (allures, 12/11) : on suit sa place qui bouge
      //    (vitesse de la cible, lissée) et on rattrape l'écart en douceur :
      //    marche pour un petit écart, trot, course ; pleine vitesse seulement
      //    quand on joue le ballon, en transition ou près du ballon. Loin du
      //    jeu, on trotte ou on court sans sprinter, sauf très en retard.
      const al = m.allure;
      const sx = j.cible.x - j.ciblePrec.x;
      const sy = j.cible.y - j.ciblePrec.y;
      const saut = Math.hypot(sx, sy);
      // Un saut de cible (bascule, ballon joué) n'est pas une vitesse à suivre.
      const ivx = saut > 0.5 ? 0 : sx / dt;
      const ivy = saut > 0.5 ? 0 : sy / dt;
      const kL = Math.min(1, dt / al.lissageS);
      j.vitCible = { x: j.vitCible.x + (ivx - j.vitCible.x) * kL, y: j.vitCible.y + (ivy - j.vitCible.y) * kL };
      j.ciblePrec = { ...j.cible };
      const dx = j.cible.x - j.pos.x;
      const dy = j.cible.y - j.pos.y;
      const d = Math.hypot(dx, dy);
      // En transition, seuls les joueurs loin de leur place sprintent (repli,
      // projection) ; les autres trottent ou courent pour se replacer.
      // Contre-attaque : toute l'équipe qui récupère se projette en sprint.
      const transition = this.temps < j.sprintJusqua && (j.phase === "attaque" || d > al.toleranceM);
      // Pris devant sa place (ballon joué derrière lui) : il se replace vite,
      // côté but (défense de couverture).
      const recule = (j.cible.y - j.pos.y) * (j.camp === 0 ? 1 : -1) < -al.reculUrgentM;
      // Près du ballon, ou en route vers l'action (sa place est près du ballon) : on y va franchement.
      const versAction = Math.hypot(j.cible.x - this.ballon.x, j.cible.y - this.ballon.y) < al.zoneActiveM * 0.75;
      const actif = plonge || j.auBallon || transition || recule || versAction || Math.hypot(j.pos.x - this.ballon.x, j.pos.y - this.ballon.y) < al.zoneActiveM;
      const plafond = actif ? vMax : Math.min(vMax, (al.courseMS + Math.max(0, d - al.toleranceM) * al.rattrapageParM) * j.facteur);
      let vx = 0;
      let vy = 0;
      const tau = actif ? al.reponseRapideS : al.reponseS;
      vx = j.vitCible.x * al.suiviCible + (d > 1e-6 ? (dx / d) * (d / tau) : 0);
      vy = j.vitCible.y * al.suiviCible + (d > 1e-6 ? (dy / d) * (d / tau) : 0);
      const vv = Math.hypot(vx, vy);
      if (vv > plafond) {
        vx = (vx / vv) * plafond;
        vy = (vy / vv) * plafond;
      }
      let ax = vx - j.vit.x;
      let ay = vy - j.vit.y;
      const a = Math.hypot(ax, ay);
      // On freine (ou on se retourne) plus fort qu'on n'accélère.
      const freine = ax * j.vit.x + ay * j.vit.y < 0;
      const aMax = (freine ? m.freinageMS2 : m.accelerationMS2) * j.facteur * dt * (plonge ? 10 : 1);
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
