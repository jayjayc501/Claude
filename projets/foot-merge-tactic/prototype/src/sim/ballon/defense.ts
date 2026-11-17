// Défense : tacles et fautes sur le porteur, pressing (un presse, un couvre, un
// ferme l'intérieur), contre-pressing juste après la perte, fermeture des lignes
// de passe, et marquage dans la surface quand le ballon approche du but.

import { PARAMETRES_NOTES as PN } from "../notes";
import type { Camp, JoueurSim } from "../simulation";
import type { Reglages } from "../types";
import type { BallonReel } from "../ballon";
import { dist } from "./outils";
import { noterStyle, statsJoueur } from "./stats";

// --- Duels sur le porteur ------------------------------------------------------

/** Les adversaires proches du porteur tentent le tacle (probabilité par seconde). */
export function tacler(b: BallonReel, dt: number): void {
  const p = b.porteur!;
  const s = b.sim;
  for (const o of s.joueurs) {
    if (o.camp === p.camp || o.poste.id === "G") continue;
    const t = s.reg(o.camp).ballon.tacle;
    if (dist(o.pos, p.pos) > t.rayonM) continue;
    const f = s.temps < b.protegeJusqua ? s.reg(p.camp).ballon.protection.facteurTacle * p.effet.protection : 1;
    // Contre-pressing : juste après la perte, on va au duel plus franchement.
    const cp = s.reg(o.camp).ballon.contrePressing;
    const contre = b.perte !== null && b.perte.camp === o.camp && s.temps - b.perte.a < cp.dureeS ? cp.tacleFois : 1;
    // Notes : duel du défenseur contre dribble du porteur.
    const n = Math.exp((o.notes.duel - p.notes.dribble) * PN.physique.tacleParPoint);
    if (b.rng.suivant() < 1 - Math.exp(-t.parSeconde * o.effet.tacle * f * contre * n * dt)) {
      duelGagne(b, o);
      return;
    }
  }
}

/** Un défenseur gagne un duel sur le porteur : tacle propre, ou faute
 *  (coup franc, penalty si c'est dans sa surface). */
export function duelGagne(b: BallonReel, o: JoueurSim): void {
  const s = b.sim;
  const r = s.reglages.ballon;
  const p = b.porteur!;
  // Un défenseur dépassé (duel sous le dribble du porteur) fait plus de fautes.
  const n = Math.exp(-(o.notes.duel - p.notes.dribble) * PN.physique.fautesParPoint);
  if (b.rng.suivant() >= s.reg(o.camp).ballon.fautes.proba * o.effet.fautes * n) {
    b.stats.tacles[o.camp]++;
    statsJoueur(b, o).tacles++;
    noterStyle(b, o, ["REC", "REM"]);
    b.donner(o);
    return;
  }
  b.stats.fautes[o.camp]++;
  statsJoueur(b, o).fautes++;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const deSonBut = o.camp === 0 ? p.pos.y : L - p.pos.y; // distance au but du fautif
  if (deSonBut <= r.surface.profondeurM && Math.abs(p.pos.x - W / 2) <= r.surface.demiLargeurM) {
    b.stats.penalties[p.camp]++;
    b.remettre({ x: W / 2, y: o.camp === 0 ? 11 : L - 11 }, p.camp, "penalty", "Penalty");
    return;
  }
  b.remettre({ x: Math.min(W - 1, Math.max(1, p.pos.x)), y: p.pos.y }, p.camp, "coupFranc", "Faute");
}

// --- Courses de l'équipe qui défend -------------------------------------------

/** L'équipe qui défend va sur le porteur : contre-pressing juste après la
 *  perte, pressing normal sinon (selon la tactique de l'équipe qui défend). */
export function defendrePorteur(b: BallonReel, p: JoueurSim): void {
  const s = b.sim;
  const defense: Camp = p.camp === 0 ? 1 : 0;
  const rd = s.reg(defense).ballon;
  const cp = rd.contrePressing;
  const contre = b.perte !== null && b.perte.camp !== p.camp && s.temps - b.perte.a < cp.dureeS;
  if (contre) contrePresser(b, p, rd);
  else presser(b, p, rd);
}

/** Contre-pressing (référence §4) : juste après la perte, les plus proches
 *  attaquent le porteur en sprint : un presse, un ferme la passe vers
 *  l'avant, un ferme l'intérieur. Sinon l'équipe se replie normalement. */
function contrePresser(b: BallonReel, p: JoueurSim, rd: Reglages["ballon"]): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const sens = p.camp === 0 ? 1 : -1;
  const cp = rd.contrePressing;
  const fin = b.perte!.a + cp.dureeS;
  const vers = W / 2 - p.pos.x > 0 ? 1 : -1;
  const places = [
    { ...s.ballon },
    { x: s.ballon.x, y: s.ballon.y + sens * 5 },
    { x: s.ballon.x + vers * 5, y: s.ballon.y + sens * 2 },
    { x: s.ballon.x - vers * 5, y: s.ballon.y + sens * 2 }, // contre-pressing renforcé : ferme l'extérieur
    { x: s.ballon.x, y: s.ballon.y + sens * 10 }, // et la passe longue vers l'avant
  ];
  s.joueurs
    .filter((j) => j.camp !== p.camp && j.poste.id !== "G" && dist(j.pos, p.pos) < cp.rayonM)
    .sort((a, c) => dist(a.pos, p.pos) - dist(c.pos, p.pos))
    .slice(0, cp.joueurs)
    .forEach((j, i) => {
      j.cible = places[i] ?? places[0]!;
      j.auBallon = true;
      j.sprintJusqua = Math.max(j.sprintJusqua, fin);
    });
}

