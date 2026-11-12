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
import { dessinerLignes, html, svg } from "./dom";
import { PICTOS } from "./pictos";
import { activer, basculerMuet, estMuet, jouer } from "./son";

const ECHELLE = 5; // unités SVG par mètre
const MARGE = 6;
/** Trois rendus à comparer (12/11, « c'est quand même un sacré bordel » avec 22 figurines) :
 *  pions ronds et seul le porteur en figurine ; toutes les figurines en petit ;
 *  figurines plus grandes avec une caméra qui suit le ballon. */
type Vue = "pions" | "figurines" | "camera";
const VUES: { id: Vue; nom: string }[] = [
  { id: "pions", nom: "Pions" },
  { id: "figurines", nom: "Figurines" },
  { id: "camera", nom: "Caméra" },
];
/** Largeur d'une figurine (unités SVG) ; repère de la maquette : 48 × 53, socle en 24,47. */
const LARGEUR_FIG: Record<Vue, number> = { pions: 40, figurines: 26, camera: 30 };
/** Agrandissement du porteur. */
const GRAND_PORTEUR: Record<Vue, number> = { pions: 1, figurines: 1.4, camera: 1.2 };
/** Caméra : fenêtre de 44 m de large autour du ballon. */
const ZOOM_CAMERA = 68 / 44;
const RAYON_ROND = 7;
const CLE_VUE = "foot-merge-tactic.vue-match.v1";
const COULEUR_EUX = "#C2413D";
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
  /** Couleur du pays et style d'un joueur de votre équipe. */
  infos: (id: string) => InfosJoueur | undefined;
}

