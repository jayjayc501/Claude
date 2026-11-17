// Mesure des bonus (14/11) : fusions, paliers de style (3 et 5) et de pays
// (5 et 8). Deux équipes identiques (l'adversaire de démonstration, notes à 65)
// s'affrontent ; seule l'équipe A reçoit le bonus mesuré. Matchs complets
// (2 × 180 s), mêmes graines pour chaque configuration ; chaque graine est
// jouée deux fois, A à gauche puis à droite (le côté du terrain ne compte plus).
//
// Lancer : bun run scripts/mesurer-bonus.ts [avant|apres] [graines] [filtre, ex. "fusion|pays"]
//   avant : règles d'avant le 14/11 (fusion = +4 par niveau sur les notes de
//           la carte ; style = accent dans les notes de la carte) ;
//   apres : règles du 14/11 (fusion et style en bonus caché du moteur).

import { jouerMatch } from "../src/jeu/championnat";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe, Joueur, Notes } from "../src/sim/types";

const REGLE = process.argv[2] === "avant" ? "avant" : "apres";
const GRAINES = Number(process.argv[3] ?? 40);
const FILTRE = process.argv[4] ?? "";
const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { adversaire } = chargerEquipes(donnees);

const SOUS = ["acceleration", "pointe", "passe", "dribble", "precision", "puissance", "duel", "endurance"] as const;
/** Accent du style dans les notes de la carte, avant le 14/11 (scripts/generer-cartes.py). */
const ACCENT: Record<string, number[]> = {
  RAP: [6, 6, 0, 0, 0, 0, -2, 0],
  TEC: [0, 0, 5, 6, 0, 0, -3, 0],
  REM: [-2, 0, 0, -3, 0, 0, 7, 0],
  REC: [0, 0, -1, 0, 0, 0, 4, 6],
};
const PAYS = ["FRA", "ESP", "ENG", "GER", "ITA"];

const titulaires = adversaire.composition.map((p) => p.joueurId);
const champ = adversaire.composition.filter((p) => p.poste !== "G").map((p) => p.joueurId);
/** Le joueur suivi pour les fusions : l'ailier ou l'attaquant le plus haut. */
const suivi = adversaire.composition.find((p) => p.poste === "AG") ?? adversaire.composition.find((p) => p.poste === "AC")!;

/** Équipe de base : pays répartis (3 au plus par pays : aucun palier). */
function base(nom: string): Equipe {
  return {
    ...adversaire,
    nom,
    tactique: "EQU",
    joueurs: adversaire.joueurs.map((j) => ({ ...j, style: null, notes: null, pays: PAYS[titulaires.indexOf(j.id) % 5] }) as Joueur),
  };
}

type Modif = (e: Equipe) => void;
const avecNotes = (j: Joueur, plus: number[]) => {
  const n: Partial<Notes> = { ...(j.notes ?? {}) };
  SOUS.forEach((k, i) => (n[k] = (n[k] ?? 65) + (plus[i] ?? 0)));
  j.notes = n;
};
const joueur = (e: Equipe, id: string) => e.joueurs.find((j) => j.id === id)!;

function fusion(niveau: number): Modif {
  return (e) => {
    const j = joueur(e, suivi.joueurId);
    if (REGLE === "avant") avecNotes(j, SOUS.map(() => 4 * niveau));
    else (j as Joueur & { fusions?: number }).fusions = niveau;
  };
}

/** Joueurs de champ répartis sur tout le terrain (défense, milieu, attaque). */
const REPARTIS = [champ[1], champ[5], champ[champ.length - 1], champ[3], champ[7], champ[0], champ[8], champ[2], champ[4], champ[6]].filter(Boolean) as string[];

function style(code: string, n: number): Modif {
  // Joueurs répartis du fond vers l'avant.
  const ordre = REPARTIS;
  return (e) => {
    for (const id of ordre.slice(0, n)) {
      const j = joueur(e, id);
      j.style = code;
      if (REGLE === "avant") avecNotes(j, ACCENT[code]!);
    }
  };
}

function pays(code: string, n: number): Modif {
  return (e) => {
    // Compatriotes répartis sur le terrain, plus le gardien.
    const ids = [...REPARTIS.slice(0, n - 1), adversaire.composition.find((p) => p.poste === "G")!.joueurId];
    for (const j of e.joueurs) {
      if (!titulaires.includes(j.id)) continue;
      (j as Joueur & { pays?: string }).pays = ids.includes(j.id) ? code : PAYS.filter((x) => x !== code)[titulaires.indexOf(j.id) % 4];
    }
  };
}

