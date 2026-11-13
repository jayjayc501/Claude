// Non-régression (13/11 au soir) : mêmes équipes, mêmes choix et même graine
// doivent donner exactement le même match, au bit près, et la même partie.
// Les empreintes de référence (tests/empreintes/reference.json) ont été
// enregistrées AVANT la séparation du calcul et de l'affichage du match.
// Pour les régénérer (seulement si le moteur change exprès, avec l'accord du
// concepteur) : MAJ_EMPREINTES=1 bun test tests/empreintes.test.ts

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { GrainesLocales } from "../src/jeu/graines";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import type { Equipe } from "../src/sim/types";
import { type Joueur, type Scenario, empreintePartie, jouerCommeLEcran, jouerParLArbitre } from "./outils/empreintes";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const plan = [...adversaire.composition.filter((p) => p.poste !== "G"), ...adversaire.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));

const FICHIER = new URL("./empreintes/reference.json", import.meta.url).pathname;
const MAJ = !!process.env.MAJ_EMPREINTES;

/** Ton équipe après une mi-temps chargée : un remplaçant entre, un milieu change de case, tactique Pressing. */
function equipeChangee(): Equipe {
  const titulaires = effectif.composition.map((p) => p.joueurId);
  const remplacant = effectif.joueurs.find((j) => !titulaires.includes(j.id) && j.postes[0] !== "G")!;
  const sortant = effectif.composition.find((p) => p.poste !== "G" && effectif.joueurs.find((j) => j.id === p.joueurId)!.postes.includes(remplacant.postes[0]!)) ?? effectif.composition.find((p) => p.poste !== "G")!;
  let composition = effectif.composition.map((p) => (p === sortant ? { ...p, joueurId: remplacant.id } : p));
  const mc = composition.find((x) => x.poste === "MC" && x.joueurId !== remplacant.id)!;
  const libre = donnees.poste("MC").cases.find((c) => !composition.some((x) => x.poste === "MC" && x.cellule === c.index))!;
  composition = composition.map((x) => (x === mc ? { ...x, cellule: libre.index } : x));
  return { ...effectif, composition, tactique: "PRS" };
}

export const SCENARIOS: Scenario[] = [
  { nom: "démo, graine 1", graine: 1, equipes: [effectif, adversaire] },
  { nom: "démo, graine 2", graine: 2, equipes: [effectif, adversaire] },
  { nom: "démo, graine 7", graine: 7, equipes: [effectif, adversaire] },
  { nom: "démo, graine 42", graine: 42, equipes: [effectif, adversaire] },
  {
    nom: "mi-temps : remplaçant, joueur déplacé, Pressing ; adversaire en Contre (graine 3)",
    graine: 3,
    equipes: [effectif, adversaire],
    miTemps: { equipe0: equipeChangee(), tactiques: [null, "CON"] },
  },
  {
    nom: "styles coupés, Tiki-taka contre Gegenpressing ; tactiques coupées à la mi-temps (graine 5)",
    graine: 5,
    equipes: [effectif, adversaire],
    options: { tactiques: true, styles: false },
    tactiquesAvant: ["TIK", "GEG"],
    miTemps: { options: { tactiques: false, styles: false } },
  },
];

let reference: { matchs: Record<string, unknown>; partie: unknown } = { matchs: {}, partie: null };
if (!MAJ) reference = JSON.parse(readFileSync(FICHIER, "utf8"));
const nouvelles: typeof reference = { matchs: {}, partie: null };

/** Graines du prototype (fournisseur local), avec la graine de partie 42 au lieu du hasard. */
const grainesDuPrototype = () => new GrainesLocales(() => 42 / 2 ** 31);

/** Joue les empreintes avec une façon de jouer le match donnée et les compare à la référence. */
export function verifierEmpreintes(titre: string, jouer: Joueur, graines = grainesDuPrototype): void {
  describe(`Empreintes : ${titre}`, () => {
    for (const s of SCENARIOS) {
      test(s.nom, () => {
        const e = jouer(donnees, reglages, s).empreinte;
        if (MAJ) nouvelles.matchs[s.nom] = e;
        else expect(e).toEqual(reference.matchs[s.nom]);
      });
    }
    test("partie et championnat complets (graine de partie 42)", () => {
      const e = empreintePartie(donnees, reglages, plan, graines(), jouer);
      if (MAJ) nouvelles.partie = e;
      else expect(e).toEqual(reference.partie);
    });
  });
}

verifierEmpreintes("moteur appelé comme l'ancien écran du match", jouerCommeLEcran);
if (!MAJ) {
  verifierEmpreintes("arbitre local, film lu image par image (comme le nouvel écran)", jouerParLArbitre());
  verifierEmpreintes("arbitre local, film passé « par le réseau » en morceaux JSON de 37 images", jouerParLArbitre(undefined, 37));
}

describe("Fournisseur de graines (13/11 au soir)", () => {
  test("en local, les mêmes graines qu'avant : partie au hasard, match regardé 1, 2, 3…, autres matchs 1000 + 7 × journée + camp", () => {
    const g = new GrainesLocales(() => 0.5);
    expect(g.partie()).toBe(Math.floor(0.5 * 2 ** 31));
    expect(g.matchRegarde()).toBe(1);
    expect(g.matchRegarde()).toBe(1); // match recommencé : même graine
    g.matchRegardeFini();
    expect(g.matchRegarde()).toBe(2);
    expect(g.matchSimule(2, 3)).toBe(1000 + 2 * 7 + 3);
    expect(new GrainesLocales(() => 42 / 2 ** 31).partie()).toBe(42);
  });
});

if (MAJ)
  test("écriture des empreintes de référence", () => {
    const dossier = FICHIER.slice(0, FICHIER.lastIndexOf("/"));
    if (!existsSync(dossier)) mkdirSync(dossier, { recursive: true });
    writeFileSync(FICHIER, `${JSON.stringify(nouvelles, null, 1)}\n`);
  });
