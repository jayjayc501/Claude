// Jeu sans ballon de l'équipe qui attaque (référence §5 ; 12/11, « plus
// réaliste dans les mouvements ») :
//  - appel en profondeur : quand le porteur a du temps, un attaquant part dans
//    le dos de la défense, en diagonale ; le porteur lève la tête (décision
//    avancée) ; le défenseur le plus proche le suit, côté but ;
//  - montée du latéral à l'extérieur du porteur (14/11) ;
//  - appel au second poteau de l'ailier opposé (14/11) ;
//  - soutien : les coéquipiers les plus proches font le triangle et, si un
//    adversaire coupe leur ligne de passe, un pas de côté ou un décrochage.
// Ces décalages dépendent des adversaires, mais restent bornés autour de la
// place donnée par la projection (pas de dérive, référence §9.2 règle 6).

import { PARAMETRES_NOTES as PN } from "../notes";
import type { Camp, JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";
import { avantageVitesse, depuisRecuperation, dist, distSegment } from "./outils";

/** Ce que les mouvements sans ballon lisent du terrain autour du porteur. */
interface Lecture {
  sens: number;
  /** Profondeur vers le but adverse. */
  prof: (y: number) => number;
  adverses: JoueurSim[];
  /** Profondeur de l'avant-dernier adversaire (ligne du hors-jeu). */
  avantDernier: number;
}

/** Courses des coéquipiers du porteur `p` : appels, montée, second poteau, soutien. */
export function jeuSansBallon(b: BallonReel, p: JoueurSim): void {
  const s = b.sim;
  const L = s.donnees.longueurM;
  const sens = p.camp === 0 ? 1 : -1;
  const prof = (y: number) => (sens === 1 ? y : L - y); // profondeur vers le but adverse
  const adverses = s.joueurs.filter((o) => o.camp !== p.camp);
  const avantDernier = adverses.map((o) => prof(o.pos.y)).sort((a, c) => c - a)[1] ?? L;
  const c: Lecture = { sens, prof, adverses, avantDernier };
  finirAppel(b, p, c);
  lancerAppel(b, p, c);
  suivreAppel(b, p, c);
  tenterMontee(b, p, c);
  appelSecondPoteau(b, p, c);
  soutenir(b, p, c);
}

// --- Appel en profondeur -------------------------------------------------------

/** Fin de l'appel : temps écoulé, autre porteur d'une autre équipe, ou hors-jeu sans ballon. */
function finirAppel(b: BallonReel, p: JoueurSim, c: Lecture): void {
  const s = b.sim;
  if (b.appel && (s.temps > b.appel.fin || b.appel.joueur.camp !== p.camp || b.appel.joueur === p)) b.appel = null;
  if (b.appel && c.prof(b.appel.joueur.pos.y) > c.avantDernier + 2 && b.receveur !== b.appel.joueur) b.appel = null;
}

/** Nouvel appel : le porteur a du temps, dans la moitié de terrain qui compte. */
function lancerAppel(b: BallonReel, p: JoueurSim, c: Lecture): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const { sens, prof, adverses, avantDernier } = c;
  const ap = s.reg(p.camp).ballon.sansBallon.appel;
  const enContre = depuisRecuperation(b, p.camp) < s.reg(p.camp).ballon.contreAttaque.dureeS;
  const pressé = !enContre && adverses.some((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < s.reglages.ballon.pressionM * 1.5);
  const frequence = ap.parSeconde * (enContre ? s.reg(p.camp).ballon.contreAttaque.appelsFois : 1);
  const dt = s.temps - b.dernierTirageAppel;
  b.dernierTirageAppel = s.temps;
  const peut = !b.appel && !pressé && !b.arrete && p.poste.id !== "G" && prof(p.pos.y) > ap.zoneM && L - prof(p.pos.y) > 20;
  if (!peut || !(b.rng.suivant() < frequence * dt)) return;
  const candidats = s.joueurs.filter((q) => {
    if (q.camp !== p.camp || q === p || q.poste.id === "G" || q.auBallon) return false;
    if (q.poste.ligneDefense !== "attaque" && !(q.poste.id === "AG" || q.poste.id === "AD" || q.poste.id === "MC")) return false;
    const ecart = avantDernier - prof(q.pos.y);
    return ecart >= ap.ecartMinM && ecart <= ap.ecartMaxM && prof(q.pos.y) - prof(p.pos.y) >= ap.avanceBallonM;
  });
  // Le plus libre (le plus loin de son adversaire le plus proche), et le plus
  // rapide face à son adversaire (notes, 12/11 : « la vitesse, c'est super important »).
  const libreDe = (q: JoueurSim) => Math.min(...adverses.map((o) => dist(o.pos, q.pos))) + avantageVitesse(q, q.pos, adverses) * PN.vitesse.appelParPoint;
  const q = candidats.sort((a, d) => libreDe(d) - libreDe(a))[0];
  if (!q) return;
  const yBut = sens === 1 ? L : 0;
  const profPoint = Math.min(avantDernier + ap.profondeurM, L - 6);
  const point = { x: Math.min(W - 3, Math.max(3, q.pos.x + (W / 2 - q.pos.x) * ap.diagonale)), y: yBut - sens * (L - profPoint) };
  b.appel = { joueur: q, fin: s.temps + ap.dureeS, point };
  b.decisionA = Math.min(b.decisionA, s.temps + 0.35); // le porteur lève la tête
}

/** L'attaquant court vers son point d'appel ; le défenseur le plus proche le suit, côté but. */
function suivreAppel(b: BallonReel, p: JoueurSim, c: Lecture): void {
  if (!b.appel || b.receveur === b.appel.joueur) return;
  const s = b.sim;
  const W = s.donnees.largeurM;
  const q = b.appel.joueur;
  const ap = s.reg(p.camp).ballon.sansBallon.appel;
  q.cible = { ...b.appel.point };
  q.sprintJusqua = Math.max(q.sprintJusqua, b.appel.fin);
  const suiveur = c.adverses
    .filter((o) => o.poste.ligneDefense === "defense" && !o.auBallon && dist(o.pos, q.pos) < ap.suivreRayonM)
    .sort((a, d) => dist(a.pos, q.pos) - dist(d.pos, q.pos))[0];
  if (suiveur) {
    suiveur.cible = { x: q.pos.x + (W / 2 - q.pos.x) * 0.15, y: q.pos.y + c.sens * 2.5 };
    suiveur.auBallon = true;
    suiveur.sprintJusqua = Math.max(suiveur.sprintJusqua, b.appel.fin);
  }
}

// --- Montée du latéral ----------------------------------------------------------

/** Montée du latéral (14/11, « les latéraux ne montent jamais ») : quand on
 *  attaque d'un côté dans la moitié adverse, le latéral de ce côté passe à
 *  l'extérieur du porteur. Un seul à la fois ; à la perte du ballon, il revient
 *  au sprint (transition), c'est le prix à payer (référence §6). */
function tenterMontee(b: BallonReel, p: JoueurSim, c: Lecture): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const mo = s.reg(p.camp).ballon.sansBallon.montee;
  if (b.montee && (s.temps > b.montee.fin || b.montee.joueur.camp !== p.camp || b.montee.joueur === p)) b.montee = null;
  const dtM = s.temps - b.dernierTirageMontee;
  b.dernierTirageMontee = s.temps;
  if (!b.montee && !b.arrete && p.poste.id !== "G" && c.prof(p.pos.y) > mo.zoneProfM && Math.abs(p.pos.x - W / 2) > mo.ecartAxeM) {
    const lat = lateralDuCote(b, p.camp, Math.sign(p.pos.x - W / 2));
    if (lat && b.rng.suivant() < mo.parSeconde * dtM * (1 + mo.bonusPlaceHaut * hauteurCase(lat))) lancerMontee(b, p.camp, Math.sign(p.pos.x - W / 2), false);
  }
}

