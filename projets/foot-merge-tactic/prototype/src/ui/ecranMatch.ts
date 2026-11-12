// Écran de match : terrain entier, vertical. Votre équipe attaque vers le haut.
// Tactique de chaque équipe modifiable en plein match, tactiques et styles
// activables ou non, pour juger leur effet (proposition du 12/11).

import type { Donnees } from "../sim/donnees";
import { projeterRect } from "../sim/projection";
import type { OptionsInfluences } from "../sim/influences";
import { MatchSim, type ModePossession } from "../sim/simulation";
import type { Equipe, Reglages } from "../sim/types";
import { dessinerLignes, html, svg } from "./dom";
import { activer, basculerMuet, estMuet, jouer } from "./son";

const ECHELLE = 5; // unités SVG par mètre
const MARGE = 10;

export class EcranMatch {
  readonly racine: HTMLElement;
  private sim!: MatchSim;
  private graine = 1;
  private vitesse = 1;
  private enPause = false;
  private zonesVisibles = false;
  private mode: ModePossession = "auto";
  private actif = false;
  private dernier = 0;
  private reserve = 0;

  private cercles: SVGCircleElement[] = [];
  private ballon!: SVGCircleElement;
  private calqueZones!: SVGGElement;
  private statut!: HTMLElement;
  /** Annonce sur le terrain (But, Faute, Corner…) et son instant d'apparition. */
  private annonce!: SVGGElement;
  private annonceTexte!: SVGTextElement;
  private annonceFond!: SVGRectElement;
  private annonceDepuis = -Infinity;
  private annonceDuree = 0;
  private dernierEvenement = -1;
  private boutonDepart!: HTMLButtonElement;
  private boutonPause!: HTMLButtonElement;
  private boutonZones!: HTMLButtonElement;
  private boutonsMode: Record<ModePossession, HTMLButtonElement> = {} as Record<ModePossession, HTMLButtonElement>;
  /** Tactiques et styles actifs (gardés d'un match à l'autre). */
  private options: OptionsInfluences = { tactiques: true, styles: true };
  /** Tactique choisie sur cet écran pour chaque équipe (null : celle de l'équipe). */
  private tactiquesForcees: [string | null, string | null] = [null, null];
  private infos!: HTMLElement;

  constructor(
    private donnees: Donnees,
    private reglages: Reglages,
    private equipes: () => [Equipe, Equipe],
    private listeTactiques: { code: string; nom: string }[] = [],
    private nomsStyles: Record<string, string> = {},
  ) {
    this.racine = html("section", { class: "ecran" });
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
    this.construire();
  }

