// Empreintes de matchs (13/11 au soir, filet de sécurité avant de séparer le
// calcul du match de son affichage). Une empreinte résume un match tel que le
// joueur le voit : chaque pas de simulation (positions des 22 joueurs et du
// ballon, score, porteur) passe dans un hachage SHA-256, au bit près ; on garde
// aussi, en clair, un échantillon toutes les 30 s de jeu, et le bilan de chaque
// mi-temps (statistiques, buteurs, possession, notes, forme).
//
// Si une empreinte change, c'est que le match n'est plus le même : même graine
// et mêmes choix doivent toujours donner exactement le même match.

import { createHash } from "node:crypto";
import { Championnat, jouerMatch } from "../../src/jeu/championnat";
import type { FournisseurGraines } from "../../src/jeu/graines";
import { ArbitreLocal, type Planificateur, planificateurImmediat } from "../../src/match/arbitreLocal";
import { Film, LecteurFilm, type VueMatch, morceauDepuisJson, morceauVersJson } from "../../src/match/film";
import { Partie, REGLES } from "../../src/jeu/partie";
import type { Donnees } from "../../src/sim/donnees";
import type { OptionsInfluences } from "../../src/sim/influences";
import { MatchSim } from "../../src/sim/simulation";
import type { Equipe, Reglages } from "../../src/sim/types";

/** Ce que l'écran montre à un pas donné. */
export interface Image {
  temps: number;
  ballon: { x: number; y: number };
  score: readonly [number, number];
  /** Indice du porteur (ou du dernier à avoir touché le ballon) dans `joueurs`, −1 sinon. */
  porteur: number;
  joueurs: readonly { camp: 0 | 1; id: string; x: number; y: number }[];
}

/** Bilan d'une mi-temps (panneau de statistiques, notes, forme). */
export interface Bilan {
  score: [number, number];
  stats: unknown;
  buts: unknown;
  tempsPossession: [number, number];
  notes: unknown;
  /** Forme et note de chaque joueur sur le terrain. */
  joueurs: { camp: 0 | 1; id: string; forme: number; note: number }[];
}

/** Pas entre deux échantillons en clair (30 s de jeu). */
const ECHANTILLON_PAS = 900;

export class Empreinte {
  private hachage = createHash("sha256");
  private bloc = createHash("sha256");
  private pasPeriode = 0;
  private readonly periodes: { pas: number; blocs: string[]; echantillons: unknown[]; ids: string; bilan?: Bilan }[] = [];
  avantCoupDEnvoi: unknown = null;

  /** Début d'une mi-temps : `image` est l'état juste après le coup d'envoi (avant le premier pas). */
  debutPeriode(image: Image): void {
    this.periodes.push({ pas: 0, blocs: [], echantillons: [], ids: image.joueurs.map((j) => `${j.camp}:${j.id}`).join(",") });
    this.pasPeriode = 0;
    this.bloc = createHash("sha256");
    this.ajouter(image, true);
  }

  /** Un pas de simulation. */
  ajouter(image: Image, initiale = false): void {
    const p = this.periodes[this.periodes.length - 1]!;
    const n = image.joueurs.length;
    const v = new Float64Array(6 + 2 * n);
    v[0] = image.temps;
    v[1] = image.ballon.x;
    v[2] = image.ballon.y;
    v[3] = image.score[0];
    v[4] = image.score[1];
    v[5] = image.porteur;
    image.joueurs.forEach((j, i) => {
      v[6 + 2 * i] = j.x;
      v[7 + 2 * i] = j.y;
    });
    const octets = new Uint8Array(v.buffer);
    this.hachage.update(octets);
    this.bloc.update(octets);
    if (!initiale) {
      this.pasPeriode++;
      p.pas = this.pasPeriode;
    }
    if (this.pasPeriode % ECHANTILLON_PAS === 0) {
      p.echantillons.push({ pas: this.pasPeriode, temps: image.temps, ballon: [image.ballon.x, image.ballon.y], score: [...image.score], porteur: image.porteur, joueurs: image.joueurs.flatMap((j) => [j.x, j.y]) });
      if (!initiale) {
        p.blocs.push(this.bloc.digest("hex").slice(0, 16));
        this.bloc = createHash("sha256");
      }
    }
  }

