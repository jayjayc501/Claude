// 1 contre 1 en ligne (15/11) : film réseau, vue du camp 1, équipes reçues,
// et déroulé complet d'une partie sur le serveur (magasin en mémoire, horloge simulée).
import { describe, expect, test } from "bun:test";
import { type ChoixEquipe, verifierChoix, verifierMiTemps } from "../src/enligne/equipes";
import { decoderFilm, encoderFilm, filmAvantCoupDEnvoi, vuDuCamp1 } from "../src/enligne/filmReseau";
import { MagasinMemoire, type Reponse, type VuePartie, calculerFilm, contexte, traiter } from "../src/enligne/serveur";
import { Partie, REGLES } from "../src/jeu/partie";
import { ETAT, COLONNES_ETAT, type Film } from "../src/match/film";

const ctx = contexte();
const { donnees } = ctx;

function equipeAuto(graine: number, qualite: "haute" | "moyenne" = "moyenne"): ChoixEquipe {
  const p = new Partie(donnees, graine, ctx.planOrdi);
  p.equipeAuto(0, qualite, 5, 3);
  const c = p.camps[0]!;
  return { effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((x) => ({ ...x })), tactique: "PRS" };
}

const A = equipeAuto(11, "haute");
const B = equipeAuto(22);
const filmRef = calculerFilm(ctx, [A, B], 4242);

describe("film réseau", () => {
  test("encodé puis décodé : même film, à la précision du float32 près", async () => {
    const octets = await encoderFilm(filmRef);
    expect(octets.length).toBeLessThan(1_400_000);
    const f = await decoderFilm(octets);
    expect(f.images).toBe(filmRef.images);
    expect(f.entete).toEqual(filmRef.entete);
    expect(f.bilan).toEqual(filmRef.bilan!);
    expect(f.evenements).toEqual(filmRef.evenements);
    expect(f.actions).toEqual(filmRef.actions);
    expect(Array.from(f.etat.subarray(0, f.images * COLONNES_ETAT))).toEqual(Array.from(filmRef.etat.subarray(0, f.images * COLONNES_ETAT)));
    let ecart = 0;
    for (let i = 0; i < f.images * 44; i++) ecart = Math.max(ecart, Math.abs(f.positions[i]! - filmRef.positions[i]!));
    expect(ecart).toBeLessThan(1e-4);
    expect(Number.isNaN(f.lignes[0]!) === Number.isNaN(filmRef.lignes[0]!)).toBe(true);
  });

  test("vue du camp 1 : camps échangés, terrain retourné, ses joueurs en tête", () => {
    const L = donnees.largeurM;
    const H = donnees.longueurM;
    const v = vuDuCamp1(filmRef, L, H);
    const nj = v.entete.joueurs.length;
    expect(v.entete.joueurs.slice(0, 11).every((j) => j.camp === 0)).toBe(true);
    expect(v.entete.joueurs[0]!.id).toBe(filmRef.entete.joueurs[11]!.id);
    expect(v.entete.tactiques).toEqual([filmRef.entete.tactiques[1], filmRef.entete.tactiques[0]]);
    const k = 500;
    // Le joueur 0 de la vue est le joueur 11 du film, retourné d'un demi-tour.
    expect(v.positions[k * nj * 2]).toBeCloseTo(L - filmRef.positions[(k * nj + 11) * 2]!, 9);
    expect(v.positions[k * nj * 2 + 1]).toBeCloseTo(H - filmRef.positions[(k * nj + 11) * 2 + 1]!, 9);
    const fin = (f: Film) => (f.images - 1) * COLONNES_ETAT;
    expect(v.etat[fin(v) + ETAT.score0]).toBe(filmRef.etat[fin(filmRef) + ETAT.score1]!);
    expect(v.bilan!.stats.tirs).toEqual([filmRef.bilan!.stats.tirs[1], filmRef.bilan!.stats.tirs[0]]);
    expect(v.bilan!.buts.map((b) => b.camp)).toEqual(filmRef.bilan!.buts.map((b) => (1 - b.camp) as 0 | 1));
    // Deux demi-tours : le film de départ.
    const w = vuDuCamp1(v, L, H);
    expect(w.entete).toEqual(filmRef.entete);
    expect(Array.from(w.etat.subarray(0, w.images * COLONNES_ETAT))).toEqual(Array.from(filmRef.etat.subarray(0, w.images * COLONNES_ETAT)));
    expect(w.positions[k * nj * 2 + 7]).toBeCloseTo(filmRef.positions[k * nj * 2 + 7]!, 9);
    expect(w.actions).toEqual(filmRef.actions);
  });

  test("avant le coup d'envoi : une image, période 0", () => {
    const f = filmAvantCoupDEnvoi(filmRef);
    expect(f.entete.periode).toBe(0);
    expect(f.images).toBe(1);
    expect(f.positions[3]).toBe(filmRef.positions[3]!);
  });
});

