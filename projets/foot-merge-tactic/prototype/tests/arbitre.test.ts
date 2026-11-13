// Arbitre de match et film (13/11 au soir) : le film est calculé par morceaux,
// en arrière-plan, pendant que l'écran le lit ; il ne dépend ni du découpage
// ni du rythme du calcul, et il passe par le réseau (JSON) sans rien perdre.

import { describe, expect, test } from "bun:test";
import { ArbitreLocal, type Planificateur, planificateurImmediat } from "../src/match/arbitreLocal";
import { DUREE_MI_TEMPS_S } from "../src/match/arbitre";
import { type Film, LecteurFilm, morceauDepuisJson, morceauVersJson } from "../src/match/film";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const choix = { options: { tactiques: true, styles: true }, tactiques: [null, null] as [string | null, string | null] };

/** Planificateur « navigateur » simulé : les tâches attendent qu'on les fasse tourner. */
function differe(): { planifier: Planificateur; tourner: (n?: number) => number } {
  const file: (() => boolean)[] = [];
  return {
    planifier: (t) => {
      file.push(t);
    },
    tourner: (n = 1) => {
      let faits = 0;
      while (file.length && faits < n) {
        const t = file[0]!;
        faits++;
        if (!t()) file.shift();
      }
      return file.length;
    },
  };
}

function memesImages(a: Film, b: Film): void {
  expect(a.images).toBe(b.images);
  expect(Array.from(a.temps.subarray(0, a.images))).toEqual(Array.from(b.temps.subarray(0, b.images)));
  const nj = a.entete.joueurs.length;
  expect(Array.from(a.positions.subarray(0, a.images * 2 * nj))).toEqual(Array.from(b.positions.subarray(0, b.images * 2 * nj)));
  expect(Array.from(a.etat.subarray(0, a.images * 12))).toEqual(Array.from(b.etat.subarray(0, b.images * 12)));
  expect(a.evenements).toEqual(b.evenements);
  expect(a.bilan).toEqual(b.bilan);
}

describe("Arbitre local (13/11 au soir)", () => {
  test("avant le coup d'envoi : une seule image, rien n'est joué", () => {
    const f = new ArbitreLocal(donnees, reglages, planificateurImmediat).nouveauMatch([effectif, adversaire], 1);
    expect(f.entete.periode).toBe(0);
    expect(f.images).toBe(1);
    expect(f.entete.joueurs.length).toBe(22);
    const l = new LecteurFilm();
    l.charger(f);
    expect(l.vue.demarre).toBe(false);
    expect(l.vue.temps).toBe(0);
  });

  test("coup d'envoi sans gel : quelques images tout de suite, le reste par morceaux ; même film qu'en un bloc", () => {
    const immediat = new ArbitreLocal(donnees, reglages, planificateurImmediat);
    immediat.nouveauMatch([effectif, adversaire], 4);
    const reference = immediat.premiereMiTemps(choix);
    expect(reference.complet).toBe(true);
    // 180 s de jeu : 5 400 pas (ou 5 401, l'arrondi des 1/30 s), plus l'image du coup d'envoi.
    expect(reference.images).toBeGreaterThanOrEqual(DUREE_MI_TEMPS_S * 30 + 1);

    const d = differe();
    const arbitre = new ArbitreLocal(donnees, reglages, d.planifier);
    arbitre.nouveauMatch([effectif, adversaire], 4);
    const film = arbitre.premiereMiTemps(choix);
    // Tout de suite : l'image du coup d'envoi et un premier petit morceau, pas la mi-temps entière.
    expect(film.images).toBeGreaterThan(1);
    expect(film.images).toBeLessThan(50);
    expect(film.complet).toBe(false);
    // L'écran lit pendant que le calcul avance, morceau après morceau.
    const l = new LecteurFilm();
    l.charger(film);
    let lues = 0;
    while (!film.complet || l.image < film.images - 1) {
      while (l.disponible(l.image + 1)) {
        l.lire(l.image + 1);
        lues++;
      }
      d.tourner(3);
    }
    expect(lues).toBe(reference.images - 1);
    memesImages(film, reference);
    // 2e mi-temps, elle aussi par morceaux : identique.
    const r2 = immediat.secondeMiTemps({ ...choix, equipe0: effectif });
    const f2 = arbitre.secondeMiTemps({ ...choix, equipe0: effectif });
    while (d.tourner(5));
    memesImages(f2, r2);
  });

  test("mi-temps demandée avant la fin du calcul de la 1re : l'arbitre la termine d'abord, même match", () => {
    const ref = new ArbitreLocal(donnees, reglages, planificateurImmediat);
    ref.nouveauMatch([effectif, adversaire], 6);
    ref.premiereMiTemps(choix);
    const r2 = ref.secondeMiTemps({ ...choix, equipe0: effectif });
    const d = differe();
    const arbitre = new ArbitreLocal(donnees, reglages, d.planifier);
    arbitre.nouveauMatch([effectif, adversaire], 6);
    const f1 = arbitre.premiereMiTemps(choix);
    d.tourner(2);
    expect(f1.complet).toBe(false);
    const f2 = arbitre.secondeMiTemps({ ...choix, equipe0: effectif });
    expect(f1.complet).toBe(true);
    while (d.tourner(5));
    memesImages(f2, r2);
  });

  test("nouveau match : le calcul du précédent s'arrête", () => {
    const d = differe();
    const arbitre = new ArbitreLocal(donnees, reglages, d.planifier);
    arbitre.nouveauMatch([effectif, adversaire], 2);
    const f = arbitre.premiereMiTemps(choix);
    const avant = f.images;
    arbitre.nouveauMatch([effectif, adversaire], 2);
    while (d.tourner(10));
    expect(f.images).toBe(avant);
    expect(f.complet).toBe(false);
  });

  test("format réseau : un morceau passe en JSON et revient identique (lignes absentes comprises)", () => {
    const arbitre = new ArbitreLocal(donnees, reglages, planificateurImmediat);
    arbitre.nouveauMatch([effectif, adversaire], 9);
    const f = arbitre.premiereMiTemps(choix);
    const m = f.morceau(100, 250);
    expect(Array.from(m.lignes).some((x) => Number.isNaN(x))).toBe(true);
    const texte = JSON.stringify(morceauVersJson(m));
    const r = morceauDepuisJson(JSON.parse(texte));
    expect(r.n).toBe(250);
    expect(Array.from(r.positions)).toEqual(Array.from(m.positions));
    expect(Array.from(r.lignes).map(String)).toEqual(Array.from(m.lignes).map(String));
    expect(Array.from(r.etat)).toEqual(Array.from(m.etat));
    expect(r.evenements).toEqual(m.evenements);
    // Taille indicative d'une mi-temps en JSON (pour le futur réseau, avant toute compression).
    const ko = JSON.stringify(morceauVersJson(f.morceau(0, f.images))).length / 1024;
    expect(ko).toBeGreaterThan(100);
  });
});
