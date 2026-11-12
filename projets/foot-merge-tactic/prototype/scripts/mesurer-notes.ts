// Mesure l'impact des notes des joueurs (12/11). Notre équipe (camp 0) reçoit
// des notes uniformes (toutes les sous-notes de ses joueurs de champ à N) ;
// l'adversaire n'a pas de notes (65 partout). Tactiques Équilibrées, styles
// coupés. Puis un test « une star » : notre ailier gauche à 90 en Vitesse face
// à leur latéral droit à 55, le reste à 65.
// Matchs complets : deux mi-temps de 180 s (fatigue comprise), comme dans le prototype.
// Lancer : bun run scripts/mesurer-notes.ts [graines] [secondes]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe, Notes } from "../src/sim/types";

const GRAINES = Number(process.argv[2] ?? 60);
const DUREE_S = Number(process.argv[3] ?? 360); // un match : deux mi-temps de 180 s
const MI_TEMPS_S = 180;

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);

const uniformes = (n: number): Notes => ({ acceleration: n, pointe: n, passe: n, dribble: n, precision: n, puissance: n, duel: n, endurance: n });

/** Équipe sans style, tactique Équilibrée, notes données par joueur (undefined : pas de notes). */
function preparer(e: Equipe, notes: (id: string, poste: string) => Partial<Notes> | undefined): Equipe {
  const poste = (id: string) => e.composition.find((p) => p.joueurId === id)?.poste ?? "";
  return { ...e, tactique: "EQU", joueurs: e.joueurs.map((j) => ({ ...j, style: null, notes: poste(j.id) === "G" ? null : (notes(j.id, poste(j.id)) ?? null) })) };
}

interface Mesure {
  v: number;
  n: number;
  d: number;
  buts: number;
  butsContre: number;
  poss: number;
  passes: number;
  reussite: number;
  reussiteAdv: number;
  tirs: number;
  tirsAdv: number;
  dribbles: number;
  tacles: number;
  changements: number;
  /** Test « une star » : ballons de l'ailier dans le camp adverse, tirs de l'équipe dans les 8 s qui suivent. */
  ballonsAilier: number;
  tirsApresAilier: number;
  dribblesAilier: number;
  dribblesReussisAilier: number;
  vitesseMaxAilier: number;
}

function jouer(nous: Equipe, eux: Equipe, graine: number, ailier: string | null): Mesure {
  const sim = new MatchSim(donnees, reglages, [nous, eux], graine, true);
  sim.definirOptions({ tactiques: true, styles: false });
  sim.demarrer();
  const dt = reglages.pasDeTempsS;
  const b = sim.balle!;
  let avant = sim.possession;
  let changements = 0;
  let ballonsAilier = 0;
  let tirsApresAilier = 0;
  let vMax = 0;
  let porteurAvant: string | null = null;
  let finFenetre = -Infinity;
  let tirsAvant = 0;
  let dribblesAilier = 0;
  let dribblesReussisAilier = 0;
  let deuxieme = false;
  for (let t = 0; t < DUREE_S; t += dt) {
    if (!deuxieme && sim.temps >= MI_TEMPS_S) {
      deuxieme = true;
      sim.commencerPeriode();
      b.coupDEnvoi(1, "2e mi-temps");
    }
    const pAvant = b.porteur?.joueur.id ?? null;
    const [dA, rA] = [b.stats.dribbles[0], b.stats.dribblesReussis[0]];
    sim.pas();
    if (ailier && pAvant === ailier) {
      dribblesAilier += b.stats.dribbles[0] - dA;
      dribblesReussisAilier += b.stats.dribblesReussis[0] - rA;
    }
    if (sim.possession !== avant) {
      changements++;
      avant = sim.possession;
    }
    const p = b.porteur;
    const id = p?.joueur.id ?? null;
    if (ailier && p && p.camp === 0 && id === ailier && porteurAvant !== ailier && p.pos.y > donnees.longueurM / 2) {
      ballonsAilier++;
      finFenetre = sim.temps + 8;
    }
    porteurAvant = id;
    if (b.stats.tirs[0] > tirsAvant && sim.temps <= finFenetre) tirsApresAilier += b.stats.tirs[0] - tirsAvant;
    tirsAvant = b.stats.tirs[0];
    if (ailier) {
      const j = sim.joueurs.find((x) => x.camp === 0 && x.joueur.id === ailier)!;
      vMax = Math.max(vMax, Math.hypot(j.vit.x, j.vit.y));
    }
  }
  const s = b.stats;
  const [a, c] = sim.score;
  return {
    v: a > c ? 1 : 0,
    n: a === c ? 1 : 0,
    d: a < c ? 1 : 0,
    buts: a,
    butsContre: c,
    poss: sim.tempsPossession[0] / (sim.tempsPossession[0] + sim.tempsPossession[1]),
    passes: s.passes[0],
    reussite: s.passesReussies[0] / Math.max(1, s.passes[0]),
    reussiteAdv: s.passesReussies[1] / Math.max(1, s.passes[1]),
    tirs: s.tirs[0],
    tirsAdv: s.tirs[1],
    dribbles: s.dribblesReussis[0] / Math.max(1, s.dribbles[0]),
    tacles: s.tacles[0],
    changements: changements / (DUREE_S / 60),
    ballonsAilier,
    tirsApresAilier,
    dribblesAilier,
    dribblesReussisAilier,
    vitesseMaxAilier: vMax,
  };
}

