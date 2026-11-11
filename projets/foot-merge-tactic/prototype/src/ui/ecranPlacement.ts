// Écran de placement, sur une seule page : le demi-terrain, et dessous le banc.
// Tout se fait en faisant glisser les ronds :
//   - un joueur lâché sur une case libre y va ;
//   - lâché sur un autre joueur du terrain, ils échangent leurs places ;
//   - un remplaçant lâché sur un joueur du terrain prend sa place ;
//   - un joueur du terrain lâché sur le banc sort.
// Le plateau (hexagones ou carrés, au choix) est toujours visible, en
// couleurs : jaune le gardien, bleu la défense, violet le milieu, rouge
// l'attaque ; les couloirs des côtés sont plus clairs. Un simple toucher sur
// un rond affiche le joueur.

import type { Donnees } from "../sim/donnees";
import {
  JOUEURS_SUR_LE_TERRAIN,
  caseAuPoint,
  echanger,
  horsPoste,
  occupant,
  placer,
  remplacer,
  retirer,
} from "../sim/placement";
import type { Cellule, Equipe, Joueur, Placement } from "../sim/types";
import { dessinerLignes, html, initiales, svg } from "./dom";

const LARGEUR = 340;
const HAUTEUR = 430;
const MARGE = 10;
const ESPACE_BANC = 10;
const HAUTEUR_BANC = 64;
const Y_BANC = MARGE + HAUTEUR + ESPACE_BANC;
const HAUTEUR_TOTALE = Y_BANC + HAUTEUR_BANC + 6;
const PAS_BANC = 46;
const X_PREMIER_BANC = MARGE + 64;

const DELAI_APPUI_MS = 250;
const SEUIL_GLISSEMENT_PX = 8;
const DECALAGE_DOIGT = 34; // unités de la planche
const RAYON_JOUEUR = 20; // lâcher à moins de 20 unités d'un rond = viser ce joueur

/** Couleur d'une case selon son rôle (bande de jeu). */
const FAMILLE: Record<string, string> = {
  G: "gardien",
  DC: "defense",
  DG: "defense",
  DD: "defense",
  MDC: "milieu",
  MC: "milieu",
  MOC: "milieu",
  MG: "milieu",
  MD: "milieu",
  MAG: "milieu",
  MAD: "milieu",
  AC: "attaque",
  AG: "attaque",
  AD: "attaque",
};
const POSTES_DE_COTE = new Set(["DG", "DD", "AG", "AD"]);

export interface EtatPlacement {
  composition: Placement[];
  joueurChoisi: string | null;
  message: string;
  messageErreur: boolean;
}

type Cible =
  | { type: "case"; poste: string; cellule: number }
  | { type: "echange"; avec: string }
  | { type: "remplacement"; entrant: string; sortant: string }
  | { type: "banc" }
  | { type: "rien" };

export class EcranPlacement {
  readonly racine: HTMLElement;

  private glisse: {
    id: string;
    surTerrain: boolean;
    pointeur: number;
    depart: { x: number; y: number };
    centre: { x: number; y: number };
    position: { x: number; y: number };
    g: SVGGElement;
    copie: SVGGElement | null;
    planche: SVGSVGElement;
    actif: boolean;
    doigt: boolean;
    minuteur: number | undefined;
  } | null = null;
  private calqueCases: SVGGElement | null = null;
  private calqueDessus: SVGGElement | null = null;
  private elMessage: HTMLElement | null = null;

  constructor(
    private donnees: Donnees,
    private equipe: Equipe,
    private etat: EtatPlacement,
    private auChangement: (composition: Placement[]) => void,
    private auChangementPlateau: (plateau: string) => void,
  ) {
    this.racine = html("section", { class: "ecran" });
    this.rendre();
  }

  // Le demi-terrain : x de 0 à 1 sur la largeur, y de 0 (but) à 0,5 (milieu).
  private X = (xn: number) => MARGE + xn * LARGEUR;
  private Y = (yn: number) => MARGE + ((0.5 - yn) / 0.5) * HAUTEUR;

