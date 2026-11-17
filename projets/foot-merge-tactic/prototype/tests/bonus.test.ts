// Bonus du 14/11 (VALIDÉS par le concepteur) : styles en bonus caché sans
// contrepartie, paliers de style à 3 et 5, de pays à 5 et 8, fusions en boost
// de match caché. Les chiffres restent des propositions (data/influences.json).

import { describe, expect, test } from "bun:test";
import { ArbitreLocal, planificateurImmediat } from "../src/match/arbitreLocal";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { NEUTRE, bonusNotes, chargerInfluences, contextePays, effetJoueur, paliersPays, paliersStyles, reglagesEquipe } from "../src/sim/influences";
import { notesAffichees } from "../src/sim/notes";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe, Joueur } from "../src/sim/types";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { adversaire } = chargerEquipes(donnees);
const inf = chargerInfluences();
const options = { tactiques: true, styles: true };
const champ = adversaire.composition.filter((p) => p.poste !== "G").map((p) => p.joueurId);
const PAYS = ["FRA", "ESP", "ENG", "GER", "ITA"];

/** L'équipe de démonstration, pays répartis (aucun palier), avec des retouches. */
function equipe(retouche: (j: Joueur, i: number) => Partial<Joueur> = () => ({})): Equipe {
  const ids = adversaire.composition.map((p) => p.joueurId);
  return {
    ...adversaire,
    joueurs: adversaire.joueurs.map((j) => {
      const i = ids.indexOf(j.id);
      return { ...j, style: null, notes: { passe: 70, duel: 60 }, pays: PAYS[Math.max(0, i) % 5], ...retouche(j, i) };
    }),
  };
}
const sim = (a: Equipe, b: Equipe = equipe()) => new MatchSim(donnees, reglages, [a, b], 3, true);

describe("Styles (14/11) : bonus caché, sans contrepartie", () => {
  test("le style ne change pas les notes affichées, mais le moteur ajoute son bonus", () => {
    const e = equipe((j) => (j.id === champ[0] ? { style: "TEC" } : {}));
    const j = e.joueurs.find((x) => x.id === champ[0])!;
    expect(notesAffichees(j)).toEqual(notesAffichees({ ...j, style: null }));
    const s = sim(e);
    const js = s.joueurs.find((x) => x.camp === 0 && x.joueur.id === champ[0])!;
    expect(js.notes.passe).toBe(70 + (inf.styles.TEC!.notes.passe ?? 0));
    expect(js.notes.dribble).toBe(65 + (inf.styles.TEC!.notes.dribble ?? 0));
    expect(js.notesBase.passe).toBe(70);
    // Styles coupés : plus de bonus.
    s.definirOptions({ styles: false });
    expect(js.notes.passe).toBe(70);
  });

  test("aucun style n'a de contrepartie (aucun effet pire que sans style)", () => {
    for (const code of Object.keys(inf.styles)) {
      const e = effetJoueur({ id: "x", nom: "x", postes: ["MC"], style: code }, inf, options);
      expect(e.vitesse).toBeGreaterThanOrEqual(1);
      expect(e.pressing).toBeGreaterThanOrEqual(1);
      expect(e.tacle).toBeGreaterThanOrEqual(1);
      expect(e.dribble).toBeGreaterThanOrEqual(1);
      expect(e.fautes).toBeLessThanOrEqual(1);
      expect(e.imprecision).toBeLessThanOrEqual(1);
      expect(e.protection).toBeLessThanOrEqual(1);
      for (const v of Object.values(inf.styles[code]!.notes)) expect(v).toBeGreaterThan(0);
    }
  });

  test("paliers : bonus d'équipe à 3 joueurs du même style, action signature en plus à 5", () => {
    const avec = (n: number) => equipe((j) => (champ.slice(0, n).includes(j.id) ? { style: "REC" } : {}));
    expect(paliersStyles(avec(2), avec(2).composition, inf)).toEqual([]);
    expect(paliersStyles(avec(3), avec(3).composition, inf)).toEqual([{ code: "REC", n: 3, fort: false }]);
    expect(paliersStyles(avec(5), avec(5).composition, inf)).toEqual([{ code: "REC", n: 5, fort: true }]);
    const base = reglages.ballon.contrePressing.joueurs;
    expect(reglagesEquipe(reglages, avec(3), "EQU", inf, options).ballon.contrePressing.joueurs).toBe(base + 1);
    const plus = (c: Record<string, unknown>) => ((c["ballon.contrePressing.joueurs"] as { plus?: number })?.plus ?? 0);
    expect(reglagesEquipe(reglages, avec(5), "EQU", inf, options).ballon.contrePressing.joueurs).toBe(base + plus(inf.styles.REC!.palier) + plus(inf.styles.REC!.palierFort));
    expect(plus(inf.styles.REC!.palierFort)).toBeGreaterThan(0);
    expect(reglagesEquipe(reglages, avec(5), "EQU", inf, { tactiques: true, styles: false }).ballon.contrePressing.joueurs).toBe(base);
  });
});

