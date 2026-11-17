// Charnière centrale (14/11, concepteur : « les défenseurs centraux, souvent
// quand il y en a deux, ils sont trop excentrés ; il faut une charnière très
// très proche ; on ne joue jamais avec des défenseurs centraux proches des
// latéraux »). Mesure, pour chaque équipe qui a deux défenseurs centraux ou plus :
// écart entre les deux DC les plus proches de l'axe, et distance de chaque DC au
// latéral le plus proche, avec et sans le ballon.
// Lancer : bun run scripts/mesurer-charniere.ts [graines] [secondes]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

const GRAINES = Number(process.argv[2] ?? 12);
const DUREE_S = Number(process.argv[3] ?? 180);
const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const W = donnees.largeurM;

const t = { attaque: { ecart: 0, lat: 0, axe: 0, n: 0 }, defense: { ecart: 0, lat: 0, axe: 0, n: 0 } };
for (let g = 1; g <= GRAINES; g++) {
  const m = new MatchSim(donnees, reglages, [effectif, adversaire], g, true);
  m.definirOptions({ tactiques: true, styles: false });
  m.demarrer();
  for (let s = 0; s < DUREE_S; s += reglages.pasDeTempsS) {
    m.pas();
    if (Math.round(s * 30) % 15) continue; // une mesure toutes les 0,5 s
    for (const camp of [0, 1] as const) {
      const dc = m.joueurs.filter((j) => j.camp === camp && j.poste.id === "DC").sort((a, b) => a.pos.x - b.pos.x);
      const lat = m.joueurs.filter((j) => j.camp === camp && (j.poste.id === "DG" || j.poste.id === "DD"));
      if (dc.length < 2 || !lat.length) continue;
      const phase = dc[0]!.phase === "attaque" ? t.attaque : t.defense;
      // Les deux DC extrêmes (charnière) ; distance au latéral le plus proche.
      phase.ecart += dc[dc.length - 1]!.pos.x - dc[0]!.pos.x;
      phase.lat += Math.min(...dc.map((d) => Math.min(...lat.map((l) => Math.abs(l.pos.x - d.pos.x)))));
      const centre = dc.reduce((s2, d) => s2 + d.pos.x, 0) / dc.length;
      phase.axe += Math.abs(centre - W / 2);
      phase.n++;
    }
  }
}
console.log(`${GRAINES} matchs de ${DUREE_S} s, Équilibrée contre l'adversaire de démonstration :`);
console.log("| Phase | Écart entre les DC | DC – latéral le plus proche | Centre de la charnière – axe |\n|---|---|---|---|");
for (const [nom, p] of [["avec le ballon", t.attaque], ["sans le ballon", t.defense]] as const) {
  console.log(`| ${nom} | ${(p.ecart / p.n).toFixed(1)} m | ${(p.lat / p.n).toFixed(1)} m | ${(p.axe / p.n).toFixed(1)} m |`);
}
