// Arbitre local (13/11 au soir) : calcule le match sur le téléphone, avec le
// moteur, par petits morceaux et en avance sur l'affichage : l'écran ne gèle
// jamais, même au coup d'envoi sur un téléphone lent. Il appelle le moteur
// exactement comme le faisait l'ancien écran du match (mêmes appels, même
// ordre) : même graine et mêmes choix = même match, au bit près.

import type { Donnees } from "../sim/donnees";
import { MatchSim } from "../sim/simulation";
import type { Equipe, Reglages } from "../sim/types";
import { type ArbitreMatch, type ChoixEcran, type ChoixMiTemps, DUREE_MI_TEMPS_S } from "./arbitre";
import { type BilanMiTemps, COLONNES_BALLON, COLONNES_ETAT, DRAPEAU_ARRET, DRAPEAU_TRANSITION, ETAT, type EnTeteFilm, type EvenementFilm, Film, type MorceauFilm, VERSION_FILM } from "./film";

/** Fait tourner une tâche jusqu'à ce qu'elle renvoie false (une tâche = un morceau de film). */
export type Planificateur = (tache: () => boolean) => void;

/** Durée d'une tranche de calcul (ms) avant de rendre la main au navigateur. */
const TRANCHE_MS = 4;
/** Pas de simulation par morceau (1/3 s de jeu). */
const PAS_PAR_MORCEAU = 10;

/** Navigateur : des tranches de quelques millisecondes, entre lesquelles
 *  le navigateur dessine et répond aux touchers. */
export const planificateurNavigateur: Planificateur = (tache) => {
  const tranche = () => {
    const fin = performance.now() + TRANCHE_MS;
    do {
      if (!tache()) return;
    } while (performance.now() < fin);
    setTimeout(tranche, 0);
  };
  setTimeout(tranche, 0);
};

/** Tests et matchs sans affichage : tout, tout de suite. */
export const planificateurImmediat: Planificateur = (tache) => {
  while (tache());
};

export class ArbitreLocal implements ArbitreMatch {
  private sim: MatchSim | null = null;
  /** Calcul en cours : son jeton d'annulation et sa tâche (pour le finir d'un coup si besoin). */
  private calcul: { annule: boolean; tache: () => boolean } | null = null;

  constructor(
    private readonly donnees: Donnees,
    private readonly reglages: Reglages,
    private readonly planifier: Planificateur = planificateurNavigateur,
  ) {}

  nouveauMatch(equipes: [Equipe, Equipe], graine: number): Film {
    this.arreter();
    // Copie du tableau : le moteur y range ton équipe changée à la mi-temps.
    this.sim = new MatchSim(this.donnees, this.reglages, [equipes[0], equipes[1]], graine, true);
    const film = new Film(this.entete(0, false));
    const enr = new Enregistreur(this.sim, film);
    enr.image();
    enr.livrer();
    return film;
  }

  premiereMiTemps(choix: ChoixEcran): Film {
    const sim = this.moteur();
    sim.definirOptions(choix.options);
    choix.tactiques.forEach((t, camp) => {
      if (t) sim.definirTactique(camp as 0 | 1, t);
    });
    sim.demarrer();
    return this.filmer(1, false);
  }

  secondeMiTemps(choix: ChoixMiTemps): Film {
    const sim = this.moteur();
    // La 1re mi-temps doit être finie : si son calcul traîne encore, on le termine.
    while (this.calcul && !this.calcul.annule && this.calcul.tache());
    // Choix faits sur l'écran du match pendant la mi-temps.
    sim.definirOptions(choix.options);
    choix.tactiques.forEach((t, camp) => {
      if (t) sim.definirTactique(camp as 0 | 1, t);
    });
    // Changements faits sur l'écran de préparation (places, remplaçants), puis tactique de l'équipe.
    const e = choix.equipe0;
    const avant = sim.joueurs.filter((j) => j.camp === 0).map((j) => `${j.joueur.id}@${j.placement.poste}${j.placement.cellule}`).sort().join();
    const apres = e.composition.map((p) => `${p.joueurId}@${p.poste}${p.cellule}`).sort().join();
    const changee = avant !== apres;
    if (changee) sim.changerEquipe(0, e);
    if (e.tactique && !choix.tactiques[0]) sim.definirTactique(0, e.tactique);
    // L'adversaire engage la 2e mi-temps.
    sim.commencerPeriode();
    sim.balle?.coupDEnvoi(1, "2e mi-temps");
    return this.filmer(2, changee);
  }

