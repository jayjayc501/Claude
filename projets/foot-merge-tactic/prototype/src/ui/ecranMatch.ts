// Écran de match, dans l'esprit de l'écran de préparation (12/11 : « une IHM
// aussi fun et belle que celle de la préparation ») : tableau de score avec
// chrono et barre de possession, pelouse rayée, joueurs en figurines sur leur
// socle (les adversaires en maillot rouge), aura de fusion, le porteur du
// ballon sur un socle doré avec son nom, annonces qui sautent, confettis.
// Votre équipe attaque vers le haut. Tactique de chaque équipe, tactiques et
// styles activables ou non (proposition du 12/11) : avant le coup d'envoi et à
// la mi-temps seulement (13/11 au soir, décision du concepteur).
//
// 13/11 au soir : l'écran ne fait plus avancer le moteur. Il demande chaque
// mi-temps à l'arbitre de match (src/match/arbitre.ts) et lit son film, image
// par image (pause, vitesse et vues inchangées). Plus tard, un arbitre serveur
// prendra la place de l'arbitre local sans rien changer ici.

import type { FournisseurGraines } from "../jeu/graines";
import { type ArbitreMatch, DUREE_MI_TEMPS_S } from "../match/arbitre";
import { type BilanMiTemps, type JoueurVu, LecteurFilm, type VueMatch } from "../match/film";
import type { Donnees } from "../sim/donnees";
import cartesBrut from "../data/cartes.json";
import { type OptionsInfluences, type Palier, chargerInfluences, paliersPays, paliersStyles, reglagesEquipe } from "../sim/influences";
import { projeterRect } from "../sim/projection";
import type { Equipe, Reglages } from "../sim/types";
import { BUSTES_ROUGES, CHAMP_ROUGE, GARDIEN_ROUGE } from "./adversaires";
import { BUSTES } from "./bustes";
import { BUSTES_BLEUS } from "./equipeBleue";
import { dessinerLignes, html, svg } from "./dom";
import { dessinerButsEtDrapeaux, imageStade } from "./stade";
import { CORPS_PICTOS, PICTOS } from "./pictos";
import { activer, basculerMuet, estMuet, jouer } from "./son";

const ECHELLE = 5; // unités SVG par mètre
// 14/11 : place pour l'herbe autour, les panneaux et les tribunes (6 avant) ;
// plus derrière les buts, où le téléphone a de la place en hauteur.
const MARGE = 16;
const MARGE_Y = 34;
/** Trois rendus à comparer (12/11) : pions ronds et seul le porteur en
 *  figurine ; toutes les figurines en petit ; « Action » : les joueurs proches
 *  du ballon en figurines, les autres en pions (remplace la caméra, 12/11). */
type Vue = "pions" | "figurines" | "action";
const VUES: { id: Vue; nom: string }[] = [
  { id: "action", nom: "Action" },
  { id: "pions", nom: "Pions" },
  { id: "figurines", nom: "Figurines" },
];
/** Largeur d'une figurine (unités SVG) ; repère de la maquette : 48 × 53, socle en 24,47. */
/** (12/11 : bustes ramenés à la même hauteur visible, un peu plus petits ; tailles relevées de 6 %.) */
const LARGEUR_FIG: Record<Vue, number> = { pions: 36, figurines: 28, action: 32 };
/** Agrandissement du porteur (vue Action : tous à la même taille, 12/11 ; le
 *  porteur se repère à son halo et à son nom). */
const GRAND_PORTEUR: Record<Vue, number> = { pions: 1, figurines: 1.4, action: 1 };
/** Vue « Action » : un joueur passe en figurine à moins de ACTION_ENTREE_M du
 *  centre de l'action et redevient pion au-delà de ACTION_SORTIE_M, après
 *  ACTION_MIN_MS au moins (temps réel) dans son état. Le centre de l'action
 *  suit le ballon à ACTION_SUIVI_MS au plus (une passe ne vide pas la zone
 *  d'un coup). Fondu de ACTION_FONDU_MS à chaque changement. 12/11, « le mode
 *  action scintille » : seuils de 13/18 m, 0,8 s de jeu (0,2 s à l'écran en
 *  ×3,5) et zone collée au ballon donnaient 7 changements par seconde. */
/* 13/11, « autour du ballon, certains restent en rond, ce n'est pas fluide » :
 * on entre en figurine tout de suite (près du ballon ou du centre de l'action,
 * 16 m), on n'en sort qu'après 1,2 s loin des deux (25 m) ; fondu croisé
 * pion ↔ figurine, sans instant vide. */
const ACTION_ENTREE_M = 16;
const ACTION_SORTIE_M = 25;
const ACTION_MIN_MS = 1200;
const ACTION_SUIVI_MS = 14;
const ACTION_FONDU_MS = 240;
const RAYON_ROND = 7;
/** Rayon du ballon à l'écran (unités SVG) ; plus gros que nature pour rester lisible. */
const RAYON_BALLON = 5;
const BLEU_NOUS = "#3563C0";
/** Durée minimale (temps de jeu, s) pendant laquelle un joueur reste « en vedette » (porteur affiché). */
const VEDETTE_MIN_S = 0.7;
/** Écart minimal à l'écran entre deux pions ou figurines (unités SVG), selon la vue. */
const ECART_AFFICHAGE: Record<Vue, number> = { pions: 2 * RAYON_ROND + 2, figurines: 18, action: 2 * RAYON_ROND + 3 };
const CLE_VUE = "foot-merge-tactic.vue-match.v2";
/** Tactiques et styles (pour les zones et les paliers affichés). */
const INFLUENCES = chargerInfluences();
/** Noms des pays (bonus de pays, 14/11). */
const PAYS = (cartesBrut as unknown as { pays: Record<string, { nom: string; couleur: string }> }).pays;
/** Durée d'un éclat de style (ms, à l'écran) ; plus long pour une action signature (palier à 5). */
const ECLAT_MS = 1300;
const ECLAT_FORT_MS = 1900;
/** Durée des annonces, en secondes de jeu simulé (≈ 0,7 s et 1,6 s à l'écran en ×3,5). */
const ANNONCE_S = 2.5;
const ANNONCE_BUT_S = 5.5;
const VITESSE_PAR_DEFAUT = 3.5;
const COULEUR_EUX = "#C2413D";
/** Couleur de chaque niveau de fusion (1 bleu, 2 or, 3 violet), comme sur la préparation. */
/** Fusion en match (14/11, concepteur : « la flamme de la couleur de l'équipe qui
 *  grossit », « au début un halo qui se transforme en flamme ») : niveau 1 = halo,
 *  2 = flamme, 3 = grande flamme avec étincelles, en bleu pour toi et en rouge pour
 *  l'adversaire. Le bleu, l'or et le violet des niveaux restent sur l'écran de préparation. */
const FEU = [
  { coeur: "#E6EEFF", milieu: "#5B8CFF", bord: "#2D5BD8" },
  { coeur: "#FFE6E1", milieu: "#FF6B5E", bord: "#C2413D" },
] as const;
/** Flamme dessinée de 0 (base) à -1 (pointe), largeur de -0,5 à 0,5. */
const FORME_FLAMME =
  "M 0 0 C -0.42 0 -0.55 -0.3 -0.42 -0.52 C -0.34 -0.66 -0.36 -0.8 -0.24 -0.95 C -0.2 -0.8 -0.1 -0.74 -0.04 -0.7 " +
  "C -0.06 -0.84 0.02 -0.94 0.08 -1 C 0.12 -0.86 0.2 -0.8 0.26 -0.74 C 0.3 -0.8 0.32 -0.86 0.34 -0.9 " +
  "C 0.5 -0.66 0.56 -0.36 0.44 -0.18 C 0.34 -0.04 0.2 0 0 0 Z";

/** La flamme à sa taille, coordonnées calculées (14/11 : pas de `transform` SVG
 *  sur un élément animé en CSS, que certains navigateurs de téléphone ignorent). */
function cheminFlamme(largeur: number, hauteur: number): string {
  let i = 0;
  return FORME_FLAMME.replace(/-?\d+(\.\d+)?/g, (n) => (Number(n) * (i++ % 2 === 0 ? largeur : hauteur)).toFixed(2));
}
const BANDES = 12;

export interface InfosJoueur {
  couleur: string;
  style: string | null;
  fusions: number;
}

export interface HabillageMatch {
  /** Noms affichés au tableau de score. */
  nomNous: string;
  nomEux: string;
  tactiques: { code: string; nom: string }[];
  styles: Record<string, string>;
  /** Couleur du pays, style et fusions d'un joueur (de ton équipe : camp 0 ; de l'adversaire : camp 1). */
  infos: (id: string, camp?: 0 | 1) => InfosJoueur | undefined;
  /** Mi-temps : ouvre l'écran de préparation pour déplacer et remplacer (13/11). */
  changements?: () => void;
  /** Championnat (13/11) : fin du match, avec le score (toi, l'adversaire). Sans
   *  elle, la fin du match propose un nouveau match. */
  finMatch?: (score: [number, number]) => void;
}

