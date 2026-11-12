// Écran de match, dans l'esprit de l'écran de préparation (12/11 : « une IHM
// aussi fun et belle que celle de la préparation ») : tableau de score avec
// chrono et barre de possession, pelouse rayée, tes joueurs en pastilles avec
// le visage de leur figurine (anneau de la couleur du pays), le porteur du
// ballon entouré d'or, annonces qui sautent, confettis sur un but.
// Votre équipe attaque vers le haut. Tactique de chaque équipe modifiable en
// plein match, tactiques et styles activables ou non (proposition du 12/11).

import type { Donnees } from "../sim/donnees";
import type { OptionsInfluences } from "../sim/influences";
import { projeterRect } from "../sim/projection";
import { MatchSim } from "../sim/simulation";
import type { Equipe, Reglages } from "../sim/types";
import { BUSTES, TETES } from "./bustes";
import { dessinerLignes, html, svg } from "./dom";
import { PICTOS } from "./pictos";
import { activer, basculerMuet, estMuet, jouer } from "./son";

const ECHELLE = 5; // unités SVG par mètre
const MARGE = 6;
const RAYON_PION = 15;
const COULEUR_EUX = "#C2413D";
const BANDES = 12;

export interface InfosJoueur {
  couleur: string;
  style: string | null;
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
  private calquePions!: SVGGElement;
  private images = 0;
  private halo!: SVGCircleElement;
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
    const defs = svg("defs", {}, s);
    const clip = svg("clipPath", { id: "match-tete" }, defs);
    svg("circle", { cx: 0, cy: 0, r: RAYON_PION - 1.8 }, clip);

    // Pelouse rayée, comme sur l'écran de préparation.
    const W = 68 * ECHELLE + 2 * MARGE;
    const H = 105 * ECHELLE + 2 * MARGE;
    svg("rect", { x: 0, y: 0, width: W, height: H, rx: 14, class: "match-pelouse" }, s);
    const hb = (105 * ECHELLE) / BANDES;
    for (let i = 0; i < BANDES; i += 2) svg("rect", { x: MARGE, y: MARGE + i * hb, width: 68 * ECHELLE, height: hb, class: "match-bande" }, s);
    dessinerLignes(svg("g", { class: "match-lignes" }, s), this.X, this.Y, false);
    this.calqueZones = svg("g", { class: "zones-match" }, s);

    // Halo du porteur, ombre du ballon, joueurs, ballon.
    this.halo = svg("circle", { r: RAYON_PION + 4, class: "match-halo" }, s);
    this.ombreBallon = svg("ellipse", { rx: 3.4, ry: 1.6, class: "match-ombre" }, s);
    const g = svg("g", {}, s);
    this.calquePions = g;
    this.pions = this.sim.joueurs.map((j) => this.pion(g, j.camp, j.joueur.id, j.joueur.nom));
    this.ballon = svg("circle", { r: 3.4, class: "match-ballon" }, s);
    this.etiquette = svg("g", { class: "match-etiquette", style: "display:none" }, s);
    this.etiquetteFond = svg("rect", { y: -9, height: 15, rx: 7.5 }, this.etiquette);
    this.etiquetteTexte = svg("text", { y: 1.5, "text-anchor": "middle" }, this.etiquette);