describe("Pays (14/11) : cohésion à 5, tradition à 8", () => {
  const compatriotes = (code: string, n: number) => equipe((j, i) => (i >= 0 && i < n ? { pays: code } : { pays: PAYS.filter((p) => p !== code)[Math.max(0, i) % 4] }));

  test("cohésion à 5 : les compatriotes réagissent plus vite et se passent mieux le ballon ; les autres non", () => {
    expect(paliersPays(compatriotes("ESP", 4), compatriotes("ESP", 4).composition, inf)).toEqual([]);
    const e = compatriotes("ESP", 5);
    expect(paliersPays(e, e.composition, inf)).toEqual([{ code: "ESP", n: 5, fort: false }]);
    const s = sim(e);
    const esp = s.joueurs.find((j) => j.camp === 0 && j.joueur.pays === "ESP")!;
    const autre = s.joueurs.find((j) => j.camp === 0 && j.joueur.pays !== "ESP")!;
    expect(esp.effet.reaction).toBe(inf.pays.cohesion.joueur.reaction!);
    expect(esp.effet.imprecisionCompatriote).toBe(inf.pays.cohesion.joueur.imprecisionCompatriote!);
    expect(autre.effet).toEqual(NEUTRE);
    // Cohésion : petit bonus caché sur toutes les notes ; pas de tradition à 5.
    expect(esp.notes.passe).toBe(esp.notesBase.passe + (inf.pays.cohesion.notes.passe ?? 0));
    expect(autre.notes).toEqual(autre.notesBase);
  });

  test("tradition à 8 : bonus caché du pays et réglages d'équipe en plus", () => {
    for (const code of PAYS) {
      const e = compatriotes(code, 8);
      expect(paliersPays(e, e.composition, inf)).toEqual([{ code, n: 8, fort: true }]);
      expect(contextePays(e, inf).tradition.has(code)).toBe(true);
      const t = inf.pays.traditions[code]!;
      const j = e.joueurs.find((x) => x.pays === code)!;
      expect(bonusNotes(j, inf, options, true)).toEqual(t.notes);
      const tout = bonusNotes(j, inf, options, true, true);
      expect(tout.duel).toBe((t.notes.duel ?? 0) + (inf.pays.cohesion.notes.duel ?? 0));
      expect(reglagesEquipe(reglages, e, "EQU", inf, options)).not.toBe(reglages);
    }
  });
});

describe("Fusions (14/11) : boost de match caché, le même pour toutes les cartes", () => {
  test("les notes affichées ne changent pas ; le moteur ajoute le boost à toutes les notes", () => {
    const e = equipe((j) => (j.id === champ[0] ? { fusions: 3 } : {}));
    const j = e.joueurs.find((x) => x.id === champ[0])!;
    expect(notesAffichees(j)).toEqual(notesAffichees({ ...j, fusions: 0 }));
    const js = sim(e).joueurs.find((x) => x.camp === 0 && x.joueur.id === champ[0])!;
    const boost = 3 * inf.fusion.notesParNiveau;
    expect(js.notes.passe).toBe(70 + boost);
    expect(js.notes.duel).toBe(60 + boost);
    expect(js.notes.acceleration).toBe(65 + boost);
    // Plus rapide aussi (la vitesse vient des notes).
    const sans = sim(equipe()).joueurs.find((x) => x.camp === 0 && x.joueur.id === champ[0])!;
    expect(js.vitesseRepos).toBeGreaterThan(sans.vitesseRepos);
  });

  test("même boost pour une petite carte et une vedette (la hiérarchie des cartes reste)", () => {
    const petite = bonusNotes({ id: "a", nom: "a", postes: ["MC"], notes: { passe: 58 }, fusions: 2 }, inf, options);
    const vedette = bonusNotes({ id: "b", nom: "b", postes: ["MC"], notes: { passe: 81 }, fusions: 2 }, inf, options);
    expect(petite).toEqual(vedette);
    expect(petite.passe).toBe(2 * inf.fusion.notesParNiveau);
  });

  test("sans style, pays ni fusion : les notes du moteur sont exactement celles de la carte", () => {
    const s = sim(equipe((j) => ({ pays: null })));
    for (const j of s.joueurs) expect(j.notes).toEqual(j.notesBase);
  });
});

describe("Styles visibles en match (14/11)", () => {
  test("les actions réussies grâce à un style passent dans le film", () => {
    const tous = (code: string) => equipe((j) => (champ.includes(j.id) ? { style: code } : {}));
    const arbitre = new ArbitreLocal(donnees, reglages, planificateurImmediat);
    arbitre.nouveauMatch([tous("REC"), tous("TEC")], 8);
    const f = arbitre.premiereMiTemps({ options, tactiques: [null, null] });
    expect(f.actions.length).toBeGreaterThan(3);
    for (const a of f.actions) {
      const j = f.entete.joueurs[a.joueur]!;
      expect(a.style).toBe(j.camp === 0 ? "REC" : "TEC");
    }
    // Styles coupés : aucune action de style.
    const b = new ArbitreLocal(donnees, reglages, planificateurImmediat);
    b.nouveauMatch([tous("REC"), tous("TEC")], 8);
    expect(b.premiereMiTemps({ options: { tactiques: true, styles: false }, tactiques: [null, null] }).actions.length).toBe(0);
  });
});
