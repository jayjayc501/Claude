// Point d'entrée de la page (13/11) : une partie contre l'ordinateur.
// 1. Draft des 11 titulaires (toucher une case, choisir parmi les joueurs tirés
//    au hasard), avec un budget ; l'ordinateur drafte en même temps, dans la
//    même réserve de cartes, avec le même budget.
// 2. Premier mercato pour le banc (le budget qui reste), relances, fusions.
// 3. Un match contre l'équipe de l'ordinateur.

import { CATALOGUE, Partie, REGLES } from "./jeu/partie";
import { chargerDonnees, chargerEquipes, chargerReglages } from "./sim/chargement";
import { notesAffichees } from "./sim/notes";
import type { Equipe } from "./sim/types";
import { BUSTES } from "./ui/bustes";
import { html } from "./ui/dom";
import { EcranMatch } from "./ui/ecranMatch";
import { type ControlePartie, EcranPreparation } from "./ui/ecranPreparation";
import { ouvrirFiche } from "./ui/fiche";
import { inscrireImages } from "./ui/imagesCatalogue";
import { ouvrirOffre } from "./ui/offreDraft";
import { type DonneesPrepa, type Fiche, Preparation, donneesPrepa, libellePoste } from "./ui/preparation";

const CLE_TACTIQUE = "foot-merge-tactic.tactique.v1";
const NOMS_POSTE: Record<string, string> = { G: "gardien", DC: "défenseur central", DG: "latéral gauche", DD: "latéral droit", MC: "milieu", AG: "ailier gauche", AD: "ailier droit", AC: "buteur" };

