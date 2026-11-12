// Point d'entrée de la page : deux écrans, préparation (maquette du 12/11) et
// match. Le plateau est celui des hexagones. L'équipe de la préparation vient
// de data/preparation.json ; l'adversaire, de data/equipes.json.

import { chargerDonnees, chargerEquipes, chargerReglages } from "./sim/chargement";
import type { Equipe, Placement } from "./sim/types";
import { html } from "./ui/dom";
import { EcranMatch } from "./ui/ecranMatch";
import { EcranPreparation } from "./ui/ecranPreparation";
import { Preparation } from "./ui/preparation";

const CLE_STOCKAGE = "foot-merge-tactic.preparation.v1";
const CLE_TACTIQUE = "foot-merge-tactic.tactique.v1";

function lire(): Placement[] | null {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    return brut ? (JSON.parse(brut) as Placement[]) : null;
  } catch {
    return null;
  }
}

function ecrire(composition: Placement[]): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(composition));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

/** Composition enregistrée encore valable pour l'effectif de départ (les achats ne sont pas gardés). */
function compositionValide(prepa: Preparation, composition: Placement[]): boolean {
  try {
    if (!Array.isArray(composition) || composition.length > 11) return false;
    const cases = new Set<string>();
    for (const p of composition) {
      prepa.donnees.cellule(p.poste, p.cellule);
      if (!prepa.membre(p.joueurId) || prepa.fiche(p.joueurId).poste !== p.poste) return false;
      if (p.poste === "G" && p.cellule !== 0) return false;
      cases.add(`${p.poste}:${p.cellule}`);
    }
    const joueurs = new Set(composition.map((p) => p.joueurId));
    return cases.size === composition.length && joueurs.size === composition.length && prepa.etat.effectif.length - composition.length <= prepa.d.bancMax;
  } catch {
    return false;
  }
}

function demarrer(): void {
  const reglages = chargerReglages();
  const donnees = chargerDonnees("hexagones");
  const { adversaire } = chargerEquipes(donnees);
  const prepa = new Preparation(donnees);
  const sauvee = lire();
  if (sauvee && compositionValide(prepa, sauvee)) prepa.etat.composition = sauvee;
  try {
    const t = localStorage.getItem(CLE_TACTIQUE);
    if (t) prepa.choisirTactique(t);
  } catch {
    // stockage indisponible : tactique par défaut
  }
  const equipes = (): [Equipe, Equipe] => [{ ...prepa.equipe(), nationalite: prepa.d.deck.map((p) => p.code).join(" · ") }, adversaire];

  const app = document.getElementById("app")!;
  const entete = html("header", { class: "entete" }, app);
  const onglets = html("nav", { class: "onglets" }, entete);
  const ongletPrepa = html("button", { type: "button", class: "onglet onglet-actif" }, onglets, "Préparation");
  const ongletMatch = html("button", { type: "button", class: "onglet" }, onglets, "Match");
  const contenu = html("main", {}, app);

  const couleurs = Object.fromEntries(prepa.d.deck.map((p) => [p.code, p.couleur]));
  const match = new EcranMatch(donnees, reglages, equipes, {
    nomNous: prepa.d.groupe.equipes.find((e) => e.toi)?.nom ?? "Toi",
    nomEux: prepa.d.groupe.equipes.find((e) => e.prochain)?.nom ?? adversaire.nom,
    tactiques: prepa.d.tactiques,
    styles: prepa.d.styles,
    infos: (id) => {
      const f = prepa.d.joueurs[id];
      return f ? { couleur: couleurs[f.pays] ?? "#1F3A93", style: f.style, fusions: prepa.membre(id)?.fusions ?? 0 } : undefined;
    },
  });
  const preparation = new EcranPreparation(prepa, () => {
    ecrire(prepa.etat.composition);
    try {
      localStorage.setItem(CLE_TACTIQUE, prepa.etat.tactique);
    } catch {
      // stockage indisponible : sans conséquence
    }
  });

  function montrer(ecran: "preparation" | "match"): void {
    if (ecran === "match" && !prepa.pret()) {
      preparation.signaler("Il faut 11 joueurs sur le terrain avant de voir le match.", true);
      return;
    }
    ongletPrepa.classList.toggle("onglet-actif", ecran === "preparation");
    ongletMatch.classList.toggle("onglet-actif", ecran === "match");
    if (ecran === "match") {
      contenu.replaceChildren(match.racine);
      match.ouvrir();
    } else {
      match.fermer();
      preparation.rendre();
      contenu.replaceChildren(preparation.racine);
    }
    window.scrollTo({ top: 0 });
  }

  ongletPrepa.addEventListener("click", () => montrer("preparation"));
  ongletMatch.addEventListener("click", () => montrer("match"));
  montrer("preparation");
}

demarrer();