  finPeriode(bilan: Bilan): void {
    const p = this.periodes[this.periodes.length - 1]!;
    p.blocs.push(this.bloc.digest("hex").slice(0, 16));
    p.bilan = bilan;
  }

  resultat(): unknown {
    return { hachage: this.hachage.digest("hex"), avantCoupDEnvoi: this.avantCoupDEnvoi, periodes: this.periodes };
  }
}

// ---- Lecture de l'état de la simulation ------------------------------------

export function imageDeSim(sim: MatchSim): Image {
  const touche = sim.balle?.porteur ?? sim.balle?.dernier ?? null;
  return {
    temps: sim.temps,
    ballon: { x: sim.ballon.x, y: sim.ballon.y },
    score: [sim.score[0], sim.score[1]],
    porteur: touche ? sim.joueurs.indexOf(touche) : -1,
    joueurs: sim.joueurs.map((j) => ({ camp: j.camp, id: j.joueur.id, x: j.pos.x, y: j.pos.y })),
  };
}

export function bilanDeSim(sim: MatchSim): Bilan {
  const copie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  return {
    score: [sim.score[0], sim.score[1]],
    stats: copie(sim.balle?.stats ?? null),
    buts: copie(sim.balle?.buts ?? []),
    tempsPossession: [sim.tempsPossession[0], sim.tempsPossession[1]],
    notes: sim.notesDuMatch(),
    joueurs: sim.joueurs.map((j) => ({ camp: j.camp, id: j.joueur.id, forme: sim.forme(j), note: sim.noteDe(j) })),
  };
}

// ---- Scénarios ---------------------------------------------------------------

/** Ce que le joueur fait autour d'un match (avant le coup d'envoi et à la mi-temps). */
export interface Scenario {
  nom: string;
  graine: number;
  equipes: [Equipe, Equipe];
  /** Interrupteurs de l'écran du match (tactiques, styles), avant le coup d'envoi. */
  options?: OptionsInfluences;
  /** Tactiques choisies sur l'écran du match avant le coup d'envoi (null : celle de l'équipe). */
  tactiquesAvant?: [string | null, string | null];
  miTemps?: {
    /** Ton équipe après les changements faits à la mi-temps (places, remplaçants, tactique). */
    equipe0?: Equipe;
    /** Tactiques choisies sur l'écran du match pendant la mi-temps. */
    tactiques?: [string | null, string | null];
    options?: OptionsInfluences;
  };
}

/** Résultat d'un match joué : son empreinte et son score. */
export interface MatchJoue {
  empreinte: unknown;
  score: [number, number];
}

/** Façon de jouer un scénario (directement avec le moteur, ou plus tard par l'arbitre de match). */
export type Joueur = (donnees: Donnees, reglages: Reglages, s: Scenario) => MatchJoue;

const DUREE_MI_TEMPS_S = 180;

/** Partie complète et championnat (comme `main.ts`), graines données par le
 *  fournisseur. Les matchs regardés passent par `jouer` ; les autres par `jouerMatch`. */
