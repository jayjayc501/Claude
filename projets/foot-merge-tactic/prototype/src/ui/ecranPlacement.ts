// Écran de placement : le demi-terrain occupe toute la largeur et il est
// étiré en hauteur pour donner de grandes cases au doigt. On choisit un
// joueur (sur le terrain ou dans l'effectif), puis une case de son poste.
// On peut aussi garder le doigt appuyé sur un joueur pour le faire glisser :
// lâché sur une case libre, il y va ; lâché sur un autre joueur, ils échangent.

import type { Donnees } from "../sim/donnees";
import {
  JOUEURS_SUR_LE_TERRAIN,
  caseAuPoint,
  echanger,
  horsPoste,
  nombreAuPoste,
  occupant,
  placer,
  retirer,
  verifier,
} from "../sim/placement";
import type { Equipe, Joueur, Placement } from "../sim/types";
import { dessinerLignes, html, initiales, svg } from "./dom";

const LARGEUR = 340;
const HAUTEUR = 470;
const MARGE = 10;
const DELAI_APPUI_MS = 250;
const SEUIL_GLISSEMENT_PX = 8;
const DECALAGE_DOIGT = 34; // unités de la planche
const RAYON_ECHANGE = 20; // lâcher à moins de 20 unités d'un joueur = échange

export interface EtatPlacement {
  composition: Placement[];
  joueurChoisi: string | null;
  posteAffiche: string;
  message: string;
  messageErreur: boolean;
}

export class EcranPlacement {
  readonly racine: HTMLElement;

