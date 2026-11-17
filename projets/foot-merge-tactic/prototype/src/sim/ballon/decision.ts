// Décision du porteur, toutes les 0,6 à 1,2 s : remise en jeu à jouer, puis,
// dans cet ordre, tir, course seul vers le but, centre, repiquage de l'ailier,
// dribble, jeu long, passe (au pied ou dans l'espace), et sinon, pressé :
// dégagement ou protection du ballon. Le premier essai qui aboutit est joué.
// Aussi : où court le porteur entre deux décisions.
//
// L'ordre des essais et l'ordre des tirages au sort sont ceux du moteur du
// 14/11 : les changer change tous les matchs (empreintes).

import { PARAMETRES_NOTES as PN, decaler } from "../notes";
import type { Camp, JoueurSim } from "../simulation";
import type { PointM, Reglages } from "../types";
import type { BallonReel } from "../ballon";
import { jouerRemiseEnJeu } from "./arrets";
import { centrer, degager, dribbler, jouerLong, passer, tirer } from "./gestes";
import { avantBouche, avantage1c1, avantageVitesse, contrePresse, depuisRecuperation, dist, distSegment, fusions } from "./outils";
import { dansSurface, estHorsJeu } from "./physique";
import { lancerMontee } from "./sansBallon";

/** Ce que le porteur voit au moment de décider. */
interface Situation {
  p: JoueurSim;
  /** Réglages du ballon de son équipe (avec sa tactique). */
  r: Reglages["ballon"];
  sens: number;
  W: number;
  L: number;
  but: PointM;
  dBut: number;
  adverses: JoueurSim[];
  /** Distance de l'adversaire le plus proche, devant ou à côté de lui. */
  pression: number;
}

/** Le porteur choisit son action (décisions selon la tactique de son équipe). */
export function decider(b: BallonReel): void {
  const s = b.sim;
  const p = b.porteur!;
  const r = s.reg(p.camp).ballon;
  const sens = p.camp === 0 ? 1 : -1;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const but = { x: W / 2, y: sens === 1 ? L : 0 };
  const dBut = dist(p.pos, but);
  const adverses = s.joueurs.filter((j) => j.camp !== p.camp);
  const pression = Math.min(...adverses.filter((o) => (o.pos.y - p.pos.y) * sens > -1.5).map((o) => dist(o.pos, p.pos)));
  b.decisionA = s.temps + b.rng.entre(r.decisionS.min, r.decisionS.max) * contrePresse(b, p).precipite;
  // Contre-attaque : juste après la récupération, on cherche l'avant.
  const poidsProgression = r.poidsProgression + (depuisRecuperation(b, p.camp) < r.contreAttaque.dureeS ? r.contreAttaque.bonusProgression : 0);
  if (jouerRemiseEnJeu(b, adverses, but, sens)) return;
  const c: Situation = { p, r, sens, W, L, but, dBut, adverses, pression };
  if (essayerTir(b, c)) return;
  if (essayerSeulDevant(b, c)) return;
  if (essayerCentre(b, c)) return;
  if (essayerRepique(b, c)) return;
  if (essayerDribble(b, c)) return;
  if (essayerJeuLong(b, c)) return;
  passerOuGarder(b, c, poidsProgression);
}

/** Tir : dans la surface, on tire toujours (jamais de passe en retrait) ;
 *  plus loin mais à portée et pas trop excentré, on tire parfois. */
function essayerTir(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, W, L, but, dBut } = c;
  if (p.poste.id === "G") return false;
  const enSurface = Math.abs(sens === 1 ? L - p.pos.y : p.pos.y) <= r.surface.profondeurM && Math.abs(p.pos.x - W / 2) <= r.surface.demiLargeurM;
  if (enSurface) {
    tirer(b, but);
    return true;
  }
  // Un joueur fusionné (14/11) ose plus (× 1 sans fusion : inchangé).
  const oseTir = 1 + fusions(p) * b.sim.influences.fusion.tirLoinParNiveau;
  if (dBut < r.tirDistanceM && Math.abs(p.pos.x - W / 2) < dBut * 0.8 && b.rng.suivant() < (r.tirLoin.probaBase + r.tirLoin.probaMax * (1 - dBut / r.tirDistanceM)) * oseTir) {
    tirer(b, but);
    return true;
  }
  return false;
}