/** Le latéral qui monte garde sa course tant que son équipe a le ballon,
 *  passes comprises (sinon, ballon en l'air, il revenait vers sa place). */
export function suivreMontee(b: BallonReel): void {
  const mo = b.montee;
  if (!mo) return;
  const s = b.sim;
  if (b.engagement || b.arrete || s.temps > mo.fin || s.possession !== mo.joueur.camp) {
    b.montee = null;
    return;
  }
  if (b.porteur === mo.joueur || b.receveur === mo.joueur) return;
  mo.joueur.cible = { ...mo.point };
  mo.joueur.sprintJusqua = Math.max(mo.joueur.sprintJusqua, mo.fin);
}

/** Latéral (DG ou DD) d'une équipe du côté `cote` (signe de x − largeur/2). */
function lateralDuCote(b: BallonReel, camp: Camp, cote: number): JoueurSim | undefined {
  const W = b.sim.donnees.largeurM;
  return b.sim.joueurs.find((q) => q.camp === camp && (q.poste.id === "DG" || q.poste.id === "DD") && Math.sign(q.cible.x - W / 2) === cote && q !== b.porteur);
}

/** Hauteur de la case d'un joueur parmi celles de son poste : 0 la plus basse, 1 la plus haute. */
function hauteurCase(j: JoueurSim): number {
  const ys = j.poste.cases.map((c) => c.centre.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  return max > min ? (j.cellule.centre.y - min) / (max - min) : 0;
}

/** Lance la montée du latéral du côté `cote` (14/11). Sur un repiquage de
 *  l'ailier, il prend le couloir le plus souvent (surRepiqueProba). */
export function lancerMontee(b: BallonReel, camp: Camp, cote: number, surRepique: boolean): void {
  const s = b.sim;
  const mo = s.reg(camp).ballon.sansBallon.montee;
  if (b.montee || !b.porteur) return;
  if (surRepique && b.rng.suivant() > mo.surRepiqueProba) return;
  const lat = lateralDuCote(b, camp, cote);
  if (!lat) return;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const sens = camp === 0 ? 1 : -1;
  const y = Math.min(L - 6, Math.max(6, b.porteur.pos.y + sens * mo.avanceM));
  b.montee = { joueur: lat, fin: s.temps + mo.dureeS, point: { x: cote > 0 ? W - mo.bordM : mo.bordM, y } };
  b.stats.montees[camp]++;
}

// --- Second poteau et soutien ------------------------------------------------------

/** Appel au second poteau (14/11, « les ailiers ont leur couloir, c'est trop
 *  robotisé ») : ballon sur un côté du dernier tiers, l'ailier opposé rentre
 *  vers le second poteau, sans se mettre hors-jeu. */
function appelSecondPoteau(b: BallonReel, p: JoueurSim, c: Lecture): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const sp = s.reg(p.camp).ballon.sansBallon.secondPoteau;
  if (!(!b.arrete && c.prof(p.pos.y) > sp.zoneProfM && Math.abs(p.pos.x - W / 2) > sp.ecartAxeM)) return;
  const coteBallon = Math.sign(p.pos.x - W / 2);
  const profPoint = Math.min(L - sp.devantButM, c.avantDernier - 0.5);
  for (const q of s.joueurs) {
    if (q.camp !== p.camp || q === p || q.auBallon || b.appel?.joueur === q || b.montee?.joueur === q) continue;
    if ((q.poste.id !== "AG" && q.poste.id !== "AD") || Math.sign(q.cible.x - W / 2) === coteBallon) continue;
    if (c.prof(q.cible.y) > profPoint) continue;
    q.cible = { x: W / 2 - coteBallon * sp.poteauM, y: c.sens === 1 ? profPoint : L - profPoint };
  }
}