function moyenne(ms: Mesure[]): Mesure {
  const r = {} as Record<keyof Mesure, number>;
  for (const k of Object.keys(ms[0]!) as (keyof Mesure)[]) r[k] = ms.reduce((s, m) => s + m[k], 0) / ms.length;
  return r as Mesure;
}

const pc = (x: number) => `${Math.round(x * 100)} %`;
const f1 = (x: number) => x.toFixed(1);

function ligne(nom: string, m: Mesure): string {
  return `| ${nom} | ${pc(m.v)} / ${pc(m.n)} / ${pc(m.d)} | ${f1(m.buts)} – ${f1(m.butsContre)} | ${pc(m.poss)} | ${pc(m.reussite)} (adv. ${pc(m.reussiteAdv)}) | ${f1(m.tirs)} – ${f1(m.tirsAdv)} | ${pc(m.dribbles)} | ${f1(m.changements)} |`;
}

console.log(`${GRAINES} matchs de ${DUREE_S} s par ligne ; adversaire sans notes (65) ; Équilibrée, styles coupés.\n`);
console.log("| Notre équipe | V / N / D | Buts | Possession | Passes réussies | Tirs | Dribbles réussis | Changements de camp / min |");
console.log("|---|---|---|---|---|---|---|---|");
const graines = Array.from({ length: GRAINES }, (_, i) => 1000 + i);
const eux = preparer(adversaire, () => undefined);

// Contrôle : 65 partout = sans notes (moteur inchangé).
const sansNotes = graines.map((g) => jouer(preparer(effectif, () => undefined), eux, g, null));
const a65 = graines.map((g) => jouer(preparer(effectif, () => uniformes(65)), eux, g, null));
const identique = sansNotes.every((m, i) => JSON.stringify(m) === JSON.stringify(a65[i]));
console.log(ligne("Sans notes", moyenne(sansNotes)));
for (const n of [60, 70, 75, 80]) console.log(ligne(`${n} partout`, moyenne(graines.map((g) => jouer(preparer(effectif, () => uniformes(n)), eux, g, null)))));
// Une seule note à 80 (ses deux sous-notes ; endurance à part : sans effet pour l'instant).
const seules: [string, Partial<Notes>][] = [
  ["Vitesse 80", { acceleration: 80, pointe: 80 }],
  ["Technique 80", { passe: 80, dribble: 80 }],
  ["Tir 80", { precision: 80, puissance: 80 }],
  ["Duel 80", { duel: 80 }],
];
for (const [nom, n] of seules) console.log(ligne(`${nom} seule`, moyenne(graines.map((g) => jouer(preparer(effectif, () => n), eux, g, null)))));
console.log(`\n65 partout identique à « sans notes » : ${identique ? "oui" : "NON"}`);

// Une star : notre ailier gauche rapide contre leur latéral droit lent.
const ailier = effectif.composition.find((p) => p.poste === "AG")?.joueurId ?? null;
const lateral = adversaire.composition.find((p) => p.poste === "DD")?.joueurId ?? null;
if (ailier && lateral) {
  const base = moyenne(graines.map((g) => jouer(preparer(effectif, () => undefined), eux, g, ailier)));
  const star = moyenne(
    graines.map((g) =>
      jouer(
        preparer(effectif, (id) => (id === ailier ? { acceleration: 90, pointe: 90 } : undefined)),
        preparer(adversaire, (id) => (id === lateral ? { acceleration: 55, pointe: 55 } : undefined)),
        g,
        ailier,
      ),
    ),
  );
  console.log(`\nUne star (ailier gauche ${ailier} à 90 en Vitesse, latéral droit adverse ${lateral} à 55) :`);
  console.log("| | Ballons de l'ailier dans le camp adverse | Ses dribbles (réussis) | Tirs dans les 8 s | Tirs de l'équipe | Buts | Vitesse max de l'ailier |");
  console.log("|---|---|---|---|---|---|---|");
  for (const [nom, m] of [["Tout à 65", base], ["Star", star]] as const) console.log(`| ${nom} | ${f1(m.ballonsAilier)} | ${f1(m.dribblesAilier)} (${f1(m.dribblesReussisAilier)}) | ${f1(m.tirsApresAilier)} | ${f1(m.tirs)} | ${f1(m.buts)} – ${f1(m.butsContre)} | ${f1(m.vitesseMaxAilier)} m/s |`);
}
