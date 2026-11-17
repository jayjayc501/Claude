// Gestes du porteur : comment le ballon part une fois la décision prise
// (decision.ts). Passe au pied ou dans l'espace, ballon aérien (touche, jeu
// long, centre, dégagement), dribble, tir, et le plongeon du gardien qui y répond.
// Ici se règlent la précision, la vitesse et le dosage des ballons.

import { PARAMETRES_NOTES as PN, decaler } from "../notes";
import type { JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";
import { duelGagne } from "./defense";
import { DEMI_BUT_M, avantage1c1, contrePresse, dist, precisionPasse } from "./outils";
import { estHorsJeu, dansSurface } from "./physique";
import { noterStyle, statsJoueur } from "./stats";

/** Compte une passe du porteur (longueur d et mètres gagnés vers le but adverse). */
function compterPasse(b: BallonReel, p: JoueurSim, d: number, gainPasse: number, longue: boolean): void {
  b.stats.passes[p.camp]++;
  statsJoueur(b, p).passes++;
  b.stats.distancePasses[p.camp] += d;
  if (longue) b.stats.passesLongues[p.camp]++;
  b.stats.gainPasses[p.camp] += gainPasse;
  if (gainPasse >= 5) b.stats.passesAvant[p.camp]++;
}

/** Passe au sol, au pied du coéquipier (anticipée sur sa course) ou dans
 *  l'espace devant lui (`point`). Moins précise sous pression. */
export function passer(b: BallonReel, q: JoueurSim, presse = false, point: PointM | null = null, anticipe = true): void {
  const p = b.porteur!;
  const r = b.sim.reg(p.camp).ballon;
  const d = dist(p.pos, point ?? q.pos);
  let v = Math.min(r.vitessePasseMaxMS, r.vitessePasseMinMS + r.vitessePasseParMetre * d);
  if (point) {
    // Passe dans l'espace : dosée pour arriver au point quand le receveur y arrive.
    const k = r.frottementParS;
    const T = dist(q.pos, point) / (b.sim.reglages.mouvement.vitesseMaxMS * q.vitesseF) + 0.3;
    v = Math.max(8, Math.min(r.vitessePasseMaxMS, (k * d) / (1 - Math.exp(-k * T))));
  }
  const t = d / v;
  const a = anticipe ? t * 0.8 : 0;
  const cible = point ?? { x: q.pos.x + q.vit.x * a, y: q.pos.y + q.vit.y * a };
  const dx = cible.x - b.sim.ballon.x;
  const dy = cible.y - b.sim.ballon.y;
  const n = Math.hypot(dx, dy) || 1;
  const erreur = erreurDePasse(b, p, q, d, presse);
  const c = Math.cos(erreur);
  const si = Math.sin(erreur);
  compterPasse(b, p, d, ((point ?? q.pos).y - p.pos.y) * (p.camp === 0 ? 1 : -1), d >= 25);
  const horsJeu = estHorsJeu(b, q);
  b.lancer(((dx * c - dy * si) / n) * v, ((dx * si + dy * c) / n) * v);
  b.receveur = q;
  b.espacePour = point ? q : null;
  b.sousPressionDe = presse ? p : null;
  b.horsJeu = horsJeu;
}

/** Erreur d'angle d'une passe (radians, tirée au sort) : distance, pression,
 *  note de passe, compatriote. */
function erreurDePasse(b: BallonReel, p: JoueurSim, q: JoueurSim, d: number, presse: boolean): number {
  const r = b.sim.reg(p.camp).ballon;
  // Passe jouée sous pression : moins précise ; une équipe qui presse gêne de plus loin.
  const g = b.sim.reg(p.camp === 0 ? 1 : 0).ballon.gene;
  const dAdv = Math.min(...b.sim.joueurs.filter((o) => o.camp !== p.camp && o.poste.id !== "G").map((o) => dist(o.pos, p.pos)));
  const gene = (presse ? r.imprecision.sousPressionFacteur : 1) * (dAdv < g.rayonM ? g.facteur : 1) * contrePresse(b, p).gene;
  // Cohésion d'un pays (14/11) : passe plus précise vers un compatriote (× 1 : inchangé).
  const compatriote = p.joueur.pays && q.joueur.pays === p.joueur.pays ? p.effet.imprecisionCompatriote : 1;
  return (((r.imprecision.baseDeg + r.imprecision.parMetreDeg * d) * gene * p.effet.imprecision * compatriote * precisionPasse(p) * Math.PI) / 180) * b.rng.entre(-1, 1);
}

/** Ballon aérien vers un point, dosé pour y arriver en T secondes. */
function lober(b: BallonReel, point: PointM, T: number, angleErreurDeg = 0): void {
  const r = b.sim.reglages.ballon;
  const ba = b.sim.ballon;
  const d = dist(ba, point) || 1;
  const k = r.frottementParS;
  const v = Math.min(30, (k * d) / (1 - Math.exp(-k * T)));
  const e = (b.rng.entre(-1, 1) * angleErreurDeg * precisionPasse(b.porteur) * Math.PI) / 180;
  const ux = (point.x - ba.x) / d;
  const uy = (point.y - ba.y) / d;
  b.lancer((ux * Math.cos(e) - uy * Math.sin(e)) * v, (ux * Math.sin(e) + uy * Math.cos(e)) * v);
  b.airDebut = b.sim.temps;
  b.airJusqua = b.sim.temps + T * r.centre.partEnLAir;
}

/** Touche : lancer à la main, en l'air, dans les pieds du coéquipier (pas de
 *  hors-jeu). Personne ne peut couper le ballon à la sortie des mains. */
export function lancerTouche(b: BallonReel, p: JoueurSim, q: JoueurSim): void {
  const d = dist(p.pos, q.pos);
  b.stats.passes[p.camp]++;
  statsJoueur(b, p).passes++;
  b.stats.distancePasses[p.camp] += d;
  // Un peu devant le receveur s'il court, sinon dans ses pieds.
  const point = { x: q.pos.x + q.vit.x * 0.3, y: q.pos.y + q.vit.y * 0.3 };
  lober(b, point, 0.45 + d / 18, 3);
  b.receveur = q;
  b.espacePour = null;
  b.sousPressionDe = null;
  b.horsJeu = false;
  b.lanceur = p;
}

/** Ballon long aérien vers un coéquipier (jeu long, contre-attaque). */
export function jouerLong(b: BallonReel, q: JoueurSim, point: PointM): void {
  const p = b.porteur!;
  const jl = b.sim.reg(p.camp).ballon.jeuLong;
  const d = dist(p.pos, point);
  b.espacePour = q;
  b.sousPressionDe = null;
  compterPasse(b, p, d, (point.y - p.pos.y) * (p.camp === 0 ? 1 : -1), true);
  const horsJeu = estHorsJeu(b, q);
  lober(b, point, d / jl.vitesseMS + 0.4, jl.erreurDeg);
  b.receveur = q;
  b.horsJeu = horsJeu;
}

/** Centre aérien vers un coéquipier de la surface (ou le point de penalty). */
export function centrer(b: BallonReel, but: PointM, sens: number): void {
  const s = b.sim;
  const r = s.reglages.ballon;
  const p = b.porteur!;
  const cibles = s.joueurs.filter((q) => q.camp === p.camp && q !== p && q.poste.id !== "G" && dansSurface(b, q.pos, q.camp === 0 ? 1 : 0));
  const q = cibles.length ? cibles[b.rng.entier(cibles.length)]! : null;
  const point = q
    ? { x: q.pos.x + b.rng.entre(-2, 2), y: q.pos.y + b.rng.entre(-2, 2) }
    : { x: but.x + b.rng.entre(-6, 6), y: but.y - sens * b.rng.entre(6, 12) };
  b.stats.centres[p.camp]++;
  b.stats.passes[p.camp]++;
  statsJoueur(b, p).passes++;
  lober(b, point, r.centre.dureeS, r.centre.erreurDeg);
  b.receveur = q;
  b.espacePour = null;
  b.sousPressionDe = null;
}

/** Dégagement : long ballon aérien vers l'avant et le côté. */
export function degager(b: BallonReel, sens: number): void {
  const s = b.sim;
  const g = s.reglages.ballon.degagement;
  const p = b.porteur!;
  const W = s.donnees.largeurM;
  const cote = p.pos.x < W / 2 ? 1 : -1;
  const x = cote === 1 ? b.rng.entre(1, 18) : W - b.rng.entre(1, 18);
  const y = p.pos.y + sens * b.rng.entre(g.longueurMinM, g.longueurMaxM);
  b.stats.degagements[p.camp]++;
  lober(b, { x, y }, g.dureeS, g.erreurDeg);
}

/** 1 contre 1 : réussi, l'adversaire est éliminé et le porteur accélère ;
 *  raté, l'adversaire prend le ballon ou le ballon part libre. */
export function dribbler(b: BallonReel, o: JoueurSim, sens: number): void {
  const s = b.sim;
  const p = b.porteur!;
  const db = s.reg(p.camp).ballon.dribble;
  b.stats.dribbles[p.camp]++;
  statsJoueur(b, p).dribbles++;
  // Notes : dribble et accélération du porteur contre duel et accélération du défenseur.
  if (b.rng.suivant() < decaler(Math.min(0.95, db.probaReussite * p.effet.dribble), avantage1c1(p, o))) {
    b.stats.dribblesReussis[p.camp]++;
    statsJoueur(b, p).dribblesReussis++;
    noterStyle(b, p, ["TEC", "RAP"]);
    o.freineJusqua = s.temps + db.eliminationS;
    p.sprintJusqua = Math.max(p.sprintJusqua, s.temps + db.eliminationS);
    return;
  }
  if (b.rng.suivant() < 0.5) {
    duelGagne(b, o);
  } else {
    const a = b.rng.entre(-Math.PI, Math.PI);
    b.lancer(Math.cos(a) * 5, Math.sin(a) * 5 + sens * 2);
  }
}

/** Tir : vise un coin, loin du gardien ; l'erreur grandit avec la distance. */
export function tirer(b: BallonReel, but: PointM, penalty = false): void {
  const s = b.sim;
  const r = s.reglages.ballon;
  const t = r.tir;
  const p = b.porteur!;
  const gardien = s.joueurs.find((j) => j.camp !== p.camp && j.poste.id === "G");
  const cote = gardien ? (gardien.pos.x > but.x ? -1 : 1) : b.rng.suivant() < 0.5 ? -1 : 1;
  const vise = but.x + cote * b.rng.entre(t.viseMinM, t.viseMaxM);
  // Notes : la précision réduit l'erreur de visée, la puissance accélère le tir.
  const ecartPrecision = p.notes.precision - PN.reference;
  const precision = ecartPrecision === 0 ? 1 : Math.exp(-ecartPrecision * PN.tir.erreurParPoint);
  const erreur = (penalty ? t.erreurPenaltyM : t.erreurBaseM + t.erreurParMetre * dist(p.pos, but)) * precision;
  const cible = { x: vise + b.rng.entre(-erreur, erreur), y: but.y };
  const dx = cible.x - s.ballon.x;
  const dy = cible.y - s.ballon.y;
  const n = Math.hypot(dx, dy) || 1;
  const vTir = r.vitesseTirMS * (1 + (p.notes.puissance - PN.reference) * PN.tir.puissanceParPoint);
  b.stats.tirs[p.camp]++;
  statsJoueur(b, p).tirs++;
  if (Math.abs(cible.x - but.x) <= DEMI_BUT_M) statsJoueur(b, p).tirsCadres++;
  b.lancer((dx / n) * vTir, (dy / n) * vTir);
  b.tirEnCours = true;
  b.tirEvite.clear();
  b.tirPenalty = penalty;
  b.plongeon = null;
  if (gardien) plonger(b, gardien, p, but, cible, dx, dy, penalty);
}

/** Le gardien plonge vers le point où le ballon passe à sa hauteur ; il a
 *  d'autant plus de chances d'arrêter que ce point est proche de lui. */
function plonger(b: BallonReel, gardien: JoueurSim, p: JoueurSim, but: PointM, cible: PointM, dx: number, dy: number, penalty: boolean): void {
  const s = b.sim;
  const r = s.reglages.ballon;
  const t = r.tir;
  // Point de passage du ballon à la hauteur du gardien.
  const k = Math.abs(dy) > 1e-6 ? (gardien.pos.y - s.ballon.y) / dy : 0;
  const point = { x: s.ballon.x + dx * Math.max(0, Math.min(1, k)), y: gardien.pos.y };
  const g = gardien.notes;
  const pg = PN.gardien;
  // Placement (13/11) : un gardien bien placé ferme l'angle, il a moins à couvrir.
  const ecart = Math.abs(point.x - gardien.pos.x) * Math.max(0.6, Math.min(1.4, 1 - (g.placement - PN.reference) * pg.placementParPoint));
  const distTir = dist(s.ballon, but);
  const loin = t.arretParMetreDistance * Math.max(0, distTir - 11); // de loin, le gardien a le temps
  const base = penalty ? r.fautes.arretPenaltyProba : Math.max(t.arretMin, Math.min(0.95, t.arretMax - t.arretParMetre * Math.max(0, ecart - 0.5) + loin));
  // Notes : réflexes du gardien contre la puissance du tireur ; de près (face-à-face),
  // ses sorties contre le dribble du tireur (13/11).
  let ecartNotes = (g.reflexes - p.notes.puissance) * PN.tir.poidsPuissanceArret * pg.poidsReflexes;
  if (!penalty && distTir < pg.sortiesDistanceM) ecartNotes += (g.sorties - p.notes.dribble) * pg.poidsSorties;
  const proba = decaler(base, ecartNotes);
  b.arret = Math.abs(cible.x - but.x) > DEMI_BUT_M ? "non" : b.rng.suivant() < proba ? "oui" : "non";
  b.plongeon = { gardien, point };
  gardien.plongeJusqua = s.temps + t.plongeonDureeS;
}

/** Pendant le tir, le gardien court vers le point de son plongeon. */
export function suivrePlongeon(b: BallonReel): void {
  if (b.tirEnCours && b.plongeon) {
    b.plongeon.gardien.cible = { ...b.plongeon.point };
    b.plongeon.gardien.auBallon = true;
  }
}