describe("équipes reçues", () => {
  test("une équipe automatique est acceptée, telle quelle", () => {
    const v = verifierChoix(donnees, A);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.choix.composition).toEqual(A.composition);
  });
  test("refusées : 10 titulaires, hors poste, budget dépassé, carte inconnue", () => {
    expect(verifierChoix(donnees, { ...A, composition: A.composition.slice(1) }).ok).toBe(false);
    const g = A.composition.find((p) => p.poste === "G")!;
    const autre = A.composition.find((p) => p.poste !== "G")!;
    expect(verifierChoix(donnees, { ...A, composition: A.composition.map((p) => (p === g ? { ...p, joueurId: autre.joueurId } : p)) }).ok).toBe(false);
    expect(verifierChoix(donnees, { ...A, effectif: A.effectif.map((m) => ({ ...m, fusions: 3 })) }).ok).toBe(false);
    expect(verifierChoix(donnees, { ...A, effectif: [...A.effectif, { id: "PIRATE", fusions: 0 }] }).ok).toBe(false);
  });
  test("mi-temps : places et tactique changent, pas l'effectif", () => {
    expect(verifierMiTemps(donnees, A, { ...A, tactique: "CON" }).ok).toBe(true);
    expect(verifierMiTemps(donnees, A, { ...A, effectif: A.effectif.slice(0, -1) }).ok).toBe(false);
  });
});

/** Une demande au serveur, réponse JSON attendue. */
async function demander(m: MagasinMemoire, t: number, r: Parameters<typeof traiter>[0]): Promise<{ ok: boolean; erreur?: string; jeton?: string; partie?: VuePartie }> {
  const rep: Reponse = await traiter(r, m, ctx, t);
  if (rep.type !== "json") throw new Error("JSON attendu");
  return rep.corps as { ok: boolean; erreur?: string; jeton?: string; partie?: VuePartie };
}