export class EcranMatch {
  readonly racine: HTMLElement;
  private sim!: MatchSim;
  private graine = 1;
  private vitesse = 1;
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
      return v === "figurines" || v === "camera" ? v : "pions";
    } catch {
      return "pions";
    }
  })();
  /** Échelle des figurines : LARGEUR_FIG / 48. */
  private k = LARGEUR_FIG.pions / 48;
  private svgTerrain!: SVGSVGElement;
  private camera: { x: number; y: number } | null = null;
  private annonceCadre!: SVGGElement;
  private images_: (string | undefined)[] = [];
  private figPorteur: SVGGElement | null = null;
  private figPorteurImage: SVGImageElement | null = null;
  private figPorteurAnim: SVGGElement | null = null;
  private dernierPorteur: unknown = null;
  private boutonsVue: HTMLButtonElement[] = [];
  private calquePions!: SVGGElement;
  private images = 0;
  private halo!: SVGEllipseElement;
  private etiquette!: SVGGElement;
  private etiquetteFond!: SVGRectElement;
  private etiquetteTexte!: SVGTextElement;
  private ballon!: SVGCircleElement;
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
      if (!this.sim.demarre) this.sim.demarrer();
      else this.enPause = !this.enPause;
      this.majCommandes();
    });
    const nouveau = html("button", { type: "button", class: "match-puce", "aria-label": "Nouveau match" }, cmd, "↺ Nouveau");
    nouveau.addEventListener("click", () => {
      this.graine += 1;
      this.nouveauMatch();
    });
    const vitesses = [0.5, 1, 2, 3, 4];
    const bVitesse = html("button", { type: "button", class: "match-puce", "aria-label": "Vitesse" }, cmd, `×${this.vitesse}`);
    bVitesse.addEventListener("click", () => {
      this.vitesse = vitesses[(vitesses.indexOf(this.vitesse) + 1) % vitesses.length]!;
      bVitesse.textContent = `×${this.vitesse}`;
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
    this.camera = null;
    this.dernierPorteur = null;
    const K = this.k;
    const defs = svg("defs", {}, s);
    const auras: [string, number][][] = [
      [],
      [["#5EC8FF", 1.2], ["#5EC8FF", 2.6]],
      [["#FFC400", 1.2], ["#FFC400", 2.6]],
      [["#FFFFFF", 0.8], ["#C04BFF", 2.4], ["#FF4FD8", 4.5]],
    ];
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
    this.ombreBallon = svg("ellipse", { rx: 3.4, ry: 1.6, class: "match-ombre" }, s);
    const g = svg("g", {}, s);
    this.calquePions = g;
    // Figurines adverses : d'abord celles qui ne sont pas sur ton terrain, pour
    // éviter de voir ton joueur et sa copie rouge côte à côte.
    const tesTitulaires = new Set(this.sim.joueurs.filter((j) => j.camp === 0).map((j) => j.joueur.id));
    const rouges = Object.entries(CHAMP_ROUGE)
      .sort(([a], [b]) => Number(tesTitulaires.has(a)) - Number(tesTitulaires.has(b)))
      .map(([, image]) => image);
    let rang = 0;
    this.images_ = this.sim.joueurs.map((j) => (j.camp === 1 ? (j.poste.id === "G" ? GARDIEN_ROUGE : rouges[rang++ % rouges.length]!) : BUSTES[j.joueur.id]));
    this.pions = this.sim.joueurs.map((j, i) =>
      this.vue === "pions" ? this.pionRond(g, j.camp, j.joueur.id, j.joueur.nom) : this.pion(g, j.camp, j.joueur.id, j.joueur.nom, this.images_[i]),
    );
    // Vue « pions » : le porteur surgit en figurine sur un socle doré.
    this.figPorteur = null;
    if (this.vue === "pions") {
      this.figPorteur = svg("g", { style: "display:none", class: "match-pion" }, s);
      this.figPorteurAnim = svg("g", { class: "match-surgit" }, this.figPorteur);
      svg("ellipse", { cx: 0, cy: 0, rx: 17 * K, ry: 5 * K, class: "match-ombre-pion" }, this.figPorteurAnim);
      this.figPorteurImage = svg("image", { x: -24 * K, y: -48 * K, width: 48 * K, height: 49 * K }, this.figPorteurAnim);
    }
    this.ballon = svg("circle", { r: 3.4, class: "match-ballon" }, s);
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
    const fusions = camp === 0 ? (this.habillage.infos(id)?.fusions ?? 0) : 0;
    if (image) {
      svg("image", {
        href: image,
        x: -24 * K,
        y: -48 * K,
        width: 48 * K,
        height: 49 * K,
        filter: fusions ? `url(#match-aura-${Math.min(3, fusions)})` : undefined,
      }, g);
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
    const couleur = camp === 0 ? (this.habillage.infos(id)?.couleur ?? "#3563C0") : COULEUR_EUX;
    svg("circle", { r: RAYON_ROND, fill: couleur }, g);
    const titre = svg("title", {}, g);
    titre.textContent = nom;
    return g;
  }

  private majCommandes(): void {
    const enJeu = this.sim.demarre && !this.enPause;
    this.boutonJouer.textContent = !this.sim.demarre ? "▶ Coup d'envoi" : enJeu ? "❚❚ Pause" : "▶ Reprendre";
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
    if (this.sim.demarre && !this.enPause) {
      this.reserve += ecoule * this.vitesse;
      const dt = this.reglages.pasDeTempsS;
      let n = 0;
      while (this.reserve >= dt && n < 20) {
        this.sim.pas();
        this.reserve -= dt;
        n++;
      }
    }
    this.dessiner();
    requestAnimationFrame((t2) => this.boucle(t2));
  }

  private dessiner(): void {
    const sim = this.sim;
    const porteur = sim.balle?.porteur ?? null;
    const grand = GRAND_PORTEUR[this.vue];
    sim.joueurs.forEach((j, i) => {
      const e = j === porteur && grand !== 1 ? ` scale(${grand})` : "";
      this.pions[i]!.setAttribute("transform", `translate(${this.X(j.pos.x).toFixed(1)} ${this.Y(j.pos.y).toFixed(1)})${e}`);
    });
    if (this.figPorteur) {
      this.figPorteur.style.display = porteur ? "" : "none";
      if (porteur) {
        const i = sim.joueurs.indexOf(porteur);
        if (porteur !== this.dernierPorteur) {
          // Nouveau porteur : sa figurine surgit.
          this.figPorteurImage!.setAttribute("href", this.images_[i] ?? "");
          const f = porteur.camp === 0 ? (this.habillage.infos(porteur.joueur.id)?.fusions ?? 0) : 0;
          if (f) this.figPorteurImage!.setAttribute("filter", `url(#match-aura-${Math.min(3, f)})`);
          else this.figPorteurImage!.removeAttribute("filter");
          this.figPorteurAnim!.style.animation = "none";
          void this.figPorteurAnim!.getBoundingClientRect();
          this.figPorteurAnim!.style.animation = "";
        }
        this.figPorteur.setAttribute("transform", `translate(${this.X(porteur.pos.x).toFixed(1)} ${this.Y(porteur.pos.y).toFixed(1)})`);
      }
    }
    this.dernierPorteur = porteur;
    // Ceux du bas de l'écran passent devant ceux du haut (comme des figurines posées sur le terrain).
    if (this.images++ % 10 === 0) {
      const ordre = sim.joueurs.map((j, i) => ({ y: this.Y(j.pos.y), p: this.pions[i]! })).sort((a, b) => a.y - b.y);
      for (const { p } of ordre) this.calquePions.appendChild(p);
    }
    this.halo.style.display = porteur ? "" : "none";
    if (porteur) {
      this.halo.setAttribute("cx", this.X(porteur.pos.x).toFixed(1));
      this.halo.setAttribute("cy", this.Y(porteur.pos.y).toFixed(1));
      this.halo.setAttribute("class", `match-halo${porteur.camp === 0 ? "" : " eux"}`);
      const nom = porteur.joueur.nom;
      if (this.etiquetteTexte.textContent !== nom) {
        this.etiquetteTexte.textContent = nom;
        const l = nom.length * 6.3 + 14;
        this.etiquetteFond.setAttribute("x", (-l / 2).toFixed(1));
        this.etiquetteFond.setAttribute("width", l.toFixed(1));
      }
      this.etiquette.setAttribute("class", `match-etiquette${porteur.camp === 0 ? "" : " eux"}`);
      this.etiquette.setAttribute("transform", `translate(${this.X(porteur.pos.x).toFixed(1)} ${(this.Y(porteur.pos.y) - 48 * this.k * grand - 7).toFixed(1)})`);
    }
    this.etiquette.style.display = porteur ? "" : "none";
    const enLAir = !!sim.balle?.enLAir;
    const bx = this.X(sim.ballon.x);
    const by = this.Y(sim.ballon.y);
    this.ballon.setAttribute("r", enLAir ? "5" : "3.4");
    this.ballon.setAttribute("cx", bx.toFixed(1));
    this.ballon.setAttribute("cy", (by - (enLAir ? 5 : 0)).toFixed(1)); // ballon aérien : plus gros, au-dessus de son ombre
    this.ombreBallon.setAttribute("cx", bx.toFixed(1));
    this.ombreBallon.setAttribute("cy", (by + 2.5).toFixed(1));
    this.ballon.style.display = sim.demarre ? "" : "none";
    this.ombreBallon.style.display = sim.demarre ? "" : "none";

    this.suivreCamera();

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
        this.annonceDepuis = performance.now();
        this.annonceDuree = but ? 2500 : 1400;
        if (but) this.confettis();
      }
    }
    this.annonce.style.display = performance.now() - this.annonceDepuis < this.annonceDuree ? "" : "none";

    // Tableau de score.
    const score = `${sim.score[0]} – ${sim.score[1]}`;
    if (this.score.textContent !== score) this.score.textContent = score;
    const t = Math.floor(sim.temps);
    const chrono = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    if (this.chrono.textContent !== chrono) this.chrono.textContent = chrono;
    const total = sim.tempsPossession[0] + sim.tempsPossession[1];
    this.barreNous.style.width = `${total > 0 ? (100 * sim.tempsPossession[0]) / total : 50}%`;

    let texte: string;
    if (!sim.demarre) texte = "Positions au coup d'envoi.";
    else {
      const qui = sim.possession === 0 ? "Tu as le ballon" : `${this.habillage.nomEux} a le ballon`;
      const etat = sim.enTransition ? "transition…" : sim.phases[0] === "attaque" ? "ton équipe monte" : "ton équipe défend";
      texte = `${qui} · ${etat}`;
    }
    if (this.statut.textContent !== texte) this.statut.textContent = texte;
    this.majBord();
  }

  /** Vue « caméra » : la fenêtre suit le ballon en douceur, sans sortir du terrain. */
  private suivreCamera(): void {
    const W = 68 * ECHELLE + 2 * MARGE;
    const H = 105 * ECHELLE + 2 * MARGE;
    if (this.vue !== "camera") {
      this.annonceCadre.removeAttribute("transform");
      return;
    }
    const vw = W / ZOOM_CAMERA;
    const vh = H / ZOOM_CAMERA;
    const cible = { x: this.X(this.sim.ballon.x), y: this.Y(this.sim.ballon.y) };
    if (!this.camera) this.camera = { ...cible };
    else {
      this.camera.x += (cible.x - this.camera.x) * 0.08;
      this.camera.y += (cible.y - this.camera.y) * 0.08;
    }
    const x0 = Math.min(W - vw, Math.max(0, this.camera.x - vw / 2));
    const y0 = Math.min(H - vh, Math.max(0, this.camera.y - vh / 2));
    this.svgTerrain.setAttribute("viewBox", `${x0.toFixed(1)} ${y0.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    // Les annonces restent au centre de ce qu'on voit.
    this.annonceCadre.setAttribute("transform", `translate(${(x0 + vw / 2 - W / 2).toFixed(1)} ${(y0 + vh / 2 - H / 2).toFixed(1)})`);
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
