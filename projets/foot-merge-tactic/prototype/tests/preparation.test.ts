import { describe, expect, test } from "bun:test";
import { chargerDonnees } from "../src/sim/chargement";
import { verifier } from "../src/sim/placement";
import { Preparation } from "../src/ui/preparation";

const nouvelle = () => new Preparation(chargerDonnees("hexagones"));

describe("écran de préparation", () => {
  test("composition de la maquette : 11 joueurs valides, banc de 2", () => {
    const p = nouvelle();
    expect(verifier(p.etat.composition, p.donnees)).toEqual([]);
    expect(p.banc()).toEqual(["AS", "DK"]);
    for (const pl of p.etat.composition) expect(p.fiche(pl.joueurId).poste).toBe(pl.poste);
  });

  test("hors poste refusé : case, échange et remplacement", () => {
    const p = nouvelle();
    expect(p.essayer({ type: "case", id: "LM", poste: "MC", cellule: 0 }).ok).toBe(false);
    expect(p.essayer({ type: "echange", a: "LM", b: "HF" }).ok).toBe(false);
    expect(p.essayer({ type: "remplacement", entrant: "AS", sortant: "LM" }).ok).toBe(false);
    expect(p.essayer({ type: "echange", a: "LM", b: "NV" }).ok).toBe(true);
    expect(p.essayer({ type: "remplacement", entrant: "DK", sortant: "LM" }).ok).toBe(true);
    expect(p.essayer({ type: "case", id: "LM", poste: "DC", cellule: 1 }).ok).toBe(true);
  });

  test("banc limité à 5 places", () => {
    const p = nouvelle();
    for (const id of ["LM", "NV", "HF"]) expect(p.appliquer({ type: "banc", id }).ok).toBe(true);
    expect(p.banc().length).toBe(5);
    expect(p.essayer({ type: "banc", id: "PA" }).ok).toBe(false);
  });

  test("mercato : la copie fusionne, un nouveau joueur va sur le banc, budget débité", () => {
    const p = nouvelle();
    expect(p.fusionPossible("HF")).toBe(true);
    expect(p.acheter(0).ok).toBe(true); // Ferrand, 3 pièces
    expect(p.membre("HF")?.fusions).toBe(2);
    expect(p.acheter(3).ok).toBe(true); // Vianello, 2 pièces
    expect(p.banc()).toContain("MV");
    expect(p.etat.budget).toBe(2);
    expect(p.acheter(1).ok).toBe(false); // Almar, 3 pièces : trop cher
    expect(p.etat.mercato[0]).toBeNull();
  });

  test("vente : le joueur quitte l'équipe, le budget remonte", () => {
    const p = nouvelle();
    expect(p.appliquer({ type: "vente", id: "TR" }).ok).toBe(true);
    expect(p.membre("TR")).toBeUndefined();
    expect(p.etat.composition.length).toBe(10);
    expect(p.etat.budget).toBe(10);
    expect(p.pret()).toBe(false);
  });

  test("compteurs de pays et paliers", () => {
    const p = nouvelle();
    const { pays, styles } = p.compteurs();
    expect(pays).toEqual([
      { code: "FRA", n: 4 },
      { code: "ESP", n: 3 },
      { code: "BRA", n: 2 },
      { code: "ITA", n: 2 },
    ]);
    expect(styles).toEqual([
      { code: "REM", n: 2 },
      { code: "PRE", n: 2 },
      { code: "TEC", n: 2 },
      { code: "RAP", n: 1 },
    ]); // 4 titulaires sans style
    expect(p.palier(4)).toEqual({ prochain: 5, atteint: true });
    expect(p.palier(2)).toEqual({ prochain: 3, atteint: false });
  });
});