/** Seul devant le but (aucun joueur de champ adverse entre lui et le but,
 *  12/11 : avant, un cône de 18 m suffisait et on fonçait de trop loin) et
 *  pas pressé : il fonce vers le but et tire à portée, sans passe en retrait. */
function essayerSeulDevant(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, but, dBut, adverses, pression } = c;
  const libreDevant = !adverses.some((o) => {
    if (o.poste.id === "G") return false;
    const avant = (o.pos.y - p.pos.y) * sens;
    return avant > 0.5 && avant < dBut && Math.abs(o.pos.x - p.pos.x) < 4 + avant * 0.3;
  });
  if (p.poste.id !== "G" && libreDevant && pression >= r.pressionM) {
    if (dBut < r.seulTirM) tirer(b, but);
    else b.decisionA = Math.min(b.decisionA, b.sim.temps + 0.3); // il lève la tête souvent : tir dès qu'il est à portée
    return true;
  }
  return false;
}

/** Sur l'aile près de la ligne de but, avec un coéquipier dans la surface : centre. */
function essayerCentre(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, W, L, but } = c;
  const ce = r.centre;
  const versLigne = sens === 1 ? L - p.pos.y : p.pos.y;
  if (p.poste.id !== "G" && versLigne < ce.zoneProfondeurM && Math.abs(p.pos.x - W / 2) > ce.ecartAxeM && b.rng.suivant() < ce.proba) {
    if (b.sim.joueurs.some((q) => q.camp === p.camp && q !== p && dansSurface(b, q.pos, q.camp === 0 ? 1 : 0))) {
      centrer(b, but, sens);
      return true;
    }
  }
  return false;
}

/** Repiquage (14/11, « les ailiers jamais repiquent au centre pour aller
 *  marquer ») : sur son côté, l'ailier rentre parfois dans l'axe balle au
 *  pied, si l'intérieur est libre, pour tirer ou combiner ; le latéral de son
 *  côté prend alors le couloir. */
function essayerRepique(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, W, L, adverses } = c;
  const s = b.sim;
  const rq = r.repiquer;
  const versLigne = sens === 1 ? L - p.pos.y : p.pos.y;
  const profP = sens === 1 ? p.pos.y : L - p.pos.y;
  const enRepique = b.repique?.joueur === p && s.temps < b.repique.fin;
  if ((p.poste.id === "AG" || p.poste.id === "AD") && !enRepique && profP > rq.zoneProfM && versLigne > rq.versLigneMinM && Math.abs(p.pos.x - W / 2) > rq.ecartAxeM && b.rng.suivant() < rq.proba) {
    const cote = Math.sign(p.pos.x - W / 2);
    const point = { x: p.pos.x - cote * rq.rentreeM, y: p.pos.y + sens * rq.avanceM };
    if (!adverses.some((o) => o.poste.id !== "G" && distSegment(o.pos, p.pos, point) < rq.libreM)) {
      b.repique = { joueur: p, fin: s.temps + rq.dureeS, point };
      b.stats.repiquages[p.camp]++;
      b.decisionA = s.temps + rq.dureeS * 0.8;
      lancerMontee(b, p.camp, cote, true);
      return true;
    }
  }
  return false;
}

/** Dribble : face à un adversaire tout proche, un joueur offensif tente
 *  parfois de l'éliminer plutôt que de passer. */
function essayerDribble(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, adverses } = c;
  const db = r.dribble;
  const devant = adverses.find((o) => o.poste.id !== "G" && dist(o.pos, p.pos) < db.distanceM && (o.pos.y - p.pos.y) * sens > -0.5);
  const tente = (p.poste.ligneDefense === "defense" ? db.probaTentative * 0.25 : p.poste.ligneDefense === "gardien" ? 0 : db.probaTentative) * (1 + fusions(p) * b.sim.influences.fusion.tentativeParNiveau);
  // Notes : on tente plus souvent le 1 contre 1 quand on a l'avantage (dribble et accélération).
  if (devant && b.rng.suivant() < (tente > 0 ? decaler(tente, avantage1c1(p, devant) * PN.unContreUn.poidsTentative) : 0)) {
    dribbler(b, devant, sens);
    return true;
  }
  return false;
}