  private construire(): void {
    const r = this.racine;
    r.replaceChildren();
    const [nous, eux] = this.equipes();

    this.statut = html("p", { class: "message", role: "status" }, r);

    const c1 = html("div", { class: "commandes" }, r);
    this.boutonDepart = html("button", { type: "button", class: "bouton bouton-principal" }, c1, "Coup d'envoi");
    this.boutonDepart.addEventListener("click", () => {
      activer(); // le son ne peut démarrer qu'après un geste
      if (!this.sim.demarre) {
        this.sim.demarrer();
        this.enPause = false;
      } else {
        this.graine += 1;
        this.nouveauMatch();
      }
      this.majCommandes();
    });
    this.boutonPause = html("button", { type: "button", class: "bouton" }, c1, "Pause");
    this.boutonPause.addEventListener("click", () => {
      this.enPause = !this.enPause;
      this.majCommandes();
    });
    const vitesses = [0.5, 1, 2, 3, 4];
    const boutonVitesse = html("button", { type: "button", class: "bouton bouton-court", "aria-label": "Vitesse" }, c1, `×${this.vitesse}`);
    boutonVitesse.addEventListener("click", () => {
      this.vitesse = vitesses[(vitesses.indexOf(this.vitesse) + 1) % vitesses.length]!;
      boutonVitesse.textContent = `×${this.vitesse}`;
    });
    const boutonSon = html("button", { type: "button", class: "bouton bouton-court", "aria-label": "Son" }, c1, "Son");
    boutonSon.addEventListener("click", () => {
      activer();
      boutonSon.textContent = basculerMuet() ? "Muet" : "Son";
    });
    if (estMuet()) boutonSon.textContent = "Muet";
    this.boutonZones = html("button", { type: "button", class: "bouton bouton-court" }, c1, "Zones");
    this.boutonZones.addEventListener("click", () => {
      this.zonesVisibles = !this.zonesVisibles;
      this.majCommandes();
      this.dessiner();
    });

    // Tactiques (modifiables en plein match) et interrupteurs tactiques / styles.
    const c2 = html("div", { class: "commandes influences" }, r);
    (["Vous", "Eux"] as const).forEach((qui, camp) => {
      const l = html("label", { class: "choix-tactique" }, c2);
      html("span", {}, l, qui);
      const sel = html("select", { "aria-label": `Tactique : ${qui === "Vous" ? "votre équipe" : "adversaire"}` }, l);
      for (const t of this.listeTactiques) {
        const o = html("option", { value: t.code }, sel, t.nom);
        o.selected = t.code === this.sim.tactiques[camp];
      }
      sel.disabled = !this.options.tactiques;
      sel.addEventListener("change", () => {
        this.tactiquesForcees[camp] = sel.value;
        this.sim.definirTactique(camp as 0 | 1, sel.value);
        this.majInfos(true);
      });
    });
    for (const cle of ["tactiques", "styles"] as const) {
      const b = html("button", { type: "button", class: "bouton bouton-court" }, c2, cle === "tactiques" ? "Tactiques" : "Styles");
      const maj = () => {
        b.classList.toggle("bouton-actif", this.options[cle]);
        b.setAttribute("aria-pressed", String(this.options[cle]));
        b.textContent = `${cle === "tactiques" ? "Tactiques" : "Styles"} ${this.options[cle] ? "✓" : "✗"}`;
      };
      maj();
      b.addEventListener("click", () => {
        this.options = { ...this.options, [cle]: !this.options[cle] };
        this.sim.definirOptions(this.options);
        for (const sel of c2.querySelectorAll("select")) sel.disabled = !this.options.tactiques;
        maj();
        this.majInfos(true);
      });
    }
    this.infos = html("p", { class: "note infos-influences", "aria-live": "off" }, r);

    const s = svg("svg", {
      viewBox: `0 0 ${68 * ECHELLE + 2 * MARGE} ${105 * ECHELLE + 2 * MARGE}`,
      class: "terrain",
      role: "img",
      "aria-label": "Terrain de match",
    });
    r.appendChild(s);
    dessinerLignes(svg("g", {}, s), this.X, this.Y, false);
    this.calqueZones = svg("g", { class: "zones-match" }, s);
    const g = svg("g", {}, s);
    this.cercles = this.sim.joueurs.map((j) =>
      svg("circle", { r: 6, class: j.camp === 0 ? "pion pion-nous" : "pion pion-eux" }, g),
    );
    this.ballon = svg("circle", { r: 3.2, class: "ballon" }, s);
    const cx = (68 * ECHELLE) / 2 + MARGE;
    const cy = (105 * ECHELLE) / 2 + MARGE;
    this.annonce = svg("g", { class: "annonce", style: "display:none" }, s);
    this.annonceFond = svg("rect", { x: cx - 90, y: cy - 24, width: 180, height: 48, rx: 12 }, this.annonce);
    this.annonceTexte = svg("text", { x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central" }, this.annonce);

    const legende = html("div", { class: "legende" }, r);
    html("span", { class: "rond rond-nous" }, legende);
    html("span", {}, legende, `${nous.nom} (${nous.nationalite})`);
    html("span", { class: "rond rond-eux" }, legende);
    html("span", {}, legende, `${eux.nom} (${eux.nationalite})`);
    html(
      "p",
      { class: "note" },
      r,
      "Tactiques et styles : proposition à juger en regardant le match. Coupez-les ou changez de tactique en plein match pour voir la différence.",
    );

    this.majCommandes();
    this.dessiner();
  }

  private majCommandes(): void {
    this.boutonDepart.textContent = this.sim.demarre ? "Recommencer" : "Coup d'envoi";
    this.boutonPause.textContent = this.enPause ? "Reprendre" : "Pause";
    this.boutonPause.disabled = !this.sim.demarre;
    this.boutonZones.classList.toggle("bouton-actif", this.zonesVisibles);
    this.boutonZones.setAttribute("aria-pressed", String(this.zonesVisibles));
    for (const [m, b] of Object.entries(this.boutonsMode)) {
      b.classList.toggle("segment-actif", m === this.mode);
      b.setAttribute("aria-pressed", String(m === this.mode));
    }
  }

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
      const c = this.cercles[i]!;
      c.setAttribute("cx", this.X(j.pos.x).toFixed(1));
      c.setAttribute("cy", this.Y(j.pos.y).toFixed(1));
    });
    this.ballon.setAttribute("r", sim.balle?.enLAir ? "4.8" : "3.2"); // ballon aérien : plus gros
    this.ballon.setAttribute("cx", this.X(sim.ballon.x).toFixed(1));
    this.ballon.setAttribute("cy", this.Y(sim.ballon.y).toFixed(1));
    this.ballon.style.display = sim.demarre ? "" : "none";

