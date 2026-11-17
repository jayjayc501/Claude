// Jeu dans les couloirs (14/11, concepteur : « les latéraux participent pas
// assez au jeu, ils ne montent jamais » ; « les ailiers jamais repiquent au
// centre pour aller marquer, ils ont leur couloir, c'est trop robotisé »).
// Mesure, par équipe et par mi-temps de 180 s : où sont les latéraux (moitié
// adverse, dernier tiers), ce qu'ils touchent devant, ce que font les ailiers
// (ballons touchés dans l'axe du dernier tiers, tirs, buts, dribbles), et les
// montées et repiquages comptés par le moteur (0 avant le 14/11).
// Lancer : bun run scripts/mesurer-couloirs.ts [graines] [secondes]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

const GRAINES = Number(process.argv[2] ?? 30);
const DUREE_S = Number(process.argv[3] ?? 180);
const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const L = donnees.longueurM;
const W = donnees.largeurM;

const LAT = new Set(["DG", "DD"]);
const AIL = new Set(["AG", "AD"]);
const t = {
  pasLat: 0, latMoitie: 0, latTiers: 0, latTouchesTiers: 0,
  ailTouches: 0, ailTouchesAxe: 0, ailTirs: 0, ailButs: 0, ailDribbles: 0,
  buts: 0, tirs: 0, montees: 0, repiquages: 0, equipes: 0,
};
for (let g = 1; g <= GRAINES; g++) {
  const m = new MatchSim(donnees, reglages, [effectif, adversaire], g, true);
  m.definirOptions({ tactiques: true, styles: false });
  m.demarrer();
  const b = m.balle!;
  let dernier: unknown = null;
  for (let s = 0; s < DUREE_S; s += reglages.pasDeTempsS) {
    m.pas();
    for (const j of m.joueurs) {
      if (!LAT.has(j.poste.id)) continue;
      const prof = j.camp === 0 ? j.pos.y : L - j.pos.y;
      t.pasLat++;
      if (prof > L / 2) t.latMoitie++;
      if (prof > (2 * L) / 3) t.latTiers++;
    }
    const p = b.porteur;
    if (p && p !== dernier) {
      const prof = p.camp === 0 ? p.pos.y : L - p.pos.y;
      if (LAT.has(p.poste.id) && prof > (2 * L) / 3) t.latTouchesTiers++;
      if (AIL.has(p.poste.id)) {
        t.ailTouches++;
        if (prof > (2 * L) / 3 && Math.abs(p.pos.x - W / 2) < 16) t.ailTouchesAxe++;
      }
    }
    dernier = p;
  }
  for (const j of m.joueurs) {
    const st = b.statsJoueurs.get(`${j.camp}:${j.joueur.id}`);
    if (!st || !AIL.has(j.poste.id)) continue;
    t.ailTirs += st.tirs;
    t.ailButs += st.buts;
    t.ailDribbles += st.dribbles;
  }
  const extra = b.stats as unknown as { montees?: number[]; repiquages?: number[] };
  t.montees += (extra.montees?.[0] ?? 0) + (extra.montees?.[1] ?? 0);
  t.repiquages += (extra.repiquages?.[0] ?? 0) + (extra.repiquages?.[1] ?? 0);
  t.tirs += b.stats.tirs[0] + b.stats.tirs[1];
  t.buts += m.score[0] + m.score[1];
  t.equipes += 2;
}
const e = t.equipes;
const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))} %`;
console.log(`${GRAINES} matchs de ${DUREE_S} s (Équilibrée contre l'adversaire de démonstration, styles coupés), par équipe :`);
console.log("| Mesure | Valeur |\n|---|---|");
console.log(`| Latéraux : temps dans la moitié adverse | ${pct(t.latMoitie, t.pasLat)} |`);
console.log(`| Latéraux : temps dans le dernier tiers | ${pct(t.latTiers, t.pasLat)} |`);
console.log(`| Latéraux : ballons touchés dans le dernier tiers | ${(t.latTouchesTiers / e).toFixed(1)} |`);
console.log(`| Montées de latéral (moteur) | ${(t.montees / e).toFixed(1)} |`);
console.log(`| Ailiers : ballons touchés | ${(t.ailTouches / e).toFixed(1)} |`);
console.log(`| Ailiers : ballons touchés dans l'axe du dernier tiers | ${(t.ailTouchesAxe / e).toFixed(1)} |`);
console.log(`| Repiquages d'ailier (moteur) | ${(t.repiquages / e).toFixed(1)} |`);
console.log(`| Ailiers : tirs, buts, dribbles | ${(t.ailTirs / e).toFixed(2)} · ${(t.ailButs / e).toFixed(2)} · ${(t.ailDribbles / e).toFixed(1)} |`);
console.log(`| Tous : tirs et buts (2 équipes, par mi-temps de 180 s) | ${((t.tirs / e) * 2).toFixed(1)} · ${((t.buts / e) * 2).toFixed(2)} |`);