/** Pressing normal (référence §4) : le plus proche presse le porteur, le
 *  suivant couvre entre le porteur et le but ; les autres tiennent leur place. */
function presser(b: BallonReel, p: JoueurSim, rd: Reglages["ballon"]): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const sens = p.camp === 0 ? 1 : -1;
  const presseurs = s.joueurs
    .filter((j) => {
      if (j.camp === p.camp || j.poste.id === "G") return false;
      // Un défenseur central sort sur le porteur dans l'axe devant lui (duel, référence §6).
      const sortie = j.poste.id === "DC" && Math.abs(p.pos.x - W / 2) < rd.sortieDC.axeM ? rd.sortieDC.distanceM : 0;
      return dist(j.pos, p.pos) < Math.max(rd.pressingM, sortie) * j.effet.pressing;
    })
    .sort((a, c) => dist(a.pos, p.pos) - dist(c.pos, p.pos))
    .slice(0, rd.presseurs);
  // 1er : sur le porteur ; 2e : couvre vers le but ; 3e (pressing haut) : ferme la passe vers l'intérieur.
  const vers = W / 2 - s.ballon.x > 0 ? 1 : -1;
  presseurs.forEach((j, i) => {
    j.auBallon = i === 0;
    j.cible =
      i === 0 ? { ...s.ballon }
      : i === 1 ? { x: s.ballon.x + (W / 2 - s.ballon.x) * 0.2, y: s.ballon.y + sens * 6 }
      : { x: s.ballon.x + vers * 7, y: s.ballon.y + sens * 3 };
  });
}

/** Défense de la surface : quand le ballon approche de son but, chaque
 *  défenseur libre suit un attaquant dangereux, côté but, à 1,5 m. Plus loin,
 *  les milieux et attaquants ferment les lignes de passe. */
export function marquer(b: BallonReel, campDef: Camp): void {
  const s = b.sim;
  const m = s.reg(campDef).ballon.marquage;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const but = { x: W / 2, y: campDef === 0 ? 0 : L };
  if (dist(s.ballon, but) > m.declenchementM) {
    fermerLignes(b, campDef, m.zonePressingM, m.rayonM);
    return;
  }
  const dangereux = s.joueurs
    .filter((a) => a.camp !== campDef && a.poste.id !== "G" && a !== b.porteur && dist(a.pos, but) < m.zoneM && Math.abs(a.pos.x - W / 2) < m.demiLargeurM)
    .sort((a, c) => dist(a.pos, but) - dist(c.pos, but));
  const libres = s.joueurs.filter((d) => d.camp === campDef && !d.auBallon && (d.poste.ligneDefense === "defense" || (m.milieux && d.poste.ligneDefense === "milieu")));
  for (const a of dangereux) {
    let meilleur: JoueurSim | null = null;
    for (const d of libres) if (dist(d.pos, a.pos) < m.rayonM && (!meilleur || dist(d.pos, a.pos) < dist(meilleur.pos, a.pos))) meilleur = d;
    if (!meilleur) continue;
    libres.splice(libres.indexOf(meilleur), 1);
    const n = dist(a.pos, but) || 1;
    meilleur.cible = { x: a.pos.x + ((but.x - a.pos.x) / n) * m.distanceM, y: a.pos.y + ((but.y - a.pos.y) / n) * m.distanceM };
    meilleur.auBallon = true; // il colle son attaquant (évitement réduit)
  }
}

/** Pressing (référence §4) : pendant qu'un joueur presse le porteur, les
 *  milieux et attaquants libres ferment les lignes de passe en se plaçant
 *  entre le ballon et les adversaires proches. Inactif si zone = 0. */
function fermerLignes(b: BallonReel, campDef: Camp, zoneM: number, rayonM: number): void {
  const s = b.sim;
  const p = b.porteur;
  if (zoneM <= 0 || !p || p.camp === campDef) return;
  const solutions = s.joueurs
    .filter((a) => a.camp !== campDef && a !== p && a.poste.id !== "G" && dist(a.pos, s.ballon) < zoneM)
    .sort((a, c) => dist(a.pos, s.ballon) - dist(c.pos, s.ballon));
  const libres = s.joueurs.filter((d) => d.camp === campDef && !d.auBallon && (d.poste.ligneDefense === "milieu" || d.poste.ligneDefense === "attaque"));
  for (const a of solutions) {
    let meilleur: JoueurSim | null = null;
    for (const d of libres) if (dist(d.pos, a.pos) < rayonM && (!meilleur || dist(d.pos, a.pos) < dist(meilleur.pos, a.pos))) meilleur = d;
    if (!meilleur) continue;
    libres.splice(libres.indexOf(meilleur), 1);
    const n = dist(a.pos, s.ballon) || 1;
    meilleur.cible = { x: a.pos.x + ((s.ballon.x - a.pos.x) / n) * 2, y: a.pos.y + ((s.ballon.y - a.pos.y) / n) * 2 };
    meilleur.auBallon = true;
  }
}
