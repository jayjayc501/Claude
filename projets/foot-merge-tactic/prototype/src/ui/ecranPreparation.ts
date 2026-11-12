// Écran de préparation, d'après la maquette du 12/11 (docs/maquette-interface/,
// page « V2 figurines ») : en-tête (chrono, groupe), compteurs de pays et de
// styles à gauche, plateau en hexagones au centre, banc de 5, mercato.
//
// Tout au glisser-déposer (appui long ou glissement) :
//   - sur une case libre de son poste : le joueur y va ;
//   - sur un joueur du même poste : échange ou entrée du remplaçant ;
//   - sur le banc : sortie (5 places) ; sur un remplaçant : il entre à sa place ;
//   - sur le mercato : vente.
// Hors poste : refusé (12/11). Un toucher affiche le nom. Un toucher sur une
// carte du mercato l'achète (fusion automatique si on a déjà ce joueur).
// Le chrono et le classement du groupe sont des données de démonstration.

import type { Donnees } from "../sim/donnees";
import { caseAuPoint, occupant } from "../sim/placement";
import type { Cellule } from "../sim/types";
import { BUSTES } from "./bustes";
import { html, svg } from "./dom";
import { type Action, type Issue, Preparation, libellePoste } from "./preparation";

// Plateau : x de 0 à 1 sur W, y de 0,5 (ligne médiane, en haut) à 0 (but, en bas) sur H.
// H = 1,5 W donne des hexagones presque réguliers ; MH laisse dépasser les bustes du haut.
const W = 300;
const H = 450;
const MH = 26;
const HAUT_TOTAL = MH + H + 10;

const DELAI_APPUI_MS = 250;
const SEUIL_GLISSEMENT_PX = 8;
const DECALAGE_DOIGT_PX = 44;

const ZONES = {
  gk: { bg: "#F2C230", lane: "#F2C230" },
  def: { bg: "#2F5FD0", lane: "#8FB0F0" },
  mid: { bg: "#7B45D0", lane: "#B9A0EE" },
  att: { bg: "#D2403A", lane: "#F09A95" },
};
const ZONE_DU_POSTE: Record<string, keyof typeof ZONES> = {
  G: "gk", DC: "def", DG: "def", DD: "def", MC: "mid", AG: "att", AD: "att", AC: "att",
};
const COULOIRS = new Set(["DG", "DD", "AG", "AD"]);
const COULEUR_FUSION = ["", "#5EC8FF", "#FFC400", "#C04BFF"];

// Gardien : une case en double losange (deux hexagones fusionnés), sous le DC central.
const GARDIEN_Y = 0.0578;
const DOUBLE_LOSANGE = [
  [0, 25], [24.07, 0], [48.15, 25], [51.85, 25], [75.93, 0], [100, 25],
  [100, 75], [75.93, 100], [51.85, 75], [48.15, 75], [24.07, 100], [0, 75],
] as const;

// Étincelles du niveau 3 (repère de la maquette : buste de 48 × 49, socle en 24,47).
const ETINCELLES =
  "M5 3 L6.4 6.6 L10 8 L6.4 9.4 L5 13 L3.6 9.4 L0 8 L3.6 6.6 Z M43 -1 L44.68 3.32 L49 5 L44.68 6.68 L43 11 L41.32 6.68 L37 5 L41.32 3.32 Z M2 26.5 L2.98 29.02 L5.5 30 L2.98 30.98 L2 33.5 L1.02 30.98 L-1.5 30 L1.02 29.02 Z M46 23 L47.12 25.88 L50 27 L47.12 28.12 L46 31 L44.88 28.12 L42 27 L44.88 25.88 Z M24 -11.5 L25.26 -8.26 L28.5 -7 L25.26 -5.74 L24 -2.5 L22.74 -5.74 L19.5 -7 L22.74 -8.26 Z";

