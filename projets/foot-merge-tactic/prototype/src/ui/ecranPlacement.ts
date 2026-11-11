// Écran de placement : le demi-terrain occupe toute la largeur et il est
// étiré en hauteur pour donner de grandes cases au doigt. On choisit un
// joueur (sur le terrain ou dans l'effectif), puis une case de son poste.

import type { Donnees } from "../sim/donnees";
import { JOUEURS_SUR_LE_TERRAIN, horsPoste, nombreAuPoste, occupant, placer, retirer, verifier } from "../sim/placement";
import type { Equipe, Joueur, Placement } from "../sim/types";
import { dessinerLignes, html, initiales, svg } from "./dom";

const LARGEUR = 340;
const HAUTEUR = 470;
const MARGE = 10;

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

  rendre(): void {
    const r = this.racine;
    r.replaceChildren();
    const comp = this.etat.composition;

    const tete = html("div", { class: "ligne-statut" }, r);
    html("span", { class: "compteur" }, tete, `${comp.length}/${JOUEURS_SUR_LE_TERRAIN} sur le terrain`);
    html("p", { class: this.etat.messageErreur ? "message erreur" : "message", role: "status" }, r, this.etat.message);

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
      g.addEventListener("click", () => this.toucherCase(poste.id, c.index));
    }

    // Jetons des joueurs placés
    const jetons = svg("g", {}, s);
    for (const pl of comp) {
      const c = this.donnees.cellule(pl.poste, pl.cellule);
      const j = this.joueur(pl.joueurId);
      const hp = horsPoste(j, this.donnees, pl.poste, pl.cellule);
      const sel = pl.joueurId === this.etat.joueurChoisi;
      // Les joueurs des autres postes restent visibles mais ne captent pas le
      // doigt, pour que les cases du poste affiché restent faciles à toucher.
      const autre = pl.poste !== this.etat.posteAffiche && !sel;
      const g = svg("g", { class: `jeton${sel ? " jeton-choisi" : ""}${hp ? " jeton-hors" : ""}${autre ? " jeton-autre" : ""}` }, jetons);
      const cx = this.X(c.centre.x);
      const cy = this.Y(c.centre.y);
      svg("circle", { cx, cy, r: 26, class: "jeton-zone-toucher" }, g);
      svg("circle", { cx, cy, r: 15, class: "jeton-rond" }, g);
      const t = svg("text", { x: cx, y: cy + 4, class: "jeton-texte" }, g);
      t.textContent = initiales(j.nom);
      g.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.choisirJoueur(sel ? null : pl.joueurId);
      });
    }

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
