// Écran de match, dans l'esprit de l'écran de préparation (12/11 : « une IHM
// aussi fun et belle que celle de la préparation ») : tableau de score avec
// chrono et barre de possession, pelouse rayée, joueurs en figurines sur leur
// socle (les adversaires en maillot rouge), aura de fusion, le porteur du
// ballon sur un socle doré avec son nom, annonces qui sautent, confettis.
// Votre équipe attaque vers le haut. Tactique de chaque équipe modifiable en
// plein match, tactiques et styles activables ou non (proposition du 12/11).

import type { Donnees } from "../sim/donnees";
import type { OptionsInfluences } from "../sim/influences";
import { projeterRect } from "../sim/projection";
import { MatchSim } from "../sim/simulation";
import type { Equipe, Reglages } from "../sim/types";
import { CHAMP_ROUGE, GARDIEN_ROUGE } from "./adversaires";
import { BUSTES } from "./bustes";
import { BUSTES_BLEUS } from "./equipeBleue";
import { dessinerLignes, html, svg } from "./dom";
import { CORPS_PICTOS, PICTOS } from "./pictos";
import { activer, basculerMuet, estMuet, jouer } from "./son";

const ECHELLE = 5; // unités SVG par mètre
const MARGE = 6;
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
/** Une mi-temps : 180 s de jeu simulé, soit environ 51 s à l'écran en vitesse ×3,5 (12/11). */
const DUREE_MI_TEMPS_S = 180;
/** Durée des annonces, en secondes de jeu simulé (≈ 0,7 s et 1,6 s à l'écran en ×3,5). */
const ANNONCE_S = 2.5;
const ANNONCE_BUT_S = 5.5;
const VITESSE_PAR_DEFAUT = 3.5;
const COULEUR_EUX = "#C2413D";
/** Couleur de chaque niveau de fusion (1 bleu, 2 or, 3 violet), comme sur la préparation. */
const COULEURS_FUSION = ["", "#38E1FF", "#FFC400", "#C04BFF"];
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
}