// Pictogrammes des styles (24 × 24, couleur du texte) : bouclier (Rempart),
// bras plié musclé (Récupérateur), ballon (Technicien), éclair (Rapide).
const PICTO = (corps: string) =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;
const PICTOS: Record<string, string> = {
  REM: PICTO('<path d="M12 2.8 L19.5 5.8 V11 C19.5 15.6 16.4 19.3 12 21.2 C7.6 19.3 4.5 15.6 4.5 11 V5.8 Z"/>'),
  REC: PICTO('<path d="M21.5 20 H8 C5.4 20 3.8 18.4 4 16 L5 10.2 C3.8 9.4 3.4 7.6 4 6 C4.8 3.9 7.6 3 9.8 3.6 C11.8 4.1 12.6 6.2 12 8.1 C11.7 9 11 9.7 10.2 10 L10.2 15.6 C11.4 11.6 14.4 10 17 10.6 C19 11 20 12.6 19.4 14.4 L21.5 15 Z"/><path d="M5 7.4 C6.8 8 8.8 8 10.4 7.2" stroke-width="1.5"/>'),
  TEC: PICTO('<circle cx="12" cy="12" r="9"/><path d="M12 8.4 L15.2 10.7 L14 14.4 H10 L8.8 10.7 Z" fill="currentColor"/><path d="M12 8.4 V3 M15.2 10.7 L20.6 9.2 M14 14.4 L17.3 19.1 M10 14.4 L6.7 19.1 M8.8 10.7 L3.4 9.2" stroke-width="1.6"/>'),
  RAP: PICTO('<path d="M13.5 2.5 L5.5 13.5 H11.5 L10.5 21.5 L18.5 10.5 H12.5 Z" fill="currentColor" stroke-width="1.4"/>'),
};

const X = (xn: number) => xn * W;
const Y = (yn: number) => MH + ((0.5 - yn) / 0.5) * H;

export class EcranPreparation {
  readonly racine: HTMLElement;
  private contenu: HTMLElement;
  private toast: HTMLElement;
  private minuteurToast: number | undefined;
  private choisi: string | null = null;

  private plateau: SVGSVGElement | null = null;
  private calqueCible: SVGGElement | null = null;
  private elBanc: HTMLElement | null = null;
  private elMercato: HTMLElement | null = null;
  private placesBanc: { id: string; el: HTMLElement }[] = [];

  private glisse: {
    id: string;
    pointeur: number;
    depart: { x: number; y: number };
    actif: boolean;
    doigt: boolean;
    minuteur: number | undefined;
    origine: Element;
    fantome: HTMLImageElement | null;
    action: Action;
  } | null = null;

  constructor(
    private prepa: Preparation,
    private auChangement: () => void,
  ) {
    this.racine = html("section", { class: "prepa" });
    this.contenu = html("div", { class: "prepa-contenu" }, this.racine);
    this.toast = html("div", { class: "prepa-toast", role: "status", "aria-live": "polite" }, this.racine);
    this.rendre();
  }

  private get donnees(): Donnees {
    return this.prepa.donnees;
  }

  signaler(texte: string, erreur = false): void {
    if (!texte) return;
    window.clearTimeout(this.minuteurToast);
    this.toast.textContent = texte;
    this.toast.className = `prepa-toast visible${erreur ? " erreur" : ""}`;
    this.minuteurToast = window.setTimeout(() => (this.toast.className = "prepa-toast"), erreur ? 3200 : 2200);
  }

  // ---- Repères -----------------------------------------------------------

  /** Nom écrit dans une case vide : AC → BU ; la case basse des ailiers → MG / MD. */
  private libelleCase(c: Cellule): string {
    if (c.poste === "AG" && c.index === 0) return "MG";
    if (c.poste === "AD" && c.index === 0) return "MD";
    return libellePoste(c.role);
  }

  private centreCase(poste: string, cellule: number): { x: number; y: number } {
    if (poste === "G") return { x: X(0.5), y: Y(GARDIEN_Y) };
    const c = this.donnees.cellule(poste, cellule);
    return { x: X(c.centre.x), y: Y(c.centre.y) };
  }

  private tailleCase(): { w: number; h: number } {
    const c = this.donnees.cellule("DC", 0);
    return { w: c.rect.w * W, h: (c.rect.h / 0.5) * H };
  }

