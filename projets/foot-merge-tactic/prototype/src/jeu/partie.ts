// Une partie (13/11) : draft des 11 titulaires, premier mercato pour le banc,
// puis un championnat (13/11 : 4 équipes, toi et 3 ordinateurs). Toutes les
// équipes piochent dans la même réserve de cartes, à copies limitées ; les
// ordinateurs suivent les mêmes règles, avec le même budget. Indépendant de l'affichage : testable sans navigateur.
// Règles : data/partie.json ; cartes : data/cartes.json.

import cartesBrut from "../data/cartes.json";
import influencesBrut from "../data/influences.json";
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
  ordi: { reserveBanc: number; relancesMax: number; valeurFusion: number };
  /** Équipe automatique (14/11) : voir partie.json. */
  auto: {
    bancMin: number;
    restarts: number;
    ecartMax: number;
    styleJoueur: number;
    palierStyle: number;
    palierStyleFort: number;
    cohesionParJoueur: number;
    tradition: number;
    valeurFusion: number;
    prixMoyenne: [number, number];
    prixBancMoyenne: [number, number];
  };
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

/** Qualité de l'équipe automatique (14/11). */
export type QualiteAuto = "haute" | "moyenne";

/** Bilan d'une équipe automatique, pour le message affiché. */
export interface BilanAuto {
  moyenne: number;
  depense: number;
  banc: number;
  fusions: number;
  paliers: string[];
}

const PALIERS = influencesBrut as unknown as { palier: number; palierFort: number; pays: { palier: number; palierFort: number } };

