// Une partie (13/11) : draft des 11 titulaires, premier mercato pour le banc,
// puis un match. Deux équipes (toi et l'ordinateur) piochent dans la même
// réserve de cartes, à copies limitées ; l'ordinateur suit les mêmes règles,
// avec le même budget. Indépendant de l'affichage : testable sans navigateur.
// Règles : data/partie.json ; cartes : data/cartes.json.

import cartesBrut from "../data/cartes.json";
import reglesBrut from "../data/partie.json";
import type { Donnees } from "../sim/donnees";
import { JOUEURS_SUR_LE_TERRAIN, nombreAuPoste, occupant, placer } from "../sim/placement";
import { Aleatoire } from "../sim/rng";
import type { Equipe, Notes, Placement } from "../sim/types";

export interface Carte {
  id: string;
  nom: string;
  pays: string;
  poste: string;
  style: string | null;
  prix: number;
  copies: number;
  notes: Notes | null;
}

export interface Regles {
  budgetDepart: number;
  offreTaille: number;
  mercatoTaille: number;
  relanceCout: number;
  bonusFusionParNiveau: number;
  ordi: { reserveBanc: number; relancesMax: number };
}

export interface Membre {
  id: string;
  fusions: number;
}

export interface Camp {
  budget: number;
  effectif: Membre[];
  composition: Placement[];
}

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

export const REGLES = reglesBrut as unknown as Regles;
export const CATALOGUE = cartesBrut as unknown as { pays: Record<string, { nom: string; couleur: string }>; cartes: Carte[] };

/** Sous-notes après fusion : + bonus par niveau (PROPOSITION, règle des fusions ouverte). */
export function notesFusionnees(notes: Notes | null, fusions: number, bonus = REGLES.bonusFusionParNiveau): Notes | null {
  if (!notes || fusions <= 0) return notes;
  const r = { ...notes };
  for (const k of Object.keys(r) as (keyof Notes)[]) r[k] = Math.min(99, r[k] + bonus * fusions);
  return r;
}

/** Réserve commune : nombre de copies restantes de chaque carte. */
export class Reserve {
  readonly restant = new Map<string, number>();

  constructor(private readonly cartes: Carte[]) {
    for (const c of cartes) this.restant.set(c.id, c.copies);
  }

  reste(id: string): number {
    return this.restant.get(id) ?? 0;
  }

  prendre(id: string): void {
    const n = this.reste(id);
    if (n <= 0) throw new Error(`Plus de copie de ${id} dans la réserve.`);
    this.restant.set(id, n - 1);
  }

  rendre(id: string): void {
    this.restant.set(id, this.reste(id) + 1);
  }

  /** `n` cartes différentes au plus, tirées au hasard en proportion des copies restantes. */
  tirer(rng: Aleatoire, n: number, filtre: (c: Carte) => boolean = () => true, exclure: Set<string> = new Set()): string[] {
    const ids = this.cartes.filter((c) => filtre(c) && !exclure.has(c.id) && this.reste(c.id) > 0).map((c) => c.id);
    const poids = ids.map((id) => this.reste(id));
    const sortie: string[] = [];
    while (ids.length && sortie.length < n) {
      let r = rng.suivant() * poids.reduce((s, p) => s + p, 0);
      let i = 0;
      while (i < ids.length - 1 && r >= poids[i]!) r -= poids[i++]!;
      sortie.push(ids.splice(i, 1)[0]!);
      poids.splice(i, 1);
    }
    return sortie;
  }
}

export class Partie {
  readonly cartes: Record<string, Carte>;
  readonly reserve: Reserve;
  readonly rng: Aleatoire;
  readonly camps: [Camp, Camp];
  /** Choix de l'ordinateur pendant le draft, dans l'ordre (pour l'afficher). */
  readonly choixOrdi: string[] = [];

  constructor(
    readonly donnees: Donnees,
    graine: number,
    /** Cases que l'ordinateur remplit, dans l'ordre (sa formation). */
    readonly planOrdi: { poste: string; cellule: number }[],
    readonly regles: Regles = REGLES,
    liste: Carte[] = CATALOGUE.cartes,
  ) {
    this.cartes = Object.fromEntries(liste.map((c) => [c.id, c]));
    this.reserve = new Reserve(liste);
    this.rng = new Aleatoire(graine);
    const camp = (): Camp => ({ budget: regles.budgetDepart, effectif: [], composition: [] });
    this.camps = [camp(), camp()];
  }

  carte(id: string): Carte {
    const c = this.cartes[id];
    if (!c) throw new Error(`Carte inconnue : ${id}`);
    return c;
  }

  draftFini(camp: 0 | 1): boolean {
    return this.camps[camp].composition.length >= JOUEURS_SUR_LE_TERRAIN;
  }

  /** Pièces à garder pour finir le draft (au moins 1 par titulaire restant après celui-ci). */
  aGarder(camp: 0 | 1): number {
    return Math.max(0, JOUEURS_SUR_LE_TERRAIN - this.camps[camp].composition.length - 1);
  }

  /** Une case peut-elle encore recevoir un titulaire ? Le dernier choix est le gardien s'il manque. */
  casePermise(camp: 0 | 1, poste: string, cellule: number): boolean {
    const c = this.camps[camp];
    if (this.draftFini(camp) || occupant(c.composition, poste, cellule)) return false;
    const def = this.donnees.poste(poste);
    if (cellule < 0 || cellule >= def.cases.length || nombreAuPoste(c.composition, poste) >= def.max) return false;
    const gardien = c.composition.some((p) => p.poste === "G");
    if (!gardien && c.composition.length === JOUEURS_SUR_LE_TERRAIN - 1) return poste === "G";
    return true;
  }