  private pointsHexagone(cx: number, cy: number, w: number, h: number): string {
    const s = [[0, -h / 2], [w / 2, -h / 4], [w / 2, h / 4], [0, h / 2], [-w / 2, h / 4], [-w / 2, -h / 4]];
    return s.map(([x, y]) => `${(cx + x!).toFixed(1)},${(cy + y!).toFixed(1)}`).join(" ");
  }

  private pointsGardien(retrait: number): number[][] {
    const { w, h } = this.tailleCase();
    const lg = 2 * w - 2 * retrait;
    const ht = h - 2 * retrait;
    const { x: cx, y: cy } = this.centreCase("G", 0);
    return DOUBLE_LOSANGE.map(([px, py]) => [cx - lg / 2 + (px / 100) * lg, cy - ht / 2 + (py / 100) * ht]);
  }

  private dessinerCase(poste: string, cellule: number, parent: SVGGElement, attrs: Record<string, string | number>, retrait = 2): void {
    if (poste === "G") {
      const pts = this.pointsGardien(retrait).map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
      svg("polygon", { points: pts, ...attrs }, parent);
      return;
    }
    const { x, y } = this.centreCase(poste, cellule);
    const { w, h } = this.tailleCase();
    svg("polygon", { points: this.pointsHexagone(x, y, w - 2 * retrait, h - 2 * retrait), ...attrs }, parent);
  }

  // ---- Cible d'un glissement ----------------------------------------------

  private dans(el: Element | null, x: number, y: number): boolean {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  private caseAuPointEcran(cx: number, cy: number): { poste: string; cellule: number } | null {
    const s = this.plateau;
    const ctm = s?.getScreenCTM();
    if (!s || !ctm) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse());
    if (dansPolygone(p.x, p.y, this.pointsGardien(0))) return { poste: "G", cellule: 0 };
    const c = caseAuPoint(this.donnees, { x: p.x / W, y: 0.5 - ((p.y - MH) / H) * 0.5 });
    if (!c) return null;
    return { poste: c.poste, cellule: c.poste === "G" ? 0 : c.index };
  }

  private cibleAu(id: string, cx: number, cy: number): Action {
    const surTerrain = !!this.prepa.placement(id);
    if (this.dans(this.elMercato, cx, cy)) return { type: "vente", id };
    if (this.dans(this.elBanc, cx, cy)) {
      if (!surTerrain) return { type: "rien" };
      const place = this.placesBanc.find((p) => this.dans(p.el, cx, cy));
      return place ? { type: "remplacement", entrant: place.id, sortant: id } : { type: "banc", id };
    }
    const c = this.caseAuPointEcran(cx, cy);
    if (!c) return { type: "rien" };
    const occ = occupant(this.prepa.etat.composition, c.poste, c.cellule);
    if (occ?.joueurId === id) return { type: "rien" };
    if (occ) return surTerrain ? { type: "echange", a: id, b: occ.joueurId } : { type: "remplacement", entrant: id, sortant: occ.joueurId };
    return { type: "case", id, poste: c.poste, cellule: c.cellule };
  }

  private montrerCible(a: Action): void {
    const calque = this.calqueCible;
    calque?.replaceChildren();
    this.elBanc?.classList.remove("cible-ok", "cible-non");
    this.elMercato?.classList.remove("cible-ok", "cible-non");
    if (a.type === "rien") return;
    const ok = this.prepa.essayer(a).ok;
    const classe = ok ? "cible-ok" : "cible-non";
    if (a.type === "vente") return void this.elMercato?.classList.add(classe);
    if (a.type === "banc") return void this.elBanc?.classList.add(classe);
    // Joueur du terrain lâché sur un remplaçant : on vise le banc.
    if (a.type === "remplacement" && a.sortant === this.glisse?.id) return void this.elBanc?.classList.add(classe);
    const visee =
      a.type === "case" ? { poste: a.poste, cellule: a.cellule }
      : a.type === "echange" ? this.prepa.placement(a.b)
      : this.prepa.placement(a.sortant);
    if (visee && calque) this.dessinerCase(visee.poste, visee.cellule, calque, { class: `prepa-cible ${classe}` }, 1);
  }

