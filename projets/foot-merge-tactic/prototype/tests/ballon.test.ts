import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

const donnees = chargerDonnees();
const reglages = chargerReglages();
const W = donnees.largeurM;
const L = donnees.longueurM;

function match(graine: number): MatchSim {
  const { effectif, adversaire } = chargerEquipes();
  const m = new MatchSim(donnees, reglages, [effectif, adversaire], graine, true);
  m.demarrer();
  return m;
}

const GRAINES = [1, 2, 3, 4];

describe("ballon réel : cohérence physique", () => {
  test("le ballon reste sur le terrain, ne saute jamais et suit son porteur", () => {
    for (const g of GRAINES) {
      const m = match(g);
      let avant = { ...m.ballon };
      let ecartPorteur = 0;
      for (let i = 0; i < 90 * 30; i++) {
        m.pas();
        const b = m.ballon;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThanOrEqual(W);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeLessThanOrEqual(L);
        const porteur = m.balle!.porteur;
        const saut = Math.hypot(b.x - avant.x, b.y - avant.y);
        // un coup de pied ne dépasse pas la vitesse du tir ; un remise en jeu repose le ballon ailleurs
        if (!porteur && !m.balle!.reserve) expect(saut).toBeLessThanOrEqual((reglages.ballon.vitesseTirMS + 1) / 30);
        if (porteur) {
          expect(m.possession).toBe(porteur.camp);
          if (Math.hypot(porteur.pos.x - b.x, porteur.pos.y - b.y) > 1.5) ecartPorteur++;
        }
        avant = { ...b };
      }
      expect(ecartPorteur).toBeLessThan(90 * 30 * 0.03);
    }
  });

  test("même graine, même match", () => {
    const a = match(7);
    const b = match(7);
    for (let i = 0; i < 1800; i++) {
      a.pas();
      b.pas();
    }
    expect(a.ballon).toEqual(b.ballon);
    expect(a.score).toEqual(b.score);
  });

  test("un ballon qui franchit la ligne dans le cadre est un but ; hors cadre, sortie de but", () => {
    const m = match(3);
    const b = m.balle!;
    m.pas();
    m.ballon = { x: W / 2, y: L - 0.2 };
    b.porteur = null;
    b.reserve = null;
    b.vit = { x: 0, y: 20 };
    m.pas();
    expect(m.score).toEqual([1, 0]);
    expect(m.ballon.y).toBeCloseTo(L / 2, 5); // remise au centre
    expect(m.possession).toBe(1);

    m.ballon = { x: W / 2 + 10, y: 0.2 };
    b.porteur = null;
    b.reserve = null;
    b.vit = { x: 0, y: -20 };
    m.pas();
    expect(m.score).toEqual([1, 0]);
    expect(m.ballon.y).toBeCloseTo(5.5, 5); // sortie de but du camp 0
    expect(m.possession).toBe(0);
  });
});

describe("ballon réel : tir dans la surface", () => {
  test("un joueur qui a le ballon dans la surface tire, il ne fait pas de passe en retrait", () => {
    for (const camp of [0, 1] as const) {
      const m = match(11);
      m.pas();
      const b = m.balle!;
      const j = m.joueurs.find((x) => x.camp === camp && x.poste.id !== "G")!;
      j.pos = { x: W / 2 + 6, y: camp === 0 ? L - 10 : 10 };
      m.ballon = { ...j.pos };
      b.porteur = j;
      b.reserve = null;
      (b as unknown as { decisionA: number }).decisionA = 0;
      m.pas();
      expect(b.tirEnCours).toBe(true);
      expect(b.stats.tirs[camp]).toBe(1);
    }
  });
});