export class EcranMatch {
  readonly racine: HTMLElement;
  private sim!: MatchSim;
  private graine = 1;
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
  /** Styles coupés en match pour l'instant (concepteur, 12/11) ; l'interrupteur reste pour essayer. */
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
  private vedette: import("../sim/simulation").JoueurSim | null = null;
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
  ) {
    this.racine = html("section", { class: "match" });
  }

  private X = (m: number) => MARGE + m * ECHELLE;
  private Y = (m: number) => MARGE + (105 - m) * ECHELLE;

  /** Appelé à l'ouverture de l'écran : nouveau match au coup d'envoi. */
  ouvrir(): void {
    this.actif = true;
    this.tactiquesForcees = [null, null]; // la tactique choisie en préparation s'applique
    this.nouveauMatch();
    this.dernier = performance.now();
    requestAnimationFrame((t) => this.boucle(t));
  }

  fermer(): void {
    this.actif = false;
  }

  private nouveauMatch(): void {
    this.sim = new MatchSim(this.donnees, this.reglages, this.equipes(), this.graine, true);
    this.sim.definirOptions(this.options);
    this.tactiquesForcees.forEach((t, camp) => {
      if (t) this.sim.definirTactique(camp as 0 | 1, t);
    });
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
        this.graine += 1;
        this.nouveauMatch();
        return;
      } else if (!this.sim.demarre) this.sim.demarrer();
      else this.enPause = !this.enPause;
      this.majCommandes();
    });
    const nouveau = html("button", { type: "button", class: "match-puce", "aria-label": "Nouveau match" }, cmd, "↺ Nouveau");
    nouveau.addEventListener("click", () => {
      this.graine += 1;
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

    // Tactiques (modifiables en plein match) et interrupteurs.
    const tac = html("div", { class: "match-tactiques" }, r);
    ([h.nomNous, h.nomEux] as const).forEach((qui, camp) => {
      const l = html("label", { class: `match-pilule${camp === 1 ? " eux" : ""}` }, tac);
      html("span", { class: "match-pilule-titre" }, l, qui);
      const valeur = html("span", { class: "match-pilule-valeur" }, l);
      const sel = html("select", { "aria-label": `Tactique de ${qui}` }, l);
      for (const t of h.tactiques) {
        const o = html("option", { value: t.code }, sel, t.nom);
        o.selected = t.code === this.sim.tactiques[camp];
      }
      const maj = () => {
        valeur.textContent = h.tactiques.find((t) => t.code === sel.value)?.nom ?? sel.value;
        sel.disabled = !this.options.tactiques;
        l.classList.toggle("coupee", !this.options.tactiques);
      };
      maj();
      sel.addEventListener("change", () => {
        this.tactiquesForcees[camp] = sel.value;
        this.sim.definirTactique(camp as 0 | 1, sel.value);
        maj();
        this.majBord(true);
      });
      l.addEventListener("maj", maj);
    });
    const inter = html("div", { class: "match-interrupteurs" }, r);
    for (const cle of ["tactiques", "styles"] as const) {
      const b = html("button", { type: "button", class: "match-interrupteur" }, inter);
      const maj = () => {
        const on = this.options[cle];
        b.classList.toggle("actif", on);
        b.setAttribute("aria-pressed", String(on));
        b.textContent = cle === "tactiques" ? `Tactiques ${on ? "activées" : "coupées"}` : `Styles ${on ? "activés" : "coupés"}`;
      };
      maj();
      b.addEventListener("click", () => {
        this.options = { ...this.options, [cle]: !this.options[cle] };
        this.sim.definirOptions(this.options);
        maj();
        for (const l of tac.querySelectorAll("label")) l.dispatchEvent(new Event("maj"));
        this.majBord(true);
      });
    }

    // Tableau de bord.
    this.bord = html("div", { class: "match-bord" }, r);
    html("p", { class: "match-note" }, r, "Tactiques et styles : proposition à juger en regardant le match. Coupe-les ou change de tactique en plein match pour voir la différence.");

    this.majCommandes();
    this.dessiner();
    this.majBord(true);
  }

  private construireTerrain(): void {
    const s = svg("svg", {
      viewBox: `0 0 ${68 * ECHELLE + 2 * MARGE} ${105 * ECHELLE + 2 * MARGE}`,
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
    const auras: [string, number][][] = [
      [],
      [["#FFFFFF", 0.7], ["#38E1FF", 1.8], ["#38E1FF", 3.6]],
      [["#FFFFFF", 0.7], ["#FFC400", 1.8], ["#FFB000", 3.6]],
      [["#FFFFFF", 0.8], ["#C04BFF", 2.4], ["#FF4FD8", 4.5]],
    ];
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
    auras.forEach((ombres, n) => {
      if (!n) return;
      const f = svg("filter", { id: `match-aura-${n}`, x: "-60%", y: "-60%", width: "220%", height: "220%", "color-interpolation-filters": "sRGB" }, defs);
      for (const [c, e] of ombres) svg("feDropShadow", { dx: 0, dy: 0, stdDeviation: e, "flood-color": c, "flood-opacity": 1 }, f);
    });

    // Pelouse rayée, comme sur l'écran de préparation.
    const W = 68 * ECHELLE + 2 * MARGE;
    const H = 105 * ECHELLE + 2 * MARGE;
    svg("rect", { x: 0, y: 0, width: W, height: H, rx: 14, class: "match-pelouse" }, s);
    const hb = (105 * ECHELLE) / BANDES;
    for (let i = 0; i < BANDES; i += 2) svg("rect", { x: MARGE, y: MARGE + i * hb, width: 68 * ECHELLE, height: hb, class: "match-bande" }, s);
    dessinerLignes(svg("g", { class: "match-lignes" }, s), this.X, this.Y, false);
    this.calqueZones = svg("g", { class: "zones-match" }, s);

    // Halo du porteur, ombre du ballon, joueurs, ballon.
    this.halo = svg("ellipse", { rx: 22 * K, ry: 7 * K, class: "match-halo" }, s);
    this.ombreBallon = svg("ellipse", { rx: RAYON_BALLON * 0.95, ry: RAYON_BALLON * 0.45, class: "match-ombre" }, s);
    const g = svg("g", {}, s);
    this.calquePions = g;
    // Figurines adverses : d'abord celles qui ne sont pas sur ton terrain, pour
    // éviter de voir ton joueur et sa copie rouge côte à côte.
    const tesTitulaires = new Set(this.sim.joueurs.filter((j) => j.camp === 0).map((j) => j.joueur.id));
    const rouges = Object.entries(CHAMP_ROUGE)
      .sort(([a], [b]) => Number(tesTitulaires.has(a)) - Number(tesTitulaires.has(b)))
      .map(([, image]) => image);
    let rang = 0;
    // Maillots d'équipe en match : bleu pour toi, rouge pour l'adversaire (12/11).
    this.images_ = this.sim.joueurs.map((j) => (j.camp === 1 ? (j.poste.id === "G" ? GARDIEN_ROUGE : rouges[rang++ % rouges.length]!) : (BUSTES_BLEUS[j.joueur.id] ?? BUSTES[j.joueur.id])));
    this.pions = this.sim.joueurs.map((j, i) =>
      this.vue === "figurines" ? this.pion(g, j.camp, j.joueur.id, j.joueur.nom, this.images_[i]) : this.pionRond(g, j.camp, j.joueur.id, j.joueur.nom),
    );
    // Vue « Action » : une figurine par joueur, au-dessus des pions, montrée près du ballon.
    this.figsAction = [];
    this.calqueFigs = null;
    this.ordreProfondeur = "";
    this.enAction = this.sim.joueurs.map(() => false);
    this.actionDepuis = this.sim.joueurs.map(() => -Infinity);
    this.fonduAction = this.sim.joueurs.map(() => null);
    this.fonduPion = this.sim.joueurs.map(() => null);
    this.centreAction = null;
    if (this.vue === "action") {
      const gf = svg("g", {}, s);
      this.calqueFigs = gf;
      this.figsAction = this.sim.joueurs.map((j, i) => {
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
      svg("image", {
        href: image,
        x: -24 * K,
        y: -48 * K,
        width: 48 * K,
        height: 49 * K,
        filter: fusions ? `url(#match-aura-${Math.min(3, fusions)})` : undefined,
      }, g);
      // Avant de l'anneau redessiné par-dessus : socle à la couleur de
      // l'équipe (bleu ou rouge, comme le maillot), la flamme (aura) autour de
      // la figurine garde la couleur de la fusion (12/11).
      svg("path", { d: `M ${-17 * K} 0 A ${17 * K} ${5 * K} 0 0 0 ${17 * K} 0`, class: "match-socle" }, g);
      if (fusions) svg("path", { d: `M ${-17 * K} 0 A ${17 * K} ${5 * K} 0 0 0 ${17 * K} 0`, class: "match-socle-fusion", stroke: COULEURS_FUSION[Math.min(3, fusions)] }, g);
      this.pastilleStyle(g, info?.style ?? null, 13 * K, -10 * K, 5.5 * Math.max(0.8, K));
    } else {
      svg("circle", { cy: -14, r: 9, fill: camp === 0 ? "#3563C0" : COULEUR_EUX, stroke: "#fff", "stroke-width": 1.5 }, g);
    }
    const titre = svg("title", {}, g);
    titre.textContent = nom;
    return g;
  }

  /** Pion rond (vue « pions ») : couleur du pays pour ton équipe, rouge pour l'adversaire. */
  private pionRond(parent: SVGGElement, camp: 0 | 1, id: string, nom: string): SVGGElement {
    const g = svg("g", { class: `match-rond${camp === 0 ? " nous" : " eux"}` }, parent);
    // Couleur d'équipe (bleu / rouge) : la séparation entre les deux équipes prime
    // (12/11, « pas de séparation visuelle forte entre les 2 équipes »).
    const info = this.habillage.infos(id, camp);
    const fusions = Math.min(3, info?.fusions ?? 0);
    // Fusion (13/11, « en match, les fusions ne se voient plus ») : anneau de la couleur du niveau.
    if (fusions) svg("circle", { r: RAYON_ROND + 2.6, class: `match-rond-fusion niveau-${fusions}`, stroke: COULEURS_FUSION[fusions] }, g);
    svg("circle", { r: RAYON_ROND, fill: camp === 0 ? BLEU_NOUS : COULEUR_EUX }, g);
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
    const enJeu = this.sim.demarre && !this.enPause && !this.arret;
    this.boutonJouer.textContent =
      this.arret === "mi-temps" ? "▶ 2e mi-temps"
      : this.arret === "fin" ? "↺ Nouveau match"
      : !this.sim.demarre ? "▶ Coup d'envoi"
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
  }

  // ---- Boucle et dessin --------------------------------------------------------

  private boucle(t: number): void {
    if (!this.actif) return;
    const ecoule = Math.min(0.1, (t - this.dernier) / 1000);
    this.dernier = t;
    if (this.sim.demarre && !this.enPause && !this.arret) {
      this.reserve += ecoule * this.vitesse;
      const dt = this.reglages.pasDeTempsS;
      let n = 0;
      while (this.reserve >= dt && n < 20) {
        this.sim.pas();
        this.reserve -= dt;
        n++;
        if (this.sim.temps - this.debutPeriode >= DUREE_MI_TEMPS_S) {
          this.finDePeriode();
          break;
        }
      }
    }
    this.dessiner();
    requestAnimationFrame((t2) => this.boucle(t2));
  }

  private dessiner(): void {
    const sim = this.sim;
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
          if (f) this.figPorteurImage!.setAttribute("filter", `url(#match-aura-${Math.min(3, f)})`);
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
      const ballon = sim.versRepere(0, sim.ballon);
      for (const j of sim.joueurs) {
        if (j.camp !== 0 || vus.has(j.poste.id)) continue;
        vus.add(j.poste.id);
        const r = projeterRect(j.poste.rect, j.poste, sim.phases[0], ballon, sim.reg(0), this.donnees.longueurM, sim.lignesTenues(0));
        const a = sim.versAbsolu(0, { x: r.x, y: r.y + r.h });
        svg("rect", { x: this.X(a.x), y: this.Y(a.y), width: r.w * 68 * ECHELLE, height: r.h * 105 * ECHELLE, rx: 4, class: "zone-match" }, this.calqueZones);
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

  /** Fin d'une mi-temps : coup de sifflet et panneau de statistiques. */
  private finDePeriode(): void {
    this.reserve = 0;
    this.arret = this.periode === 1 ? "mi-temps" : "fin";
    if (this.periode === 1) this.scoreMiTemps = [...this.sim.score];
    jouer(this.arret === "fin" ? "Fin du match" : "Mi-temps");
    this.majCommandes();
    this.montrerStats();
  }

  /** Deuxième mi-temps : l'adversaire engage, chacun regagne sa place. */
  private secondeMiTemps(): void {
    this.panneau?.remove();
    this.panneau = null;
    this.arret = null;
    this.periode = 2;
    this.debutPeriode = this.sim.temps;
    this.sim.commencerPeriode();
    this.enPause = false;
    this.sim.balle?.coupDEnvoi(1, "2e mi-temps");
  }

  /** Panneau de statistiques sur le terrain (mi-temps, fin du match). */
  private montrerStats(): void {
    const sim = this.sim;
    const st = sim.balle?.stats;
    if (!st) return;
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
    const buts = sim.balle?.buts ?? [];
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
    if (this.arret === "mi-temps") html("p", { class: "match-panneau-aide" }, carte, "Tu peux changer ta tactique sous le terrain avant de reprendre.");
    const b = html("button", { type: "button", class: "match-jouer" }, carte, this.arret === "fin" ? "↺ Nouveau match" : "▶ 2e mi-temps");
    b.addEventListener("click", () => this.boutonJouer.click());
    this.panneau = p;
  }

  /** Vue « Action » (12/11, à la place de la caméra) : les joueurs proches du
   *  ballon passent en figurines, les autres restent des pions. Hystérésis et
   *  durée minimale : un joueur ne clignote pas d'un état à l'autre. */
  private dessinerAction(pos: { x: number; y: number }[], porteur: import("../sim/simulation").JoueurSim | null, grand: number): void {
    const sim = this.sim;
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
    const sim = this.sim;
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
    const sim = this.sim;
    if (!force && performance.now() - this.derniereMajBord < 500) return;
    this.derniereMajBord = performance.now();
    const st = sim.balle?.stats;
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
    html("span", { class: "match-carte-titre" }, p, "Paliers de styles");
    const paliers = sim.paliers(0);
    if (!this.options.styles) html("span", { class: "match-discret" }, p, "styles coupés");
    else if (!paliers.length) html("span", { class: "match-discret" }, p, "aucun (3 joueurs du même style)");
    for (const code of paliers) {
      const badge = html("span", { class: "match-palier" }, p);
      const ic = html("span", { class: "match-palier-picto" }, badge);
      ic.innerHTML = PICTOS[code] ?? "";
      html("span", {}, badge, this.habillage.styles[code] ?? code);
    }
  }
}
