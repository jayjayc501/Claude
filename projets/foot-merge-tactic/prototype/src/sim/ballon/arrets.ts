// Arrêts de jeu et remises en jeu : engagement (début de période, après un
// but), touche, six mètres, corner, coup franc, penalty. Ici : qui se place où
// pendant l'arrêt, combien de temps on attend, et comment la remise est jouée.
// La faute qui donne un coup franc ou un penalty est dans defense.ts, la sortie
// qui donne une touche, un corner ou un six mètres dans physique.ts.

import type { Camp, JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";
import { centrer, lancerTouche, passer, tirer } from "./gestes";
import { dist, distSegment } from "./outils";
import { dansSurface } from "./physique";

// --- Engagement ---------------------------------------------------------------

/** But ou nouvelle période : ballon au centre, les deux équipes regagnent leur
 *  camp ; l'engagement a lieu quand tout le monde y est (10 s au plus). */
export function preparerEngagement(b: BallonReel, camp: Camp, texte: string): void {
  const s = b.sim;
  b.remettre({ x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 }, camp, null, texte);
  b.reserve = null;
  // Après un but, on laisse le temps à l'annonce (et à la joie) avant de réengager.
  b.engagement = { camp, depuis: s.temps, minS: texte === "But !" ? s.reglages.ballon.attenteButS : 2 };
}

/** Avant l'engagement : dès que chacun est en place (ou au bout de 10 s), le
 *  ballon est posé au centre pour l'équipe qui engage. */
export function attendreEngagement(b: BallonReel): void {
  const s = b.sim;
  const e = b.engagement!;
  const L = s.donnees.longueurM;
  const kicker = engageur(b);
  const part = partenaire(b, e.camp, kicker);
  const enPlace =
    dist(kicker.pos, s.ballon) < 1.5 &&
    s.joueurs.every((j) => j === kicker || j === part || ((j.camp === 0 ? j.pos.y <= L / 2 + 0.5 : j.pos.y >= L / 2 - 0.5) && dist(j.pos, j.depart) < 3));
  if ((enPlace && s.temps - e.depuis > e.minS) || s.temps - e.depuis > 10) {
    const camp = e.camp;
    b.engagement = null;
    b.remettre({ ...s.ballon }, camp, "engagement", "Engagement");
  }
}

/** Avant l'engagement : chacun regagne sa place de départ, celui qui engage
 *  va au ballon, un partenaire se place à côté, les adversaires hors du rond. */
export function placerPourEngagement(b: BallonReel): void {
  const s = b.sim;
  for (const j of s.joueurs) j.cible = { ...j.depart };
  const kicker = engageur(b);
  kicker.cible = { x: s.ballon.x, y: s.ballon.y - (kicker.camp === 0 ? 0.8 : -0.8) };
  placerPartenaire(b, b.engagement!.camp, kicker);
  eloignerEngagement(b, b.engagement!.camp); // adversaires dans leur moitié, hors du rond
}

/** Joueur qui engage : le joueur de champ de l'équipe le plus proche du centre. */
function engageur(b: BallonReel): JoueurSim {
  const s = b.sim;
  const camp = b.engagement!.camp;
  return s.joueurs
    .filter((j) => j.camp === camp && j.poste.id !== "G")
    .reduce((a, c) => (dist(a.depart, s.ballon) <= dist(c.depart, s.ballon) ? a : c));
}

/** Coéquipier qui se place à côté du ballon pour l'engagement (12/11 :
 *  « les engagements sont nuls : une passe en arrière à personne »). */
function partenaire(b: BallonReel, camp: Camp, kicker: JoueurSim): JoueurSim | undefined {
  const s = b.sim;
  const centre = { x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 };
  return s.joueurs
    .filter((j) => j.camp === camp && j !== kicker && j.poste.id !== "G")
    .sort((a, c) => dist(a.depart, centre) - dist(c.depart, centre))[0];
}

/** Place du partenaire : 4 m à côté du ballon, un pas dans son camp. */
export function placerPartenaire(b: BallonReel, camp: Camp, kicker: JoueurSim): void {
  const s = b.sim;
  const q = partenaire(b, camp, kicker);
  if (!q) return;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const cote = q.depart.x < W / 2 ? -1 : 1;
  q.cible = { x: W / 2 + cote * 4, y: L / 2 + (camp === 0 ? -1.5 : 1.5) };
  q.auBallon = true;
  const depuis = b.placePartenaire?.joueur === q ? b.placePartenaire.depuis : s.temps;
  b.placePartenaire = { joueur: q, point: { ...q.cible }, depuis };
}

// --- Placements pendant l'arrêt ----------------------------------------------

/** Un engagement se joue au point central : loin du centre, ce n'en est plus un. */
export function annulerEngagementLoin(b: BallonReel, p: JoueurSim): void {
  const W = b.sim.donnees.largeurM;
  const L = b.sim.donnees.longueurM;
  if (b.arrete === "engagement" && dist(p.pos, { x: W / 2, y: L / 2 }) > 4) {
    b.arrete = null;
    b.placePartenaire = null;
  }
}

/** Remise en jeu prise par le porteur : on place les autres (true), ou rien à
 *  faire (false, la touche se joue avec le jeu sans ballon habituel). */
export function placerPendantArret(b: BallonReel, p: JoueurSim): boolean {
  if (b.arrete === "engagement") {
    placerPartenaire(b, p.camp, p); // un coéquipier à côté pour recevoir l'engagement
    eloignerEngagement(b, p.camp); // adversaires hors du rond (9,15 m) tant que l'engagement n'est pas joué
    return true;
  }
  if (b.arrete === "sixMetres") {
    viderSurface(b, p.camp);
    return true;
  }
  if (b.arrete === "coupFranc") {
    eloigner(b, p.camp);
    return true;
  }
  return false;
}

/** Six mètres : les adversaires sortent de la surface. */
export function viderSurface(b: BallonReel, camp: Camp): void {
  const L = b.sim.donnees.longueurM;
  const bord = b.sim.reglages.ballon.surface.profondeurM + 1.5;
  for (const o of b.sim.joueurs) {
    if (o.camp === camp) continue;
    if (dansSurface(b, o.cible, camp)) o.cible = { x: o.cible.x, y: camp === 0 ? bord : L - bord };
  }
}

/** Coup franc : les adversaires se tiennent à 9,15 m du ballon (touche : 2 m). */
export function eloigner(b: BallonReel, camp: Camp, rayon = 9.5): void {
  const ba = b.sim.ballon;
  for (const o of b.sim.joueurs) {
    if (o.camp === camp) continue;
    const d = dist(o.cible, ba);
    if (d >= rayon) continue;
    const ux = d > 0.1 ? (o.cible.x - ba.x) / d : 0;
    const uy = d > 0.1 ? (o.cible.y - ba.y) / d : camp === 0 ? 1 : -1;
    o.cible = { x: ba.x + ux * rayon, y: ba.y + uy * rayon };
  }
}

/** Coup d'envoi : les adversaires restent dans leur moitié, hors du rond central. */
export function eloignerEngagement(b: BallonReel, camp: Camp): void {
  const s = b.sim;
  const ba = s.ballon;
  const L = s.donnees.longueurM;
  const sens = camp === 0 ? 1 : -1; // côté de la moitié adverse
  for (const o of s.joueurs) {
    if (o.camp === camp) continue;
    let c = { x: o.cible.x, y: sens > 0 ? Math.max(o.cible.y, L / 2 + 0.5) : Math.min(o.cible.y, L / 2 - 0.5) };
    const d = dist(c, ba);
    if (d < 9.5) {
      const ux = d > 0.1 ? (c.x - ba.x) / d : 0;
      const uy = Math.max(0.3, Math.abs(d > 0.1 ? (c.y - ba.y) / d : 1)) * sens;
      const n = Math.hypot(ux, uy);
      c = { x: ba.x + (ux / n) * 9.5, y: ba.y + (uy / n) * 9.5 };
    }
    o.cible = c;
  }
}

// --- Jouer la remise en jeu ---------------------------------------------------

/** Le porteur a une remise en jeu à jouer. true : elle est jouée, ou il attend ;
 *  false : plus rien de spécial, il décide comme dans le jeu. */
export function jouerRemiseEnJeu(b: BallonReel, adverses: JoueurSim[], but: PointM, sens: number): boolean {
  switch (b.arrete) {
    case "touche":
      return jouerTouche(b, adverses);
    case "coupFranc":
      b.arrete = null; // le tireur joue normalement (passe, tir à portée)
      return false;
    case "sixMetres":
      return attendreSixMetres(b, adverses);
    case "engagement":
      return jouerEngagement(b, adverses, sens);
    case "penalty":
      b.arrete = null;
      tirer(b, but, true);
      return true;
    case "corner":
      b.arrete = null;
      centrer(b, but, sens);
      return true;
    default:
      return false;
  }
}

/** Touche (13/11, « ils donnent le ballon à l'adversaire collé ») : passe à la main
 *  vers un coéquipier démarqué (adversaire à plus de 3 m, ligne de passe libre),
 *  à moins de 22 m. Personne de libre : on attend un peu (3 s au plus) qu'un
 *  coéquipier se démarque, puis on joue le moins marqué. */
function jouerTouche(b: BallonReel, adverses: JoueurSim[]): boolean {
  const s = b.sim;
  const p = b.porteur!;
  let choix: JoueurSim | null = null;
  let mieux = -Infinity;
  let libre = false;
  for (const q of s.joueurs) {
    if (q === p || q.camp !== p.camp || q.poste.id === "G") continue;
    const d = dist(p.pos, q.pos);
    if (d < 4 || d > 22) continue;
    const marque = Math.min(...adverses.map((a) => dist(a.pos, q.pos)));
    const coupe = adverses.some((a) => distSegment(a.pos, p.pos, q.pos) < 1.8 && dist(a.pos, q.pos) > 1);
    const ok = marque >= 3 && !coupe;
    const sc = (ok ? 10 : 0) + Math.min(8, marque) - d * 0.1 - (coupe ? 4 : 0) + b.rng.entre(-1, 1);
    if (sc > mieux) {
      mieux = sc;
      choix = q;
      libre = ok;
    }
  }
  const attente = b.evenement ? s.temps - b.evenement.a : 99;
  if ((!choix || !libre) && attente < 3 + s.reglages.ballon.pauseArretS.max) {
    b.decisionA = s.temps + 0.3;
    return true;
  }
  b.arrete = null;
  if (!choix) return false;
  lancerTouche(b, p, choix);
  return true;
}

/** Six mètres : on attend que les adversaires soient sortis de la surface (5 s au plus). */
function attendreSixMetres(b: BallonReel, adverses: JoueurSim[]): boolean {
  const s = b.sim;
  const p = b.porteur!;
  const encore = adverses.some((o) => dansSurface(b, o.pos, p.camp));
  if (encore && b.evenement && s.temps - b.evenement.a < 5) {
    b.decisionA = s.temps + 0.2;
    return true;
  }
  b.arrete = null;
  return false;
}

/** Engagement : on attend que le partenaire soit à côté du ballon et les
 *  adversaires hors du rond (6 s au plus), puis passe au partenaire ou en retrait. */
function jouerEngagement(b: BallonReel, adverses: JoueurSim[], sens: number): boolean {
  const s = b.sim;
  const p = b.porteur!;
  if (dist(p.pos, { x: s.donnees.largeurM / 2, y: s.donnees.longueurM / 2 }) > 4) {
    b.arrete = null; // loin du point central : ce n'est plus un engagement
    b.placePartenaire = null;
    return false;
  }
  const pp = b.placePartenaire?.joueur.camp === p.camp ? b.placePartenaire : null;
  const rondOccupe = adverses.some((o) => dist(o.pos, p.pos) < 9);
  if (pp && (dist(pp.joueur.pos, pp.point) > 1.5 || rondOccupe) && s.temps - pp.depuis < 6) {
    b.decisionA = s.temps + 0.2;
    return true;
  }
  b.arrete = null;
  b.placePartenaire = null;
  // Le plus souvent au partenaire placé à côté, sinon à un milieu en retrait.
  let choix: JoueurSim | undefined = pp && dist(pp.joueur.pos, p.pos) < 8 && b.rng.suivant() < 0.85 ? pp.joueur : undefined;
  if (!choix) {
    const options = s.joueurs
      .filter((q) => q !== p && q.camp === p.camp && q.poste.id !== "G")
      .map((q) => ({ q, d: dist(p.pos, q.pos), recul: (p.pos.y - q.pos.y) * sens }))
      .filter((o) => o.d > 2 && o.d < 28 && o.recul > 1)
      .sort((a, c) => a.d - c.d);
    choix = options[0]?.q;
  }
  if (!choix) return false;
  passer(b, choix, false, null, false); // dans ses pieds
  return true;
}