const SCENARIOS: [string, Modif][] = [
  ["témoin (aucun bonus)", () => {}],
  ["fusion ×1 (ailier)", fusion(1)],
  ["fusion ×2 (ailier)", fusion(2)],
  ["fusion ×3 (ailier)", fusion(3)],
  ...["REC", "TEC", "RAP", "REM"].flatMap((s) => [
    [`style ${s} ×3`, style(s, 3)] as [string, Modif],
    [`style ${s} ×5`, style(s, 5)] as [string, Modif],
  ]),
  ["pays FRA ×5 (cohésion)", pays("FRA", 5)],
  ...PAYS.map((p) => [`pays ${p} ×8 (cohésion + tradition)`, pays(p, 8)] as [string, Modif]),
];

interface Res {
  v: number;
  n: number;
  d: number;
  bp: number;
  bc: number;
  touches: number;
  tirs: number;
  buts: number;
  dribbles: number;
  dribblesOk: number;
}

function mesurer(modif: Modif, suivreJoueur: boolean): Res {
  const r: Res = { v: 0, n: 0, d: 0, bp: 0, bc: 0, touches: 0, tirs: 0, buts: 0, dribbles: 0, dribblesOk: 0 };
  for (let k = 0; k < 2 * GRAINES; k++) {
    const g = 1 + (k >> 1);
    const cote = k & 1; // 0 : A à gauche (camp 0) ; 1 : A à droite (camp 1)
    const a = structuredClone(base("A"));
    modif(a);
    const b = base("B");
    const equipes: [Equipe, Equipe] = cote ? [b, a] : [a, b];
    let score: [number, number];
    if (suivreJoueur) {
      // Match complet pas à pas pour compter les ballons touchés par le joueur suivi.
      const sim = new MatchSim(donnees, reglages, equipes, g, true);
      sim.demarrer();
      let dernier: unknown = null;
      for (let mt = 0; mt < 2; mt++) {
        if (mt === 1) {
          sim.commencerPeriode();
          sim.balle?.coupDEnvoi(1, "2e mi-temps");
        }
        const fin = sim.temps + 180;
        while (sim.temps < fin - 1e-9) {
          sim.pas();
          const p = sim.balle?.porteur ?? null;
          if (p && p !== dernier && p.camp === cote && p.joueur.id === suivi.joueurId) r.touches++;
          dernier = p;
        }
      }
      const st = sim.balle!.statsJoueurs.get(`${cote}:${suivi.joueurId}`);
      if (st) {
        r.tirs += st.tirs;
        r.buts += st.buts;
        r.dribbles += st.dribbles;
        r.dribblesOk += st.dribblesReussis;
      }
      score = [sim.score[0], sim.score[1]];
    } else score = jouerMatch(donnees, reglages, equipes, g);
    if (cote) score = [score[1], score[0]];
    r.bp += score[0];
    r.bc += score[1];
    if (score[0] > score[1]) r.v++;
    else if (score[0] === score[1]) r.n++;
    else r.d++;
  }
  return r;
}

const N = 2 * GRAINES;
const pc = (x: number) => `${Math.round((100 * x) / N)} %`;
console.log(`Règles « ${REGLE} », ${N} matchs complets par configuration (A avec le bonus contre B sans bonus, ${GRAINES} graines × 2 côtés)`);
console.log("| Configuration | Victoires A | Nuls | Défaites | Buts A – B | Ballons touchés* | Tirs* | Buts* | Dribbles réussis* |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const [nom, modif] of SCENARIOS) {
  if (FILTRE && !FILTRE.split("|").some((f) => nom.includes(f))) continue;
  const suivreJoueur = nom.startsWith("fusion") || nom.startsWith("témoin");
  const r = mesurer(modif, suivreJoueur);
  const j = suivreJoueur ? `${(r.touches / N).toFixed(1)} | ${(r.tirs / N).toFixed(2)} | ${(r.buts / N).toFixed(2)} | ${r.dribbles ? Math.round((100 * r.dribblesOk) / r.dribbles) : 0} % de ${(r.dribbles / N).toFixed(1)}` : "— | — | — | —";
  console.log(`| ${nom} | ${pc(r.v)} | ${pc(r.n)} | ${pc(r.d)} | ${(r.bp / N).toFixed(2)} – ${(r.bc / N).toFixed(2)} | ${j} |`);
}
console.log("* par match, pour l'ailier suivi (fusions et témoin seulement).");