describe("ballon réel : pressing et contre-pressing (référence §4)", () => {
  test("juste après une perte, les plus proches attaquent le porteur ; ensuite un seul presse", () => {
    const cp = reglages.ballon.contrePressing;
    let contre = 0;
    let normal = 0;
    for (const g of GRAINES) {
      const m = match(g);
      for (let i = 0; i < 120 * 30; i++) {
        m.pas();
        const b = m.balle!;
        const p = b.porteur;
        if (!p || p.poste.id === "G") continue;
        const eux = m.joueurs.filter((j) => j.camp !== p.camp && j.poste.id !== "G");
        const proches = eux.filter((j) => Math.hypot(j.pos.x - p.pos.x, j.pos.y - p.pos.y) < cp.rayonM - 2); // marge : positions relevées après le déplacement
        const surLeBallon = eux.filter((j) => Math.hypot(j.cible.x - m.ballon.x, j.cible.y - m.ballon.y) < 6).length;
        const auBallon = eux.filter((j) => Math.hypot(j.cible.x - m.ballon.x, j.cible.y - m.ballon.y) < 0.5).length;
        if (b.perte && b.perte.camp !== p.camp && m.temps - b.perte.a < cp.dureeS) {
          if (proches.length >= 3) {
            expect(surLeBallon).toBeGreaterThanOrEqual(3);
            contre++;
          }
        } else {
          expect(auBallon).toBeLessThanOrEqual(1);
          normal++;
        }
      }
    }
    expect(contre).toBeGreaterThan(30);
    expect(normal).toBeGreaterThan(300);
  });
});

describe("ballon réel : réalisme du jeu (référence football §9.4)", () => {
  const MINUTES = 3;
  function jouer(g: number) {
    const m = match(g);
    let changements = 0;
    let derniere = m.possession;
    let libre = 0;
    let libreMax = 0;
    for (let i = 0; i < MINUTES * 60 * 30; i++) {
      m.pas();
      if (m.possession !== derniere) {
        changements++;
        derniere = m.possession;
      }
      if (m.balle!.porteur) libre = 0;
      else if (m.temps > 15) {
        libre += 1 / 30;
        libreMax = Math.max(libreMax, libre);
      }
    }
    return { m, changements, libreMax };
  }
  const parties = GRAINES.map(jouer);

  test("des passes sont jouées, la plupart arrivent (50 à 97 %)", () => {
    for (const { m } of parties)
      for (const camp of [0, 1] as const) {
        const s = m.balle!.stats;
        expect(s.passes[camp] / MINUTES).toBeGreaterThan(4);
        expect(s.passes[camp] / MINUTES).toBeLessThan(16);
        const taux = s.passesReussies[camp] / s.passes[camp];
        expect(taux).toBeGreaterThan(0.5);
        expect(taux).toBeLessThan(0.97);
      }
  });

  test("le ballon change de camp (interceptions, tacles) sans que ce soit un ping-pong", () => {
    for (const { m, changements } of parties) {
      expect(changements / MINUTES).toBeGreaterThan(2);
      expect(changements / MINUTES).toBeLessThan(12);
      expect(m.balle!.stats.interceptions[0] + m.balle!.stats.interceptions[1]).toBeGreaterThan(0);
    }
  });

  test("peu de tirs et peu de buts : en moyenne moins de 1,5 tir par équipe et par minute", () => {
    const total = parties.reduce((s, { m }) => s + m.balle!.stats.tirs[0] + m.balle!.stats.tirs[1], 0);
    expect(total / (parties.length * 2 * MINUTES)).toBeLessThan(1.5);
    for (const { m } of parties)
      for (const camp of [0, 1] as const) {
        expect(m.balle!.stats.tirs[0] + m.balle!.stats.tirs[1]).toBeGreaterThan(0);
        expect(m.score[camp]).toBeLessThanOrEqual(3);
      }
  });

  test("le ballon n'est jamais libre trop longtemps", () => {
    for (const { libreMax } of parties) expect(libreMax).toBeLessThan(9);
  });

  test("prendre le ballon fait réagir l'équipe : chacun bascule à son tour", () => {
    const m = match(5);
    let vu = false;
    let poss = m.possession;
    for (let i = 0; i < 120 * 30 && !vu; i++) {
      m.pas();
      if (m.possession !== poss) {
        poss = m.possession;
        expect(m.enTransition).toBe(true);
        const camp = m.possession;
        m.avancer(2.5);
        expect(m.joueurs.filter((j) => j.camp === camp && j.phase === "attaque").length).toBeGreaterThanOrEqual(8);
        vu = true;
      }
    }
    expect(vu).toBe(true);
  });
});