  arreter(): void {
    if (this.calcul) this.calcul.annule = true;
    this.calcul = null;
  }

  private moteur(): MatchSim {
    if (!this.sim) throw new Error("Pas de match : appeler nouveauMatch d'abord");
    return this.sim;
  }

  private entete(periode: 0 | 1 | 2, equipeChangee: boolean): EnTeteFilm {
    const sim = this.moteur();
    return {
      version: VERSION_FILM,
      periode,
      pasDeTempsS: this.reglages.pasDeTempsS,
      dureeS: DUREE_MI_TEMPS_S,
      joueurs: sim.joueurs.map((j) => ({ camp: j.camp, id: j.joueur.id, nom: j.joueur.nom, poste: j.poste.id, cellule: j.placement.cellule })),
      equipeChangee,
      tactiques: [sim.tactiques[0], sim.tactiques[1]],
    };
  }

  /** Calcule une mi-temps : l'image du coup d'envoi tout de suite, puis le
   *  reste par morceaux, jusqu'à 180 s de jeu (même règle que l'ancien écran :
   *  on s'arrête après le pas qui atteint 180 s). */
  private filmer(periode: 1 | 2, equipeChangee: boolean): Film {
    this.arreter();
    const sim = this.moteur();
    const film = new Film(this.entete(periode, equipeChangee));
    const debut = sim.temps;
    const enr = new Enregistreur(sim, film);
    enr.image();
    enr.livrer();
    const calcul = {
      annule: false,
      tache: (): boolean => {
        if (calcul.annule || film.complet) return false;
        for (let i = 0; i < PAS_PAR_MORCEAU; i++) {
          sim.pas();
          enr.image();
          if (sim.temps - debut >= DUREE_MI_TEMPS_S) {
            enr.livrer();
            film.terminer(bilanDe(sim));
            if (this.calcul === calcul) this.calcul = null;
            return false;
          }
        }
        enr.livrer();
        return true;
      },
    };
    this.calcul = calcul;
    // Un premier petit morceau tout de suite (quelques millisecondes), le reste en arrière-plan.
    if (calcul.tache()) this.planifier(calcul.tache);
    return film;
  }
}

/** Bilan d'une mi-temps : statistiques, buteurs, notes et forme. */
function bilanDe(sim: MatchSim): BilanMiTemps {
  const b = sim.balle!;
  return {
    stats: structuredClone(b.stats),
    buts: b.buts.map((x) => ({ ...x })),
    notes: sim.notesDuMatch(),
    joueurs: sim.joueurs.map((j) => ({ camp: j.camp, id: j.joueur.id, forme: sim.forme(j), note: sim.noteDe(j) })),
  };
}

/** Recopie l'état du moteur, image après image, dans des morceaux de film. */
class Enregistreur {
  private readonly nj: number;
  private m: MorceauFilm;
  private suivante = 0;
  /** Dernier événement enregistré (undefined : aucun encore dans ce film). */
  private dernierEv: { texte: string; a: number } | null | undefined = undefined;
  /** Actions de style déjà recopiées (celles des mi-temps précédentes sont sautées). */
  private actionsVues: number;

  constructor(
    private readonly sim: MatchSim,
    private readonly film: Film,
  ) {
    this.nj = film.entete.joueurs.length;
    this.actionsVues = sim.balle?.actionsStyle.length ?? 0;
    this.m = this.nouveau();
  }

  private nouveau(): MorceauFilm {
    const c = PAS_PAR_MORCEAU + 1;
    return {
      premiere: this.suivante,
      n: 0,
      temps: new Float64Array(c),
      positions: new Float64Array(c * 2 * this.nj),
      ballon: new Float64Array(c * COLONNES_BALLON),
      possessionS: new Float64Array(c * 2),
      lignes: new Float64Array(c * 2),
      etat: new Int32Array(c * COLONNES_ETAT),
      evenements: [],
      actions: [],
    };
  }