  private joueur(id: string): Joueur {
    const j = this.equipe.joueurs.find((x) => x.id === id);
    if (!j) throw new Error(`Joueur inconnu : ${id}`);
    return j;
  }

  private placementDe(id: string | null): Placement | undefined {
    return id ? this.etat.composition.find((p) => p.joueurId === id) : undefined;
  }

  private remplacants(): Joueur[] {
    return this.equipe.joueurs.filter((j) => !this.placementDe(j.id));
  }

  /** Centre d'un rond, sur le terrain ou sur le banc. */
  private centreDe(id: string): { x: number; y: number } {
    const pl = this.placementDe(id);
    if (pl) {
      const c = this.donnees.cellule(pl.poste, pl.cellule);
      return { x: this.X(c.centre.x), y: this.Y(c.centre.y) };
    }
    const i = this.remplacants().findIndex((j) => j.id === id);
    return { x: X_PREMIER_BANC + i * PAS_BANC, y: Y_BANC + HAUTEUR_BANC / 2 };
  }

  private description(id: string): string {
    const j = this.joueur(id);
    const naturels = j.postes.map((x) => this.donnees.roles[x] ?? x).join(", ");
    const pl = this.placementDe(id);
    if (!pl) return `${j.nom} · remplaçant · poste naturel : ${naturels}.`;
    const c = this.donnees.cellule(pl.poste, pl.cellule);
    const hp = horsPoste(j, this.donnees, pl.poste, pl.cellule) ? " · hors poste" : "";
    return `${j.nom} · ${this.nomCase(c)}${hp} · naturel : ${naturels}.`;
  }

  private nomCase(c: Cellule): string {
    const role = this.donnees.roles[c.role] ?? c.role;
    return c.label ? `${role} (${c.label})` : role;
  }