export class EcranMatch {
  readonly racine: HTMLElement;
  /** Le film du match en cours (mi-temps calculées par l'arbitre) et l'image affichée. */
  private lecteur = new LecteurFilm();
  /** Équipes du match ; la tienne change si tu fais des changements à la mi-temps. */
  private equipesMatch!: [Equipe, Equipe];
  /** Tactique de chaque équipe en ce moment (pour les zones et les listes). */
  private tactiques: [string, string] = ["EQU", "EQU"];
  /** Bilan de la dernière mi-temps finie (statistiques, buteurs, notes, forme). */
  private bilan: BilanMiTemps | null = null;
  /** Mise à jour des listes de tactiques et des interrupteurs (grisés pendant le jeu). */
  private majChoix: (() => void)[] = [];
  private regZones: { cle: string; equipe: Equipe; reg: Reglages } | null = null;
  /** Éclats des styles (14/11) : pictogramme qui brille au-dessus du joueur quand son style agit. */
  private calqueEclats!: SVGGElement;
  private eclats: { g: SVGGElement; joueur: JoueurVu; fin: number }[] = [];
  /** Styles à leur palier fort (5 joueurs) dans chaque équipe : leurs éclats sont dorés. */
  private stylesForts: [Set<string>, Set<string>] = [new Set(), new Set()];
  private bandeau: HTMLElement | null = null;
  private vitesse = VITESSE_PAR_DEFAUT;
  /** Mi-temps en cours et arrêt du jeu (mi-temps, fin du match). */
  private periode: 1 | 2 = 1;
  private debutPeriode = 0;
  private arret: "mi-temps" | "fin" | null = null;
  private scoreMiTemps: [number, number] = [0, 0];
  private panneau: HTMLElement | null = null;
  private enPause = false;
  private zonesVisibles = false;
  private actif = false;
  private dernier = 0;
  private reserve = 0;
  /** Tactiques et styles actifs (gardés d'un match à l'autre). */
  private options: OptionsInfluences = { tactiques: true, styles: true };
  /** Tactique choisie sur cet écran pour chaque équipe (null : celle de l'équipe). */
  private tactiquesForcees: [string | null, string | null] = [null, null];

  private pions: SVGGElement[] = [];
  private vue: Vue = (() => {
    try {
      const v = localStorage.getItem(CLE_VUE);
      return v === "figurines" || v === "pions" ? v : "action";
    } catch {
      return "pions";
    }
  })();
  /** Échelle des figurines : LARGEUR_FIG / 48. */
  private k = LARGEUR_FIG.pions / 48;
  private svgTerrain!: SVGSVGElement;
  /** Vue « Action » : figurine de chaque joueur (montrée près du ballon), état et instant du dernier changement. */
  private figsAction: SVGGElement[] = [];
  private enAction: boolean[] = [];
  private actionDepuis: number[] = [];
  private fonduAction: (Animation | null)[] = [];
  private fonduPion: (Animation | null)[] = [];
  private centreAction: { x: number; y: number } | null = null;
  private tempsAction = 0;
  /** Ballon : groupe, motif qui tourne quand il roule, traînée, angle et dernière position. */
  private ballonMotif!: SVGGElement;
  private trainee!: SVGPathElement;
  private ballonAngle = 0;
  private ballonAvant: { x: number; y: number } | null = null;
  private annonceCadre!: SVGGElement;
  private images_: (string | undefined)[] = [];
  private figPorteur: SVGGElement | null = null;
  private figPorteurImage: SVGImageElement | null = null;
  private figPorteurAnim: SVGGElement | null = null;
  private dernierPorteur: unknown = null;
  /** Joueur mis en vedette (porteur, ou dernier à avoir touché le ballon pendant une passe). */
  private vedette: JoueurVu | null = null;
  private vedetteDepuis = -Infinity;
  private boutonsVue: HTMLButtonElement[] = [];
  private calquePions!: SVGGElement;
  private calqueFigs: SVGGElement | null = null;
  /** Dernier ordre de profondeur appliqué (indices des joueurs). */
  private ordreProfondeur = "";
  private images = 0;
  private halo!: SVGEllipseElement;
  private etiquette!: SVGGElement;
  private etiquetteFond!: SVGRectElement;
  private etiquetteTexte!: SVGTextElement;
  private ballon!: SVGGElement;
  private degradeTrainee!: SVGLinearGradientElement;
  private ombreBallon!: SVGEllipseElement;
  private calqueZones!: SVGGElement;
  private terrain!: HTMLElement;
  private score!: HTMLElement;
  private chrono!: HTMLElement;
  private barreNous!: HTMLElement;
  private statut!: HTMLElement;
  private bord!: HTMLElement;
  private annonce!: SVGGElement;
  private annonceTexte!: SVGTextElement;
  private annonceFond!: SVGRectElement;
  private annonceDepuis = -Infinity;
  private annonceDuree = 0;
  private dernierEvenement = -1;
  private boutonJouer!: HTMLButtonElement;
  private boutonZones!: HTMLButtonElement;
  private derniereMajBord = 0;

  constructor(
    private donnees: Donnees,
    private reglages: Reglages,
    private equipes: () => [Equipe, Equipe],
    private habillage: HabillageMatch,
    /** D'où viennent les graines des matchs (13/11 au soir : un seul endroit). */
    private graines: FournisseurGraines,
    /** Celui qui calcule le match (13/11 au soir) : local aujourd'hui, serveur plus tard. */
    private arbitre: ArbitreMatch,
  ) {
    this.racine = html("section", { class: "match" });
  }

  /** L'état du match à l'image affichée du film. */
  private get instant(): VueMatch {
    return this.lecteur.vue;
  }

  /** Entre le coup d'envoi et la mi-temps, et pendant la 2e mi-temps : on ne
   *  change ni les tactiques ni les interrupteurs (13/11 au soir). */
  private get enJeu(): boolean {
    return this.instant.demarre && !this.arret;
  }

  // Changement de côté à la mi-temps (14/11, concepteur : « à la mi-temps, on ne
  // change pas de côté, c'est un peu bizarre ») : en 2e mi-temps, le terrain est
  // affiché retourné (ton équipe attaque vers le bas). Le moteur ne change pas.
  private X = (m: number) => MARGE + (this.periode === 2 ? 68 - m : m) * ECHELLE;
  private Y = (m: number) => MARGE_Y + (this.periode === 2 ? m : 105 - m) * ECHELLE;

  /** Appelé à l'ouverture de l'écran : nouveau match au coup d'envoi. */
  /** Ouvre l'écran : nouveau match, ou reprise du match en cours (mi-temps, 13/11). */
  ouvrir(reprise = false): void {
    this.actif = true;
    if (!reprise || !this.lecteur.film || this.arret === "fin") {
      this.tactiquesForcees = [null, null]; // la tactique choisie en préparation s'applique
      this.nouveauMatch();
    }
    this.dernier = performance.now();
    requestAnimationFrame((t) => this.boucle(t));
  }

  fermer(): void {
    this.actif = false;
  }

  private nouveauMatch(): void {
    this.equipesMatch = this.equipes();
    this.lecteur.nouveauMatch();
    this.lecteur.charger(this.arbitre.nouveauMatch(this.equipesMatch, this.graines.matchRegarde()));
    this.tactiques = [this.equipesMatch[0].tactique ?? "EQU", this.equipesMatch[1].tactique ?? "EQU"];
    this.tactiquesForcees.forEach((t, camp) => {
      if (t) this.tactiques[camp] = t;
    });
    this.bilan = null;
    this.reserve = 0;
    this.enPause = false;
    this.periode = 1;
    this.debutPeriode = 0;
    this.arret = null;
    this.scoreMiTemps = [0, 0];
    this.dernierEvenement = -1;
    this.annonceDepuis = -Infinity;
    this.construire();
  }

  // ---- Construction ----------------------------------------------------------