  // ---- Glisser-déposer -----------------------------------------------------

  private appui(ev: PointerEvent, id: string, el: Element): void {
    if (this.glisse || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    this.glisse = {
      id,
      pointeur: ev.pointerId,
      depart: { x: ev.clientX, y: ev.clientY },
      actif: false,
      doigt: ev.pointerType !== "mouse",
      minuteur: window.setTimeout(() => this.soulever(ev.clientX, ev.clientY), DELAI_APPUI_MS),
      origine: el,
      fantome: null,
      action: { type: "rien" },
    };
    const bouge = (e: PointerEvent) => this.bouger(e);
    const lache = (e: PointerEvent) => {
      el.removeEventListener("pointermove", bouge as EventListener);
      el.removeEventListener("pointerup", lache as EventListener);
      el.removeEventListener("pointercancel", lache as EventListener);
      this.lacher(e);
    };
    el.addEventListener("pointermove", bouge as EventListener);
    el.addEventListener("pointerup", lache as EventListener);
    el.addEventListener("pointercancel", lache as EventListener);
  }

  private soulever(cx: number, cy: number): void {
    const gl = this.glisse;
    if (!gl || gl.actif) return;
    gl.actif = true;
    gl.origine.classList.add("prepa-origine");
    const m = this.prepa.membre(gl.id);
    const f = html("img", { src: BUSTES[gl.id] ?? "", alt: "", class: `prepa-fantome aura-${m?.fusions ?? 0}` }, document.body);
    gl.fantome = f;
    try {
      navigator.vibrate?.(15);
    } catch {
      // vibration indisponible : sans conséquence
    }
    this.suivre(cx, cy);
  }

  private suivre(cx: number, cy: number): void {
    const gl = this.glisse;
    if (!gl?.fantome) return;
    const py = cy - (gl.doigt ? DECALAGE_DOIGT_PX : 0);
    // Le socle du buste est au point visé.
    gl.fantome.style.transform = `translate(${cx - 28}px, ${py - 54}px)`;
    gl.action = this.cibleAu(gl.id, cx, py);
    this.montrerCible(gl.action);
  }

  private bouger(ev: PointerEvent): void {
    const gl = this.glisse;
    if (!gl || ev.pointerId !== gl.pointeur) return;
    if (!gl.actif) {
      if (Math.hypot(ev.clientX - gl.depart.x, ev.clientY - gl.depart.y) < SEUIL_GLISSEMENT_PX) return;
      window.clearTimeout(gl.minuteur);
      this.soulever(ev.clientX, ev.clientY);
    }
    this.suivre(ev.clientX, ev.clientY);
  }

  private lacher(ev: PointerEvent): void {
    const gl = this.glisse;
    if (!gl) return;
    window.clearTimeout(gl.minuteur);
    gl.fantome?.remove();
    this.glisse = null;
    if (ev.type === "pointercancel") return this.rendre();
    if (!gl.actif) {
      this.choisi = this.choisi === gl.id ? null : gl.id;
      return this.rendre();
    }
    this.afficherIssue(this.prepa.appliquer(gl.action));
  }

  private afficherIssue(r: Issue): void {
    if (r.ok) {
      this.choisi = null;
      this.auChangement();
      this.signaler(r.message);
    } else {
      this.signaler(r.erreur, true);
    }
    this.rendre();
  }

  // ---- Affichage -----------------------------------------------------------

  rendre(): void {
    const c = this.contenu;
    c.replaceChildren();
    this.rendreEntete(c);
    const milieu = html("div", { class: "prepa-milieu" }, c);
    this.rendreTraits(milieu);
    const terrain = html("div", { class: "prepa-terrain" }, milieu);
    this.rendreTactique(terrain);
    this.rendrePlateau(terrain);
    this.rendreBanc(c);
    this.rendreMercato(c);
  }

  private rendreEntete(parent: HTMLElement): void {
    const d = this.prepa.d;
    const tete = html("div", { class: "prepa-tete" }, parent);
    const t = html("div", { class: "prepa-titre" }, tete);
    html("span", { class: "prepa-h" }, t, "Préparation");
    html("span", { class: "prepa-sous" }, t, `${d.groupe.nom} · ${d.groupe.match}`);
    const chrono = html("div", { class: "prepa-chrono", "aria-label": `Temps restant ${d.chrono}` }, tete);
    chrono.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2"></path><path d="M9 2h6"></path></svg>';
    html("span", {}, chrono, d.chrono);

    const groupe = html("div", { class: "prepa-groupe" }, parent);
    for (const e of d.groupe.equipes) {
      const cl = e.toi ? " toi" : e.prochain ? " prochain" : "";
      const b = html("div", { class: `prepa-equipe${cl}`, "aria-label": `${e.nom}, ${e.points} point${e.points > 1 ? "s" : ""}${e.prochain ? ", prochain adversaire" : ""}` }, groupe);
      html("span", { class: "prepa-avatar" }, b, e.nom.charAt(0));
      const n = html("span", { class: "prepa-equipe-texte" }, b);
      html("span", { class: "prepa-equipe-nom" }, n, e.nom);
      html("span", { class: "prepa-equipe-pts" }, n, `${e.points} pt${e.points > 1 ? "s" : ""}`);
      if (e.prochain) html("span", { class: "prepa-prochain" }, b, "Prochain");
    }
  }

  private rendreTraits(parent: HTMLElement): void {
    const d = this.prepa.d;
    const { pays, styles } = this.prepa.compteurs();
    const col = html("div", { class: "prepa-traits" }, parent);
    html("span", { class: "prepa-etiquette" }, col, "Pays");
    for (const p of pays) {
      const couleur = d.deck.find((x) => x.code === p.code)!.couleur;
      const { prochain, atteint } = this.prepa.palier(p.n);
      const nom = d.deck.find((x) => x.code === p.code)!.nom;
      const r = html("div", { class: `prepa-trait${atteint ? " atteint" : ""}`, title: nom, "aria-label": `${nom} : ${p.n} sur ${prochain}` }, col);
      const b = html("span", { class: "prepa-badge" }, r, p.code);
      b.style.background = couleur;
      b.style.borderColor = couleur;
      const n = html("span", { class: "prepa-nombre" }, r, String(p.n));
      html("span", { class: "prepa-palier" }, n, `/${prochain}`);
    }
    html("span", { class: "prepa-etiquette" }, col, "Style");
    for (const s of styles) {
      const { prochain, atteint } = this.prepa.palier(s.n);
      const nom = d.styles[s.code] ?? s.code;
      const r = html("div", { class: `prepa-trait style${atteint ? " atteint" : ""}`, title: nom, "aria-label": `${nom} : ${s.n} sur ${prochain}` }, col);
      const b = html("span", { class: "prepa-badge" }, r);
      b.innerHTML = PICTOS[s.code] ?? s.code;
      const n = html("span", { class: "prepa-nombre" }, r, String(s.n));
      html("span", { class: "prepa-palier" }, n, `/${prochain}`);
    }
    const tit = html("div", { class: "prepa-titulaires" }, col);
    html("span", { class: "prepa-nombre" }, tit, `${this.prepa.etat.composition.length}/11`);
    html("span", {}, tit, "titulaires");
  }

  private rendrePlateau(parent: HTMLElement): void {
    const s = svg("svg", { viewBox: `0 0 ${W} ${HAUT_TOTAL}`, class: "prepa-plateau", role: "img", "aria-label": "Plateau de placement" });
    parent.appendChild(s);
    this.plateau = s;
    this.definirAuras(svg("defs", {}, s));

    this.dessinerPelouse(s);

    // Cases : couleur de la zone à 30 %, fin contour blanc, nom du poste à 30 % (cases vides).
    const cases = svg("g", { class: "prepa-cases" }, s);
    const compo = this.prepa.etat.composition;
    const { h } = this.tailleCase();
    for (const p of this.donnees.postes) {
      const cellules = p.id === "G" ? p.cases.slice(0, 1) : p.cases;
      for (const c of cellules) {
        const z = ZONES[ZONE_DU_POSTE[p.id] ?? "mid"];
        const couleur = COULOIRS.has(p.id) ? z.lane : z.bg;
        this.dessinerCase(p.id, c.index, cases, { fill: couleur, class: "prepa-case" });
        if (!occupant(compo, p.id, c.index)) {
          const { x, y } = this.centreCase(p.id, c.index);
          const t = svg("text", { x, y: y + 4, class: "prepa-role" }, cases);
          t.textContent = p.id === "G" ? "G" : this.libelleCase(c);
        }
      }
    }
    this.calqueCible = svg("g", {}, s);

    // Bustes : du haut vers le bas, pour que ceux de devant passent dessus.
    const echelle = this.tailleCase().w / 52;
    const ordre = [...compo].sort((a, b) => this.centreCase(a.poste, a.cellule).y - this.centreCase(b.poste, b.cellule).y);
    const dessus = svg("g", {}, s);
    for (const pl of ordre) {
      const { x, y } = this.centreCase(pl.poste, pl.cellule);
      const socle = y + 0.258 * h;
      const fusions = this.prepa.membre(pl.joueurId)?.fusions ?? 0;
      const nom = this.prepa.fiche(pl.joueurId).nom;
      const g = svg("g", { class: "prepa-buste", "aria-label": nom }, dessus);
      this.figurine(g, pl.joueurId, fusions, x, socle, echelle);
      g.addEventListener("pointerdown", (ev) => this.appui(ev, pl.joueurId, g));
      // Les navigateurs ignorent `touch-action` sur les éléments SVG : sans
      // ceci, le doigt posé sur un buste ferait défiler la page.
      g.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
      if (pl.joueurId === this.choisi) this.etiquette(s, nom, x, socle - 48 * echelle - 4);
    }
  }

  /** Pelouse rayée et tracé du demi-terrain. Les lignes sont à l'échelle de la
   *  largeur (68 m), posées sur la ligne de but (en bas) et la ligne médiane (en haut). */
  private dessinerPelouse(s: SVGSVGElement): void {
    const M = W / 68;
    const yBut = Y(0);
    const yMed = Y(0.5);
    const cx = W / 2;
    const clip = svg("clipPath", { id: "prepa-bord" }, s.querySelector("defs") ?? s);
    svg("rect", { x: 0, y: 0, width: W, height: HAUT_TOTAL, rx: 14 }, clip);
    const g = svg("g", { "clip-path": "url(#prepa-bord)" }, s);
    svg("rect", { x: 0, y: 0, width: W, height: HAUT_TOTAL, class: "prepa-pelouse" }, g);
    const nb = 10;
    const hb = H / nb;
    for (let i = 0; i <= nb; i += 2) svg("rect", { x: 0, y: yBut - (i + 1) * hb, width: W, height: hb, class: "prepa-bande" }, g);
    const l = svg("g", { class: "prepa-ligne" }, g);
    svg("line", { x1: 0, y1: yMed, x2: W, y2: yMed }, l);
    svg("line", { x1: 0, y1: yBut, x2: W, y2: yBut }, l);
    svg("line", { x1: 1, y1: yMed, x2: 1, y2: yBut }, l);
    svg("line", { x1: W - 1, y1: yMed, x2: W - 1, y2: yBut }, l);
    svg("circle", { cx, cy: yMed, r: 9.15 * M }, l);
    svg("circle", { cx, cy: yMed, r: 1.6, class: "point" }, l);
    svg("rect", { x: cx - 20.16 * M, y: yBut - 16.5 * M, width: 40.32 * M, height: 16.5 * M }, l);
    svg("rect", { x: cx - 9.16 * M, y: yBut - 5.5 * M, width: 18.32 * M, height: 5.5 * M }, l);
    svg("circle", { cx, cy: yBut - 11 * M, r: 1.6, class: "point" }, l);
    const dx = Math.sqrt(9.15 ** 2 - 5.5 ** 2) * M;
    svg("path", { d: `M ${cx - dx} ${yBut - 16.5 * M} A ${9.15 * M} ${9.15 * M} 0 0 1 ${cx + dx} ${yBut - 16.5 * M}` }, l);
    svg("path", { d: `M 1 ${yBut - M} A ${M} ${M} 0 0 0 ${1 + M} ${yBut} M ${W - 1} ${yBut - M} A ${M} ${M} 0 0 1 ${W - 1 - M} ${yBut}` }, l);
    svg("rect", { x: cx - 3.66 * M, y: yBut, width: 7.32 * M, height: 7, class: "but" }, l);
  }

  private definirAuras(defs: SVGDefsElement): void {
    const niveaux: [string, number][][] = [
      [],
      [["#5EC8FF", 1.5], ["#5EC8FF", 3.5], ["#5EC8FF", 6]],
      [["#FFC400", 1.5], ["#FFC400", 3.5], ["#FFC400", 6]],
      [["#FFFFFF", 1], ["#E9A8FF", 2], ["#C04BFF", 4], ["#8A2BE2", 7], ["#FF4FD8", 10]],
    ];
    niveaux.forEach((ombres, n) => {
      if (!n) return;
      const f = svg("filter", { id: `prepa-aura-${n}`, x: "-80%", y: "-80%", width: "260%", height: "260%", "color-interpolation-filters": "sRGB" }, defs);
      for (const [c, e] of ombres) svg("feDropShadow", { dx: 0, dy: 0, stdDeviation: e, "flood-color": c, "flood-opacity": 1 }, f);
    });
  }

  /** Buste sur son socle, dans le repère de la maquette (48 × 53, socle en 24,47). */
  private figurine(parent: SVGGElement, id: string, fusions: number, x: number, socle: number, echelle: number): void {
    const g = svg("g", { transform: `translate(${(x - 24 * echelle).toFixed(1)} ${(socle - 47 * echelle).toFixed(1)}) scale(${echelle.toFixed(3)})` }, parent);
    svg("ellipse", { cx: 24, cy: 47, rx: 17, ry: 5, fill: "#16201A", "fill-opacity": 0.22 }, g);
    if (fusions > 0) {
      svg("ellipse", { cx: 24, cy: 47, rx: 17, ry: 5, fill: "none", stroke: "#16201A", "stroke-width": 5 }, g);
      svg("ellipse", { cx: 24, cy: 47, rx: 17, ry: 5, fill: "none", stroke: COULEUR_FUSION[fusions] ?? "#C04BFF", "stroke-width": 3 }, g);
    }
    if (fusions >= 3) svg("path", { d: ETINCELLES, fill: "#FFFFFF", stroke: "#C04BFF", "stroke-width": 0.9, "stroke-linejoin": "round" }, g);
    svg("image", { href: BUSTES[id] ?? "", x: 0, y: -1, width: 48, height: 49, filter: fusions ? `url(#prepa-aura-${Math.min(fusions, 3)})` : undefined }, g);
    // Zone de toucher plus large que le buste.
    svg("rect", { x: 2, y: -2, width: 44, height: 54, fill: "transparent" }, g);
  }

  /** Nom du joueur touché, au-dessus du buste. */
  private etiquette(s: SVGSVGElement, nom: string, x: number, bas: number): void {
    const l = nom.length * 6.6 + 14;
    const g = svg("g", { class: "prepa-nom" }, s);
    svg("rect", { x: x - l / 2, y: bas - 16, width: l, height: 16, rx: 6 }, g);
    const t = svg("text", { x, y: bas - 4.5 }, g);
    t.textContent = nom;
  }

  /** Liste déroulante de la tactique d'équipe, au-dessus du terrain (une seule à la fois).
   *  La liste native est posée, invisible, sur le texte affiché : on garde le
   *  sélecteur du téléphone et on règle librement la taille du texte. */
  private rendreTactique(parent: HTMLElement): void {
    const d = this.prepa.d;
    const actuelle = d.tactiques.find((t) => t.code === this.prepa.etat.tactique) ?? d.tactiques[0]!;
    const l = html("label", { class: "prepa-tactique" }, parent);
    html("span", { class: "prepa-tactique-titre" }, l, "Tactique");
    html("span", { class: "prepa-tactique-valeur" }, l, actuelle.nom);
    const choix = html("select", { "aria-label": "Tactique d'équipe" }, l);
    for (const t of d.tactiques) {
      const o = html("option", { value: t.code }, choix, t.nom);
      o.selected = t.code === actuelle.code;
    }
    choix.addEventListener("change", () => this.afficherIssue(this.prepa.choisirTactique(choix.value)));
  }

  private rendreBanc(parent: HTMLElement): void {
    const d = this.prepa.d;
    const banc = this.prepa.banc();
    const b = html("div", { class: "prepa-banc" }, parent);
    this.elBanc = b;
    const t = html("div", { class: "prepa-banc-titre" }, b);
    html("span", { class: "prepa-gras" }, t, "Banc");
    html("span", { class: "prepa-discret" }, t, `${banc.length}/${d.bancMax}`);
    const places = html("div", { class: "prepa-places" }, b);
    this.placesBanc = [];
    for (let i = 0; i < d.bancMax; i++) {
      const id = banc[i];
      if (!id) {
        const v = html("div", { class: "prepa-place" }, places);
        html("div", { class: "prepa-vide" }, v);
        html("span", { class: "prepa-discret" }, v, "vide");
        continue;
      }
      const f = this.prepa.fiche(id);
      const fusions = this.prepa.membre(id)?.fusions ?? 0;
      const p = html("div", { class: `prepa-place prepa-tirable${id === this.choisi ? " choisi" : ""}`, "aria-label": `${f.nom}, ${libellePoste(f.poste)}, remplaçant` }, places);
      html("img", { src: BUSTES[id] ?? "", alt: "", class: `prepa-mini aura-${fusions}`, draggable: "false" }, p);
      html("span", { class: "prepa-poste" }, p, id === this.choisi ? f.nom : libellePoste(f.poste));
      p.addEventListener("pointerdown", (ev) => this.appui(ev, id, p));
      this.placesBanc.push({ id, el: p });
    }
  }

  private rendreMercato(parent: HTMLElement): void {
    const e = this.prepa.etat;
    const m = html("div", { class: "prepa-mercato" }, parent);
    this.elMercato = m;
    const t = html("div", { class: "prepa-mercato-tete" }, m);
    const g = html("div", { class: "prepa-titre" }, t);
    html("span", { class: "prepa-h petit" }, g, "Mercato");
    html("span", { class: "prepa-discret" }, g, "Glisse un joueur ici pour le vendre");
    const budget = html("div", { class: "prepa-budget", "aria-label": `Budget : ${e.budget} pièces` }, t);
    html("span", { class: "prepa-piece" }, budget);
    html("span", { class: "prepa-nombre" }, budget, String(e.budget));
    const cartes = html("div", { class: "prepa-cartes" }, m);
    e.mercato.forEach((id, i) => {
      if (!id) {
        html("div", { class: "prepa-carte vide", "aria-hidden": "true" }, cartes);
        return;
      }
      const f = this.prepa.fiche(id);
      const fusion = this.prepa.fusionPossible(id);
      const trop = f.prix > e.budget;
      const k = html(
        "button",
        {
          type: "button",
          class: `prepa-carte${fusion ? " fusion" : ""}${trop ? " trop-cher" : ""}`,
          "aria-label": `Recruter ${f.nom}, ${libellePoste(f.poste)}, ${f.prix} pièces${fusion ? ", fusion avec ta copie" : ""}`,
        },
        cartes,
      );
      html("img", { src: BUSTES[id] ?? "", alt: "", class: "prepa-mini", draggable: "false" }, k);
      html("span", { class: "prepa-poste" }, k, libellePoste(f.poste));
      html("span", { class: "prepa-prix" }, k, String(f.prix));
      if (fusion) html("span", { class: "prepa-fusion" }, k, "Fusion");
      k.addEventListener("click", () => this.afficherIssue(this.prepa.acheter(i)));
    });
  }
}

/** Point dans un polygone (règle du rayon). */
function dansPolygone(x: number, y: number, pts: number[][]): boolean {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i] as [number, number];
    const [xj, yj] = pts[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}