export function empreintePartie(donnees: Donnees, reglages: Reglages, plan: { poste: string; cellule: number }[], graines: FournisseurGraines, jouer: Joueur): unknown {
  const graine = graines.partie();
  const p = new Partie(donnees, graine, plan);
  const bancMax = 5;
  const fusionsMax = 3;
  // Ton draft : l'ordinateur choisit pour toi (mêmes règles), puis les ordinateurs.
  while (!p.draftFini(0)) {
    p.ordiChoisir(0);
    p.ordisChoisissent();
  }
  p.finirDraftOrdis(bancMax, fusionsMax);
  const mercatos: string[][] = [p.tirerMercato()];
  p.ordiMercato(bancMax, fusionsMax, 0);
  const etat = () => p.camps.map((c) => ({ budget: c.budget, effectif: c.effectif.map((m) => `${m.id}+${m.fusions}`), composition: c.composition.map((x) => `${x.joueurId}@${x.poste}${x.cellule}`) }));
  const draft = etat();
  const ch = new Championnat(p.noms, REGLES.allerRetour);
  const journees: unknown[] = [];
  while (!ch.fini) {
    const adv = ch.adversaire(0) ?? 1;
    const graineMatch = graines.matchRegarde();
    const m = jouer(donnees, reglages, { nom: `journée ${ch.journee + 1}`, graine: graineMatch, equipes: [{ ...p.equipeDe(0), nom: "Toi", nationalite: "Toi" }, p.equipeDe(adv)] });
    graines.matchRegardeFini(); // « Continuer » en fin de match
    ch.enregistrer(0, adv, m.score);
    for (const r of ch.rencontres) {
      if (r.score) continue;
      r.score = jouerMatch(donnees, reglages, [p.equipeDe(r.a), p.equipeDe(r.b)], graines.matchSimule(ch.journee, r.a));
    }
    journees.push({ graineMatch, ton: m.empreinte, rencontres: ch.rencontres.map((r) => ({ a: r.a, b: r.b, score: r.score })) });
    ch.suivante();
    if (!ch.fini) {
      p.nouvelleJournee(bancMax, fusionsMax);
      mercatos.push(p.tirerMercato());
      p.ordiMercato(bancMax, fusionsMax, 0);
    }
  }
  return { graine, draft, mercatos, journees, fin: etat(), classement: ch.classement() };
}

/** Le match comme le jouait l'écran du match avant le 13/11 au soir
 *  (`ecranMatch.ts` faisait avancer le moteur dans sa boucle d'affichage) :
 *  mêmes appels au moteur, dans le même ordre. C'est la référence. */
export const jouerCommeLEcran: Joueur = (donnees, reglages, s) => {
  const e = new Empreinte();
  const options: OptionsInfluences = { ...(s.options ?? { tactiques: true, styles: true }) };
  const forcees: [string | null, string | null] = [null, null];
  // nouveauMatch()
  // Un tableau neuf, comme `this.equipes()` dans l'écran (le moteur y range l'équipe changée à la mi-temps).
  const sim = new MatchSim(donnees, reglages, [s.equipes[0], s.equipes[1]], s.graine, true);
  sim.definirOptions(options);
  // Choix sur l'écran du match avant le coup d'envoi.
  s.tactiquesAvant?.forEach((t, camp) => {
    if (!t) return;
    forcees[camp] = t;
    sim.definirTactique(camp as 0 | 1, t);
  });
  e.avantCoupDEnvoi = imageDeSim(sim);
  // Coup d'envoi, puis la boucle : un pas, puis fin de mi-temps à 180 s.
  sim.demarrer();
  let debut = 0;
  const periode = () => {
    e.debutPeriode(imageDeSim(sim));
    for (;;) {
      sim.pas();
      e.ajouter(imageDeSim(sim));
      if (sim.temps - debut >= DUREE_MI_TEMPS_S) break;
    }
    e.finPeriode(bilanDeSim(sim));
  };
  periode();
  // Mi-temps : choix sur l'écran du match, puis secondeMiTemps().
  const mt = s.miTemps ?? {};
  if (mt.options) {
    Object.assign(options, mt.options);
    sim.definirOptions(options);
  }
  mt.tactiques?.forEach((t, camp) => {
    if (!t) return;
    forcees[camp] = t;
    sim.definirTactique(camp as 0 | 1, t);
  });
  const e0 = mt.equipe0 ?? s.equipes[0];
  const avant = sim.joueurs.filter((j) => j.camp === 0).map((j) => `${j.joueur.id}@${j.placement.poste}${j.placement.cellule}`).sort().join();
  const apres = e0.composition.map((p) => `${p.joueurId}@${p.poste}${p.cellule}`).sort().join();
  if (avant !== apres) sim.changerEquipe(0, e0);
  if (e0.tactique && !forcees[0]) sim.definirTactique(0, e0.tactique);
  debut = sim.temps;
  sim.commencerPeriode();
  sim.balle?.coupDEnvoi(1, "2e mi-temps");
  periode();
  return { empreinte: e.resultat(), score: [sim.score[0], sim.score[1]] };
};

