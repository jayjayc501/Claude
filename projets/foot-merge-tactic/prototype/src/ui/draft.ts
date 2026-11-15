// Draft (13/11), commun au championnat et au 1 contre 1 (15/11) : toucher une
// case libre ouvre les joueurs proposés pour ce poste ; un toucher en recrute un.

import { CATALOGUE, type Partie } from "../jeu/partie";
import { notesAffichees } from "../sim/notes";
import { BUSTES } from "./bustes";
import type { EcranPreparation } from "./ecranPreparation";
import { ouvrirFiche } from "./fiche";
import { ouvrirOffre } from "./offreDraft";
import { type Preparation, libellePoste } from "./preparation";

const NOMS_POSTE: Record<string, string> = { G: "gardien", DC: "défenseur central", DG: "latéral gauche", DD: "latéral droit", MC: "milieu", AG: "ailier gauche", AD: "ailier droit", AC: "buteur" };

/** Fiche d'une carte du catalogue. */
export function voirFicheCarte(partie: Partie, prepa: Preparation, id: string): void {
  const k = partie.carte(id);
  const p = CATALOGUE.pays[k.pays]!;
  ouvrirFiche({ id, nom: k.nom, pays: { code: k.pays, nom: p.nom, couleur: p.couleur }, poste: k.poste, style: k.style ? { code: k.style, nom: prepa.d.styles[k.style] ?? k.style } : null, notes: k.notes, fusions: 0 });
}

/** Ouvre l'offre du draft pour une case. Les joueurs proposés restent les mêmes
 *  jusqu'au choix suivant (`offres`), fermer la fenêtre ne relance pas le tirage.
 *  `choisi` reçoit le message du recrutement réussi (la suite dépend du mode). */
export function ouvrirCaseDraft(o: { partie: Partie; prepa: Preparation; preparation: EcranPreparation; offres: Map<string, string[]>; poste: string; cellule: number; choisi: (message: string) => void }): void {
  const { partie, prepa, preparation, offres, poste, cellule } = o;
  const ids = offres.get(poste) ?? partie.offre(0, poste);
  offres.set(poste, ids);
  const max = partie.camps[0]!.budget - partie.aGarder(0);
  ouvrirOffre({
    titre: `Choisis ton ${NOMS_POSTE[poste] ?? libellePoste(poste)}`,
    sousTitre: `Budget : ${partie.camps[0]!.budget} pièces · tu peux dépenser jusqu'à ${max} ici`,
    cartes: ids.map((id) => {
      const k = partie.carte(id);
      const p = CATALOGUE.pays[k.pays]!;
      return {
        id,
        nom: k.nom,
        pays: { code: k.pays, nom: p.nom, couleur: p.couleur },
        poste: k.poste,
        style: k.style ? { code: k.style, nom: prepa.d.styles[k.style] ?? k.style } : null,
        prix: k.prix,
        notes: notesAffichees({ id, nom: k.nom, postes: [k.poste], notes: k.notes }),
        image: BUSTES[id] ?? "",
        abordable: k.prix <= max,
        copies: partie.reserve.reste(id),
      };
    }),
    voirFiche: (id) => voirFicheCarte(partie, prepa, id),
    choisir: (id) => {
      const r = partie.choisir(0, poste, cellule, id);
      if (!r.ok) return preparation.signaler(r.erreur, true);
      offres.clear();
      o.choisi(r.message);
    },
  });
}
