// Logique de l'écran de préparation (maquette du 12/11), sans affichage :
// effectif, banc de 5, placement refusé hors poste, mercato (achat, fusion
// automatique d'une copie, revente), compteurs de pays et de styles.
// Le moteur n'est pas touché : equipe() fournit une Equipe ordinaire.

import brut from "../data/preparation.json";
import type { Donnees } from "../sim/donnees";
import { JOUEURS_SUR_LE_TERRAIN, echanger, placer, remplacer, retirer } from "../sim/placement";
import type { Equipe, Placement } from "../sim/types";

export interface Fiche {
  nom: string;
  pays: string;
  /** Identifiant de postes.json (AC s'affiche BU). */
  poste: string;
  /** Un des styles de la première version, ou null : pas de style. */
  style: string | null;
  prix: number;
}

export interface Membre {
  id: string;
  fusions: number;
}

export interface EtatPrepa {
  effectif: Membre[];
  composition: Placement[];
  budget: number;
  /** Cartes du mercato (identifiant du joueur), null = place vide. */
  mercato: (string | null)[];
  /** Tactique d'équipe choisie (une seule). Sans effet sur le moteur pour l'instant. */
  tactique: string;
}

export interface DonneesPrepa {
  deck: { code: string; nom: string; couleur: string }[];
  styles: Record<string, string>;
  tactiques: { code: string; nom: string; court?: string; aide: string }[];
  tactique: string;
  paliers: number[];
  bancMax: number;
  fusionsMax: number;
  budget: number;
  chrono: string;
  groupe: { nom: string; match: string; equipes: { nom: string; points: number; toi?: boolean; prochain?: boolean }[] };
  joueurs: Record<string, Fiche>;
  effectif: Membre[];
  composition: Placement[];
  mercato: string[];
}

export type Action =
  | { type: "case"; id: string; poste: string; cellule: number }
  | { type: "echange"; a: string; b: string }
  | { type: "remplacement"; entrant: string; sortant: string }
  | { type: "banc"; id: string }
  | { type: "vente"; id: string }
  | { type: "rien" };

export type Issue = { ok: true; etat: EtatPrepa; message: string } | { ok: false; erreur: string };

/** Libellé affiché d'un poste : AC s'appelle BU (buteur) depuis le 12/11. */
export const LIBELLE_POSTE: Record<string, string> = { AC: "BU" };
export const libellePoste = (poste: string) => LIBELLE_POSTE[poste] ?? poste;

export function donneesPrepa(): DonneesPrepa {
  return structuredClone(brut) as DonneesPrepa;
}

export function etatInitial(d: DonneesPrepa): EtatPrepa {
  return {
    effectif: d.effectif.map((m) => ({ ...m })),
    composition: d.composition.map((p) => ({ ...p })),
    budget: d.budget,
    mercato: [...d.mercato],
    tactique: d.tactique,
  };
}

export class Preparation {
  etat: EtatPrepa;

  constructor(
    readonly donnees: Donnees,
    readonly d: DonneesPrepa = donneesPrepa(),
    etat?: EtatPrepa,
  ) {
    this.etat = etat ?? etatInitial(d);
  }

  fiche(id: string): Fiche {
    const f = this.d.joueurs[id];
    if (!f) throw new Error(`Joueur inconnu : ${id}`);
    return f;
  }

  membre(id: string): Membre | undefined {
    return this.etat.effectif.find((m) => m.id === id);
  }

  placement(id: string): Placement | undefined {
    return this.etat.composition.find((p) => p.joueurId === id);
  }

  /** Remplaçants, dans l'ordre de l'effectif. */
  banc(): string[] {
    return this.etat.effectif.filter((m) => !this.placement(m.id)).map((m) => m.id);
  }

  equipe(): Equipe {
    return {
      nom: "Votre équipe",
      nationalite: "Plusieurs",
      joueurs: this.etat.effectif.map((m) => ({ id: m.id, nom: this.fiche(m.id).nom, postes: [this.fiche(m.id).poste] })),
      composition: this.etat.composition.map((p) => ({ ...p })),
    };
  }

  /** Joueurs sur le terrain par pays (pays du deck, dans l'ordre) et par style (les 4, du plus fréquent au moins
   *  fréquent) ; un joueur sans style ne compte dans aucun. */
  compteurs(): { pays: { code: string; n: number }[]; styles: { code: string; n: number }[] } {
    const surTerrain = this.etat.composition.map((p) => this.fiche(p.joueurId));
    const pays = this.d.deck.map((p) => ({ code: p.code, n: surTerrain.filter((f) => f.pays === p.code).length }));
    const ordre = Object.keys(this.d.styles);
    const styles = ordre
      .map((code) => ({ code, n: surTerrain.filter((f) => f.style === code).length }))
      .sort((a, b) => b.n - a.n || ordre.indexOf(a.code) - ordre.indexOf(b.code));
    return { pays, styles };
  }

  /** Palier visé (3, 5, 7) et palier atteint. */
  palier(n: number): { prochain: number; atteint: boolean } {
    const p = this.d.paliers;
    return { prochain: p.find((x) => x > n) ?? p[p.length - 1]!, atteint: n >= p[0]! };
  }

