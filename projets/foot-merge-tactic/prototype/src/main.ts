// Point d'entrée de la page : deux écrans, placement et match. On peut
// choisir la forme des cases du plateau (hexagones ou carrés) : la
// composition suit, chaque joueur prend la case la plus proche de son poste.

import { chargerDonnees, chargerEquipes, chargerReglages } from "./sim/chargement";
import type { Donnees } from "./sim/donnees";
import { convertirComposition } from "./sim/placement";
import type { Equipe, Placement } from "./sim/types";
import { html } from "./ui/dom";
import { EcranMatch } from "./ui/ecranMatch";
import { EcranPlacement, type EtatPlacement } from "./ui/ecranPlacement";

const CLE_STOCKAGE = "foot-merge-tactic.composition.v3"; // v3 : plateau au choix
const CLE_ANCIENNE = "foot-merge-tactic.composition.v2"; // ancien découpage = plateau des carrés

interface Sauvegarde {
  plateau: string;
  composition: Placement[];
}

function lire(): Sauvegarde | null {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) return JSON.parse(brut) as Sauvegarde;
    const ancienne = localStorage.getItem(CLE_ANCIENNE);
    if (ancienne) return { plateau: "carres", composition: JSON.parse(ancienne) as Placement[] };
  } catch {
    // stockage indisponible ou illisible : composition par défaut
  }
  return null;
}

function ecrire(s: Sauvegarde): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(s));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

/** Composition enregistrée, convertie pour `donnees` ; null si elle ne correspond plus aux données. */
function compositionValide(s: Sauvegarde, donnees: Donnees, effectif: Equipe): Placement[] | null {
  try {
    const source = chargerDonnees(s.plateau);
    for (const p of s.composition) source.cellule(p.poste, p.cellule);
    if (!s.composition.every((p) => effectif.joueurs.some((j) => j.id === p.joueurId))) return null;
    return convertirComposition(s.composition, source, donnees);
  } catch {
    return null;
  }
}

function demarrer(): void {
  const reglages = chargerReglages();
  const sauvegarde = lire();
  let donnees = (() => {
    try {
      return chargerDonnees(sauvegarde?.plateau);
    } catch {
      return chargerDonnees();
    }
  })();
  let { effectif, adversaire } = chargerEquipes(donnees);

  const etat: EtatPlacement = {
    composition: (sauvegarde && compositionValide(sauvegarde, donnees, effectif)) ?? effectif.composition,
    joueurChoisi: null,
    message: "",
    messageErreur: false,
  };
  const enregistrer = () => ecrire({ plateau: donnees.plateauId, composition: etat.composition });
  const equipes = (): [Equipe, Equipe] => [{ ...effectif, composition: etat.composition }, adversaire];

  const app = document.getElementById("app")!;
  const entete = html("header", { class: "entete" }, app);
  html("h1", {}, entete, "Prototype 1 · placement et blocs");
  const onglets = html("nav", { class: "onglets" }, entete);
  const ongletPlacement = html("button", { type: "button", class: "onglet onglet-actif" }, onglets, "Placement");
  const ongletMatch = html("button", { type: "button", class: "onglet" }, onglets, "Match");
  const contenu = html("main", {}, app);

  let match: EcranMatch;
  let placement: EcranPlacement;
  const construireEcrans = () => {
    match = new EcranMatch(donnees, reglages, equipes);
    placement = new EcranPlacement(donnees, effectif, etat, () => enregistrer(), (id) => changerPlateau(id));
  };

  function changerPlateau(id: string): void {
    const nouvelles = chargerDonnees(id);
    etat.composition = convertirComposition(etat.composition, donnees, nouvelles);
    donnees = nouvelles;
    ({ effectif, adversaire } = chargerEquipes(donnees));
    etat.joueurChoisi = null;
    etat.message = `Plateau en ${donnees.plateau.nom.toLowerCase()} : chaque joueur a gardé son poste, sur la case la plus proche.`;
    etat.messageErreur = false;
    enregistrer();
    construireEcrans();
    montrer("placement");
  }

  function montrer(ecran: "placement" | "match"): void {
    ongletPlacement.classList.toggle("onglet-actif", ecran === "placement");
    ongletMatch.classList.toggle("onglet-actif", ecran === "match");
    if (ecran === "match") {
      if (etat.composition.length !== 11) {
        etat.message = "Il faut 11 joueurs sur le terrain avant de voir le match.";
        etat.messageErreur = true;
        placement.rendre();
        montrer("placement");
        return;
      }
      contenu.replaceChildren(match.racine);
      match.ouvrir();
    } else {
      match.fermer();
      placement.rendre();
      contenu.replaceChildren(placement.racine);
    }
    window.scrollTo({ top: 0 });
  }

  construireEcrans();
  ongletPlacement.addEventListener("click", () => montrer("placement"));
  ongletMatch.addEventListener("click", () => montrer("match"));
  montrer("placement");
}

demarrer();