/** Soutien : ouvrir une ligne de passe pour les plus proches (triangles). */
function soutenir(b: BallonReel, p: JoueurSim, c: Lecture): void {
  const s = b.sim;
  const W = s.donnees.largeurM;
  const so = s.reg(p.camp).ballon.sansBallon.soutien;
  const libre = (a: PointM, d: PointM) => !c.adverses.some((o) => distSegment(o.pos, a, d) < s.reglages.ballon.voieLibreM + 0.5);
  const proches = s.joueurs
    .filter((q) => q.camp === p.camp && q !== p && q.poste.id !== "G" && !q.auBallon && b.appel?.joueur !== q && b.montee?.joueur !== q && dist(q.cible, p.pos) < so.rayonM)
    .sort((a, d) => dist(a.cible, p.pos) - dist(d.cible, p.pos))
    .slice(0, so.joueurs);
  for (const q of proches) {
    // Triangles : le soutien se rapproche du porteur (sans le coller).
    const dq = dist(q.cible, p.pos);
    if (dq > so.distanceM) {
      const k = Math.min(so.rapprochementMaxM, dq - so.distanceM) / dq;
      q.cible = { x: q.cible.x + (p.pos.x - q.cible.x) * k, y: q.cible.y + (p.pos.y - q.cible.y) * k };
    }
    if (libre(p.pos, q.cible)) continue;
    const dx = q.cible.x - p.pos.x;
    const dy = q.cible.y - p.pos.y;
    const n = Math.hypot(dx, dy) || 1;
    const px = -dy / n;
    const py = dx / n;
    const essais = [...so.decalagesM.map((k) => ({ x: q.cible.x + px * k, y: q.cible.y + py * k })), { x: q.cible.x, y: q.cible.y - c.sens * so.reculM }];
    const bon = essais.find((e) => e.x > 2 && e.x < W - 2 && libre(p.pos, e) && Math.min(...c.adverses.map((o) => dist(o.pos, e))) > 3);
    if (bon) q.cible = bon;
  }
}