/** Jeu long (12/11) : depuis sa moitié ou le milieu, ballon aérien vers un
 *  attaquant lancé ou libre, là où il arrivera avant les défenseurs. */
function essayerJeuLong(b: BallonReel, c: Situation): boolean {
  const { p, r, sens, L } = c;
  const jl = r.jeuLong;
  const deSonButJL = sens === 1 ? p.pos.y : L - p.pos.y;
  const probaJL = depuisRecuperation(b, p.camp) < r.contreAttaque.dureeS ? jl.probaContre : jl.proba;
  if (!(p.poste.id !== "G" && deSonButJL < jl.profondeurMaxM && probaJL > 0 && b.rng.suivant() < probaJL)) return false;
  const choix = choisirJeuLong(b, c);
  if (!choix) return false;
  jouerLong(b, choix.q, choix.point);
  return true;
}

/** Le coéquipier du jeu long : celui qui gagne le plus de terrain et arrive au
 *  point de chute nettement avant les défenseurs (hors-jeu exclus). */
function choisirJeuLong(b: BallonReel, c: Situation): { q: JoueurSim; point: PointM; gain: number } | null {
  const { p, r, sens, W, L, adverses } = c;
  const s = b.sim;
  const jl = r.jeuLong;
  let choixJL: { q: JoueurSim; point: PointM; gain: number } | null = null;
  for (const q of s.joueurs) {
    if (q === p || q.camp !== p.camp || q.poste.id === "G") continue;
    if (estHorsJeu(b, q)) continue;
    const d0 = dist(p.pos, q.pos);
    const T = d0 / jl.vitesseMS + 0.4;
    const point = { x: Math.min(W - 2, Math.max(2, q.pos.x + q.vit.x * T)), y: Math.min(L - 3, Math.max(3, q.pos.y + q.vit.y * T)) };
    const d = dist(p.pos, point);
    const gain = (point.y - p.pos.y) * sens;
    if (d < jl.distanceMinM || d > jl.distanceMaxM || gain < jl.gainMinM) continue;
    const tLui = dist(q.pos, point) / (s.reglages.mouvement.vitesseMaxMS * q.vitesseF);
    const tEux = Math.min(...adverses.map((o) => dist(o.pos, point) / (s.reglages.mouvement.vitesseMaxMS * o.vitesseF)));
    if (tLui + jl.avanceS > Math.max(tEux, T * 0.8)) continue;
    if (!choixJL || gain > choixJL.gain) choixJL = { q, point, gain };
  }
  return choixJL;
}

/** La meilleure passe si elle vaut le coup (ou s'il est pressé) ; sinon il
 *  garde le ballon, et, pressé sans solution sûre : dégagement dans son tiers,
 *  passe vers l'avant près de son but, sinon il protège le ballon. */
function passerOuGarder(b: BallonReel, c: Situation, poidsProgression: number): void {
  const { p, r, sens, L, pression } = c;
  const { meilleur, score, fuite } = noterPasses(b, c, poidsProgression);
  const presse = pression < r.pressionM;
  // Avant bouché (adversaire proche dans le cône) : il fait tourner le ballon
  // (passe latérale ou en retrait) plutôt que de foncer dans le bloc.
  const bouche = avantBouche(b, p);
  const seuil = bouche ? r.seuilPasse - r.construction.baisseSeuil : r.seuilPasse;
  if (meilleur && (p.poste.id === "G" || presse || score > seuil)) {
    passer(b, meilleur.q, presse, meilleur.point);
    return;
  }
  if (!presse) return; // rien d'ouvert : il continue de conduire
  const deSonBut = sens === 1 ? p.pos.y : L - p.pos.y;
  if (deSonBut < r.degagement.zoneM && p.poste.id !== "G") {
    degager(b, sens);
    return;
  }
  if (fuite && deSonBut < r.zoneDegagementM) {
    passer(b, fuite, presse); // dégagement
    return;
  }
  b.protegeJusqua = b.sim.temps + r.protection.dureeS;
}

