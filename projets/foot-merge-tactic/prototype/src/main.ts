// Point d'entrée de la page : deux écrans, placement et match.

import { chargerDonnees, chargerEquipes, chargerReglages } from "./sim/chargement";
import type { Equipe, Placement } from "./sim/types";
import { html } from "./ui/dom";
import { EcranMatch } from "./ui/ecranMatch";
import { EcranPlacement, type EtatPlacement } from "./ui/ecranPlacement";

const CLE_STOCKAGE = "foot-merge-tactic.composition.v1";

function lireComposition(defaut: Placement[]): Placement[] {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) return JSON.parse(brut) as Placement[];
  } catch {
    // stockage indisponible : on garde la composition par défaut
  }
  return defaut;
}

function ecrireComposition(c: Placement[]): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(c));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

function demarrer(): void {
  const donnees = chargerDonnees();
  const reglages = chargerReglages();
  const { effectif, adversaire } = chargerEquipes();

  const etat: EtatPlacement = {
    composition: lireComposition(effectif.composition),
    joueurChoisi: null,
    posteAffiche: "DC",
    message: "Choisissez un joueur, puis une case de son poste.",
    messageErreur: false,
  };
  // Une composition enregistrée qui ne correspond plus aux données est ignorée.
  try {
    for (const p of etat.composition) donnees.cellule(p.poste, p.cellule);
    if (!etat.composition.every((p) => effectif.joueurs.some((j) => j.id === p.joueurId))) throw new Error();
  } catch {
    etat.composition = effectif.composition;
  }

  const equipes = (): [Equipe, Equipe] => [{ ...effectif, composition: etat.composition }, adversaire];

  const app = document.getElementById("app")!;
  const entete = html("header", { class: "entete" }, app);
  html("h1", {}, entete, "Prototype 1 · placement et blocs");
  const onglets = html("nav", { class: "onglets" }, entete);
  const ongletPlacement = html("button", { type: "button", class: "onglet onglet-actif" }, onglets, "Placement");
  const ongletMatch = html("button", { type: "button", class: "onglet" }, onglets, "Match");
  const contenu = html("main", {}, app);

  const match = new EcranMatch(donnees, reglages, equipes);
  const placement = new EcranPlacement(
    donnees,
    effectif,
    etat,
    (c) => ecrireComposition(c),
    () => montrer("match"),
  );

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

  ongletPlacement.addEventListener("click", () => montrer("placement"));
  ongletMatch.addEventListener("click", () => montrer("match"));
  montrer("placement");
}

demarrer();