  private construire(): void {
    const r = this.racine;
    r.replaceChildren();
    const h = this.habillage;

    // Tableau de score : équipes, score, chrono, barre de possession.
    const tableau = html("div", { class: "match-tableau" }, r);
    const ligne = html("div", { class: "match-ligne-score" }, tableau);
    const nous = html("div", { class: "match-equipe nous" }, ligne);
    html("span", { class: "match-avatar" }, nous, h.nomNous.charAt(0));
    html("span", { class: "match-nom" }, nous, h.nomNous);
    const centre = html("div", { class: "match-centre" }, ligne);
    this.score = html("span", { class: "match-score", "aria-live": "polite" }, centre, "0 – 0");
    this.chrono = html("span", { class: "match-chrono" }, centre, "0:00");
    const eux = html("div", { class: "match-equipe eux" }, ligne);
    html("span", { class: "match-nom" }, eux, h.nomEux);
    html("span", { class: "match-avatar" }, eux, h.nomEux.charAt(0));
    const barre = html("div", { class: "match-possession", "aria-hidden": "true" }, tableau);
    this.barreNous = html("span", { class: "nous" }, barre);
    html("span", { class: "eux" }, barre);

    // Commandes principales, juste au-dessus du terrain.
    const cmd = html("div", { class: "match-commandes" }, r);
    this.boutonJouer = html("button", { type: "button", class: "match-jouer" }, cmd);
    this.boutonJouer.addEventListener("click", () => {
      activer(); // le son ne peut démarrer qu'après un geste
      if (this.arret === "mi-temps") this.secondeMiTemps();
      else if (this.arret === "fin") {
        this.graines.matchRegardeFini();
        if (this.habillage.finMatch) return this.habillage.finMatch([this.instant.score[0], this.instant.score[1]]);
        this.nouveauMatch();
        return;
      } else if (!this.instant.demarre) this.coupDEnvoi();
      else this.enPause = !this.enPause;
      this.majCommandes();
    });
    const nouveau = html("button", { type: "button", class: "match-puce", "aria-label": "Nouveau match" }, cmd, "↺ Nouveau");
    if (h.finMatch) nouveau.style.display = "none"; // championnat : pas de match rejoué
    nouveau.addEventListener("click", () => {
      this.graines.matchRegardeFini();
      this.nouveauMatch();
    });
    const vitesses = [0.5, 1, 2, 3, 3.5, 4];
    const libelle = () => `×${String(this.vitesse).replace(".", ",")}`;
    const bVitesse = html("button", { type: "button", class: "match-puce", "aria-label": "Vitesse" }, cmd, libelle());
    bVitesse.addEventListener("click", () => {
      this.vitesse = vitesses[(vitesses.indexOf(this.vitesse) + 1) % vitesses.length]!;
      bVitesse.textContent = libelle();
    });
    const bSon = html("button", { type: "button", class: "match-puce", "aria-label": "Son" }, cmd, estMuet() ? "Muet" : "Son");
    bSon.addEventListener("click", () => {
      activer();
      bSon.textContent = basculerMuet() ? "Muet" : "Son";
    });
    this.boutonZones = html("button", { type: "button", class: "match-puce" }, cmd, "Zones");
    this.boutonZones.addEventListener("click", () => {
      this.zonesVisibles = !this.zonesVisibles;
      this.majCommandes();
      this.dessiner();
    });

    const vues = html("div", { class: "match-vues", role: "group", "aria-label": "Rendu du terrain" }, r);
    html("span", { class: "match-vues-titre" }, vues, "Vue");
    this.boutonsVue = VUES.map((v) => {
      const b = html("button", { type: "button", class: "match-vue" }, vues, v.nom);
      b.addEventListener("click", () => {
        if (this.vue === v.id) return;
        this.vue = v.id;
        try {
          localStorage.setItem(CLE_VUE, v.id);
        } catch {
          // stockage indisponible : sans conséquence
        }
        this.construireTerrain();
        if (this.arret) this.montrerStats();
        this.majCommandes();
        this.dessiner();
      });
      return b;
    });

    this.statut = html("p", { class: "match-statut", role: "status" }, r);

    // Terrain.
    this.terrain = html("div", { class: "match-terrain" }, r);
    this.construireTerrain();

    // Tactiques et interrupteurs : avant le coup d'envoi et à la mi-temps (13/11 au soir).
    this.majChoix = [];
    const tac = html("div", { class: "match-tactiques" }, r);
    ([h.nomNous, h.nomEux] as const).forEach((qui, camp) => {
      const l = html("label", { class: `match-pilule${camp === 1 ? " eux" : ""}` }, tac);
      html("span", { class: "match-pilule-titre" }, l, qui);
      const valeur = html("span", { class: "match-pilule-valeur" }, l);
      const sel = html("select", { "aria-label": `Tactique de ${qui}` }, l);
      for (const t of h.tactiques) {
        const o = html("option", { value: t.code }, sel, t.nom);
        o.selected = t.code === this.tactiques[camp];
      }
      const maj = () => {
        valeur.textContent = h.tactiques.find((t) => t.code === sel.value)?.nom ?? sel.value;
        sel.disabled = !this.options.tactiques || this.enJeu;
        l.classList.toggle("coupee", !this.options.tactiques);
        l.classList.toggle("figee", this.enJeu);
      };
      maj();
      sel.addEventListener("change", () => {
        if (this.enJeu) return;
        this.tactiquesForcees[camp] = sel.value;
        this.tactiques[camp] = sel.value;
        maj();
        this.majBord(true);
      });
      l.addEventListener("maj", maj);
      this.majChoix.push(maj);
    });
    const inter = html("div", { class: "match-interrupteurs" }, r);
    for (const cle of ["tactiques", "styles"] as const) {
      const b = html("button", { type: "button", class: "match-interrupteur" }, inter);
      const maj = () => {
        const on = this.options[cle];
        b.classList.toggle("actif", on);
        b.setAttribute("aria-pressed", String(on));
        b.textContent = cle === "tactiques" ? `Tactiques ${on ? "activées" : "coupées"}` : `Styles ${on ? "activés" : "coupés"}`;
        b.disabled = this.enJeu;
      };
      maj();
      this.majChoix.push(maj);
      b.addEventListener("click", () => {
        if (this.enJeu) return;
        this.options = { ...this.options, [cle]: !this.options[cle] };
        maj();
        for (const l of tac.querySelectorAll("label")) l.dispatchEvent(new Event("maj"));
        this.majBord(true);
      });
    }

    // Tableau de bord.
    this.bord = html("div", { class: "match-bord" }, r);
    html("p", { class: "match-note" }, r, "Tactiques et styles : proposition à juger en regardant le match. Coupe-les ou change de tactique avant le coup d'envoi ou à la mi-temps pour voir la différence.");

    this.majCommandes();
    this.dessiner();
    this.majBord(true);
  }