/** Passes : on note chaque partenaire (progression, espace, distance, voie
 *  libre), au pied ou dans l'espace devant lui, dans le sens du jeu. Aussi :
 *  le coéquipier le plus avancé (`fuite`), pour se dégager sous pression. */
function noterPasses(b: BallonReel, c: Situation, poidsProgression: number): { meilleur: { q: JoueurSim; point: PointM | null } | null; score: number; fuite: JoueurSim | null } {
  const { p, r, sens } = c;
  let meilleur: { q: JoueurSim; point: PointM | null } | null = null;
  let score = -Infinity;
  let fuite: JoueurSim | null = null;
  let avanceMax = -Infinity;
  for (const q of b.sim.joueurs) {
    if (q === p || q.camp !== p.camp) continue;
    if (q.poste.id === "G" && p.poste.id !== "G") continue;
    if (estHorsJeu(b, q) && b.rng.suivant() > r.horsJeuVuProba) continue; // le passeur voit presque toujours le hors-jeu
    const d = dist(p.pos, q.pos);
    if (d < r.passeMinM || d > r.passeMaxM) continue;
    const avance = (q.pos.y - p.pos.y) * sens;
    if (avance > avanceMax) {
      avanceMax = avance;
      fuite = q;
    }
    for (const o of optionsDePasse(b, c, q, avance)) {
      const sc = noterOption(b, c, q, o.vise, poidsProgression);
      if (sc !== null && sc > score) {
        score = sc;
        meilleur = { q, point: o.point };
      }
    }
  }
  return { meilleur, score, fuite };
}

/** Les deux façons de servir q : au pied, et dans l'espace devant lui s'il y
 *  arrive nettement avant tout adversaire (joueur en appel : dans le sens de sa course). */
function optionsDePasse(b: BallonReel, c: Situation, q: JoueurSim, avance: number): { point: PointM | null; vise: PointM }[] {
  const { r, sens, L, adverses } = c;
  const s = b.sim;
  const options: { point: PointM | null; vise: PointM }[] = [{ point: null, vise: q.pos }];
  // Joueur en appel : l'espace est dans le sens de sa course (diagonale).
  const vq = Math.hypot(q.vit.x, q.vit.y) || 1;
  const enAppel = b.appel?.joueur === q || b.montee?.joueur === q; // 14/11 : le latéral qui monte aussi
  const esp = enAppel
    ? { x: q.pos.x + (q.vit.x / vq) * r.passeEspace.avanceM * 1.3, y: q.pos.y + (q.vit.y / vq) * r.passeEspace.avanceM * 1.3 }
    : { x: q.pos.x, y: q.pos.y + sens * r.passeEspace.avanceM };
  if (avance > 0 && q.vit.y * sens > r.passeEspace.courseMinMS && esp.y > 2 && esp.y < L - 2) {
    // L'espace est à lui s'il y arrive nettement avant tout adversaire.
    const vCourse = s.reglages.mouvement.vitesseMaxMS;
    const tLui = dist(q.pos, esp) / (vCourse * q.vitesseF);
    const tEux = Math.min(...adverses.map((o) => dist(o.pos, esp) / (vCourse * o.vitesseF)));
    if (tLui + r.passeEspace.avanceSurAdversaireS < tEux) options.push({ point: esp, vise: esp });
  }
  return options;
}

/** Note d'une passe vers `vise` (null : voie coupée, ou surface adverse trop
 *  fermée). Tire au sort une part de hasard (± 2). */
