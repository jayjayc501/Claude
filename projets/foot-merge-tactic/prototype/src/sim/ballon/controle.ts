// Contrôle du ballon libre : qui le prend (receveur, interception, ballon
// disputé), les contres sur les ballons rapides, l'arrêt du gardien, le
// contrôle raté sous pression et la sanction du hors-jeu. Aussi : où va le
// ballon si personne ne le touche, pour que les joueurs anticipent.

import { PARAMETRES_NOTES as PN, decaler } from "../notes";
import type { Camp, JoueurSim } from "../simulation";
import type { PointM } from "../types";
import type { BallonReel } from "../ballon";
import { dist, portee } from "./outils";
import { noterStyle, statsJoueur } from "./stats";

/** Un joueur prend-il le ballon libre ce pas-ci ? Si oui, on règle le hors-jeu,
 *  l'arrêt du gardien ou le contrôle raté, puis on lui donne le ballon. */
export function reprendre(b: BallonReel): void {
  const s = b.sim;
  if (s.temps < b.airJusqua) return; // ballon en l'air
  const gagnant = chercherGagnant(b);
  if (!gagnant) return;
  if (gagnant === b.receveur && b.horsJeu) {
    b.stats.horsJeu[gagnant.camp]++;
    const adv: Camp = gagnant.camp === 0 ? 1 : 0;
    b.remettre({ ...gagnant.pos }, adv, null, "Hors-jeu");
    return;
  }
  if (b.tirEnCours && gagnant.poste.id === "G" && arretDuGardien(b, gagnant)) return;
  if (gagnant === b.receveur && !b.tirEnCours && controleRate(b, gagnant)) return;
  compterReprise(b, gagnant);
  b.donner(gagnant);
}

/** Le plus proche des joueurs qui ont le ballon à leur portée (null : personne,
 *  ou le ballon vient d'être dévié par un contre). */
function chercherGagnant(b: BallonReel): JoueurSim | null {
  const s = b.sim;
  const r = s.reglages.ballon;
  const vBalle = Math.hypot(b.vit.x, b.vit.y);
  let gagnant: JoueurSim | null = null;
  let meilleurD = Infinity;
  for (const j of s.joueurs) {
    if (b.reserve && s.temps < b.reserve.jusqua && j.camp !== b.reserve.camp) continue;
    if (j === b.dernier && s.temps - b.dernierTemps < r.recontactS) continue;
    if (j === b.lanceur) continue;
    const gardienAdverse = j.poste.id === "G" && b.tirEnCours && b.dernier !== null && j.camp !== b.dernier.camp;
    const allonge = allongeSurLeBallon(b, j);
    const rayon = j === b.receveur ? r.rayonReceveurM : gardienAdverse ? r.tir.rayonPlongeonM : j.poste.id === "G" ? r.rayonGardienM : r.rayonControleM * allonge;
    const d = dist(j.pos, s.ballon);
    if (d > rayon) continue;
    const adverseDuTireur = b.dernier !== null && j.camp !== b.dernier.camp && j.poste.id !== "G";
    if (adverseDuTireur && !b.tirPenalty && vBalle > r.contre.vitesseMinMS && d <= r.rayonControleM * allonge) {
      // Tir (12/11, « pas assez de buts » : 41 % des tirs étaient contrés) : un défenseur
      // sur la trajectoire ne touche le ballon qu'une fois sur deux ; sinon le tir passe.
      if (b.tirEnCours) {
        if (b.tirEvite.has(j)) continue;
        if (b.rng.suivant() > s.reg(j.camp).ballon.tir.contreProba) {
          b.tirEvite.add(j);
          continue;
        }
      }
      // Ballon rapide qui arrive sur un adversaire : contrôlé, ou dévié (contre).
      if (vBalle > r.vitesseControleMaxMS || b.rng.suivant() > r.contre.probaControle) {
        devier(b, j, vBalle);
        return null;
      }
    } else if (vBalle > r.vitesseControleMaxMS && j !== b.receveur && j.poste.id !== "G") continue;
    if (gardienAdverse) {
      if (b.arret === "?") b.arret = b.rng.suivant() < (b.tirPenalty ? r.fautes.arretPenaltyProba : r.arretProba) ? "oui" : "non";
      if (b.arret === "non") continue;
    }
    if (d / allonge < meilleurD) {
      meilleurD = d / allonge;
      gagnant = j;
    }
  }
  return gagnant;
}

/** Portée d'un joueur sur le ballon : le duel, réduit pour un adversaire quand
 *  la passe est bien dosée (note de passe du passeur). */
function allongeSurLeBallon(b: BallonReel, j: JoueurSim): number {
  // Notes : le duel donne la portée sur le ballon (interceptions, ballons disputés, têtes).
  let allonge = portee(j);
  // Passe bien dosée (note de passe du passeur) : plus dure à intercepter.
  if (b.receveur && b.dernier && j.camp !== b.dernier.camp && j.poste.id !== "G" && b.dernier.notes.passe !== PN.reference)
    allonge *= 1 - (b.dernier.notes.passe - PN.reference) * PN.technique.interceptionParPoint;
  return allonge;
}