  private construireTerrain(): void {
    const s = svg("svg", {
      viewBox: `0 0 ${68 * ECHELLE + 2 * MARGE} ${105 * ECHELLE + 2 * MARGE_Y}`,
      role: "img",
      "aria-label": "Terrain de match",
    });
    this.terrain.replaceChildren(s);
    this.svgTerrain = s;
    this.k = LARGEUR_FIG[this.vue] / 48;
    this.dernierPorteur = null;
    this.vedette = null;
    this.vedetteDepuis = -Infinity;
    const K = this.k;
    const defs = svg("defs", {}, s);
    // Ballon moderne (12/11, « le ballon n'est pas beau ») : sphère brillante,
    // motif de match bleu et or qui tourne quand il roule, reflet, traînée.
    const sphere = svg("radialGradient", { id: "match-ballon-sphere", cx: "38%", cy: "32%", r: "75%" }, defs);
    svg("stop", { offset: "0%", "stop-color": "#FFFFFF" }, sphere);
    svg("stop", { offset: "55%", "stop-color": "#F1F4F8" }, sphere);
    svg("stop", { offset: "100%", "stop-color": "#B9C3D0" }, sphere);
    const queue = svg("linearGradient", { id: "match-ballon-trainee", gradientUnits: "userSpaceOnUse", x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
    this.degradeTrainee = queue as SVGLinearGradientElement;
    svg("stop", { offset: "0%", "stop-color": "#FFFFFF", "stop-opacity": "0" }, queue);
    svg("stop", { offset: "100%", "stop-color": "#FFFFFF", "stop-opacity": "0.75" }, queue);
    const clip = svg("clipPath", { id: "match-ballon-clip" }, defs);
    svg("circle", { r: RAYON_BALLON }, clip);
    // Fusion (14/11) : halo, flamme et aura aux couleurs de chaque équipe.
    FEU.forEach((feu, camp) => {
      const halo = svg("radialGradient", { id: `match-halo-feu-${camp}`, cx: "50%", cy: "50%", r: "50%" }, defs);
      svg("stop", { offset: "0%", "stop-color": feu.coeur, "stop-opacity": "1" }, halo);
      svg("stop", { offset: "55%", "stop-color": feu.milieu, "stop-opacity": "0.9" }, halo);
      svg("stop", { offset: "100%", "stop-color": feu.bord, "stop-opacity": "0" }, halo);
      const flamme = svg("linearGradient", { id: `match-feu-${camp}`, x1: "0", y1: "1", x2: "0", y2: "0" }, defs);
      svg("stop", { offset: "0%", "stop-color": feu.coeur, "stop-opacity": "0.95" }, flamme);
      svg("stop", { offset: "40%", "stop-color": feu.milieu, "stop-opacity": "0.95" }, flamme);
      svg("stop", { offset: "100%", "stop-color": feu.bord, "stop-opacity": "0.15" }, flamme);
      for (let n = 1; n <= 3; n++) {
        const f = svg("filter", { id: `match-aura-${camp}-${n}`, x: "-60%", y: "-60%", width: "220%", height: "220%", "color-interpolation-filters": "sRGB" }, defs);
        svg("feDropShadow", { dx: 0, dy: 0, stdDeviation: 0.9, "flood-color": "#FFFFFF", "flood-opacity": 1 }, f);
        svg("feDropShadow", { dx: 0, dy: 0, stdDeviation: 1.6 + n, "flood-color": feu.milieu, "flood-opacity": 1 }, f);
      }
    });

    // Pelouse rayée (affichée tout de suite), puis le stade peint une fois
    // (14/11 : tonte en damier, lumière, panneaux, tribunes ; voir stade.ts).
    const W = 68 * ECHELLE + 2 * MARGE;
    const H = 105 * ECHELLE + 2 * MARGE_Y;
    svg("rect", { x: 0, y: 0, width: W, height: H, rx: 14, class: "match-pelouse" }, s);
    const hb = (105 * ECHELLE) / BANDES;
    for (let i = 0; i < BANDES; i += 2) svg("rect", { x: MARGE, y: MARGE_Y + i * hb, width: 68 * ECHELLE, height: hb, class: "match-bande" }, s);
    const decor = svg("image", { x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none", class: "match-stade" }, s);
    const densite = Math.min(3, Math.max(1.5, globalThis.devicePixelRatio || 1));
    void imageStade({ echelle: ECHELLE, margeX: MARGE, margeY: MARGE_Y }, densite).then((url) => {
      if (url) decor.setAttribute("href", url);
    });
    dessinerLignes(svg("g", { class: "match-lignes" }, s), this.X, this.Y, false);
    dessinerButsEtDrapeaux(svg("g", { class: "match-buts" }, s), this.X, this.Y);
    this.calqueZones = svg("g", { class: "zones-match" }, s);

    // Halo du porteur, ombre du ballon, joueurs, ballon.
    this.halo = svg("ellipse", { rx: 22 * K, ry: 7 * K, class: "match-halo" }, s);
    this.ombreBallon = svg("ellipse", { rx: RAYON_BALLON * 0.95, ry: RAYON_BALLON * 0.45, class: "match-ombre" }, s);
    const g = svg("g", {}, s);
    this.calquePions = g;
    // Figurines adverses : d'abord celles qui ne sont pas sur ton terrain, pour
    // éviter de voir ton joueur et sa copie rouge côte à côte.
    const tesTitulaires = new Set(this.instant.joueurs.filter((j) => j.camp === 0).map((j) => j.joueur.id));
    const rouges = Object.entries(CHAMP_ROUGE)
      .sort(([a], [b]) => Number(tesTitulaires.has(a)) - Number(tesTitulaires.has(b)))
      .map(([, image]) => image);
    let rang = 0;
    // Maillots d'équipe en match : bleu pour toi, rouge pour l'adversaire (12/11).
    this.images_ = this.instant.joueurs.map((j) => (j.camp === 1 ? (BUSTES_ROUGES[j.joueur.id] ?? (j.poste.id === "G" ? GARDIEN_ROUGE : rouges[rang++ % rouges.length]!)) : (BUSTES_BLEUS[j.joueur.id] ?? BUSTES[j.joueur.id])));
    this.pions = this.instant.joueurs.map((j, i) =>
      this.vue === "figurines" ? this.pion(g, j.camp, j.joueur.id, j.joueur.nom, this.images_[i]) : this.pionRond(g, j.camp, j.joueur.id, j.joueur.nom),
    );
    // Vue « Action » : une figurine par joueur, au-dessus des pions, montrée près du ballon.
    this.figsAction = [];
    this.calqueFigs = null;
    this.ordreProfondeur = "";
    this.enAction = this.instant.joueurs.map(() => false);
    this.actionDepuis = this.instant.joueurs.map(() => -Infinity);
    this.fonduAction = this.instant.joueurs.map(() => null);
    this.fonduPion = this.instant.joueurs.map(() => null);
    this.centreAction = null;
    if (this.vue === "action") {
      const gf = svg("g", {}, s);
      this.calqueFigs = gf;
      this.figsAction = this.instant.joueurs.map((j, i) => {
        // Groupe extérieur : position ; intérieur (la figurine) : animation d'apparition.
        const f = svg("g", { style: "display:none" }, gf);
        this.pion(f, j.camp, j.joueur.id, j.joueur.nom, this.images_[i]).classList.add("match-fig-action");
        return f;
      });
    }
    // Vue « pions » : le porteur surgit en figurine sur un socle doré.
    this.figPorteur = null;
    if (this.vue === "pions") {
      this.figPorteur = svg("g", { style: "display:none", class: "match-pion" }, s);
      this.figPorteurAnim = svg("g", { class: "match-surgit" }, this.figPorteur);
      svg("ellipse", { cx: 0, cy: 0, rx: 17 * K, ry: 5 * K, class: "match-ombre-pion" }, this.figPorteurAnim);
      this.figPorteurImage = svg("image", { x: -24 * K, y: -48 * K, width: 48 * K, height: 49 * K }, this.figPorteurAnim);
    }
    this.trainee = svg("path", { class: "match-trainee", fill: "url(#match-ballon-trainee)" }, s);
    this.ballon = svg("g", { class: "match-ballon" }, s);
    svg("circle", { r: RAYON_BALLON, fill: "url(#match-ballon-sphere)" }, this.ballon);
    const motif = svg("g", { "clip-path": "url(#match-ballon-clip)" }, this.ballon);
    this.ballonMotif = svg("g", {}, motif);
    const R = RAYON_BALLON;
    // Panneaux du ballon : une virgule bleue et une or, symétriques (motif moderne).
    svg("path", { d: `M ${-R * 0.95} ${-R * 0.2} C ${-R * 0.4} ${-R * 0.9}, ${R * 0.35} ${-R * 0.7}, ${R * 0.15} ${-R * 0.05} C ${-R * 0.1} ${-R * 0.45}, ${-R * 0.55} ${-R * 0.45}, ${-R * 0.95} ${-R * 0.2} Z`, class: "match-ballon-bleu" }, this.ballonMotif);
    svg("path", { d: `M ${R * 0.95} ${R * 0.2} C ${R * 0.4} ${R * 0.9}, ${-R * 0.35} ${R * 0.7}, ${-R * 0.15} ${R * 0.05} C ${R * 0.1} ${R * 0.45}, ${R * 0.55} ${R * 0.45}, ${R * 0.95} ${R * 0.2} Z`, class: "match-ballon-or" }, this.ballonMotif);
    svg("circle", { r: R * 0.16, class: "match-ballon-centre" }, this.ballonMotif);
    svg("circle", { r: RAYON_BALLON, class: "match-ballon-bord" }, this.ballon);
    svg("ellipse", { cx: -R * 0.35, cy: -R * 0.42, rx: R * 0.32, ry: R * 0.2, class: "match-ballon-reflet", transform: `rotate(-30 ${-R * 0.35} ${-R * 0.42})` }, this.ballon);
    this.ballonAvant = null;
    this.etiquette = svg("g", { class: "match-etiquette", style: "display:none" }, s);
    this.etiquetteFond = svg("rect", { y: -9, height: 15, rx: 7.5 }, this.etiquette);
    this.etiquetteTexte = svg("text", { y: 1.5, "text-anchor": "middle" }, this.etiquette);

    this.calqueEclats = svg("g", { class: "match-eclats" }, s);
    this.eclats = [];

    const cx = W / 2;
    const cy = H / 2;
    this.annonceCadre = svg("g", {}, s);
    this.annonce = svg("g", { class: "match-annonce", style: "display:none" }, this.annonceCadre);
    this.annonceFond = svg("rect", { x: cx - 90, y: cy - 26, width: 180, height: 52, rx: 26 }, this.annonce);
    this.annonceTexte = svg("text", { x: cx, y: cy + 1, "text-anchor": "middle", "dominant-baseline": "central" }, this.annonce);
  }

  /** Figurine d'un joueur, posée sur son socle à sa position : le buste de
   *  la carte (votre équipe, avec l'aura de fusion) ou un buste en maillot
   *  rouge (adversaire). Le socle a la couleur de l'équipe. */
  private pion(parent: SVGGElement, camp: 0 | 1, id: string, nom: string, image?: string): SVGGElement {
    const K = this.k;
    const g = svg("g", { class: `match-pion${camp === 0 ? " nous" : " eux"}` }, parent);
    svg("ellipse", { cx: 0, cy: 0, rx: 17 * K, ry: 5 * K, class: "match-ombre-pion" }, g);
    svg("ellipse", { cx: 0, cy: 0, rx: 17 * K, ry: 5 * K, class: "match-socle" }, g);
    const info = this.habillage.infos(id, camp);
    const fusions = info?.fusions ?? 0;
    if (image) {
      if (fusions) this.feu(g, camp, Math.min(3, fusions), 0, 0, 20 * K, true);
      svg("image", {
        href: image,
        x: -24 * K,
        y: -48 * K,
        width: 48 * K,
        height: 49 * K,
        filter: fusions ? `url(#match-aura-${camp}-${Math.min(3, fusions)})` : undefined,
      }, g);
      // Avant de l'anneau redessiné par-dessus : socle à la couleur de
      // l'équipe (bleu ou rouge, comme le maillot), la flamme (aura) autour de
      // la figurine garde la couleur de la fusion (12/11).
      svg("path", { d: `M ${-17 * K} 0 A ${17 * K} ${5 * K} 0 0 0 ${17 * K} 0`, class: "match-socle" }, g);
      if (fusions) svg("path", { d: `M ${-17 * K} 0 A ${17 * K} ${5 * K} 0 0 0 ${17 * K} 0`, class: "match-socle-fusion", stroke: FEU[camp].milieu }, g);
      this.pastilleStyle(g, info?.style ?? null, 13 * K, -10 * K, 5.5 * Math.max(0.8, K));
    } else {
      svg("circle", { cy: -14, r: 9, fill: camp === 0 ? "#3563C0" : COULEUR_EUX, stroke: "#fff", "stroke-width": 1.5 }, g);
    }
    const titre = svg("title", {}, g);
    titre.textContent = nom;
    return g;
  }

  /** Halo (niveau 1) ou flamme (niveaux 2 et 3, plus grande au 3, avec des
   *  étincelles) derrière un joueur fusionné, à la couleur de son équipe.
   *  (x, y) : pied de la flamme ; `taille` : rayon du pion ou demi-largeur de la figurine. */
  private feu(g: SVGGElement, camp: 0 | 1, niveau: number, x: number, y: number, taille: number, figurine: boolean): void {
    // 14/11 (« je ne vois toujours pas les halos ou les flammes ») : plus grands, plus
    // lumineux, et sans transformation SVG sur les éléments animés.
    const f = svg("g", { class: `match-feu niveau-${niveau}`, transform: `translate(${x} ${y})` }, g);
    if (niveau === 1) {
      const r = taille * (figurine ? 1.65 : 3.2);
      const cy = figurine ? -taille * 1.05 : -y;
      svg("ellipse", { cx: 0, cy, rx: r, ry: figurine ? r * 1.3 : r, fill: `url(#match-halo-feu-${camp})`, class: "match-flamme" }, f);
      svg("ellipse", { cx: 0, cy, rx: r * 0.72, ry: (figurine ? r * 1.3 : r) * 0.72, class: "match-halo-anneau", stroke: FEU[camp].coeur }, f);
      return;
    }
    const largeur = taille * (niveau === 3 ? (figurine ? 2.9 : 4.4) : figurine ? 2.3 : 3.4);
    const hauteur = taille * (niveau === 3 ? (figurine ? 4 : 7.2) : figurine ? 3.1 : 5.4);
    svg("path", { d: cheminFlamme(largeur, hauteur), fill: `url(#match-feu-${camp})`, class: "match-flamme-forme" }, f);
    // Cœur clair de la flamme.
    svg("path", { d: cheminFlamme(largeur * 0.5, hauteur * 0.55), fill: FEU[camp].coeur, class: "match-flamme-coeur" }, f);
    if (niveau === 3) {
      for (let i = 0; i < 3; i++) {
        svg("circle", { cx: (i - 1) * largeur * 0.28, cy: -hauteur * (0.7 + 0.1 * i), r: Math.max(1, taille * 0.14), fill: FEU[camp].coeur, class: `match-etincelle e${i}` }, f);
      }
    }
  }

  /** Pion rond (vue « pions ») : couleur du pays pour ton équipe, rouge pour l'adversaire. */
  private pionRond(parent: SVGGElement, camp: 0 | 1, id: string, nom: string): SVGGElement {
    const g = svg("g", { class: `match-rond${camp === 0 ? " nous" : " eux"}` }, parent);
    // Couleur d'équipe (bleu / rouge) : la séparation entre les deux équipes prime
    // (12/11, « pas de séparation visuelle forte entre les 2 équipes »).
    const info = this.habillage.infos(id, camp);
    const fusions = Math.min(3, info?.fusions ?? 0);
    // Fusion (14/11) : halo au niveau 1, flamme qui grossit aux niveaux 2 et 3, couleur de l'équipe.
    if (fusions) {
      this.feu(g, camp, fusions, 0, RAYON_ROND * 0.9, RAYON_ROND, false);
      svg("circle", { r: RAYON_ROND + 2.4, class: `match-rond-fusion niveau-${fusions}`, stroke: FEU[camp].milieu }, g);
    }
    svg("circle", { r: RAYON_ROND, fill: camp === 0 ? BLEU_NOUS : COULEUR_EUX, class: "match-rond-corps" }, g);
    // Style (13/11, « il faut qu'on ait la visibilité ») : petite pastille du pictogramme.
    this.pastilleStyle(g, info?.style ?? null, RAYON_ROND * 1.05, -RAYON_ROND * 1.05, 5.4);
    const titre = svg("title", {}, g);
    titre.textContent = nom;
    return g;
  }

  /** Pastille ronde du style (même pictogramme que sur la préparation). */
  private pastilleStyle(g: SVGGElement, style: string | null, x: number, y: number, r: number): void {
    if (!style || !CORPS_PICTOS[style]) return;
    const p = svg("g", { transform: `translate(${x} ${y})`, class: "match-style" }, g);
    svg("circle", { r, class: "match-style-fond" }, p);
    const ic = svg("g", { transform: `scale(${(r * 1.5) / 24}) translate(-12 -12)`, class: "match-style-picto" }, p);
    ic.innerHTML = CORPS_PICTOS[style]!;
  }

  private majCommandes(): void {
    const enJeu = this.instant.demarre && !this.enPause && !this.arret;
    this.boutonJouer.textContent =
      this.arret === "mi-temps" ? "▶ 2e mi-temps"
      : this.arret === "fin" ? (this.habillage.finMatch ? "Continuer ▶" : "↺ Nouveau match")
      : !this.instant.demarre ? "▶ Coup d'envoi"
      : enJeu ? "❚❚ Pause"
      : "▶ Reprendre";
    this.boutonJouer.classList.toggle("en-jeu", enJeu);
    this.boutonZones.classList.toggle("actif", this.zonesVisibles);
    VUES.forEach((v, i) => {
      const b = this.boutonsVue[i];
      if (!b) return;
      b.classList.toggle("actif", v.id === this.vue);
      b.setAttribute("aria-pressed", String(v.id === this.vue));
    });
    this.boutonZones.setAttribute("aria-pressed", String(this.zonesVisibles));
    for (const f of this.majChoix) f();
  }

  /** Coup d'envoi : l'arbitre calcule la 1re mi-temps avec les choix faits sur cet écran. */
  private coupDEnvoi(): void {
    const film = this.arbitre.premiereMiTemps({ options: { ...this.options }, tactiques: [...this.tactiquesForcees] });
    this.lecteur.charger(film);
    this.afficherBonus();
  }

  // ---- Boucle et dessin --------------------------------------------------------

  private boucle(t: number): void {
    if (!this.actif) return;
    const ecoule = Math.min(0.1, (t - this.dernier) / 1000);
    this.dernier = t;
    if (this.instant.demarre && !this.enPause && !this.arret) {
      this.reserve += ecoule * this.vitesse;
      const dt = this.reglages.pasDeTempsS;
      let n = 0;
      while (this.reserve >= dt && n < 20) {
        // Image suivante du film (un pas de simulation, 1/30 s de jeu).
        const k = this.lecteur.image + 1;
        if (!this.lecteur.disponible(k)) {
          // Pas encore calculée (téléphone très lent) : on l'attend, sans prendre de retard.
          this.reserve = Math.min(this.reserve, dt);
          break;
        }
        this.lecteur.lire(k);
        this.reserve -= dt;
        n++;
        if (k === this.lecteur.derniere) {
          this.finDePeriode();
          break;
        }
      }
    }
    this.dessiner();
    requestAnimationFrame((t2) => this.boucle(t2));
  }

  private dessiner(): void {
    const sim = this.instant;
    // Vedette : le porteur, ou pendant une passe le dernier à avoir touché le
    // ballon ; elle ne change qu'après un court délai (sinon la figurine
    // apparaît et disparaît sans arrêt).
    const touche = sim.balle?.porteur ?? sim.balle?.dernier ?? null;
    if (touche !== this.vedette && (this.vedette === null || sim.temps - this.vedetteDepuis >= VEDETTE_MIN_S)) {
      this.vedette = touche;
      this.vedetteDepuis = sim.temps;
    }
    const porteur = sim.demarre ? this.vedette : null;
    const grand = GRAND_PORTEUR[this.vue];
    // Positions à l'écran : les pions trop proches s'écartent un peu (affichage seulement, le moteur ne change pas).
    const pos = sim.joueurs.map((j) => ({ x: this.X(j.pos.x), y: this.Y(j.pos.y) }));
    const ecart = ECART_AFFICHAGE[this.vue];
    for (let passe = 0; passe < 3; passe++) {
      for (let a = 0; a < pos.length; a++) {
        for (let b = a + 1; b < pos.length; b++) {
          const pa = pos[a]!;
          const pb = pos[b]!;
          let dx = pb.x - pa.x;
          let dy = pb.y - pa.y;
          let d = Math.hypot(dx, dy);
          if (d >= ecart) continue;
          if (d < 1e-3) {
            dx = 1;
            dy = 0;
            d = 1;
          }
          const pousse = (ecart - d) / 2;
          pa.x -= (dx / d) * pousse;
          pa.y -= (dy / d) * pousse;
          pb.x += (dx / d) * pousse;
          pb.y += (dy / d) * pousse;
        }
      }
    }
    sim.joueurs.forEach((j, i) => {
      const e = j === porteur && grand !== 1 && this.vue === "figurines" ? ` scale(${grand})` : "";
      this.pions[i]!.setAttribute("transform", `translate(${pos[i]!.x.toFixed(1)} ${pos[i]!.y.toFixed(1)})${e}`);
    });
    if (this.vue === "action") this.dessinerAction(pos, porteur, grand);
    if (this.figPorteur) {
      this.figPorteur.style.display = porteur ? "" : "none";
      if (porteur) {
        const i = sim.joueurs.indexOf(porteur);
        if (porteur !== this.dernierPorteur) {
          // Nouveau porteur : sa figurine surgit.
          this.figPorteurImage!.setAttribute("href", this.images_[i] ?? "");
          const f = this.habillage.infos(porteur.joueur.id, porteur.camp)?.fusions ?? 0;
          if (f) this.figPorteurImage!.setAttribute("filter", `url(#match-aura-${porteur.camp}-${Math.min(3, f)})`);
          else this.figPorteurImage!.removeAttribute("filter");
          this.figPorteurAnim!.style.animation = "none";
          void this.figPorteurAnim!.getBoundingClientRect();
          this.figPorteurAnim!.style.animation = "";
        }
        const pp = pos[i]!;
        this.figPorteur.setAttribute("transform", `translate(${pp.x.toFixed(1)} ${pp.y.toFixed(1)})`);
      }
    }
    this.dernierPorteur = porteur;
    // Ceux du bas de l'écran passent devant ceux du haut (comme des figurines posées sur le terrain).
    // On ne déplace les nœuds que si l'ordre a changé.
    if (this.images++ % 10 === 0) {
      const ordre = sim.joueurs.map((j, i) => ({ y: this.Y(j.pos.y), i })).sort((a, b) => a.y - b.y).map((o) => o.i);
      const cle = ordre.join(",");
      if (cle !== this.ordreProfondeur) {
        this.ordreProfondeur = cle;
        for (const i of ordre) this.calquePions.appendChild(this.pions[i]!);
        if (this.calqueFigs) for (const i of ordre) this.calqueFigs.appendChild(this.figsAction[i]!);
      }
    }
    this.halo.style.display = porteur ? "" : "none";
    if (porteur) {
      const pp = pos[sim.joueurs.indexOf(porteur)]!;
      this.halo.setAttribute("cx", pp.x.toFixed(1));
      this.halo.setAttribute("cy", pp.y.toFixed(1));
      this.halo.setAttribute("class", `match-halo${porteur.camp === 0 ? "" : " eux"}`);
      const nom = porteur.joueur.nom;
      if (this.etiquetteTexte.textContent !== nom) {
        this.etiquetteTexte.textContent = nom;
        const l = nom.length * 6.3 + 14;
        this.etiquetteFond.setAttribute("x", (-l / 2).toFixed(1));
        this.etiquetteFond.setAttribute("width", l.toFixed(1));
      }
      this.etiquette.setAttribute("class", `match-etiquette${porteur.camp === 0 ? "" : " eux"}`);
      const hauteurFig = this.vue === "pions" || this.vue === "action" || this.vue === "figurines" ? 48 * this.k * grand : 0;
      this.etiquette.setAttribute("transform", `translate(${pp.x.toFixed(1)} ${(pp.y - hauteurFig - 7).toFixed(1)})`);
    }
    this.etiquette.style.display = porteur ? "" : "none";
    this.dessinerBallon();

    this.calqueZones.replaceChildren();
    if (this.zonesVisibles) {
      const vus = new Set<string>();
      // Repère de ton équipe (le même calcul que le moteur : versRepere, versAbsolu, lignesTenues).
      const W = this.donnees.largeurM;
      const L = this.donnees.longueurM;
      const ballon = { x: sim.ballon.x / W, y: sim.ballon.y / L };
      const tenues = { ligneDefM: sim.lignesDef[0] ?? undefined, ligneAdverseM: sim.lignesDef[1] === null ? undefined : L - sim.lignesDef[1] };
      const reg = this.reglagesZones();
      for (const j of sim.joueurs) {
        if (j.camp !== 0 || vus.has(j.poste.id)) continue;
        vus.add(j.poste.id);
        const poste = this.donnees.poste(j.poste.id);
        const r = projeterRect(poste.rect, poste, sim.phases[0], ballon, reg, L, tenues);
        const a = { x: r.x * W, y: (r.y + r.h) * L };
        const xs = [this.X(a.x), this.X(a.x + r.w * W)];
        const ys = [this.Y(a.y), this.Y(a.y - r.h * L)];
        svg("rect", { x: Math.min(...xs), y: Math.min(...ys), width: r.w * 68 * ECHELLE, height: r.h * 105 * ECHELLE, rx: 4, class: "zone-match" }, this.calqueZones);
      }
    }

    // Événement de jeu : son + annonce qui saute, confettis sur un but.
    const ev = sim.balle?.evenement;
    if (ev && ev.a !== this.dernierEvenement) {
      this.dernierEvenement = ev.a;
      jouer(ev.texte);
      if (ev.texte !== "Engagement" && ev.texte !== "Arrêt") { // un arrêt n'arrête pas le jeu : pas d'annonce
        const but = ev.texte === "But !";
        const mot = but ? `BUT !  ${sim.score[0]} – ${sim.score[1]}` : ev.texte === "Penalty" ? "Penalty !" : ev.texte;
        this.annonceTexte.textContent = mot;
        const genre = but ? (sim.balle?.dernier?.camp === 1 ? "but eux" : "but") : ["Faute", "Penalty", "Hors-jeu"].includes(ev.texte) ? "faute" : "neutre";
        this.annonce.setAttribute("class", `match-annonce ${genre}`);
        const largeur = Math.max(130, mot.length * (but ? 22 : 15) + 48);
        const cx = (68 * ECHELLE) / 2 + MARGE;
        this.annonceFond.setAttribute("x", (cx - largeur / 2).toFixed(0));
        this.annonceFond.setAttribute("width", largeur.toFixed(0));
        // Relancer l'animation d'entrée.
        this.annonce.style.animation = "none";
        void this.annonce.getBoundingClientRect();
        this.annonce.style.animation = "";
        // Durée en temps de jeu : l'annonce disparaît avant la reprise (pause de 3,2 s au moins,
        // 7 s après un but), quelle que soit la vitesse d'affichage (12/11).
        this.annonceDepuis = sim.temps;
        this.annonceDuree = but ? ANNONCE_BUT_S : ANNONCE_S;
        if (but) this.confettis();
      }
    }
    this.annonce.style.display = sim.temps - this.annonceDepuis < this.annonceDuree ? "" : "none";

    // Styles qui agissent (14/11) : le pictogramme du joueur brille un instant au-dessus de lui.
    for (const a of this.lecteur.prendreActions()) this.eclairer(a.joueur, a.style);
    if (this.eclats.length) {
      const maintenant = performance.now();
      this.eclats = this.eclats.filter((e) => {
        const i = sim.joueurs.indexOf(e.joueur);
        const p = pos[i];
        if (maintenant > e.fin || !p) {
          e.g.remove();
          return false;
        }
        const enFigurine = this.vue === "figurines" || (this.vue === "action" && this.enAction[i]) || (this.vue === "pions" && e.joueur === porteur);
        const haut = enFigurine ? 54 * this.k * (e.joueur === porteur ? grand : 1) : RAYON_ROND + 13;
        // En haut à droite de la tête : le nom du porteur reste lisible.
        e.g.setAttribute("transform", `translate(${(p.x + 13).toFixed(1)} ${(p.y - haut + 4).toFixed(1)})`);
        return true;
      });
    }

    // Tableau de score.
    const score = `${sim.score[0]} – ${sim.score[1]}`;
    if (this.score.textContent !== score) this.score.textContent = score;
    // Minutes de match : chaque mi-temps de 180 s de jeu simulé vaut 45 minutes.
    const dansPeriode = Math.min(DUREE_MI_TEMPS_S, sim.temps - this.debutPeriode);
    const minute = Math.floor((dansPeriode / DUREE_MI_TEMPS_S) * 45) + (this.periode === 2 ? 45 : 0);
    const chrono = this.arret === "mi-temps" ? "Mi-temps" : this.arret === "fin" ? "Terminé" : `${this.periode === 1 ? "1re" : "2e"} MT · ${minute}'`;
    if (this.chrono.textContent !== chrono) this.chrono.textContent = chrono;
    const total = sim.tempsPossession[0] + sim.tempsPossession[1];
    this.barreNous.style.width = `${total > 0 ? (100 * sim.tempsPossession[0]) / total : 50}%`;

    let texte: string;
    if (!sim.demarre) texte = "Positions au coup d'envoi. Une mi-temps dure environ 50 s en vitesse ×3,5.";
    else if (this.arret) texte = this.arret === "fin" ? "Fin du match." : "Mi-temps : change ta tactique si tu veux, puis lance la 2e mi-temps.";
    else {
      const qui = sim.possession === 0 ? "Tu as le ballon" : `${this.habillage.nomEux} a le ballon`;
      const etat = sim.enTransition ? "transition…" : sim.phases[0] === "attaque" ? "ton équipe monte" : "ton équipe défend";
      texte = `${qui} · ${etat}`;
    }
    if (this.statut.textContent !== texte) this.statut.textContent = texte;
    this.majBord();
  }

  /** Le style d'un joueur vient d'agir (14/11) : son pictogramme brille au-dessus de lui ;
   *  doré et plus long quand son équipe a 5 joueurs de ce style (action signature). */
  private eclairer(joueur: JoueurVu, style: string): void {
    if (!CORPS_PICTOS[style] || !this.calqueEclats) return;
    // Un seul éclat à la fois par joueur.
    for (const e of this.eclats) if (e.joueur === joueur) e.fin = 0;
    const fort = this.stylesForts[joueur.camp].has(style);
    const g = svg("g", { class: `match-eclat${fort ? " fort" : ""}${joueur.camp === 0 ? " nous" : " eux"}` }, this.calqueEclats);
    const anim = svg("g", { class: "match-eclat-anim" }, g);
    const r = fort ? 10 : 8;
    svg("circle", { r: r + 4, class: "match-eclat-halo" }, anim);
    svg("circle", { r, class: "match-eclat-fond" }, anim);
    const ic = svg("g", { transform: `scale(${(r * 1.45) / 24}) translate(-12 -12)`, class: "match-eclat-picto" }, anim);
    ic.innerHTML = CORPS_PICTOS[style]!;
    this.eclats.push({ g, joueur, fin: performance.now() + (fort ? ECLAT_FORT_MS : ECLAT_MS) });
  }

  /** Bonus actifs d'une équipe (14/11) : paliers de styles (3, et 5 : action
   *  signature) si les styles sont activés, et paliers de pays (5 : cohésion ; 8 : tradition). */
  private bonusDe(camp: 0 | 1): { styles: Palier[]; pays: Palier[] } {
    const e = this.equipesMatch[camp];
    return { styles: this.options.styles ? paliersStyles(e, e.composition, INFLUENCES) : [], pays: paliersPays(e, e.composition, INFLUENCES) };
  }

  /** Une pastille de bonus : style (pictogramme) ou pays (sa couleur). */
  private pastilleBonus(parent: HTMLElement, type: "style" | "pays", p: Palier): void {
    const b = html("span", { class: `match-palier${p.fort ? " fort" : ""}` }, parent);
    const ic = html("span", { class: "match-palier-picto" }, b);
    if (type === "style") {
      ic.innerHTML = PICTOS[p.code] ?? "";
      const st = INFLUENCES.styles[p.code]!;
      html("span", {}, b, `${p.fort ? "★ " : ""}${p.fort ? st.palierFortNom : st.palierNom} · ${this.habillage.styles[p.code] ?? st.nom} ×${p.n}`);
    } else {
      ic.textContent = p.code.slice(0, 2);
      ic.style.background = PAYS[p.code]?.couleur ?? "#1F3A93";
      ic.style.color = "#fff";
      const nom = PAYS[p.code]?.nom ?? p.code;
      const t = INFLUENCES.pays.traditions[p.code];
      html("span", {}, b, p.fort && t ? `★ ${nom} ×${p.n} · ${t.nom}` : `${INFLUENCES.pays.cohesion.nom} ${nom} ×${p.n}`);
    }
  }

  /** Bandeau des bonus au coup d'envoi de chaque mi-temps (14/11, « surtout à 5, il faut que ça soit visible »). */
  private afficherBonus(): void {
    this.bandeau?.remove();
    this.bandeau = null;
    const bonus = [this.bonusDe(0), this.bonusDe(1)] as const;
    this.stylesForts = [new Set(bonus[0].styles.filter((p) => p.fort).map((p) => p.code)), new Set(bonus[1].styles.filter((p) => p.fort).map((p) => p.code))];
    if (!bonus.some((b) => b.styles.length || b.pays.length)) return;
    const fort = bonus.some((b) => b.styles.some((p) => p.fort) || b.pays.some((p) => p.fort));
    const d = html("div", { class: `match-bandeau${fort ? " fort" : ""}`, role: "status" }, this.terrain);
    html("div", { class: "match-bandeau-titre" }, d, "Bonus actifs");
    ([0, 1] as const).forEach((camp) => {
      const b = bonus[camp];
      if (!b.styles.length && !b.pays.length) return;
      const l = html("div", { class: `match-bandeau-ligne ${camp === 0 ? "nous" : "eux"}` }, d);
      html("span", { class: "match-bandeau-equipe" }, l, camp === 0 ? this.habillage.nomNous : this.habillage.nomEux);
      for (const p of b.styles) this.pastilleBonus(l, "style", p);
      for (const p of b.pays) this.pastilleBonus(l, "pays", p);
    });
    d.addEventListener("click", () => d.remove());
    this.bandeau = d;
    setTimeout(() => {
      d.classList.add("part");
      setTimeout(() => d.remove(), 400);
    }, fort ? 5200 : 4200);
  }

  /** Réglages de ton équipe (tactique et paliers de styles), pour dessiner les zones. */
  private reglagesZones(): Reglages {
    const equipe = this.equipesMatch[0];
    const cle = `${this.tactiques[0]}|${this.options.tactiques}|${this.options.styles}`;
    if (!this.regZones || this.regZones.cle !== cle || this.regZones.equipe !== equipe) this.regZones = { cle, equipe, reg: reglagesEquipe(this.reglages, equipe, this.tactiques[0], INFLUENCES, this.options) };
    return this.regZones.reg;
  }

  /** Fin d'une mi-temps : coup de sifflet et panneau de statistiques. */
  private finDePeriode(): void {
    this.reserve = 0;
    this.bilan = this.lecteur.film?.bilan ?? null;
    this.arret = this.periode === 1 ? "mi-temps" : "fin";
    if (this.periode === 1) this.scoreMiTemps = [this.instant.score[0], this.instant.score[1]];
    jouer(this.arret === "fin" ? "Fin du match" : "Mi-temps");
    this.majCommandes();
    this.montrerStats();
  }

  /** Score du match en cours. */
  get scoreActuel(): [number, number] {
    return [this.instant.score[0], this.instant.score[1]];
  }

  /** Match arrêté à la mi-temps ? */
  get aLaMiTemps(): boolean {
    return this.arret === "mi-temps";
  }

  /** Forme (sur 100) et note de match d'un de tes joueurs sur le terrain. */
  infosJoueur(id: string): { forme: number; note: number } | null {
    const j = this.bilan?.joueurs.find((x) => x.camp === 0 && x.id === id);
    return j ? { forme: j.forme, note: j.note } : null;
  }

  /** Lance la 2e mi-temps (depuis l'écran de préparation). */
  lancerSecondeMiTemps(): void {
    if (this.arret === "mi-temps") this.secondeMiTemps();
  }

  /** Deuxième mi-temps : l'adversaire engage, chacun regagne sa place. Les
   *  changements faits à la mi-temps (places, remplaçants) s'appliquent. */
  private secondeMiTemps(): void {
    const e = this.equipes()[0];
    // L'arbitre applique les choix (places, remplaçants, tactique) et calcule la 2e mi-temps
    // à partir de l'état exact de la fin de la 1re.
    const film = this.arbitre.secondeMiTemps({ options: { ...this.options }, tactiques: [...this.tactiquesForcees], equipe0: e });
    this.debutPeriode = this.instant.temps;
    this.lecteur.charger(film);
    if (film.entete.equipeChangee) {
      this.equipesMatch = [e, this.equipesMatch[1]];
      this.construireTerrain();
    }
    if (e.tactique && !this.tactiquesForcees[0]) this.tactiques[0] = e.tactique;
    this.panneau?.remove();
    this.panneau = null;
    this.arret = null;
    this.periode = 2;
    this.enPause = false;
    for (const f of this.majChoix) f();
    this.afficherBonus();
  }

  /** Panneau de statistiques sur le terrain (mi-temps, fin du match). */
  private montrerStats(): void {
    const sim = this.instant;
    const bilan = this.bilan;
    if (!bilan) return;
    const st = bilan.stats;
    this.panneau?.remove();
    const h = this.habillage;
    const p = html("div", { class: "match-panneau", role: "dialog", "aria-label": this.arret === "fin" ? "Fin du match" : "Mi-temps" }, this.terrain);
    const carte = html("div", { class: "match-panneau-carte" }, p);
    html("span", { class: "match-panneau-titre" }, carte, this.arret === "fin" ? "Fin du match" : "Mi-temps");
    const score = html("div", { class: "match-panneau-score" }, carte);
    html("span", { class: "nous" }, score, h.nomNous);
    html("strong", {}, score, `${sim.score[0]} – ${sim.score[1]}`);
    html("span", { class: "eux" }, score, h.nomEux);
    if (this.arret === "fin") html("span", { class: "match-panneau-sous" }, carte, `Mi-temps : ${this.scoreMiTemps[0]} – ${this.scoreMiTemps[1]}`);
    // Buteurs (13/11, demande du concepteur), sous le score, de chaque côté.
    const buts = bilan.buts;
    if (buts.length) {
      const zone = html("div", { class: "match-panneau-buteurs" }, carte);
      for (const camp of [0, 1] as const) {
        const col = html("div", { class: camp === 0 ? "nous" : "eux" }, zone);
        for (const b of buts.filter((x) => x.camp === camp)) {
          const l = html("span", { class: "buteur" }, col);
          html("span", { class: "minute" }, l, `${b.minute}'`);
          l.append(` ${b.joueur ?? "?"}${b.contreSonCamp ? " (c.s.c.)" : ""}`);
        }
      }
    }
    const total = sim.tempsPossession[0] + sim.tempsPossession[1];
    const pc = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)} %` : "—");
    const cadres = (c: 0 | 1) => sim.score[c] + st.arrets[c === 0 ? 1 : 0];
    const lignes: [string, string, string][] = [
      ["Possession", pc(sim.tempsPossession[0], total), pc(sim.tempsPossession[1], total)],
      ["Tirs (cadrés)", `${st.tirs[0]} (${cadres(0)})`, `${st.tirs[1]} (${cadres(1)})`],
      ["Passes réussies", `${st.passesReussies[0]}/${st.passes[0]}`, `${st.passesReussies[1]}/${st.passes[1]}`],
      ["Réussite des passes", pc(st.passesReussies[0], st.passes[0]), pc(st.passesReussies[1], st.passes[1])],
      ["Tacles gagnés", String(st.tacles[0]), String(st.tacles[1])],
      ["Fautes", String(st.fautes[0]), String(st.fautes[1])],
      ["Corners", String(st.corners[0]), String(st.corners[1])],
      ["Hors-jeu", String(st.horsJeu[0]), String(st.horsJeu[1])],
      ["Arrêts du gardien", String(st.arrets[0]), String(st.arrets[1])],
    ];
    const table = html("div", { class: "match-panneau-stats" }, carte);
    for (const [nom, a, b] of lignes) {
      html("span", { class: "nous" }, table, a);
      html("span", { class: "nom" }, table, nom);
      html("span", { class: "eux" }, table, b);
    }
    // Notes du match (13/11) : ton meilleur joueur, le sien ; homme du match à la fin.
    const notes = bilan.notes;
    if (notes.length) {
      const z = html("div", { class: "match-panneau-notes" }, carte);
      const ligne = (titre: string, n: (typeof notes)[number] | undefined, cl: string) => {
        if (!n) return;
        const l = html("div", { class: `match-note-ligne ${cl}` }, z);
        html("span", {}, l, titre);
        html("strong", {}, l, n.nom);
        html("b", { class: n.note >= 7 ? "bien" : n.note >= 6 ? "moyen" : "faible" }, l, n.note.toFixed(1));
      };
      if (this.arret === "fin") ligne("★ Homme du match", notes[0], notes[0]!.camp === 0 ? "nous" : "eux");
      ligne("Ton meilleur", notes.find((n) => n.camp === 0), "nous");
      const pire = [...notes].reverse().find((n) => n.camp === 0);
      ligne("Ton moins bon", pire, "nous");
    }
    if (this.arret === "mi-temps" && this.habillage.changements) {
      const c = html("button", { type: "button", class: "match-changements" }, carte, "⇄ Changements, places, fatigue");
      c.addEventListener("click", () => this.habillage.changements!());
    } else if (this.arret === "mi-temps") html("p", { class: "match-panneau-aide" }, carte, "Tu peux changer ta tactique sous le terrain avant de reprendre.");
    const b = html("button", { type: "button", class: "match-jouer" }, carte, this.arret === "fin" ? (this.habillage.finMatch ? "Continuer ▶" : "↺ Nouveau match") : "▶ 2e mi-temps");
    b.addEventListener("click", () => this.boutonJouer.click());
    this.panneau = p;
  }

  /** Vue « Action » (12/11, à la place de la caméra) : les joueurs proches du
   *  ballon passent en figurines, les autres restent des pions. Hystérésis et
   *  durée minimale : un joueur ne clignote pas d'un état à l'autre. */
  private dessinerAction(pos: { x: number; y: number }[], porteur: JoueurVu | null, grand: number): void {
    const sim = this.instant;
    const maintenant = performance.now();
    // Centre de l'action : suit le ballon à vitesse limitée (temps de jeu).
    const dtJeu = Math.max(0, sim.temps - this.tempsAction);
    this.tempsAction = sim.temps;
    if (!this.centreAction || dtJeu > 2 || sim.balle?.arretDeJeu) this.centreAction = { ...sim.ballon };
    else {
      const dx = sim.ballon.x - this.centreAction.x;
      const dy = sim.ballon.y - this.centreAction.y;
      const d = Math.hypot(dx, dy);
      const pas = ACTION_SUIVI_MS * dtJeu;
      this.centreAction = d <= pas ? { ...sim.ballon } : { x: this.centreAction.x + (dx / d) * pas, y: this.centreAction.y + (dy / d) * pas };
    }
    const c = this.centreAction;
    sim.joueurs.forEach((j, i) => {
      // Distance au plus proche du ballon et du centre de l'action.
      const d = Math.min(Math.hypot(j.pos.x - c.x, j.pos.y - c.y), Math.hypot(j.pos.x - sim.ballon.x, j.pos.y - sim.ballon.y));
      const voulu = sim.demarre && (j === porteur || (this.enAction[i] ? d < ACTION_SORTIE_M : d < ACTION_ENTREE_M));
      // Entrer : tout de suite. Sortir : seulement après ACTION_MIN_MS dans l'état (pas de clignotement).
      if (voulu !== this.enAction[i] && (voulu || maintenant - this.actionDepuis[i]! >= ACTION_MIN_MS || !sim.demarre)) {
        this.enAction[i] = voulu;
        this.actionDepuis[i] = maintenant;
        this.fondre(i, voulu);
      }
      if (this.enAction[i]) {
        const e = j === porteur ? ` scale(${grand})` : "";
        this.figsAction[i]!.setAttribute("transform", `translate(${pos[i]!.x.toFixed(1)} ${pos[i]!.y.toFixed(1)})${e}`);
      }
    });
  }

  /** Fondu entre le pion et la figurine d'un joueur (vue « Action ») :
   *  animation par script, qui survit au tri de profondeur (une animation CSS
   *  repartait de zéro à chaque déplacement du nœud et faisait scintiller). */
  private fondre(i: number, versFigurine: boolean): void {
    const f = this.figsAction[i]!;
    const pion = this.pions[i]!;
    const fig = f.firstElementChild as SVGGElement;
    this.fonduAction[i]?.cancel();
    this.fonduPion[i]?.cancel();
    f.style.display = "";
    pion.style.display = "";
    // Fondu croisé : la figurine grandit depuis le socle pendant que le pion s'efface (et l'inverse).
    const a = fig.animate(
      versFigurine
        ? [{ opacity: 0, transform: "scale(0.55)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }]
        : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.6)" }],
      { duration: ACTION_FONDU_MS, easing: "ease-out" },
    );
    const b = pion.animate(versFigurine ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: ACTION_FONDU_MS, easing: "ease-out" });
    a.onfinish = () => {
      if (!this.enAction[i]) f.style.display = "none";
    };
    b.onfinish = () => {
      if (this.enAction[i]) pion.style.display = "none";
    };
    this.fonduAction[i] = a;
    this.fonduPion[i] = b;
  }

  /** Ballon : au sol il roule (le motif tourne), en l'air il monte au-dessus
   *  de son ombre et grossit ; une traînée suit les ballons rapides. */
  private dessinerBallon(): void {
    const sim = this.instant;
    const visible = sim.demarre;
    this.ballon.style.display = visible ? "" : "none";
    this.ombreBallon.style.display = visible ? "" : "none";
    this.trainee.style.display = "none";
    if (!visible) return;
    const bx = this.X(sim.ballon.x);
    const by = this.Y(sim.ballon.y);
    const h = sim.balle?.hauteur ?? 0;
    const lift = h * 16;
    const echelle = 1 + 0.45 * h;
    if (this.ballonAvant) {
      const d = Math.hypot(bx - this.ballonAvant.x, by - this.ballonAvant.y);
      if (d < 40) this.ballonAngle = (this.ballonAngle + (d / RAYON_BALLON) * (180 / Math.PI) * (bx >= this.ballonAvant.x ? 1 : -1)) % 360;
    }
    this.ballonAvant = { x: bx, y: by };
    this.ballonMotif.setAttribute("transform", `rotate(${this.ballonAngle.toFixed(0)})`);
    this.ballon.setAttribute("transform", `translate(${bx.toFixed(1)} ${(by - lift).toFixed(1)}) scale(${echelle.toFixed(2)})`);
    this.ombreBallon.setAttribute("cx", bx.toFixed(1));
    this.ombreBallon.setAttribute("cy", (by + RAYON_BALLON * 0.55).toFixed(1));
    this.ombreBallon.setAttribute("transform", `translate(${bx.toFixed(1)} ${(by + RAYON_BALLON * 0.55).toFixed(1)}) scale(${(1 - 0.35 * h).toFixed(2)}) translate(${(-bx).toFixed(1)} ${(-(by + RAYON_BALLON * 0.55)).toFixed(1)})`);
    this.ombreBallon.style.opacity = (1 - 0.5 * h).toFixed(2);
    // Traînée : ballon rapide (passe appuyée, tir, dégagement).
    const v = sim.balle?.vit ?? { x: 0, y: 0 };
    const vitesse = Math.hypot(v.x, v.y);
    if (vitesse > 9 && !sim.balle?.porteur) {
      const ux = (this.X(sim.ballon.x + v.x) - bx) / vitesse;
      const uy = (this.Y(sim.ballon.y + v.y) - by) / vitesse;
      const n = Math.hypot(ux, uy) || 1;
      const dx = ux / n;
      const dy = uy / n;
      const long = Math.min(46, (vitesse - 6) * 2.2);
      const w = RAYON_BALLON * 0.9 * echelle;
      const cy = by - lift;
      const qx = bx - dx * long;
      const qy = cy - dy * long;
      this.trainee.setAttribute("d", `M ${(bx - dy * w).toFixed(1)} ${(cy + dx * w).toFixed(1)} L ${qx.toFixed(1)} ${qy.toFixed(1)} L ${(bx + dy * w).toFixed(1)} ${(cy - dx * w).toFixed(1)} Z`);
      this.degradeTrainee.setAttribute("x1", qx.toFixed(1));
      this.degradeTrainee.setAttribute("y1", qy.toFixed(1));
      this.degradeTrainee.setAttribute("x2", bx.toFixed(1));
      this.degradeTrainee.setAttribute("y2", cy.toFixed(1));
      this.trainee.style.display = "";
    }
  }

  /** Pluie de confettis sur le terrain (but). */
  private confettis(): void {
    const couleurs = ["#FFC400", "#5EC8FF", "#C04BFF", "#FF6B6B", "#FFFFFF", "#3BD17A"];
    const boite = html("div", { class: "match-confettis", "aria-hidden": "true" }, this.terrain);
    for (let i = 0; i < 36; i++) {
      const c = html("span", {}, boite);
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = couleurs[i % couleurs.length]!;
      c.style.animationDelay = `${Math.random() * 0.35}s`;
      c.style.setProperty("--derive", `${(Math.random() - 0.5) * 80}px`);
      c.style.setProperty("--tour", `${(Math.random() - 0.5) * 720}deg`);
    }
    window.setTimeout(() => boite.remove(), 2200);
  }

  /** Tableau de bord : possession, passes réussies, lignes défensives, paliers de styles. */
  private majBord(force = false): void {
    const sim = this.instant;
    if (!force && performance.now() - this.derniereMajBord < 500) return;
    this.derniereMajBord = performance.now();
    const st = sim.balle;
    const total = sim.tempsPossession[0] + sim.tempsPossession[1];
    const pc = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)} %` : "—");
    const ligne = (camp: 0 | 1) => (sim.lignesDef[camp] === null ? "—" : `${Math.round(sim.lignesDef[camp]!)} m`);
    const cartes: [string, string, string][] = [
      ["Possession", pc(sim.tempsPossession[0], total), pc(sim.tempsPossession[1], total)],
      ["Passes réussies", st ? pc(st.passesReussies[0], st.passes[0]) : "—", st ? pc(st.passesReussies[1], st.passes[1]) : "—"],
      ["Ligne défensive", ligne(0), ligne(1)],
    ];
    const b = this.bord;
    b.replaceChildren();
    for (const [titre, a, c] of cartes) {
      const k = html("div", { class: "match-carte" }, b);
      html("span", { class: "match-carte-titre" }, k, titre);
      const v = html("span", { class: "match-carte-valeurs" }, k);
      html("span", { class: "nous" }, v, a);
      html("span", { class: "eux" }, v, c);
    }
    const p = html("div", { class: "match-paliers" }, b);
    html("span", { class: "match-carte-titre" }, p, "Tes bonus");
    // Paliers atteints par ton équipe sur le terrain (14/11) : styles (3 et 5) et pays (5 et 8).
    const bonus = this.bonusDe(0);
    if (!this.options.styles) html("span", { class: "match-discret" }, p, "styles coupés");
    if (!bonus.styles.length && !bonus.pays.length) html("span", { class: "match-discret" }, p, "aucun (3 joueurs du même style, 5 du même pays)");
    for (const x of bonus.styles) this.pastilleBonus(p, "style", x);
    for (const x of bonus.pays) this.pastilleBonus(p, "pays", x);
  }
}