function demarrer(): void {
  const reglages = chargerReglages();
  const donnees = chargerDonnees("hexagones");
  const { adversaire } = chargerEquipes(donnees);
  inscrireImages(CATALOGUE.cartes);
  // Formation de l'ordinateur : celle de l'adversaire de démonstration, gardien en dernier.
  const planOrdi = [...adversaire.composition.filter((p) => p.poste !== "G"), ...adversaire.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));
  const deck = Object.entries(CATALOGUE.pays).map(([code, p]) => ({ code, nom: p.nom, couleur: p.couleur }));
  const fiches: Record<string, Fiche> = Object.fromEntries(CATALOGUE.cartes.map((c) => [c.id, { nom: c.nom, pays: c.pays, poste: c.poste, style: c.style, prix: c.prix, notes: c.notes }]));
  const couleurs = Object.fromEntries(deck.map((p) => [p.code, p.couleur]));

  let partie!: Partie;
  let prepa!: Preparation;
  let preparation!: EcranPreparation;
  /** Joueurs proposés par poste, gardés jusqu'au prochain choix (fermer la fenêtre ne relance pas le tirage). */
  let offres = new Map<string, string[]>();
  /** Mi-temps en cours : l'écran de préparation sert aux changements (13/11). */
  let miTemps = false;

  const app = document.getElementById("app")!;
  const entete = html("header", { class: "entete" }, app);
  const onglets = html("nav", { class: "onglets" }, entete);
  const ongletPrepa = html("button", { type: "button", class: "onglet onglet-actif" }, onglets, "Préparation");
  const ongletMatch = html("button", { type: "button", class: "onglet" }, onglets, "Match");
  const contenu = html("main", {}, app);

  const equipes = (): [Equipe, Equipe] => [{ ...prepa.equipe(), nom: "Toi", nationalite: "Toi" }, partie.equipeOrdi()];
  const match = new EcranMatch(donnees, reglages, equipes, {
    nomNous: "Toi",
    nomEux: "Ordinateur",
    changements: () => {
      miTemps = true;
      montrer("preparation");
    },
    tactiques: donneesPrepa().tactiques,
    styles: donneesPrepa().styles,
    infos: (id, camp = 0) => {
      const f = prepa.d.joueurs[id];
      if (!f) return undefined;
      // Fusions : celles de ton effectif, ou celles de l'ordinateur pour ses joueurs.
      const fusions = camp === 0 ? (prepa.membre(id)?.fusions ?? 0) : (partie.camps[1].effectif.find((m) => m.id === id)?.fusions ?? 0);
      return { couleur: couleurs[f.pays] ?? "#1F3A93", style: f.style, fusions };
    },
  });

  /** Recopie l'équipe du draft (toi) dans l'écran de préparation. */
  function synchroniser(): void {
    const c = partie.camps[0];
    prepa.etat = { ...prepa.etat, effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((p) => ({ ...p })), budget: c.budget };
  }

  function voirFiche(id: string): void {
    const k = partie.carte(id);
    const p = CATALOGUE.pays[k.pays]!;
    ouvrirFiche({ id, nom: k.nom, pays: { code: k.pays, nom: p.nom, couleur: p.couleur }, poste: k.poste, style: k.style ? { code: k.style, nom: prepa.d.styles[k.style] ?? k.style } : null, notes: k.notes, fusions: 0 });
  }

  function finDraft(): void {
    while (!partie.draftFini(1) && partie.ordiChoisir());
    prepa.etat = { ...prepa.etat, mercato: partie.tirerMercato() };
    partie.ordiMercato(prepa.d.bancMax, prepa.d.fusionsMax);
  }

  const controle: ControlePartie = {
    enDraft: () => !partie.draftFini(0),
    casePermise: (poste, cellule) => partie.casePermise(0, poste, cellule),
    aGarder: () => partie.aGarder(0),
    ouvrirCase: (poste, cellule) => {
      const ids = offres.get(poste) ?? partie.offre(0, poste);
      offres.set(poste, ids);
      const max = partie.camps[0].budget - partie.aGarder(0);
      ouvrirOffre({
        titre: `Choisis ton ${NOMS_POSTE[poste] ?? libellePoste(poste)}`,
        sousTitre: `Budget : ${partie.camps[0].budget} pièces · tu peux dépenser jusqu'à ${max} ici`,
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
        voirFiche,
        choisir: (id) => {
          const r = partie.choisir(0, poste, cellule, id);
          if (!r.ok) return preparation.signaler(r.erreur, true);
          offres = new Map();
          const o = partie.ordiChoisir();
          let message = r.message + (o ? ` L'ordinateur prend ${partie.carte(o).nom} (${libellePoste(partie.carte(o).poste)}).` : "");
          if (partie.draftFini(0)) {
            finDraft();
            message = "Draft terminé ! Complète ton banc au mercato avec ce qui te reste.";
          }
          synchroniser();
          preparation.rendre();
          preparation.signaler(message);
        },
      });
    },
    ordi: () => {
      const c = partie.camps[1];
      return {
        titulaires: c.composition.length,
        banc: c.effectif.length - c.composition.length,
        choix: [...partie.choixOrdi].reverse().map((id) => {
          const k = partie.carte(id);
          return { nom: k.nom, poste: k.poste, prix: k.prix, couleur: couleurs[k.pays] ?? "#3A4A40", pays: k.pays };
        }),
      };
    },
    miTemps: () => (miTemps ? { score: match.scoreActuel, joueur: (id) => match.infosJoueur(id) } : null),
    jouer: () => {
      if (!miTemps) return montrer("match");
      // Mi-temps : on revient au match en cours, les changements s'appliquent.
      miTemps = false;
      montrer("match", true);
      match.lancerSecondeMiTemps();
    },
    nouvelle: () => nouvellePartie(),
  };

  function nouvellePartie(): void {
    miTemps = false;
    partie = new Partie(donnees, Math.floor(Math.random() * 2 ** 31), planOrdi);
    offres = new Map();
    const d: DonneesPrepa = {
      ...donneesPrepa(),
      deck,
      joueurs: fiches,
      effectif: [],
      composition: [],
      mercato: [],
      budget: REGLES.budgetDepart,
      chrono: "",
      groupe: { nom: "Match amical", match: "Toi contre l'ordinateur", equipes: [{ nom: "Toi", points: 0, toi: true }, { nom: "Ordinateur", points: 0, prochain: true }] },
    };
    prepa = new Preparation(donnees, d);
    prepa.reserve = partie.reserve;
    prepa.tirage = () => partie.tirerMercato();
    prepa.relanceCout = REGLES.relanceCout;
    prepa.bonusFusion = REGLES.bonusFusionParNiveau;
    try {
      const t = localStorage.getItem(CLE_TACTIQUE);
      if (t) prepa.choisirTactique(t);
    } catch {
      // stockage indisponible : tactique par défaut
    }
    preparation = new EcranPreparation(
      prepa,
      () => {
        // Pendant le draft, on peut déplacer ses titulaires : la partie suit.
        if (!partie.draftFini(0)) partie.camps[0].composition = prepa.etat.composition.map((p) => ({ ...p }));
        try {
          localStorage.setItem(CLE_TACTIQUE, prepa.etat.tactique);
        } catch {
          // stockage indisponible : sans conséquence
        }
      },
      controle,
    );
    montrer("preparation");
  }

  function montrer(ecran: "preparation" | "match", reprise = miTemps): void {
    if (ecran === "match" && !prepa.pret()) {
      preparation.signaler(partie.draftFini(0) ? "Il faut 11 joueurs sur le terrain avant de jouer." : "Termine d'abord ton draft : 11 titulaires.", true);
      return;
    }
    ongletPrepa.classList.toggle("onglet-actif", ecran === "preparation");
    ongletMatch.classList.toggle("onglet-actif", ecran === "match");
    if (ecran === "match") {
      contenu.replaceChildren(match.racine);
      match.ouvrir(reprise);
    } else {
      match.fermer();
      preparation.rendre();
      contenu.replaceChildren(preparation.racine);
    }
    window.scrollTo({ top: 0 });
  }

  ongletPrepa.addEventListener("click", () => montrer("preparation"));
  ongletMatch.addEventListener("click", () => montrer("match"));
  nouvellePartie();
}

demarrer();