// ---- Le match par l'arbitre de match, lu dans son film --------------------------

export function imageDeVue(v: VueMatch): Image {
  const touche = v.balle.porteur ?? v.balle.dernier ?? null;
  return {
    temps: v.temps,
    ballon: { x: v.ballon.x, y: v.ballon.y },
    score: [v.score[0], v.score[1]],
    porteur: touche ? v.joueurs.indexOf(touche) : -1,
    joueurs: v.joueurs.map((j) => ({ camp: j.camp, id: j.joueur.id, x: j.pos.x, y: j.pos.y })),
  };
}

function bilanDeFilm(film: Film, v: VueMatch): Bilan {
  const copie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  const b = film.bilan!;
  return { score: [v.score[0], v.score[1]], stats: copie(b.stats), buts: copie(b.buts), tempsPossession: [v.tempsPossession[0], v.tempsPossession[1]], notes: b.notes, joueurs: b.joueurs };
}

/** Le film tel qu'il arriverait par le réseau : en-tête, morceaux de `taille`
 *  images et bilan, chacun passé en JSON (texte) puis relu. */
export function parLeReseau(film: Film, taille: number): Film {
  const recu = new Film(JSON.parse(JSON.stringify(film.entete)));
  for (let i = 0; i < film.images; i += taille) recu.ajouter(morceauDepuisJson(JSON.parse(JSON.stringify(morceauVersJson(film.morceau(i, taille))))));
  if (film.bilan) recu.terminer(JSON.parse(JSON.stringify(film.bilan)));
  return recu;
}

/** Le match joué par l'arbitre local et lu image par image dans son film,
 *  comme le fait l'écran du match depuis le 13/11 au soir. `reseau` : taille
 *  des morceaux si le film passe d'abord « par le réseau » (JSON). */
export function jouerParLArbitre(planifier: Planificateur = planificateurImmediat, reseau?: number): Joueur {
  return (donnees, reglages, s) => {
    const arbitre = new ArbitreLocal(donnees, reglages, planifier);
    const lecteur = new LecteurFilm();
    const e = new Empreinte();
    const options: OptionsInfluences = { ...(s.options ?? { tactiques: true, styles: true }) };
    const tactiques: [string | null, string | null] = [null, null];
    const recevoir = (f: Film) => (reseau ? parLeReseau(f, reseau) : f);
    lecteur.nouveauMatch();
    lecteur.charger(recevoir(arbitre.nouveauMatch(s.equipes, s.graine)));
    e.avantCoupDEnvoi = imageDeVue(lecteur.vue);
    s.tactiquesAvant?.forEach((t, camp) => {
      if (t) tactiques[camp] = t;
    });
    const lire = (f: Film) => {
      const film = recevoir(f);
      if (!film.complet) throw new Error("film incomplet (planificateur différé : attendre la fin du calcul)");
      lecteur.charger(film);
      e.debutPeriode(imageDeVue(lecteur.vue));
      for (let k = 1; k < film.images; k++) {
        lecteur.lire(k);
        e.ajouter(imageDeVue(lecteur.vue));
      }
      e.finPeriode(bilanDeFilm(film, lecteur.vue));
    };
    lire(arbitre.premiereMiTemps({ options: { ...options }, tactiques: [...tactiques] }));
    const mt = s.miTemps ?? {};
    if (mt.options) Object.assign(options, mt.options);
    mt.tactiques?.forEach((t, camp) => {
      if (t) tactiques[camp] = t;
    });
    lire(arbitre.secondeMiTemps({ options: { ...options }, tactiques: [...tactiques], equipe0: mt.equipe0 ?? s.equipes[0] }));
    return { empreinte: e.resultat(), score: [lecteur.vue.score[0], lecteur.vue.score[1]] };
  };
}

export { DUREE_MI_TEMPS_S };