/** Cartes encore dans la réserve qui passent le filtre. */
function idsDisponibles(p: Partie, filtre: (k: Carte) => boolean): string[] {
  return Object.values(p.cartes).filter((k) => filtre(k) && p.reserve.reste(k.id) > 0).map((k) => k.id);
}

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

  /** Valeur estimée d'un onze (titulaires), bonus cachés compris (14/11) :
   *  moyenne des notes de chacun, style, paliers de style et de pays. */
  valeurOnze(ids: string[]): number {
    const a = this.regles.auto;
    let v = 0;
    const styles = new Map<string, number>();
    const pays = new Map<string, number>();
    for (const id of ids) {
      const k = this.carte(id);
      v += this.valeur(id);
      if (k.style) {
        v += a.styleJoueur;
        styles.set(k.style, (styles.get(k.style) ?? 0) + 1);
      }
      pays.set(k.pays, (pays.get(k.pays) ?? 0) + 1);
    }
    for (const n of styles.values()) v += (n >= PALIERS.palier ? a.palierStyle : 0) + (n >= PALIERS.palierFort ? a.palierStyleFort : 0);
    for (const n of pays.values()) v += (n >= PALIERS.pays.palier ? a.cohesionParJoueur * n : 0) + (n >= PALIERS.pays.palierFort ? a.tradition : 0);
    return v;
  }

  /** Équipe automatique d'un camp, au début de la partie (14/11, demande du
   *  concepteur : « optimisé de haute qualité » ou « qualité moyenne, pas nul »).
   *  Titulaires dans la formation de l'ordinateur, banc, fusions (haute qualité). */
  equipeAuto(camp: number, qualite: QualiteAuto, bancMax: number, fusionsMax: number): BilanAuto {
    const a = this.regles.auto;
    const c = this.camps[camp]!;
    const slots = this.planOrdi;
    const candidats = slots.map((s) => idsDisponibles(this, (k) => k.poste === s.poste));
    const prix = (ids: string[]) => ids.reduce((t, id) => t + this.carte(id).prix, 0);
    let onze: string[];
    if (qualite === "haute") {
      const budget = c.budget - a.bancMin;
      // Goûts du jour : un petit écart au hasard sur chaque carte (± ecartMax / 2),
      // pour que deux équipes auto ne soient pas toujours les mêmes, toutes très bonnes.
      const gout = new Map(Object.keys(this.cartes).map((id) => [id, this.rng.entre(-a.ecartMax / 2, a.ecartMax / 2)]));
      const note = (ids: string[]) => this.valeurOnze(ids) + ids.reduce((t, id) => t + gout.get(id)!, 0);
      const trouvees: { ids: string[]; v: number }[] = [];
      for (let r = 0; r < a.restarts; r++) {
        // Départ au hasard, abordable : des cartes à 1 ou 2 pièces, parfois tournées vers un pays.
        const paysVise = this.rng.suivant() < 0.5 ? Object.keys(CATALOGUE.pays)[this.rng.entier(Object.keys(CATALOGUE.pays).length)] : null;
        const ids: string[] = [];
        for (const liste of candidats) {
          const libres = liste.filter((id) => !ids.includes(id));
          const pays = libres.filter((id) => this.carte(id).pays === paysVise && this.carte(id).prix <= 3);
          const bon = libres.filter((id) => this.carte(id).prix <= 2);
          const choix = pays.length ? pays : bon.length ? bon : libres;
          ids.push(choix[this.rng.entier(choix.length)]!);
        }
        if (prix(ids) > budget) continue;
        // Amélioration case par case tant qu'on gagne quelque chose.
        let v = note(ids);
        for (let passe = 0, mieux = true; mieux && passe < 8; passe++) {
          mieux = false;
          for (let i = 0; i < ids.length; i++) {
            for (const id of candidats[i]!) {
              if (id === ids[i] || ids.includes(id)) continue;
              const essai = ids.slice();
              essai[i] = id;
              if (prix(essai) > budget) continue;
              const ve = note(essai);
              if (ve > v + 1e-9) {
                ids[i] = id;
                v = ve;
                mieux = true;
              }
            }
          }
        }
        if (!trouvees.some((t) => t.ids.join() === ids.join())) trouvees.push({ ids, v });
      }
      trouvees.sort((x, y) => y.v - x.v);
      onze = trouvees[0]!.ids;
    } else {
      onze = [];
      for (const liste of candidats) {
        const libres = liste.filter((id) => !onze.includes(id));
        const moyens = libres.filter((id) => this.carte(id).prix >= a.prixMoyenne[0] && this.carte(id).prix <= a.prixMoyenne[1]);
        const choix = moyens.length ? moyens : libres;
        onze.push(choix[this.rng.entier(choix.length)]!);
      }
    }
    // Titulaires : par les règles du draft (budget, cases, gardien en dernier).
    slots.forEach((s, i) => {
      const r = this.choisir(camp, s.poste, s.cellule, onze[i]!);
      if (!r.ok) throw new Error(`Équipe auto : ${r.erreur}`);
    });
    // Banc : un défenseur, un milieu, un attaquant (puis d'autres), les meilleurs au prix visé.
    const lignes = [["DC", "DG", "DD"], ["MC"], ["AG", "AD", "BU"]];
    const [pMin, pMax] = qualite === "haute" ? [1, 1] : a.prixBancMoyenne;
    let banc = 0;
    for (let i = 0; i < a.bancMin && banc < bancMax; i++) {
      const ligne = lignes[i % lignes.length]!;
      const possibles = idsDisponibles(this, (k) => ligne.includes(k.poste) && k.prix >= pMin && k.prix <= pMax && k.prix <= c.budget).filter((id) => !c.effectif.some((m) => m.id === id));
      if (!possibles.length) continue;
      const id = qualite === "haute" ? possibles.sort((x, y) => this.valeur(y) - this.valeur(x))[0]! : possibles[this.rng.entier(possibles.length)]!;
      this.reserve.prendre(id);
      c.budget -= this.carte(id).prix;
      c.effectif.push({ id, fusions: 0 });
      banc++;
    }
    // Haute qualité : le reste en fusions de titulaires (+ valeurFusion caché par niveau, le plus rentable d'abord).
    let fusions = 0;
    if (qualite === "haute") {
      for (;;) {
        const options = c.effectif
          .filter((m) => c.composition.some((p) => p.joueurId === m.id) && m.fusions < fusionsMax && this.reserve.reste(m.id) > 0 && this.carte(m.id).prix <= c.budget)
          .sort((x, y) => a.valeurFusion / this.carte(y.id).prix - a.valeurFusion / this.carte(x.id).prix || this.valeur(y.id) - this.valeur(x.id));
        const m = options[0];
        if (!m) break;
        this.reserve.prendre(m.id);
        c.budget -= this.carte(m.id).prix;
        m.fusions++;
        fusions++;
      }
    }
    // Bilan.
    const paliers: string[] = [];
    const compte = (cle: (id: string) => string | null) => {
      const n = new Map<string, number>();
      for (const id of onze) {
        const k = cle(id);
        if (k) n.set(k, (n.get(k) ?? 0) + 1);
      }
      return n;
    };
    for (const [p, n] of compte((id) => this.carte(id).pays)) if (n >= PALIERS.pays.palier) paliers.push(`${CATALOGUE.pays[p]?.nom ?? p} ×${n}`);
    for (const [st, n] of compte((id) => this.carte(id).style)) if (n >= PALIERS.palier) paliers.push(`${st} ×${n}`);
    return {
      moyenne: onze.reduce((t, id) => t + this.valeur(id), 0) / onze.length,
      depense: this.regles.budgetDepart - c.budget,
      banc,
      fusions,
      paliers,
    };
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
    this.ordiTitulaires(camp);
    return achats;
  }

  /** L'ordinateur fait entrer un remplaçant plus fort qu'un titulaire du même
   *  poste (14/11 : ses joueurs fusionnés restaient sur le banc). */
  ordiTitulaires(camp: number): void {
    const c = this.camps[camp]!;
    const force = (m: Membre) => this.valeur(m.id) + this.regles.ordi.valeurFusion * m.fusions;
    const remplacants = () => c.effectif.filter((m) => !c.composition.some((p) => p.joueurId === m.id));
    for (const r of remplacants().sort((a, b) => force(b) - force(a))) {
      const poste = this.carte(r.id).poste;
      let pire: Placement | null = null;
      for (const p of c.composition) {
        if (p.poste !== poste) continue;
        const m = c.effectif.find((x) => x.id === p.joueurId)!;
        if (!pire || force(m) < force(c.effectif.find((x) => x.id === pire!.joueurId)!)) pire = p;
      }
      const sortant = pire;
      if (sortant && force(r) > force(c.effectif.find((x) => x.id === sortant.joueurId)!)) {
        c.composition = c.composition.map((p) => (p === sortant ? { ...p, joueurId: r.id } : p));
      }
    }
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