  /** Dessine une case à sa forme (hexagone à pointe en haut, ou carré), un
   *  peu en retrait pour laisser voir le joint entre les cases. */
  private dessinerCase(c: Cellule, parent: SVGGElement, classe: string, retrait = 1.6): SVGElement {
    const cx = this.X(c.centre.x);
    const cy = this.Y(c.centre.y);
    const w = c.rect.w * LARGEUR - 2 * retrait;
    const h = (c.rect.h / 0.5) * HAUTEUR - 2 * retrait;
    if (c.forme === "carre") {
      return svg("rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 5, class: classe }, parent);
    }
    const sommets = [
      [0, -h / 2],
      [w / 2, -h / 4],
      [w / 2, h / 4],
      [0, h / 2],
      [-w / 2, h / 4],
      [-w / 2, -h / 4],
    ];
    const points = sommets.map(([x, y]) => `${(cx + x!).toFixed(1)},${(cy + y!).toFixed(1)}`).join(" ");
    return svg("polygon", { points, class: classe }, parent);
  }

  private info(texte: string, erreur = false): void {
    this.etat.message = texte;
    this.etat.messageErreur = erreur;
  }

  // ---- Glisser-déposer -------------------------------------------------

  private appui(ev: PointerEvent, id: string, g: SVGGElement, planche: SVGSVGElement): void {
    if (this.glisse || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    ev.preventDefault();
    g.setPointerCapture(ev.pointerId);
    const centre = this.centreDe(id);
    this.glisse = {
      id,
      surTerrain: !!this.placementDe(id),
      pointeur: ev.pointerId,
      depart: { x: ev.clientX, y: ev.clientY },
      centre,
      position: centre,
      g,
      copie: null,
      planche,
      actif: false,
      doigt: ev.pointerType !== "mouse",
      minuteur: window.setTimeout(() => this.souleverJeton(), DELAI_APPUI_MS),
    };
    const bouge = (e: PointerEvent) => this.bouger(e);
    const lache = (e: PointerEvent) => {
      g.removeEventListener("pointermove", bouge);
      g.removeEventListener("pointerup", lache);
      g.removeEventListener("pointercancel", lache);
      this.lacher(e);
    };
    g.addEventListener("pointermove", bouge);
    g.addEventListener("pointerup", lache);
    g.addEventListener("pointercancel", lache);
  }

  private souleverJeton(): void {
    const gl = this.glisse;
    if (!gl || gl.actif) return;
    gl.actif = true;
    // Le rond d'origine reste en place, estompé ; une copie suit le doigt.
    const copie = gl.g.cloneNode(true) as SVGGElement;
    copie.classList.add("jeton-souleve");
    this.calqueDessus?.appendChild(copie);
    gl.copie = copie;
    gl.g.classList.add("jeton-origine");
    try {
      navigator.vibrate?.(15);
    } catch {
      // vibration indisponible : sans conséquence
    }
    this.montrerCible(gl.position);
  }

  private versPlanche(planche: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
    const ctm = planche.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  private bouger(ev: PointerEvent): void {
    const gl = this.glisse;
    if (!gl || ev.pointerId !== gl.pointeur) return;
    if (!gl.actif) {
      if (Math.hypot(ev.clientX - gl.depart.x, ev.clientY - gl.depart.y) < SEUIL_GLISSEMENT_PX) return;
      window.clearTimeout(gl.minuteur);
      this.souleverJeton();
    }
    const p = this.versPlanche(gl.planche, ev.clientX, ev.clientY);
    if (!p) return;
    // Au doigt, le rond est dessiné un peu au-dessus pour rester visible.
    const pos = { x: p.x, y: p.y - (gl.doigt ? DECALAGE_DOIGT : 0) };
    gl.position = pos;
    gl.copie?.setAttribute("transform", `translate(${pos.x - gl.centre.x} ${pos.y - gl.centre.y})`);
    this.montrerCible(pos);
  }

  private lacher(ev: PointerEvent): void {
    const gl = this.glisse;
    if (!gl) return;
    window.clearTimeout(gl.minuteur);
    this.glisse = null;
    if (ev.type === "pointercancel") {
      this.rendre();
      return;
    }
    if (!gl.actif) {
      // Simple toucher : afficher le joueur (ou le libérer).
      const choisi = this.etat.joueurChoisi === gl.id ? null : gl.id;
      this.etat.joueurChoisi = choisi;
      this.info(choisi ? this.description(choisi) : this.aide());
      this.rendre();
      return;
    }
    this.deposer(gl.id, gl.surTerrain, gl.position);
  }

  /** Ce qui arriverait si on lâchait le joueur à ce point de la planche. */
  private cible(id: string, surTerrain: boolean, pos: { x: number; y: number }): Cible {
    // Sur le banc
    if (pos.y >= Y_BANC - 4) {
      if (!surTerrain) return { type: "rien" };
      const surRemplacant = this.remplacants().find((j) => {
        const c = this.centreDe(j.id);
        return Math.hypot(c.x - pos.x, c.y - pos.y) <= RAYON_JOUEUR;
      });
      return surRemplacant ? { type: "remplacement", entrant: surRemplacant.id, sortant: id } : { type: "banc" };
    }
    // Sur un joueur du terrain
    for (const pl of this.etat.composition) {
      if (pl.joueurId === id) continue;
      const c = this.centreDe(pl.joueurId);
      if (Math.hypot(c.x - pos.x, c.y - pos.y) <= RAYON_JOUEUR) {
        return surTerrain ? { type: "echange", avec: pl.joueurId } : { type: "remplacement", entrant: id, sortant: pl.joueurId };
      }
    }
    // Sur une case
    const point = { x: (pos.x - MARGE) / LARGEUR, y: 0.5 - ((pos.y - MARGE) / HAUTEUR) * 0.5 };
    const c = caseAuPoint(this.donnees, point);
    if (!c) return { type: "rien" };
    const occ = occupant(this.etat.composition, c.poste, c.index);
    if (occ && occ.joueurId === id) return { type: "rien" };
    if (occ) return surTerrain ? { type: "echange", avec: occ.joueurId } : { type: "remplacement", entrant: id, sortant: occ.joueurId };
    return { type: "case", poste: c.poste, cellule: c.index };
  }

  private montrerCible(pos: { x: number; y: number }): void {
    const gl = this.glisse;
    if (!gl || !this.calqueCases) return;
    const calque = this.calqueCases;
    calque.replaceChildren();
    const ci = this.cible(gl.id, gl.surTerrain, pos);
    const nom = this.joueur(gl.id).nom;
    let texte = gl.surTerrain
      ? `${nom} : lâchez-le sur une case, sur un joueur ou sur le banc.`
      : this.etat.composition.length < JOUEURS_SUR_LE_TERRAIN
        ? `${nom} : lâchez-le sur une case libre ou sur un joueur.`
        : `${nom} : lâchez-le sur un joueur pour le faire entrer à sa place.`;
    let visee: { poste: string; index: number } | null = null;
    if (ci.type === "echange") {
      const pl = this.placementDe(ci.avec)!;
      visee = { poste: pl.poste, index: pl.cellule };
      texte = `${nom} ⇄ ${this.joueur(ci.avec).nom} : échange de places.`;
    } else if (ci.type === "remplacement") {
      const pl = this.placementDe(ci.sortant)!;
      visee = { poste: pl.poste, index: pl.cellule };
      texte = `${this.joueur(ci.entrant).nom} entre à la place de ${this.joueur(ci.sortant).nom}.`;
    } else if (ci.type === "case") {
      visee = { poste: ci.poste, index: ci.cellule };
      const c = this.donnees.cellule(ci.poste, ci.cellule);
      texte = `${nom} → ${this.nomCase(c)}`;
    } else if (ci.type === "banc") {
      texte = `${nom} sort et va sur le banc.`;
      svg("rect", { x: MARGE, y: Y_BANC, width: LARGEUR, height: HAUTEUR_BANC, rx: 10, class: "cible-case" }, calque);
    }
    if (visee) this.dessinerCase(this.donnees.cellule(visee.poste, visee.index), calque, "cible-case", 1);
    if (this.elMessage) {
      this.elMessage.textContent = texte;
      this.elMessage.className = "message";
    }
  }

  private deposer(id: string, surTerrain: boolean, pos: { x: number; y: number }): void {
    const ci = this.cible(id, surTerrain, pos);
    const nom = this.joueur(id).nom;
    if (ci.type === "rien") {
      this.info(`${nom} n'a pas bougé.`);
      this.rendre();
      return;
    }
    let r;
    if (ci.type === "banc") r = { ok: true as const, composition: retirer(this.etat.composition, id) };
    else if (ci.type === "echange") r = echanger(this.etat.composition, id, ci.avec);
    else if (ci.type === "remplacement") r = remplacer(this.etat.composition, ci.entrant, ci.sortant);
    else r = placer(this.etat.composition, this.donnees, id, ci.poste, ci.cellule);
    if (!r.ok) {
      const plein = ci.type === "case" && !surTerrain && this.etat.composition.length >= JOUEURS_SUR_LE_TERRAIN;
      this.info(plein ? `Il y a déjà 11 joueurs : lâchez ${nom} sur un joueur pour le faire entrer à sa place.` : r.erreur, true);
      this.rendre();
      return;
    }
    this.etat.composition = r.composition;
    this.auChangement(r.composition);
    if (ci.type === "banc") {
      this.etat.joueurChoisi = null;
      this.info(`${nom} est sur le banc. ${this.aide()}`);
    } else if (ci.type === "echange") {
      this.etat.joueurChoisi = id;
      this.info(`${nom} et ${this.joueur(ci.avec).nom} ont échangé leurs places.`);
    } else if (ci.type === "remplacement") {
      this.etat.joueurChoisi = ci.entrant;
      this.info(`${this.joueur(ci.entrant).nom} entre à la place de ${this.joueur(ci.sortant).nom}.`);
    } else {
      this.etat.joueurChoisi = id;
      this.info(this.description(id));
    }
    this.rendre();
  }

  private aide(): string {
    const n = this.etat.composition.length;
    if (n < JOUEURS_SUR_LE_TERRAIN) return `Il manque ${JOUEURS_SUR_LE_TERRAIN - n} joueur(s) : faites glisser un remplaçant sur une case.`;
    return "Faites glisser un joueur sur une case, sur un autre joueur ou sur le banc.";
  }

  // ---- Affichage ---------------------------------------------------------

  rendre(): void {
    const r = this.racine;
    r.replaceChildren();
    const comp = this.etat.composition;
    if (!this.etat.message) this.info(this.aide());

    const tete = html("div", { class: "ligne-statut" }, r);
    html("span", { class: "compteur" }, tete, `${comp.length}/${JOUEURS_SUR_LE_TERRAIN} sur le terrain`);
    const choix = html("div", { class: "choix-plateau", role: "group", "aria-label": "Forme des cases" }, tete);
    for (const p of this.donnees.plateauxDisponibles) {
      const actif = p.id === this.donnees.plateauId;
      const b = html(
        "button",
        { type: "button", class: `mini${actif ? " mini-actif" : ""}`, "aria-pressed": String(actif) },
        choix,
        `${p.id === "hexagones" ? "⬡" : "▢"} ${p.nom}`,
      );
      b.addEventListener("click", () => {
        if (!actif) this.auChangementPlateau(p.id);
      });
    }
    this.elMessage = html("p", { class: this.etat.messageErreur ? "message erreur" : "message", role: "status" }, r, this.etat.message);

    const s = svg("svg", {
      viewBox: `0 0 ${LARGEUR + 2 * MARGE} ${HAUTEUR_TOTALE}`,
      class: "planche",
      role: "img",
      "aria-label": "Demi-terrain de placement et banc des remplaçants",
    });
    r.appendChild(s);
    dessinerLignes(svg("g", {}, s), (m) => this.X(m / 68), (m) => this.Y(m / 105), true);

    // Banc
    const banc = svg("g", { class: "banc" }, s);
    svg("rect", { x: MARGE, y: Y_BANC, width: LARGEUR, height: HAUTEUR_BANC, rx: 10, class: "banc-fond" }, banc);
    const titre = svg("text", { x: MARGE + 10, y: Y_BANC + HAUTEUR_BANC / 2 + 4, class: "banc-titre" }, banc);
    titre.textContent = "Banc";

    // Plateau : toutes les cases, en couleur, avec leur rôle.
    const plateau = svg("g", { class: "plateau" }, s);
    for (const p of this.donnees.postes) {
      for (const c of p.cases) {
        const cote = POSTES_DE_COTE.has(p.id) ? " case-cote" : "";
        this.dessinerCase(c, plateau, `case-plateau case-${FAMILLE[c.role] ?? "milieu"}${cote}`);
        const t = svg("text", { x: this.X(c.centre.x), y: this.Y(c.centre.y) + 3.5, class: `case-role case-role-${FAMILLE[c.role] ?? "milieu"}` }, plateau);
        t.textContent = c.role;
      }
    }

    // Case visée pendant un glissement, puis ronds, puis rond soulevé.
    this.calqueCases = svg("g", {}, s);
    const jetons = svg("g", {}, s);
    const tous = [...comp.map((p) => p.joueurId), ...this.remplacants().map((j) => j.id)];
    for (const id of tous) {
      const j = this.joueur(id);
      const pl = this.placementDe(id);
      const hp = pl ? horsPoste(j, this.donnees, pl.poste, pl.cellule) : false;
      const sel = id === this.etat.joueurChoisi;
      const { x: cx, y: cy } = this.centreDe(id);
      const g = svg("g", { class: `jeton${pl ? "" : " jeton-banc"}${sel ? " jeton-choisi" : ""}${hp ? " jeton-hors" : ""}` }, jetons);
      svg("circle", { cx, cy, r: 21, class: "jeton-zone-toucher" }, g);
      svg("circle", { cx, cy, r: 15, class: "jeton-rond" }, g);
      const t = svg("text", { x: cx, y: cy + 4, class: "jeton-texte" }, g);
      t.textContent = initiales(j.nom);
      g.addEventListener("pointerdown", (ev) => this.appui(ev, id, g, s));
      // Les navigateurs ignorent `touch-action` sur les éléments SVG : sans
      // ceci, le doigt posé sur un rond ferait défiler la page.
      g.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
    }
    this.calqueDessus = svg("g", {}, s);
  }
}
