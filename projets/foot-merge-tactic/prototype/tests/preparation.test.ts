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

  test("mercato glissé : achat et placement, achat et remplacement, refus hors poste sans rien acheter", () => {
    const p = nouvelle();
    expect(p.appliquer({ type: "achat", place: 2, vers: { poste: "DG", cellule: 0 } }).ok).toBe(false); // Brandão (AD) en DG : hors poste
    expect(p.etat.budget).toBe(7);
    expect(p.etat.mercato[2]).toBe("CB");
    expect(p.essayer({ type: "achat", place: 3, vers: { poste: "DC", cellule: 1 } }).ok).toBe(false); // déjà 11 sur le terrain
    expect(p.appliquer({ type: "banc", id: "NV" }).ok).toBe(true);
    const r = p.appliquer({ type: "achat", place: 3, vers: { poste: "DC", cellule: 1 } }); // Vianello, 2 pièces, sur une case libre
    expect(r.ok).toBe(true);
    expect(p.placement("MV")).toEqual({ joueurId: "MV", poste: "DC", cellule: 1 });
    expect(p.etat.budget).toBe(5);
    expect(p.appliquer({ type: "achat", place: 2, vers: { remplace: "KM" } }).ok).toBe(true); // Brandão remplace Moura
    expect(p.placement("CB")?.poste).toBe("AD");
    expect(p.banc()).toContain("KM");
    expect(p.etat.budget).toBe(3);
    expect(p.appliquer({ type: "achat", place: 1, vers: { remplace: "IS" } }).ok).toBe(true); // Almar (3 pièces) remplace Salvat
    expect(p.appliquer({ type: "achat", place: 5, vers: { remplace: "PA" } }).ok).toBe(false); // Lobo : 3 pièces, il n'en reste plus
  });

  test("vente : le joueur quitte l'équipe, le budget remonte", () => {
    const p = nouvelle();
    const avant = p.etat.budget;
    // 14/11 : prix de vente = ce qu'il a coûté (copies fusionnées comprises) moins 1.
    const prix = p.prixVente("TR");
    expect(prix).toBe(p.fiche("TR").prix * (1 + p.membre("TR")!.fusions) - 1);
    expect(p.appliquer({ type: "vente", id: "TR" }).ok).toBe(true);
    expect(p.membre("TR")).toBeUndefined();
    expect(p.etat.composition.length).toBe(10);
    expect(p.etat.budget).toBe(avant + prix);
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
      { code: "REC", n: 2 },
      { code: "TEC", n: 2 },
      { code: "RAP", n: 1 },
    ]); // 4 titulaires sans style
    // Paliers (14/11) : styles à 3 et 5 joueurs, pays à 5 et 8.
    expect(p.palier(4)).toEqual({ prochain: 5, atteint: true, fort: false });
    expect(p.palier(2)).toEqual({ prochain: 3, atteint: false, fort: false });
    expect(p.palier(5)).toEqual({ prochain: 5, atteint: true, fort: true });
    expect(p.palier(4, "pays")).toEqual({ prochain: 5, atteint: false, fort: false });
    expect(p.palier(6, "pays")).toEqual({ prochain: 8, atteint: true, fort: false });
    expect(p.palier(8, "pays")).toEqual({ prochain: 8, atteint: true, fort: true });
  });

  test("tactique d'équipe : une seule, Équilibrée par défaut", () => {
    const p = nouvelle();
    expect(p.etat.tactique).toBe("EQU");
    expect(p.choisirTactique("TIK").ok).toBe(true);
    expect(p.etat.tactique).toBe("TIK");
    expect(p.choisirTactique("XXX").ok).toBe(false);
    expect(p.etat.tactique).toBe("TIK");
  });

  test("14/11 : une carte à 1 pièce se libère sans rien rapporter (minimum 0)", () => {
    const p = nouvelle();
    const un = p.etat.effectif.find((m) => p.fiche(m.id).prix === 1 && m.fusions === 0);
    if (!un) return;
    expect(p.prixVente(un.id)).toBe(0);
  });
});
