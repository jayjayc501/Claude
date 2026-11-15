// Temps de calcul d'une mi-temps par l'arbitre (préparation de l'arbitre serveur, 15/11)
// et taille du film en JSON. bun run scripts/mesurer-arbitre.ts [graines]
import { gzipSync } from "node:zlib";
import { ArbitreLocal, planificateurImmediat } from "../src/match/arbitreLocal";
import { morceauVersJson } from "../src/match/film";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";

const n = Number(process.argv[2] ?? 3);
const donnees = chargerDonnees();
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
for (let g = 1; g <= n; g++) {
  const arbitre = new ArbitreLocal(donnees, reglages, planificateurImmediat);
  const t0 = performance.now();
  arbitre.nouveauMatch([effectif, adversaire], 1000 + g);
  const f1 = arbitre.premiereMiTemps({ options: { tactiques: true, styles: true }, tactiques: [null, null] });
  const t1 = performance.now();
  const f2 = arbitre.secondeMiTemps({ options: { tactiques: true, styles: true }, tactiques: [null, null], equipe0: effectif });
  const t2 = performance.now();
  const json = JSON.stringify({ entete: f1.entete, morceaux: [morceauVersJson(f1.morceau(0, f1.images))], bilan: f1.bilan });
  const t3 = performance.now();
  const gz = gzipSync(json);
  const t4 = performance.now();
  console.log(`graine ${1000 + g} : 1re mi-temps ${(t1 - t0).toFixed(0)} ms, 2e ${(t2 - t1).toFixed(0)} ms, ${f1.images} images ; JSON ${(json.length / 1e6).toFixed(2)} Mo en ${(t3 - t2).toFixed(0)} ms, gzip ${(gz.length / 1e6).toFixed(2)} Mo en ${(t4 - t3).toFixed(0)} ms ; score ${f2.bilan?.stats ? "ok" : "?"}`);
}
