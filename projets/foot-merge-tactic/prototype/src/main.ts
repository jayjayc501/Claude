// Point d'entrée de la page (13/11) : un championnat contre 3 ordinateurs.
// 1. Draft des 11 titulaires (toucher une case, choisir parmi les joueurs tirés
//    au hasard), avec un budget ; les ordinateurs draftent en même temps, dans
//    la même réserve de cartes, avec le même budget.
// 2. Premier mercato pour le banc (le budget qui reste), relances, fusions.
// 3. Championnat de 4 équipes : à chaque journée, ton match (regardé), l'autre
//    match (simulé), le classement, puis un mercato avec les pièces gagnées.

import { Championnat, jouerMatch } from "./jeu/championnat";
import { GrainesLocales } from "./jeu/graines";
import { ArbitreLocal } from "./match/arbitreLocal";
import { CATALOGUE, Partie, REGLES } from "./jeu/partie";
import { chargerDonnees, chargerEquipes, chargerReglages } from "./sim/chargement";
import { chargerInfluences } from "./sim/influences";
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
  // Toutes les graines viennent d'ici (13/11 au soir) ; plus tard, d'un serveur.
  const graines = new GrainesLocales();
  const { adversaire: adversaireDemo } = chargerEquipes(donnees);
  inscrireImages(CATALOGUE.cartes);
  // Formation de l'ordinateur : celle de l'adversaire de démonstration, gardien en dernier.
  const planOrdi = [...adversaireDemo.composition.filter((p) => p.poste !== "G"), ...adversaireDemo.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));
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
  let championnat!: Championnat;
  /** Résultats de la dernière journée jouée (affichés sous le classement). */
  let resultats: string[] = [];
  const adversaire = (): number => championnat.adversaire(0) ?? 1;

  const app = document.getElementById("app")!;
  const entete = html("header", { class: "entete" }, app);
  const onglets = html("nav", { class: "onglets" }, entete);
  const ongletPrepa = html("button", { type: "button", class: "onglet onglet-actif" }, onglets, "Préparation");
  const ongletMatch = html("button", { type: "button", class: "onglet" }, onglets, "Match");
  const contenu = html("main", {}, app);

  const equipes = (): [Equipe, Equipe] => [{ ...prepa.equipe(), nom: "Toi", nationalite: "Toi" }, partie.equipeDe(adversaire())];
  const habillage = {
    nomNous: "Toi",
    nomEux: "Ordinateur",
    changements: () => {
      miTemps = true;
      montrer("preparation");
    },
    finMatch: (score: [number, number]) => finJournee(score),
    tactiques: donneesPrepa().tactiques,
    styles: donneesPrepa().styles,
    infos: (id: string, camp: 0 | 1 = 0) => {
      const f = prepa.d.joueurs[id];
      if (!f) return undefined;
      // Fusions : celles de ton effectif, ou celles de l'ordinateur pour ses joueurs.
      const fusions = camp === 0 ? (prepa.membre(id)?.fusions ?? 0) : (partie.camps[adversaire()]!.effectif.find((m) => m.id === id)?.fusions ?? 0);
      return { couleur: couleurs[f.pays] ?? "#1F3A93", style: f.style, fusions };
    },
  };
  // Le match est calculé par l'arbitre (13/11 au soir) : sur le téléphone aujourd'hui, par un serveur plus tard.
  const match = new EcranMatch(donnees, reglages, equipes, habillage, graines, new ArbitreLocal(donnees, reglages));

  /** Fin de ton match : l'autre match de la journée est simulé, le classement avance,
   *  chacun gagne ses pièces et les ordinateurs font leur mercato (13/11). */
  function finJournee(score: [number, number]): void {
    const adv = adversaire();
    championnat.enregistrer(0, adv, score);
    for (const r of championnat.rencontres) {
      if (r.score) continue;
      r.score = jouerMatch(donnees, reglages, [partie.equipeDe(r.a), partie.equipeDe(r.b)], graines.matchSimule(championnat.journee, r.a));
    }
    resultats = championnat.rencontres.map((r) => `${partie.noms[r.a]} ${r.score![0]}–${r.score![1]} ${partie.noms[r.b]}`);
    championnat.suivante();
    let message = `Journée finie : ${resultats.join(" · ")}.`;
    if (!championnat.fini) {
      partie.nouvelleJournee(prepa.d.bancMax, prepa.d.fusionsMax);
      prepa.etat = { ...prepa.etat, budget: prepa.etat.budget + REGLES.gainParJournee, mercato: partie.tirerMercato() };
      message += ` +${REGLES.gainParJournee} pièces pour le mercato.`;
    } else {
      const premier = championnat.classement()[0]!;
      message = premier.camp === 0 ? "Tu es champion ! 🏆" : `Championnat terminé : ${premier.nom} est champion.`;
    }
    montrer("preparation");
    preparation.signaler(message);
  }

  /** Recopie l'équipe du draft (toi) dans l'écran de préparation. */
  function synchroniser(): void {
    const c = partie.camps[0]!;
    prepa.etat = { ...prepa.etat, effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((p) => ({ ...p })), budget: c.budget };
  }

  function voirFiche(id: string): void {
    const k = partie.carte(id);
    const p = CATALOGUE.pays[k.pays]!;
    ouvrirFiche({ id, nom: k.nom, pays: { code: k.pays, nom: p.nom, couleur: p.couleur }, poste: k.poste, style: k.style ? { code: k.style, nom: prepa.d.styles[k.style] ?? k.style } : null, notes: k.notes, fusions: 0 });
  }

  function finDraft(): void {
    partie.finirDraftOrdis(prepa.d.bancMax, prepa.d.fusionsMax);
    prepa.etat = { ...prepa.etat, mercato: partie.tirerMercato() };
  }

  const controle: ControlePartie = {
    enDraft: () => !partie.draftFini(0),
    casePermise: (poste, cellule) => partie.casePermise(0, poste, cellule),
    aGarder: () => partie.aGarder(0),
    ouvrirCase: (poste, cellule) => {
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
        voirFiche,
        choisir: (id) => {
          const r = partie.choisir(0, poste, cellule, id);
          if (!r.ok) return preparation.signaler(r.erreur, true);
          offres = new Map();
          const pris = partie.ordisChoisissent();
          let message = r.message + (pris.length ? ` Les ordinateurs prennent ${pris.map((x) => partie.carte(x.id).nom).join(", ")}.` : "");
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
      const ordis = partie.camps.slice(1);
      return {
        titulaires: Math.min(...ordis.map((c) => c.composition.length)),
        banc: ordis.reduce((n, c) => n + c.effectif.length - c.composition.length, 0),
        choix: [...partie.choixOrdi].reverse().slice(0, 9).map(({ camp, id }) => {
          const k = partie.carte(id);
          return { nom: `${k.nom} (${partie.noms[camp]})`, poste: k.poste, prix: k.prix, couleur: couleurs[k.pays] ?? "#3A4A40", pays: k.pays };
        }),
      };
    },
    championnat: () => {
      const adv = championnat.fini ? null : adversaire();
      return {
        journee: Math.min(championnat.journees.length, championnat.journee + 1),
        total: championnat.journees.length,
        fini: championnat.fini,
        prochain: adv === null ? null : (partie.noms[adv] ?? null),
        classement: championnat.classement().map((l) => ({ nom: l.nom, points: l.points, joues: l.joues, diff: l.pour - l.contre, toi: l.camp === 0, prochain: l.camp === adv })),
        resultats,
      };
    },
    miTemps: () => (miTemps ? { score: match.scoreActuel, joueur: (id) => match.infosJoueur(id) } : null),
    jouer: () => {
      if (championnat.fini) return;
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
    partie = new Partie(donnees, graines.partie(), planOrdi);
    championnat = new Championnat(partie.noms, REGLES.allerRetour);
    resultats = [];
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
      groupe: { nom: "Championnat", match: "Toi contre 3 ordinateurs", equipes: [] },
    };
    prepa = new Preparation(donnees, d);
    prepa.reserve = partie.reserve;
    prepa.tirage = () => partie.tirerMercato();
    prepa.relanceCout = REGLES.relanceCout;
    prepa.bonusFusion = chargerInfluences().fusion.notesParNiveau;
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
        if (!partie.draftFini(0)) partie.camps[0]!.composition = prepa.etat.composition.map((p) => ({ ...p }));
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
    if (ecran === "match" && championnat.fini) return;
    if (ecran === "match") {
      habillage.nomEux = partie.noms[adversaire()] ?? "Ordinateur";
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