function noterOption(b: BallonReel, c: Situation, q: JoueurSim, vise: PointM, poidsProgression: number): number | null {
  const { p, r, sens, W, L, adverses } = c;
  const s = b.sim;
  const libre = (a: PointM, d: PointM) => !adverses.some((o) => distSegment(o.pos, a, d) < r.voieLibreM);
  const adv: Camp = p.camp === 0 ? 1 : 0;
  // Passe dans la surface adverse (12/11, « les actions finissent trop
  // vite en tir ») : seulement vers un joueur vraiment libre, par une voie
  // bien dégagée, et moins tentante qu'une passe qui garde le ballon.
  const versSurface = dansSurface(b, vise, adv);
  if (!libre(p.pos, vise)) return null;
  const ouvert = Math.min(8, Math.min(...adverses.map((a) => dist(a.pos, vise))));
  if (versSurface && (ouvert < r.construction.surfaceOuvertM || adverses.some((a) => distSegment(a.pos, p.pos, vise) < r.voieLibreM * r.construction.surfaceVoieFacteur))) return null;
  const gain = (vise.y - p.pos.y) * sens;
  const large = Math.abs(vise.x - W / 2) > r.construction.largeurM && (vise.y - L / 2) * sens > -10 ? r.construction.bonusLargeur : 0;
  // Notes : on cherche le coéquipier plus rapide que son adversaire direct (passe vers l'avant).
  const vitesse = gain > 0 ? avantageVitesse(q, vise, adverses) * PN.vitesse.choixPasseParPoint : 0;
  // Fusions (14/11) : on cherche davantage le joueur fusionné (+ 0 sans fusion).
  const vedette = fusions(q) * s.influences.fusion.passeVersLuiParNiveau;
  // Latéral qui monte devant le ballon (14/11) : le porteur le cherche (+ 0 sinon).
  const dedouble = b.montee?.joueur === q && gain > 0 ? r.sansBallon.montee.bonusPasse : 0;
  return gain * poidsProgression + ouvert * r.poidsEspace - dist(p.pos, vise) * 0.08 + large - (versSurface ? r.construction.surfaceMalus : 0) + vitesse + vedette + dedouble + b.rng.entre(-2, 2);
}

/** Où court le porteur entre deux décisions : vers l'avant (droit au but dans
 *  le dernier tiers), en temporisant si l'avant est bouché, dans l'axe s'il
 *  repique ; il attend sur place pour une remise en jeu. Un adversaire qui
 *  arrive sur lui avance sa décision (passe avant le tacle). */
export function ciblePorteur(b: BallonReel, p: JoueurSim): void {
  const s = b.sim;
  const r = s.reglages.ballon;
  const W = s.donnees.largeurM;
  const L = s.donnees.longueurM;
  const sens = p.camp === 0 ? 1 : -1;
  if (p.poste.id === "G" || b.arrete) {
    p.cible = { ...p.pos }; // remise en jeu : il attend sur place
    return;
  }
  const butAdv = { x: W / 2, y: sens === 1 ? L : 0 };
  const dBut = dist(p.pos, butAdv);
  // Avant bouché (12/11, « les actions finissent trop vite en tir ») : il
  // ne fonce plus dans le bloc, il temporise et cherche une passe : il
  // s'écarte de côté de l'adversaire le plus proche (il protège le ballon).
  const bouche = avantBouche(b, p);
  const avance = bouche ? s.reg(p.camp).ballon.construction.temporiseM : r.dribbleAvanceM;
  p.cible =
    dBut < 35 // dernier tiers : droit vers le but
      ? { x: p.pos.x + ((butAdv.x - p.pos.x) / dBut) * avance, y: p.pos.y + ((butAdv.y - p.pos.y) / dBut) * avance }
      : { x: p.pos.x + (W / 2 - p.pos.x) * 0.2, y: Math.min(L - 3, Math.max(3, p.pos.y + sens * avance)) };
  if (bouche) {
    const proche = s.joueurs
      .filter((o) => o.camp !== p.camp && o.poste.id !== "G")
      .reduce((a, o) => (dist(o.pos, p.pos) < dist(a.pos, p.pos) ? o : a));
    const cote = proche.pos.x > p.pos.x ? -1 : 1;
    const ecart = s.reg(p.camp).ballon.construction.ecartM;
    p.cible = { x: Math.min(W - 2, Math.max(2, p.cible.x + cote * ecart)), y: p.cible.y };
  }
  // Ailier qui repique (14/11) : il rentre dans l'axe balle au pied.
  if (b.repique?.joueur === p && s.temps < b.repique.fin) p.cible = { ...b.repique.point };
  // Un adversaire arrive sur lui : il décide tout de suite (passe avant le tacle).
  const rp = s.reg(p.camp).ballon;
  if (b.decisionA > s.temps + rp.reactionPressionS && s.joueurs.some((o) => o.camp !== p.camp && o.poste.id !== "G" && dist(o.pos, p.pos) < rp.pressionM)) {
    b.decisionA = s.temps + rp.reactionPressionS;
  }
}