  /** La carte du mercato fusionnerait-elle avec un joueur de l'effectif ? */
  fusionPossible(id: string): boolean {
    const m = this.membre(id);
    return !!m && m.fusions < this.d.fusionsMax;
  }

  private refusHorsPoste(id: string, poste: string): string | null {
    const f = this.fiche(id);
    return f.poste === poste ? null : `${f.nom} joue ${libellePoste(f.poste)} : pas ${libellePoste(poste)}.`;
  }

  /** Résultat d'une action, sans rien changer. */
  essayer(a: Action): Issue {
    const e = this.etat;
    const avec = (composition: Placement[], message: string, autre: Partial<EtatPrepa> = {}): Issue => ({
      ok: true,
      etat: { ...e, ...autre, composition },
      message,
    });
    switch (a.type) {
      case "rien":
        return { ok: false, erreur: "" };
      case "case": {
        const refus = this.refusHorsPoste(a.id, a.poste);
        if (refus) return { ok: false, erreur: refus };
        const r = placer(e.composition, this.donnees, a.id, a.poste, a.cellule);
        return r.ok ? avec(r.composition, "") : { ok: false, erreur: r.erreur };
      }
      case "echange": {
        const pa = this.placement(a.a);
        const pb = this.placement(a.b);
        if (!pa || !pb) return { ok: false, erreur: "Les deux joueurs doivent être sur le terrain." };
        const refus = this.refusHorsPoste(a.a, pb.poste) ?? this.refusHorsPoste(a.b, pa.poste);
        if (refus) return { ok: false, erreur: refus };
        const r = echanger(e.composition, a.a, a.b);
        return r.ok ? avec(r.composition, "") : { ok: false, erreur: r.erreur };
      }
      case "remplacement": {
        const ps = this.placement(a.sortant);
        if (!ps) return { ok: false, erreur: "Le joueur remplacé doit être sur le terrain." };
        const refus = this.refusHorsPoste(a.entrant, ps.poste);
        if (refus) return { ok: false, erreur: refus };
        const r = remplacer(e.composition, a.entrant, a.sortant);
        return r.ok
          ? avec(r.composition, `${this.fiche(a.entrant).nom} entre, ${this.fiche(a.sortant).nom} sort.`)
          : { ok: false, erreur: r.erreur };
      }
      case "banc": {
        if (!this.placement(a.id)) return { ok: false, erreur: "" };
        if (this.banc().length >= this.d.bancMax) return { ok: false, erreur: `Banc plein (${this.d.bancMax} places).` };
        return avec(retirer(e.composition, a.id), `${this.fiche(a.id).nom} va sur le banc.`);
      }
      case "vente": {
        const f = this.fiche(a.id);
        if (!this.membre(a.id)) return { ok: false, erreur: "" };
        return avec(retirer(e.composition, a.id), `${f.nom} vendu : +${f.prix}.`, {
          effectif: e.effectif.filter((m) => m.id !== a.id),
          budget: e.budget + f.prix,
        });
      }
    }
  }

  appliquer(a: Action): Issue {
    const r = this.essayer(a);
    if (r.ok) this.etat = r.etat;
    return r;
  }

  /** Achat de la carte n° `place` du mercato : fusion avec la copie de
   *  l'effectif s'il y en a une, sinon le joueur va sur le banc. */
  acheter(place: number): Issue {
    const e = this.etat;
    const id = e.mercato[place];
    if (!id) return { ok: false, erreur: "" };
    const f = this.fiche(id);
    if (e.budget < f.prix) return { ok: false, erreur: `Pas assez de pièces pour ${f.nom} (${f.prix}).` };
    const copie = this.membre(id);
    if (copie && copie.fusions >= this.d.fusionsMax) return { ok: false, erreur: `${f.nom} : fusion maximale atteinte.` };
    if (!copie && this.banc().length >= this.d.bancMax) return { ok: false, erreur: `Banc plein (${this.d.bancMax} places).` };
    const effectif = copie
      ? e.effectif.map((m) => (m.id === id ? { ...m, fusions: m.fusions + 1 } : m))
      : [...e.effectif, { id, fusions: 0 }];
    this.etat = {
      ...e,
      effectif,
      budget: e.budget - f.prix,
      mercato: e.mercato.map((x, i) => (i === place ? null : x)),
    };
    const message = copie ? `${f.nom} fusionne : niveau ${copie.fusions + 1}.` : `${f.nom} rejoint le banc.`;
    return { ok: true, etat: this.etat, message };
  }

  /** Choix de la tactique d'équipe (une seule à la fois). */
  choisirTactique(code: string): Issue {
    const t = this.d.tactiques.find((x) => x.code === code);
    if (!t) return { ok: false, erreur: "Tactique inconnue." };
    this.etat = { ...this.etat, tactique: code };
    return { ok: true, etat: this.etat, message: `Tactique : ${t.nom} (${t.aide}). Pas encore d'effet sur le match.` };
  }

  /** Composition prête pour le match ? */
  pret(): boolean {
    return this.etat.composition.length === JOUEURS_SUR_LE_TERRAIN;
  }
}
