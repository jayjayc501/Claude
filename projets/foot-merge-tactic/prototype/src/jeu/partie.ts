// Une partie (13/11) : draft des 11 titulaires, premier mercato pour le banc,
// puis un championnat (13/11 : 4 équipes, toi et 3 ordinateurs). Toutes les
// équipes piochent dans la même réserve de cartes, à copies limitées ; les
// ordinateurs suivent les mêmes règles, avec le même budget. Indépendant de l'affichage : testable sans navigateur.
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
  /** Championnat : noms des équipes de l'ordinateur, pièces gagnées à chaque journée. */
  nomsOrdis: string[];
  gainParJournee: number;
  allerRetour: boolean;
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

const TACTIQUES_ORDIS = ["EQU", "PRS", "CON", "TIK"];

export const REGLES = reglesBrut as unknown as Regles;
export const CATALOGUE = cartesBrut as unknown as { pays: Record<string, { nom: string; couleur: string }>; cartes: Carte[] };


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
  tirer(rng: Aleatoire, n: number, filtre: (c: Carte) => boolean = () => true, exclure: Set<string> = new Set(), uniforme = false): string[] {
    const ids = this.cartes.filter((c) => filtre(c) && !exclure.has(c.id) && this.reste(c.id) > 0).map((c) => c.id);
    // Mercato : chaque copie a sa chance (les cartes bon marché tombent plus).
    // Draft (uniforme) : chaque joueur a la même chance, pour voir tous les prix.
    const poids = ids.map((id) => (uniforme ? 1 : this.reste(id)));
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
  /** camps[0] : toi ; camps[1..] : les ordinateurs. */
  readonly camps: Camp[];
  readonly noms: string[];
  /** Choix des ordinateurs pendant le draft, dans l'ordre (pour l'afficher). */
  readonly choixOrdi: { camp: number; id: string }[] = [];

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
    this.noms = ["Toi", ...regles.nomsOrdis];
    this.camps = this.noms.map(camp);
  }

  carte(id: string): Carte {
    const c = this.cartes[id];
    if (!c) throw new Error(`Carte inconnue : ${id}`);
    return c;
  }

  draftFini(camp: number): boolean {
    return this.camps[camp]!.composition.length >= JOUEURS_SUR_LE_TERRAIN;
  }

  /** Pièces à garder pour finir le draft (au moins 1 par titulaire restant après celui-ci). */
  aGarder(camp: number): number {
    return Math.max(0, JOUEURS_SUR_LE_TERRAIN - this.camps[camp]!.composition.length - 1);
  }

  /** Une case peut-elle encore recevoir un titulaire ? Le dernier choix est le gardien s'il manque. */
  casePermise(camp: number, poste: string, cellule: number): boolean {
    const c = this.camps[camp]!;
    if (this.draftFini(camp) || occupant(c.composition, poste, cellule)) return false;
    const def = this.donnees.poste(poste);
    if (cellule < 0 || cellule >= def.cases.length || nombreAuPoste(c.composition, poste) >= def.max) return false;
    const gardien = c.composition.some((p) => p.poste === "G");
    if (!gardien && c.composition.length === JOUEURS_SUR_LE_TERRAIN - 1) return poste === "G";
    return true;
  }

  /** Joueurs proposés pour un poste : tirés de la réserve, sans ceux de l'équipe ; au moins un abordable. */
  offre(camp: number, poste: string): string[] {
    const c = this.camps[camp]!;
    const deja = new Set(c.effectif.map((m) => m.id));
    // 13/11 (« les prix de 1 à 3, c'est pas terrible ») : tous les joueurs du poste
    // ont la même chance, et l'offre montre une vedette (4 ou 5 pièces) s'il en reste.
    const ids = this.reserve.tirer(this.rng, this.regles.offreTaille, (x) => x.poste === poste, deja, true);
    if (!ids.some((id) => this.carte(id).prix >= 4)) {
      const vedette = this.reserve.tirer(this.rng, 1, (x) => x.poste === poste && x.prix >= 4, new Set([...deja, ...ids]), true);
      if (vedette[0] && ids.length) ids[0] = vedette[0];
    }
    const max = c.budget - this.aGarder(camp);
    if (!ids.some((id) => this.carte(id).prix <= max)) {
      const abordables = this.reserve.tirer(this.rng, 1, (x) => x.poste === poste && x.prix <= max, new Set([...deja, ...ids]), true);
      if (abordables[0]) ids[ids.length - 1] = abordables[0];
    }
    return ids;
  }

  /** Recrute un titulaire pendant le draft. */
  choisir(camp: number, poste: string, cellule: number, id: string): Resultat {
    const c = this.camps[camp]!;
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
  ordiChoisir(camp = 1): string | null {
    const c = this.camps[camp]!;
    const slot = this.planOrdi.find((s) => this.casePermise(camp, s.poste, s.cellule));
    if (!slot) return null;
    const offre = this.offre(camp, slot.poste);
    const restants = JOUEURS_SUR_LE_TERRAIN - c.composition.length;
    const max = c.budget - this.aGarder(camp);
    // Part du budget visée pour ce choix, en gardant de quoi faire un banc.
    const cible = Math.max(1, (c.budget - this.regles.ordi.reserveBanc) / restants);
    const memePays = (id: string) => c.effectif.filter((m) => this.carte(m.id).pays === this.carte(id).pays).length;
    const note = (id: string) => this.valeur(id) + 1.5 * memePays(id) - 5 * Math.max(0, this.carte(id).prix - cible - 1);
    // 13/11 : avec une vedette dans chaque offre, l'ordinateur dépensait tout au draft
    // et n'avait plus de banc. Il garde sa réserve pour le banc tant qu'il le peut.
    const tri = (ids: string[]) => ids.sort((a, b) => note(b) - note(a))[0];
    const plafond = Math.min(max - this.regles.ordi.reserveBanc, Math.floor(cible + 0.8));
    const choix = tri(offre.filter((id) => this.carte(id).prix <= plafond)) ?? tri(offre.filter((id) => this.carte(id).prix <= max));
    if (!choix) return null;
    const r = this.choisir(camp, slot.poste, slot.cellule, choix);
    if (!r.ok) return null;
    this.choixOrdi.push({ camp, id: choix });
    return choix;
  }

  /** Chaque ordinateur fait un choix de draft (après le tien). */
  ordisChoisissent(): { camp: number; id: string }[] {
    const faits: { camp: number; id: string }[] = [];
    for (let c = 1; c < this.camps.length; c++) {
      const id = this.ordiChoisir(c);
      if (id) faits.push({ camp: c, id });
    }
    return faits;
  }

  /** Fin du draft : les ordinateurs finissent leur équipe puis font leur premier mercato. */
  finirDraftOrdis(bancMax: number, fusionsMax: number): void {
    for (let c = 1; c < this.camps.length; c++) {
      while (!this.draftFini(c) && this.ordiChoisir(c));
      this.ordiMercato(bancMax, fusionsMax, c);
    }
  }

  /** Journée suivante du championnat : chaque équipe gagne des pièces, les ordinateurs font leur mercato. */
  nouvelleJournee(bancMax: number, fusionsMax: number): void {
    for (const c of this.camps) c.budget += this.regles.gainParJournee;
    for (let c = 1; c < this.camps.length; c++) this.ordiMercato(bancMax, fusionsMax, c);
  }

  /** Cartes du mercato (tous postes, copies comprises). */
  tirerMercato(): string[] {
    return this.reserve.tirer(this.rng, this.regles.mercatoTaille);
  }

  /** Mercato de l'ordinateur : fusionne ses copies, puis remplit son banc ; relance si rien d'utile. */
  ordiMercato(bancMax: number, fusionsMax: number, camp = 1): string[] {
    const c = this.camps[camp]!;
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
  equipeOrdi(nom = "Ordinateur", camp = 1): Equipe {
    return this.equipeDe(camp, nom);
  }

  /** Équipe d'un camp pour un match : notes de la carte, pays et fusions (14/11 :
   *  le boost de match des fusions est appliqué par le moteur, sans toucher aux notes). */
  equipeDe(camp: number, nom = this.noms[camp] ?? "Ordinateur"): Equipe {
    const c = this.camps[camp]!;
    return {
      nom,
      nationalite: nom,
      joueurs: c.effectif.map((m) => {
        const k = this.carte(m.id);
        return { id: k.id, nom: k.nom, postes: [k.poste], style: k.style, notes: k.notes, pays: k.pays, fusions: m.fusions };
      }),
      composition: c.composition.map((p) => ({ ...p })),
      // Chaque ordinateur a sa tactique (13/11), pour des adversaires différents.
      tactique: TACTIQUES_ORDIS[camp % TACTIQUES_ORDIS.length] ?? "EQU",
    };
  }
}