  /** Ajoute l'état présent du moteur comme image suivante. */
  image(): void {
    const s = this.sim;
    const b = s.balle!;
    const m = this.m;
    const k = m.n;
    const nj = this.nj;
    m.temps[k] = s.temps;
    for (let i = 0; i < nj; i++) {
      const p = s.joueurs[i]!.pos;
      m.positions[(k * nj + i) * 2] = p.x;
      m.positions[(k * nj + i) * 2 + 1] = p.y;
    }
    const o = k * COLONNES_BALLON;
    m.ballon[o] = s.ballon.x;
    m.ballon[o + 1] = s.ballon.y;
    m.ballon[o + 2] = b.hauteur;
    m.ballon[o + 3] = b.vit.x;
    m.ballon[o + 4] = b.vit.y;
    m.possessionS[k * 2] = s.tempsPossession[0];
    m.possessionS[k * 2 + 1] = s.tempsPossession[1];
    m.lignes[k * 2] = s.lignesDef[0] ?? Number.NaN;
    m.lignes[k * 2 + 1] = s.lignesDef[1] ?? Number.NaN;
    const e = k * COLONNES_ETAT;
    m.etat[e + ETAT.porteur] = b.porteur ? s.joueurs.indexOf(b.porteur) : -1;
    m.etat[e + ETAT.dernier] = b.dernier ? s.joueurs.indexOf(b.dernier) : -1;
    m.etat[e + ETAT.score0] = s.score[0];
    m.etat[e + ETAT.score1] = s.score[1];
    m.etat[e + ETAT.possession] = s.possession;
    m.etat[e + ETAT.phase0] = s.phases[0] === "attaque" ? 1 : 0;
    m.etat[e + ETAT.phase1] = s.phases[1] === "attaque" ? 1 : 0;
    m.etat[e + ETAT.drapeaux] = (s.enTransition ? DRAPEAU_TRANSITION : 0) | (b.arretDeJeu ? DRAPEAU_ARRET : 0);
    m.etat[e + ETAT.passes0] = b.stats.passes[0];
    m.etat[e + ETAT.passes1] = b.stats.passes[1];
    m.etat[e + ETAT.reussies0] = b.stats.passesReussies[0];
    m.etat[e + ETAT.reussies1] = b.stats.passesReussies[1];
    const ev = b.evenement;
    const avant = this.dernierEv;
    if (avant === undefined || (ev === null) !== (avant === null) || (ev && avant && (ev.texte !== avant.texte || ev.a !== avant.a))) {
      const note: EvenementFilm = { image: this.suivante, texte: ev ? ev.texte : null, a: ev ? ev.a : 0 };
      m.evenements.push(note);
      this.dernierEv = ev ? { texte: ev.texte, a: ev.a } : null;
    }
    // Actions réussies grâce à un style depuis l'image précédente (14/11).
    while (this.actionsVues < b.actionsStyle.length) {
      const a = b.actionsStyle[this.actionsVues++]!;
      const joueur = s.joueurs.findIndex((j) => j.camp === a.camp && j.joueur.id === a.id);
      if (joueur >= 0) m.actions.push({ image: this.suivante, joueur, style: a.style });
    }
    m.n++;
    this.suivante++;
  }

  /** Envoie au film les images en attente (morceau à la taille exacte). */
  livrer(): void {
    const m = this.m;
    if (!m.n) return;
    const nj = this.nj;
    this.film.ajouter({
      premiere: m.premiere,
      n: m.n,
      temps: m.temps.slice(0, m.n),
      positions: m.positions.slice(0, m.n * 2 * nj),
      ballon: m.ballon.slice(0, m.n * COLONNES_BALLON),
      possessionS: m.possessionS.slice(0, m.n * 2),
      lignes: m.lignes.slice(0, m.n * 2),
      etat: m.etat.slice(0, m.n * COLONNES_ETAT),
      evenements: m.evenements,
      actions: m.actions,
    });
    this.m = this.nouveau();
  }
}