/** Le gardien arrête le tir. Il bloque, ou repousse en corner (parade : true). */
function arretDuGardien(b: BallonReel, gardien: JoueurSim): boolean {
  const s = b.sim;
  const r = s.reglages.ballon;
  b.stats.arrets[gardien.camp]++;
  statsJoueur(b, gardien).arrets++;
  b.evenement = { texte: "Arrêt", a: s.temps };
  // Réflexes (13/11) : un bon gardien bloque plus souvent au lieu de repousser.
  if (b.rng.suivant() < decaler(r.tir.paradeProba, -(gardien.notes.reflexes - PN.reference) * PN.gardien.poidsCaptage)) {
    // Parade : le gardien repousse le ballon sur le côté, derrière sa ligne (corner).
    const versLigne = gardien.camp === 0 ? -1 : 1;
    const cote = s.ballon.x < s.donnees.largeurM / 2 ? -1 : 1;
    b.vit = { x: cote * b.rng.entre(9, 13), y: versLigne * b.rng.entre(2.5, 4) }; // surtout de côté : sort hors du cadre
    b.dernier = gardien;
    b.dernierTemps = s.temps;
    b.tirEnCours = false;
    b.plongeon = null;
    return true;
  }
  return false;
}

/** Receveur serré par un adversaire : contrôle parfois raté (pressing, 12/11). */
function controleRate(b: BallonReel, receveur: JoueurSim): boolean {
  const s = b.sim;
  const g = s.reg(receveur.camp === 0 ? 1 : 0).ballon.gene;
  // Notes : dribble du receveur (contrôle sous pression) contre duel de l'adversaire le plus proche.
  let serre: JoueurSim | null = null;
  for (const o of s.joueurs) {
    if (o.camp === receveur.camp || o.poste.id === "G" || dist(o.pos, receveur.pos) >= g.controleRayonM) continue;
    if (!serre || dist(o.pos, receveur.pos) < dist(serre.pos, receveur.pos)) serre = o;
  }
  if (serre && b.rng.suivant() < decaler(g.controleRate, serre.notes.duel - receveur.notes.dribble)) {
    const a = b.rng.entre(-Math.PI, Math.PI);
    b.vit = { x: Math.cos(a) * 4, y: Math.sin(a) * 4 };
    b.dernier = receveur;
    b.dernierTemps = s.temps;
    b.receveur = null;
    b.horsJeu = false;
    return true;
  }
  return false;
}

/** Statistiques de la reprise : passe réussie (et passe décisive possible) ou interception. */
function compterReprise(b: BallonReel, gagnant: JoueurSim): void {
  if (gagnant === b.receveur) {
    if (gagnant === b.espacePour) noterStyle(b, gagnant, ["RAP"]);
    // Passe réussie sous pression : le Technicien a gardé le ballon.
    if (b.sousPressionDe && b.sousPressionDe.camp === gagnant.camp && b.sousPressionDe !== gagnant) noterStyle(b, b.sousPressionDe, ["TEC"]);
    b.stats.passesReussies[gagnant.camp]++;
    if (b.dernier && b.dernier.camp === gagnant.camp && b.dernier !== gagnant) {
      statsJoueur(b, b.dernier).passesReussies++;
      b.passeReussie = { de: b.dernier, vers: gagnant, t: b.sim.temps };
    }
  } else if (b.dernier && gagnant.camp !== b.dernier.camp) {
    b.stats.interceptions[gagnant.camp]++;
    statsJoueur(b, gagnant).interceptions++;
    noterStyle(b, gagnant, ["REC", "REM"]);
  }
}

/** Contre : le ballon rapide est dévié franchement d'un côté ou de l'autre. */
function devier(b: BallonReel, j: JoueurSim, v: number): void {
  const c = b.sim.reglages.ballon.contre;
  const cote = b.rng.suivant() < 0.5 ? -1 : 1; // dévié franchement d'un côté ou de l'autre
  const a = Math.atan2(b.vit.y, b.vit.x) + (cote * b.rng.entre(c.angleMinDeg, c.angleMaxDeg) * Math.PI) / 180;
  const nv = v * c.perteVitesse;
  b.stats.contres++;
  noterStyle(b, j, ["REM"]);
  b.vit = { x: Math.cos(a) * nv, y: Math.sin(a) * nv };
  b.dernier = j;
  b.dernierTemps = b.sim.temps;
  b.receveur = null;
  b.tirEnCours = false;
  b.horsJeu = false;
}

/** Où va le ballon si personne ne le touche (pour que les joueurs anticipent). */
function pointArrivee(b: BallonReel, tS: number): PointM {
  const k = b.sim.reglages.ballon.frottementParS;
  const g = (1 - Math.exp(-k * tS)) / k;
  const W = b.sim.donnees.largeurM;
  const L = b.sim.donnees.longueurM;
  return {
    x: Math.min(W - 1, Math.max(1, b.sim.ballon.x + b.vit.x * g)),
    y: Math.min(L - 1, Math.max(1, b.sim.ballon.y + b.vit.y * g)),
  };
}

/** Premier point de la trajectoire du ballon que ce joueur peut atteindre à temps. */
export function pointInterception(b: BallonReel, j: JoueurSim): PointM {
  const vMax = b.sim.reglages.mouvement.vitesseMaxMS * j.vitesseF;
  for (let t = 0; t <= 3; t += 1 / 15) {
    const p = pointArrivee(b, t);
    if (dist(j.pos, p) <= vMax * t + b.sim.reglages.ballon.rayonControleM) return p;
  }
  return pointArrivee(b, 3);
}