    const cx = W / 2;
    const cy = H / 2;
    this.annonce = svg("g", { class: "match-annonce", style: "display:none" }, s);
    this.annonceFond = svg("rect", { x: cx - 90, y: cy - 26, width: 180, height: 52, rx: 26 }, this.annonce);
    this.annonceTexte = svg("text", { x: cx, y: cy + 1, "text-anchor": "middle", "dominant-baseline": "central" }, this.annonce);
  }

  /** Pastille d'un joueur : visage de sa figurine dans l'anneau de son pays
   *  (votre équipe), ou rond rouge avec ses initiales (adversaire). */
  private pion(parent: SVGGElement, camp: 0 | 1, id: string, nom: string): SVGGElement {
    const g = svg("g", { class: `match-pion${camp === 0 ? " nous" : " eux"}` }, parent);
    const infos = camp === 0 ? this.habillage.infos(id) : undefined;
    const tete = TETES[id];
    if (camp === 0 && infos && BUSTES[id] && tete) {
      svg("circle", { r: RAYON_PION, fill: infos.couleur, class: "match-anneau" }, g);
      svg("circle", { r: RAYON_PION - 1.8, class: "match-fond-visage" }, g);
      // Le visage remplit la pastille : on agrandit l'image pour que la tête fasse le diamètre intérieur.
      const largeur = ((RAYON_PION - 1.8) * 1.0) / tete.r;
      const hauteur = largeur * (97 / 96);
      svg("image", { href: BUSTES[id], x: -tete.cx * largeur, y: -(tete.cy + 0.03) * hauteur, width: largeur, height: hauteur, "clip-path": "url(#match-tete)" }, g);
    } else {
      this.avatar(g, camp === 0 ? "#1F3A93" : COULEUR_EUX, nom);
    }
    const titre = svg("title", {}, g);
    titre.textContent = nom;
    return g;
  }

  /** Petit avatar dessiné (adversaires, sans figurine) : tête, cheveux et
   *  maillot, différents d'un joueur à l'autre. Original, rien de copié. */
  private avatar(g: SVGGElement, maillot: string, nom: string): void {
    let h = 0;
    for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const peaux = ["#F1C7A5", "#D9A47E", "#B07A52", "#7A4E30", "#E8B892"];
    const cheveux = ["#2A1C14", "#16120F", "#5A3A22", "#C9A15A", "#B5532A", "#3B2A1E"];
    const peau = peaux[h % peaux.length]!;
    const chev = cheveux[(h >> 3) % cheveux.length]!;
    const coupe = (h >> 6) % 4;
    const ri = 8.2;
    svg("circle", { r: RAYON_PION, fill: maillot, class: "match-anneau" }, g);
    const cadre = svg("g", { "clip-path": "url(#match-tete)" }, g);
    const interieur = svg("g", { transform: `scale(${((RAYON_PION - 1.8) / ri).toFixed(3)})` }, cadre);
    svg("circle", { r: ri, fill: "#F4F1EA" }, interieur);
    svg("ellipse", { cx: 0, cy: ri + 1.2, rx: ri, ry: 5.2, fill: maillot }, interieur); // épaules et maillot
    svg("path", { d: `M -2 ${ri - 4} L 0 ${ri - 2.2} L 2 ${ri - 4}`, fill: "none", stroke: "#fff", "stroke-width": 0.8 }, interieur); // col
    svg("circle", { cx: 0, cy: -1.2, r: 4.4, fill: peau }, interieur); // tête
    if (coupe === 0) svg("path", { d: "M -4.5 -1.6 A 4.6 4.6 0 0 1 4.5 -1.6 L 3.4 -3 L -3.4 -3 Z", fill: chev }, interieur); // courts
    if (coupe === 1) svg("path", { d: "M -4.6 -0.6 C -5 -6 5 -6 4.6 -0.6 C 3.6 -3.6 -3.6 -3.6 -4.6 -0.6 Z", fill: chev }, interieur); // mèche
    if (coupe === 2) for (const [x, y] of [[-3.4, -3.6], [-1.2, -4.9], [1.2, -4.9], [3.4, -3.6], [0, -5.5]]) svg("circle", { cx: x, cy: y, r: 1.7, fill: chev }, interieur); // bouclés
    if (coupe === 3) svg("rect", { x: -4.4, y: -4.2, width: 8.8, height: 1.4, rx: 0.7, fill: "#fff" }, interieur); // bandeau
    svg("circle", { cx: -1.5, cy: -1, r: 0.65, fill: "#16201A" }, interieur); // yeux
    svg("circle", { cx: 1.5, cy: -1, r: 0.65, fill: "#16201A" }, interieur);
    svg("path", { d: "M -1.2 1.2 Q 0 2 1.2 1.2", fill: "none", stroke: "#16201A", "stroke-width": 0.5, "stroke-linecap": "round" }, interieur); // sourire
  }

  private majCommandes(): void {
    const enJeu = this.sim.demarre && !this.enPause;
    this.boutonJouer.textContent = !this.sim.demarre ? "▶ Coup d'envoi" : enJeu ? "❚❚ Pause" : "▶ Reprendre";
    this.boutonJouer.classList.toggle("en-jeu", enJeu);
    this.boutonZones.classList.toggle("actif", this.zonesVisibles);
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
    sim.joueurs.forEach((j, i) => {
      this.pions[i]!.setAttribute("transform", `translate(${this.X(j.pos.x).toFixed(1)} ${this.Y(j.pos.y).toFixed(1)})`);
    });
    // Ceux du bas de l'écran passent devant ceux du haut (comme des figurines posées sur le terrain).
    if (this.images++ % 10 === 0) {
      const ordre = sim.joueurs.map((j, i) => ({ y: this.Y(j.pos.y), p: this.pions[i]! })).sort((a, b) => a.y - b.y);
      for (const { p } of ordre) this.calquePions.appendChild(p);
    }
    const porteur = sim.balle?.porteur;
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
      this.etiquette.setAttribute("transform", `translate(${this.X(porteur.pos.x).toFixed(1)} ${(this.Y(porteur.pos.y) - RAYON_PION - 8).toFixed(1)})`);
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