  /** Joueurs proposés pour un poste : tirés de la réserve, sans ceux de l'équipe ; au moins un abordable. */
  offre(camp: 0 | 1, poste: string): string[] {
    const c = this.camps[camp];
    const deja = new Set(c.effectif.map((m) => m.id));
    const ids = this.reserve.tirer(this.rng, this.regles.offreTaille, (x) => x.poste === poste, deja);
    const max = c.budget - this.aGarder(camp);
    if (!ids.some((id) => this.carte(id).prix <= max)) {
      const abordables = this.reserve.tirer(this.rng, 1, (x) => x.poste === poste && x.prix <= max, new Set([...deja, ...ids]));
      if (abordables[0]) ids[ids.length - 1] = abordables[0];
    }
    return ids;
  }

  /** Recrute un titulaire pendant le draft. */
  choisir(camp: 0 | 1, poste: string, cellule: number, id: string): Resultat {
    const c = this.camps[camp];
    const k = this.carte(id);
    if (k.poste !== poste) return { ok: false, erreur: `${k.nom} ne joue pas à ce poste.` };
    if (!this.casePermise(camp, poste, cellule)) return { ok: false, erreur: "Cette case n'est pas libre." };
    if (c.effectif.some((m) => m.id === id)) return { ok: false, erreur: `${k.nom} est déjà dans ton équipe.` };
    if (k.prix > c.budget - this.aGarder(camp)) return { ok: false, erreur: `Trop cher : garde au moins ${this.aGarder(camp)} pièce(s) pour finir ton équipe.` };
    if (this.reserve.reste(id) <= 0) return { ok: false, erreur: `Plus de copie de ${k.nom}.` };
    const r = placer(c.composition, this.donnees, id, poste, cellule);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    this.reserve.prendre(id);
    c.budget -= k.prix;
    c.effectif.push({ id, fusions: 0 });
    c.composition = r.composition;
    return { ok: true, message: `${k.nom} rejoint l'équipe.` };
  }

  /** Valeur d'une carte pour l'ordinateur : moyenne des sous-notes (gardien : d'après son prix). */
  valeur(id: string): number {
    const k = this.carte(id);
    if (!k.notes) return 52 + 6 * k.prix;
    const v = Object.values(k.notes);
    return v.reduce((s, x) => s + x, 0) / v.length;
  }

  /** L'ordinateur remplit la prochaine case de sa formation. Renvoie la carte choisie. */
  ordiChoisir(): string | null {
    const c = this.camps[1];
    const slot = this.planOrdi.find((s) => this.casePermise(1, s.poste, s.cellule));
    if (!slot) return null;
    const offre = this.offre(1, slot.poste);
    const restants = JOUEURS_SUR_LE_TERRAIN - c.composition.length;
    const max = c.budget - this.aGarder(1);
    // Part du budget visée pour ce choix, en gardant de quoi faire un banc.
    const cible = Math.max(1, (c.budget - this.regles.ordi.reserveBanc) / restants);
    const memePays = (id: string) => c.effectif.filter((m) => this.carte(m.id).pays === this.carte(id).pays).length;
    const note = (id: string) => this.valeur(id) + 1.5 * memePays(id) - 3 * Math.max(0, this.carte(id).prix - cible - 1);
    const choix = offre.filter((id) => this.carte(id).prix <= max).sort((a, b) => note(b) - note(a))[0];
    if (!choix) return null;
    const r = this.choisir(1, slot.poste, slot.cellule, choix);
    if (!r.ok) return null;
    this.choixOrdi.push(choix);
    return choix;
  }

  /** Cartes du mercato (tous postes, copies comprises). */
  tirerMercato(): string[] {
    return this.reserve.tirer(this.rng, this.regles.mercatoTaille);
  }

  /** Mercato de l'ordinateur : fusionne ses copies, puis remplit son banc ; relance si rien d'utile. */
  ordiMercato(bancMax: number, fusionsMax: number): string[] {
    const c = this.camps[1];
    const achats: string[] = [];
    let relances = 0;
    for (;;) {
      const offre = this.tirerMercato();
      let achete = false;
      for (const id of [...offre].sort((a, b) => this.valeur(b) - this.valeur(a))) {
        const k = this.carte(id);
        if (k.prix > c.budget || this.reserve.reste(id) <= 0) continue;
        const copie = c.effectif.find((m) => m.id === id);
        const banc = c.effectif.length - c.composition.length;
        if (copie ? copie.fusions >= fusionsMax : banc >= bancMax) continue;
        this.reserve.prendre(id);
        c.budget -= k.prix;
        if (copie) copie.fusions++;
        else c.effectif.push({ id, fusions: 0 });
        achats.push(id);
        achete = true;
      }
      const banc = c.effectif.length - c.composition.length;
      if (achete || banc >= bancMax || relances >= this.regles.ordi.relancesMax || c.budget < this.regles.relanceCout + 1) break;
      c.budget -= this.regles.relanceCout;
      relances++;
    }
    return achats;
  }

  /** Équipe de l'ordinateur pour le match (notes avec le bonus de fusion). */
  equipeOrdi(nom = "Ordinateur"): Equipe {
    const c = this.camps[1];
    return {
      nom,
      nationalite: "Ordinateur",
      joueurs: c.effectif.map((m) => {
        const k = this.carte(m.id);
        return { id: k.id, nom: k.nom, postes: [k.poste], style: k.style, notes: notesFusionnees(k.notes, m.fusions, this.regles.bonusFusionParNiveau) };
      }),
      composition: c.composition.map((p) => ({ ...p })),
      tactique: "EQU",
    };
  }
}