    this.calqueZones.replaceChildren();
    if (this.zonesVisibles) {
      const vus = new Set<string>();
      const ballon = sim.versRepere(0, sim.ballon);
      for (const j of sim.joueurs) {
        if (j.camp !== 0 || vus.has(j.poste.id)) continue;
        vus.add(j.poste.id);
        const r = projeterRect(j.poste.rect, j.poste, sim.phases[0], ballon, sim.reg(0), this.donnees.longueurM, sim.lignesTenues(0));
        const a = sim.versAbsolu(0, { x: r.x, y: r.y + r.h });
        svg("rect", {
          x: this.X(a.x),
          y: this.Y(a.y),
          width: r.w * 68 * ECHELLE,
          height: r.h * 105 * ECHELLE,
          rx: 3,
          class: "zone-match",
        }, this.calqueZones);
      }
    }

    // Événement de jeu : son + annonce sur le terrain.
    const ev = sim.balle?.evenement;
    if (ev && ev.a !== this.dernierEvenement) {
      this.dernierEvenement = ev.a;
      jouer(ev.texte);
      const libelles: Record<string, string> = { "But !": `BUT !  ${sim.score[0]} – ${sim.score[1]}`, Penalty: "Penalty !" };
      if (ev.texte !== "Engagement" && ev.texte !== "Arrêt") { // un arrêt n'arrête pas le jeu : pas d'annonce
        const mot = libelles[ev.texte] ?? ev.texte;
        const but = ev.texte === "But !";
        this.annonceTexte.textContent = mot;
        this.annonce.setAttribute("class", but ? "annonce annonce-but" : "annonce");
        const largeur = Math.max(120, mot.length * (but ? 26 : 17) + 40);
        const cx = (68 * ECHELLE) / 2 + MARGE;
        this.annonceFond.setAttribute("x", (cx - largeur / 2).toFixed(0));
        this.annonceFond.setAttribute("width", largeur.toFixed(0));
        this.annonceDepuis = performance.now();
        this.annonceDuree = but ? 2500 : 1400;
      }
    }
    const visible = performance.now() - this.annonceDepuis < this.annonceDuree;
    this.annonce.style.display = visible ? "" : "none";

    let texte: string;
    if (!sim.demarre) texte = "Positions au coup d'envoi. Touchez « Coup d'envoi » pour lancer.";
    else {
      const ev = sim.balle?.evenement;
      const fait = ev && sim.temps - ev.a < 2.5 ? ` · ${ev.texte}` : "";
      const qui = `${sim.score[0]} – ${sim.score[1]} · ${sim.possession === 0 ? "Vous avez le ballon" : "L'adversaire a le ballon"}${fait}`;
      const etat = sim.enTransition
        ? "transition…"
        : sim.phases[0] === "attaque"
          ? "votre équipe monte"
          : "votre équipe défend";
      texte = `${qui} : ${etat}`;
    }
    if (this.statut.textContent !== texte) this.statut.textContent = texte;
    this.majInfos();
  }

  private derniereMajInfos = 0;

  /** Tableau de bord des influences : tactiques, paliers de styles, possession, hauteur des lignes. */
  private majInfos(force = false): void {
    const sim = this.sim;
    if (!force && performance.now() - this.derniereMajInfos < 500) return;
    this.derniereMajInfos = performance.now();
    const nom = (code: string) => this.listeTactiques.find((t) => t.code === code)?.nom ?? code;
    const paliers = (camp: 0 | 1) => sim.paliers(camp).map((p) => this.nomsStyles[p] ?? p).join(", ") || "aucun";
    const total = sim.tempsPossession[0] + sim.tempsPossession[1];
    const poss = total > 0 ? `${Math.round((100 * sim.tempsPossession[0]) / total)} %` : "—";
    const ligne = (camp: 0 | 1) => (sim.lignesDef[camp] === null ? "—" : `${Math.round(sim.lignesDef[camp]!)} m`);
    const st = sim.balle?.stats;
    const reussite = (camp: 0 | 1) => (st && st.passes[camp] ? `${Math.round((100 * st.passesReussies[camp]) / st.passes[camp])} %` : "—");
    const t = this.options.tactiques ? `${nom(sim.tactiques[0])} contre ${nom(sim.tactiques[1])}` : "tactiques coupées";
    const texte =
      `${t} · paliers de styles : ${this.options.styles ? paliers(0) : "styles coupés"}. ` +
      `Possession ${poss} · passes réussies ${reussite(0)} / ${reussite(1)} · ligne défensive ${ligne(0)} / ${ligne(1)} (vous / eux).`;
    if (this.infos.textContent !== texte) this.infos.textContent = texte;
  }
}
