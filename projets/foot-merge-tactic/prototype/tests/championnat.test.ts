import { describe, expect, test } from "bun:test";
import { Championnat, calendrier, jouerMatch } from "../src/jeu/championnat";
import { Partie, REGLES } from "../src/jeu/partie";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { adversaire } = chargerEquipes(donnees);
const plan = [...adversaire.composition.filter((p) => p.poste !== "G"), ...adversaire.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));

describe("Championnat à 4 équipes (13/11)", () => {
  test("calendrier : chaque équipe rencontre les autres une fois ; toi à chaque journée", () => {
    const j = calendrier(4);
    expect(j.length).toBe(3);
    const paires = j.flat().map((r) => [r.a, r.b].sort().join("-"));
    expect(new Set(paires).size).toBe(6);
    for (const jour of j) {
      expect(jour.length).toBe(2);
      expect(jour.some((r) => r.a === 0 || r.b === 0)).toBe(true);
    }
    expect(calendrier(4, true).length).toBe(6);
  });

  test("classement : 3 points la victoire, 1 le nul, départage à la différence de buts", () => {
    const c = new Championnat(["Toi", "A", "B", "C"]);
    const [r1, r2] = c.rencontres;
    c.enregistrer(r1!.a, r1!.b, [2, 0]);
    c.enregistrer(r2!.a, r2!.b, [1, 1]);
    c.suivante();
    const cl = c.classement();
    expect(cl[0]!.camp).toBe(r1!.a);
    expect(cl[0]!.points).toBe(3);
    expect(cl.filter((l) => l.points === 1).length).toBe(2);
    expect(cl[3]!.points).toBe(0);
  });

  test("une partie entière : 4 drafts, mercatos, 3 journées jouées, un champion", () => {
    const p = new Partie(donnees, 42, plan);
    expect(p.camps.length).toBe(4);
    // Toi : on laisse l'ordinateur drafter ton équipe aussi (même règles).
    while (!p.draftFini(0)) {
      p.ordiChoisir(0);
      p.ordisChoisissent();
    }
    p.finirDraftOrdis(5, 3);
    for (const c of p.camps) expect(c.composition.length).toBe(11);
    const ch = new Championnat(p.noms, REGLES.allerRetour);
    while (!ch.fini) {
      for (const r of ch.rencontres) r.score = jouerMatch(donnees, reglages, [p.equipeDe(r.a), p.equipeDe(r.b)], 7 + ch.journee, 60);
      ch.suivante();
      if (!ch.fini) {
        const avant = p.camps[1]!.budget + p.camps[1]!.effectif.length;
        p.nouvelleJournee(5, 3);
        expect(p.camps[1]!.budget + p.camps[1]!.effectif.length).toBeGreaterThanOrEqual(avant);
      }
    }
    const cl = ch.classement();
    expect(cl.reduce((n, l) => n + l.joues, 0)).toBe(12);
    expect(cl[0]!.points).toBeGreaterThanOrEqual(cl[3]!.points);
  });
});