describe("serveur : une partie entière", () => {
  test("lien, deux équipes, deux mi-temps, changements, même match que l'arbitre local", async () => {
    const m = new MagasinMemoire();
    let t = 1_000_000;
    const c = await demander(m, t, { action: "creer" });
    expect(c.ok).toBe(true);
    const id = c.partie!.id;
    const jh = c.jeton!;
    expect(c.partie!.etat).toBe("attente");
    const j = await demander(m, (t += 5000), { action: "rejoindre", id });
    expect(j.partie!.etat).toBe("equipes");
    expect(j.partie!.camp).toBe(1);
    expect(j.partie!.finEquipes).toBe(t + REGLES.enLigne.dureeEquipesS * 1000);
    expect(j.partie!.graineDraft).not.toBe(c.partie!.graineDraft);
    const ji = j.jeton!;
    expect((await demander(m, t, { action: "rejoindre", id })).erreur).toContain("deux joueurs");
    expect((await demander(m, t, { action: "etat", id, jeton: "faux" })).ok).toBe(false);
    // Page rouverte : même place.
    expect((await demander(m, t, { action: "rejoindre", id, jeton: ji })).partie!.camp).toBe(1);

    expect((await demander(m, (t += 60_000), { action: "equipe", id, jeton: jh, equipe: A })).partie!.equipePrete).toEqual([true, false]);
    const v1 = (await demander(m, (t += 30_000), { action: "equipe", id, jeton: ji, equipe: B })).partie!;
    expect(v1.etat).toBe("mt1");
    expect(v1.films.mt1).toBe(true);
    expect(v1.equipes![0]).toEqual(B); // l'invité voit son équipe d'abord
    expect(v1.debutMt1! - t).toBeGreaterThanOrEqual(REGLES.enLigne.margeDebutS * 1000);
    const rf = await traiter({ action: "film", id, jeton: jh, n: 1 }, m, ctx, t);
    expect(rf.type).toBe("octets");
    const mt1 = await decoderFilm((rf as { corps: Uint8Array }).corps);
    expect(mt1.bilan).toEqual(calculerFilm(ctx, [A, B], (await m.lire(id))!.graine).bilan!);

    // Mi-temps : refusée avant la fin de la 1re mi-temps à l'écran ? Non : on peut envoyer, le calcul attend.
    const changeA: ChoixEquipe = { ...A, tactique: "CON" };
    await demander(m, (t = v1.finMt1! + 2000), { action: "mitemps", id, jeton: jh, equipe: changeA });
    const v2 = (await demander(m, (t += 3000), { action: "mitemps", id, jeton: ji, equipe: B })).partie!;
    expect(v2.etat).toBe("mt2");
    expect(v2.debutMt2! - t).toBeGreaterThanOrEqual(REGLES.enLigne.margeRepriseS * 1000);
    const mt2 = await decoderFilm(((await traiter({ action: "film", id, jeton: ji, n: 2 }, m, ctx, t)) as { corps: Uint8Array }).corps);
    expect(mt2.entete.periode).toBe(2);
    expect(mt2.entete.tactiques[0]).toBe("CON");
    // Le serveur rejoue la 1re mi-temps à l'identique : même film que le calcul d'un coup.
    const ref2 = calculerFilm(ctx, [A, B], (await m.lire(id))!.graine, [changeA, B]);
    expect(mt2.bilan).toEqual(ref2.bilan!);
    expect(v2.score).toEqual([ref2.etat[(ref2.images - 1) * COLONNES_ETAT + ETAT.score1]!, ref2.etat[(ref2.images - 1) * COLONNES_ETAT + ETAT.score0]!]);
    const fin = (await demander(m, v2.finMt2! + 1, { action: "etat", id, jeton: jh })).partie!;
    expect(fin.etat).toBe("fini");
  });

  test("sans équipe à la fin du chrono : équipe automatique ; mi-temps sans réponse : équipe inchangée", async () => {
    const m = new MagasinMemoire();
    let t = 5_000_000;
    const c = await demander(m, t, { action: "creer" });
    const id = c.partie!.id;
    const ji = (await demander(m, t, { action: "rejoindre", id })).jeton!;
    await demander(m, (t += 1000), { action: "equipe", id, jeton: ji, equipe: B });
    // L'hôte n'envoie rien : rien ne se passe avant la fin du chrono (et de la marge).
    expect((await demander(m, (t += REGLES.enLigne.dureeEquipesS * 1000 - 2000), { action: "etat", id, jeton: ji })).partie!.etat).toBe("equipes");
    const v = (await demander(m, (t += (REGLES.enLigne.graceS + 3) * 1000), { action: "etat", id, jeton: ji })).partie!;
    expect(v.etat).toBe("mt1");
    expect(v.auto).toEqual([false, true]);
    expect(v.equipes![1].composition).toHaveLength(11);
    // Personne n'envoie ses changements : la 2e mi-temps part à la fin du temps de mi-temps.
    expect((await demander(m, v.finMiTemps! - 1000, { action: "etat", id, jeton: ji })).partie!.etat).toBe("mt1");
    const v2 = (await demander(m, v.finMiTemps! + REGLES.enLigne.graceS * 1000 + 1, { action: "etat", id, jeton: ji })).partie!;
    expect(v2.etat).toBe("mt2");
    expect(v2.equipesMt2).toEqual(v.equipes!);
  });

  test("deux demandes en même temps : un seul calcul", async () => {
    const m = new MagasinMemoire();
    const t = 9_000_000;
    const c = await demander(m, t, { action: "creer" });
    const id = c.partie!.id;
    const ji = (await demander(m, t, { action: "rejoindre", id })).jeton!;
    await demander(m, t, { action: "equipe", id, jeton: c.jeton!, equipe: A });
    let depots = 0;
    const deposer = m.deposerFilm.bind(m);
    m.deposerFilm = async (ch, o) => {
      depots++;
      return deposer(ch, o);
    };
    const [x, y] = await Promise.all([demander(m, t, { action: "equipe", id, jeton: ji, equipe: B }), demander(m, t, { action: "etat", id, jeton: c.jeton! })]);
    expect(depots).toBe(1);
    expect([x.partie!.etat, y.partie!.etat]).toContain("mt1");
  });
});