  constructor(
    private donnees: Donnees,
    private equipe: Equipe,
    private etat: EtatPlacement,
    private auChangement: (composition: Placement[]) => void,
    private lancerMatch: () => void,
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

  private posteNaturel(j: Joueur): string {
    for (const role of j.postes) {
      const p = this.donnees.postes.find((poste) => poste.cases.some((c) => c.role === role));
      if (p) return p.id;
    }
    return this.donnees.postes[0]!.id;
  }

  private choisirJoueur(id: string | null): void {
    this.etat.joueurChoisi = id;
    if (id) {
      const pl = this.placementDe(id);
      this.etat.posteAffiche = pl ? pl.poste : this.posteNaturel(this.joueur(id));
      const j = this.joueur(id);
      this.info(pl ? `${j.nom} : touchez une case libre pour le déplacer.` : `${j.nom} : touchez une case libre pour le faire jouer.`);
    } else {
      this.info("Choisissez un joueur, puis une case de son poste.");
    }
    this.rendre();
  }

  private info(texte: string, erreur = false): void {
    this.etat.message = texte;
    this.etat.messageErreur = erreur;
  }

  private toucherCase(poste: string, cellule: number): void {
    const occ = occupant(this.etat.composition, poste, cellule);
    if (occ && occ.joueurId !== this.etat.joueurChoisi) {
      this.choisirJoueur(occ.joueurId);
      return;
    }
    const id = this.etat.joueurChoisi;
    if (!id) {
      this.info("Choisissez d'abord un joueur.", true);
      this.rendre();
      return;
    }
    const r = placer(this.etat.composition, this.donnees, id, poste, cellule);
    if (!r.ok) {
      this.info(r.erreur, true);
      this.rendre();
      return;
    }
    this.etat.composition = r.composition;
    this.auChangement(r.composition);
    const j = this.joueur(id);
    const c = this.donnees.cellule(poste, cellule);
    const hp = horsPoste(j, this.donnees, poste, cellule);
    this.info(`${j.nom} : ${this.donnees.roles[c.role] ?? c.role} (${c.label})${hp ? " — hors de son poste naturel" : ""}.`);
    this.rendre();
  }

  private retirerChoisi(): void {
    const id = this.etat.joueurChoisi;
    if (!id) return;
    this.etat.composition = retirer(this.etat.composition, id);
    this.auChangement(this.etat.composition);
    this.info(`${this.joueur(id).nom} est sur le banc.`);
    this.rendre();
  }

  // ---- Glisser-déposer -------------------------------------------------
  // Le glissement démarre si le doigt reste appuyé (DELAI_APPUI_MS) ou s'il
  // bouge de plus de SEUIL_GLISSEMENT_PX. Sinon, c'est un simple toucher.

  private glisse: {
    id: string;
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
  private calqueCible: SVGGElement | null = null;
  private calqueDessus: SVGGElement | null = null;
  private elMessage: HTMLElement | null = null;
  private clicsIgnoresJusqua = 0;

  private appui(ev: PointerEvent, id: string, g: SVGGElement, planche: SVGSVGElement, centre: { x: number; y: number }): void {
    if (this.glisse || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    ev.preventDefault();
    g.setPointerCapture(ev.pointerId);
    this.glisse = {
      id,
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
    // Le jeton d'origine reste en place, estompé ; une copie suit le doigt,
    // au-dessus de tous les autres joueurs.
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
    // Au doigt, le jeton est dessiné un peu au-dessus pour rester visible.
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
    this.clicsIgnoresJusqua = performance.now() + 400;
    if (ev.type === "pointercancel") {
      this.rendre();
      return;
    }
    if (!gl.actif) {
      // Simple toucher : choisir ou libérer le joueur.
      this.choisirJoueur(this.etat.joueurChoisi === gl.id ? null : gl.id);
      return;
    }
    this.deposer(gl.id, gl.position);
  }

  /** Ce qui arriverait si on lâchait le joueur à ce point de la planche. */
  private cible(
    id: string,
    pos: { x: number; y: number },
  ): { type: "echange"; avec: string } | { type: "case"; poste: string; cellule: number } | { type: "rien" } {
    for (const pl of this.etat.composition) {
      if (pl.joueurId === id) continue;
      const c = this.donnees.cellule(pl.poste, pl.cellule);
      if (Math.hypot(this.X(c.centre.x) - pos.x, this.Y(c.centre.y) - pos.y) <= RAYON_ECHANGE) {
        return { type: "echange", avec: pl.joueurId };
      }
    }
    const point = { x: (pos.x - MARGE) / LARGEUR, y: 0.5 - ((pos.y - MARGE) / HAUTEUR) * 0.5 };
    const c = caseAuPoint(this.donnees, point);
    if (!c) return { type: "rien" };
    const occ = occupant(this.etat.composition, c.poste, c.index);
    if (occ && occ.joueurId !== id) return { type: "echange", avec: occ.joueurId };
    if (occ) return { type: "rien" };
    return { type: "case", poste: c.poste, cellule: c.index };
  }

  private montrerCible(pos: { x: number; y: number }): void {
    const gl = this.glisse;
    if (!gl || !this.calqueCible) return;
    this.calqueCible.replaceChildren();
    const ci = this.cible(gl.id, pos);
    const nom = this.joueur(gl.id).nom;
    let texte = `${nom} : lâchez-le sur une case ou sur un autre joueur.`;
    let cellule: { poste: string; index: number } | null = null;
    if (ci.type === "echange") {
      const pl = this.placementDe(ci.avec)!;
      cellule = { poste: pl.poste, index: pl.cellule };
      texte = `${nom} ⇄ ${this.joueur(ci.avec).nom} : échange de places.`;
    } else if (ci.type === "case") {
      cellule = { poste: ci.poste, index: ci.cellule };
      const c = this.donnees.cellule(ci.poste, ci.cellule);
      texte = `${nom} → ${this.donnees.roles[c.role] ?? c.role} (${c.label})`;
    }
    if (cellule) {
      const c = this.donnees.cellule(cellule.poste, cellule.index);
      svg("rect", {
        x: this.X(c.rect.x) + 2,
        y: this.Y(c.rect.y + c.rect.h) + 2,
        width: c.rect.w * LARGEUR - 4,
        height: (c.rect.h / 0.5) * HAUTEUR - 4,
        rx: 6,
        class: "cible-case",
      }, this.calqueCible);
    }
    if (this.elMessage) {
      this.elMessage.textContent = texte;
      this.elMessage.className = "message";
    }
  }

  private deposer(id: string, pos: { x: number; y: number }): void {
    const ci = this.cible(id, pos);
    const nom = this.joueur(id).nom;
    if (ci.type === "rien") {
      this.info(`${nom} n'a pas bougé : lâchez-le sur une case ou sur un autre joueur.`);
      this.rendre();
      return;
    }
    const r = ci.type === "echange"
      ? echanger(this.etat.composition, id, ci.avec)
      : placer(this.etat.composition, this.donnees, id, ci.poste, ci.cellule);
    if (!r.ok) {
      this.info(r.erreur, true);
      this.rendre();
      return;
    }
    this.etat.composition = r.composition;
    this.auChangement(r.composition);
    const pl = this.placementDe(id)!;
    this.etat.joueurChoisi = id;
    this.etat.posteAffiche = pl.poste;
    if (ci.type === "echange") {
      this.info(`${nom} et ${this.joueur(ci.avec).nom} ont échangé leurs places.`);
    } else {
      const c = this.donnees.cellule(pl.poste, pl.cellule);
      const hp = horsPoste(this.joueur(id), this.donnees, pl.poste, pl.cellule);
      this.info(`${nom} : ${this.donnees.roles[c.role] ?? c.role} (${c.label})${hp ? " — hors de son poste naturel" : ""}.`);
    }
    this.rendre();
  }

  rendre(): void {
    const r = this.racine;
    r.replaceChildren();
    const comp = this.etat.composition;

    const tete = html("div", { class: "ligne-statut" }, r);
    html("span", { class: "compteur" }, tete, `${comp.length}/${JOUEURS_SUR_LE_TERRAIN} sur le terrain`);
    this.elMessage = html("p", { class: this.etat.messageErreur ? "message erreur" : "message", role: "status" }, r, this.etat.message);

    // Demi-terrain
    const s = svg("svg", {
      viewBox: `0 0 ${LARGEUR + 2 * MARGE} ${HAUTEUR + 2 * MARGE}`,
      class: "planche",
      role: "img",
      "aria-label": "Demi-terrain de placement",
    });
    r.appendChild(s);
    const fond = svg("g", {}, s);
    dessinerLignes(fond, (m) => this.X(m / 68), (m) => this.Y(m / 105), true);

    const zones = svg("g", {}, s);
    for (const p of this.donnees.postes) {
      const affiche = p.id === this.etat.posteAffiche;
      svg("rect", {
        x: this.X(p.rect.x),
        y: this.Y(p.rect.y + p.rect.h),
        width: p.rect.w * LARGEUR,
        height: (p.rect.h / 0.5) * HAUTEUR,
        rx: 4,
        class: affiche ? "zone zone-active" : "zone",
      }, zones);
    }
    const poste = this.donnees.poste(this.etat.posteAffiche);
    const choisi = this.placementDe(this.etat.joueurChoisi);
    for (const c of poste.cases) {
      const occ = occupant(comp, poste.id, c.index);
      const estLui = occ && occ.joueurId === this.etat.joueurChoisi;
      const g = svg("g", { class: `case ${occ ? (estLui ? "case-lui" : "case-prise") : "case-libre"}` }, zones);
      svg("rect", {
        x: this.X(c.rect.x) + 2,
        y: this.Y(c.rect.y + c.rect.h) + 2,
        width: c.rect.w * LARGEUR - 4,
        height: (c.rect.h / 0.5) * HAUTEUR - 4,
        rx: 6,
      }, g);
      if (!occ) {
        const t = svg("text", { x: this.X(c.centre.x), y: this.Y(c.centre.y) + 4, class: "case-texte" }, g);
        t.textContent = c.role;
      }
      g.addEventListener("click", () => {
        if (performance.now() < this.clicsIgnoresJusqua) return;
        this.toucherCase(poste.id, c.index);
      });
    }

    // Case visée pendant un glisser-déposer (dessinée sous les jetons).
    this.calqueCible = svg("g", { class: "calque-cible" }, s);

    // Jetons des joueurs placés. On les touche pour les choisir, ou on garde
    // le doigt appuyé pour les faire glisser vers une autre case.
    const jetons = svg("g", {}, s);
    for (const pl of comp) {
      const c = this.donnees.cellule(pl.poste, pl.cellule);
      const j = this.joueur(pl.joueurId);
      const hp = horsPoste(j, this.donnees, pl.poste, pl.cellule);
      const sel = pl.joueurId === this.etat.joueurChoisi;
      const autre = pl.poste !== this.etat.posteAffiche && !sel;
      const g = svg("g", { class: `jeton${sel ? " jeton-choisi" : ""}${hp ? " jeton-hors" : ""}${autre ? " jeton-autre" : ""}` }, jetons);
      const cx = this.X(c.centre.x);
      const cy = this.Y(c.centre.y);
      svg("circle", { cx, cy, r: 22, class: "jeton-zone-toucher" }, g);
      svg("circle", { cx, cy, r: 15, class: "jeton-rond" }, g);
      const t = svg("text", { x: cx, y: cy + 4, class: "jeton-texte" }, g);
      t.textContent = initiales(j.nom);
      g.addEventListener("pointerdown", (ev) => this.appui(ev, pl.joueurId, g, s, { x: cx, y: cy }));
      // Les navigateurs ignorent `touch-action` sur les éléments SVG : sans
      // ceci, le doigt posé sur un joueur ferait défiler la page au lieu de
      // le déplacer.
      g.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
    }
    this.calqueDessus = svg("g", { class: "calque-dessus" }, s);

    // Postes
    const puces = html("div", { class: "puces", role: "group", "aria-label": "Postes" }, r);
    for (const p of this.donnees.postes) {
      const n = nombreAuPoste(comp, p.id);
      const b = html("button", { class: p.id === this.etat.posteAffiche ? "puce puce-active" : "puce", type: "button" }, puces);
      html("span", { class: "puce-id" }, b, p.id);
      html("span", { class: "puce-compte" }, b, `${n}/${p.max}`);
      b.title = p.nom;
      b.addEventListener("click", () => {
        this.etat.posteAffiche = p.id;
        this.info(`${p.nom} : ${p.cases.length} cases, ${p.max} joueur${p.max > 1 ? "s" : ""} au maximum.`);
        this.rendre();
      });
    }

    // Joueur choisi
    if (this.etat.joueurChoisi) {
      const j = this.joueur(this.etat.joueurChoisi);
      const bloc = html("div", { class: "choisi" }, r);
      const roles = j.postes.map((x) => this.donnees.roles[x] ?? x).join(", ");
      html("div", { class: "choisi-nom" }, bloc, j.nom);
      html("div", { class: "choisi-detail" }, bloc, `Poste naturel : ${roles}`);
      if (choisi) {
        const b = html("button", { type: "button", class: "bouton" }, bloc, "Mettre sur le banc");
        b.addEventListener("click", () => this.retirerChoisi());
      }
    }

    // Effectif
    html("h2", {}, r, "Effectif");
    const liste = html("ul", { class: "effectif" }, r);
    const tries = [...this.equipe.joueurs].sort((a, b) => Number(!this.placementDe(a.id)) - Number(!this.placementDe(b.id)));
    for (const j of tries) {
      const pl = this.placementDe(j.id);
      const li = html("li", {}, liste);
      const b = html("button", { type: "button", class: j.id === this.etat.joueurChoisi ? "rang rang-choisi" : "rang" }, li);
      html("span", { class: pl ? "pastille" : "pastille pastille-banc" }, b, initiales(j.nom));
      const txt = html("span", { class: "rang-texte" }, b);
      html("span", { class: "rang-nom" }, txt, j.nom);
      let detail = "Remplaçant";
      if (pl) {
        const c = this.donnees.cellule(pl.poste, pl.cellule);
        detail = `${this.donnees.roles[c.role] ?? c.role} (${c.label})`;
        if (horsPoste(j, this.donnees, pl.poste, pl.cellule)) detail += " · hors poste";
      }
      html("span", { class: "rang-detail" }, txt, detail);
      html("span", { class: "rang-postes" }, b, j.postes.join(" / "));
      b.addEventListener("click", () => this.choisirJoueur(j.id === this.etat.joueurChoisi ? null : j.id));
    }

    const erreurs = verifier(comp, this.donnees);
    const lancer = html("button", { type: "button", class: "bouton bouton-principal lancer" }, r, "Voir le match");
    lancer.addEventListener("click", () => {
      if (erreurs.length) {
        this.info(erreurs.join(" "), true);
        this.rendre();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      this.lancerMatch();
    });
  }
}
