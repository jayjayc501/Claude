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
        if (!porteur && !m.balle!.reserve && !m.balle!.engagement) expect(saut).toBeLessThanOrEqual((Math.max(reglages.ballon.vitesseTirMS, 30) + 1) / 30); // 30 m/s : ballon aérien le plus rapide
        if (porteur) {
          expect(m.possession).toBe(porteur.camp);
          const pause = (m.balle as unknown as { arrete: unknown }).arrete !== null; // remise en jeu : il prend le ballon à 1,6 m et s'arrête
          if (!pause && Math.hypot(porteur.pos.x - b.x, porteur.pos.y - b.y) > 1.5) ecartPorteur++;
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

    b.engagement = null; // on saute le retour au camp
    m.ballon = { x: W / 2 + 10, y: 0.2 };
    b.porteur = null;
    b.reserve = null;
    b.vit = { x: 0, y: -20 };
    m.pas();
    expect(m.score).toEqual([1, 0]);
    expect(m.ballon.y).toBeCloseTo(5.5, 5); // six mètres du camp 0, au coin de la surface de but
    expect(m.ballon.x).toBeCloseTo(W / 2 + 9.16, 5);
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

describe("ballon réel : arrêts de jeu (lot B)", () => {
  test("ballon sorti derrière la ligne, touché en dernier par un défenseur : corner", () => {
    const m = match(3);
    m.pas();
    const b = m.balle!;
    b.porteur = null;
    b.reserve = null;
    b.dernier = m.joueurs.find((j) => j.camp === 1 && j.poste.id === "DC")!;
    m.ballon = { x: W / 2 + 12, y: L - 0.2 };
    b.vit = { x: 0, y: 20 };
    m.pas();
    expect(b.stats.corners[0]).toBe(1);
    expect(m.possession).toBe(0);
    expect(m.ballon).toEqual({ x: W - 0.5, y: L - 0.5 });
  });

  test("passe à un joueur hors-jeu : coup franc pour l'adversaire", () => {
    const m = match(4);
    m.pas();
    const b = m.balle!;
    const q = m.joueurs.find((j) => j.camp === 0 && j.poste.ligneDefense === "attaque")!;
    const p = m.joueurs.find((j) => j.camp === 0 && j.poste.ligneDefense === "milieu")!;
    q.pos = { x: W / 2, y: L - 12 };
    p.pos = { x: W / 2, y: L - 45 };
    for (const o of m.joueurs) if (o.camp === 1 && o.poste.id !== "G") o.pos = { x: o.pos.x < W / 2 ? 2 : W - 2, y: L - 30 };
    m.ballon = { ...p.pos };
    b.porteur = p;
    b.reserve = null;
    (b as unknown as { passer(q: unknown): void }).passer(q);
    for (let i = 0; i < 5 * 30 && b.stats.horsJeu[0] === 0; i++) m.pas();
    expect(b.stats.horsJeu[0]).toBe(1);
    expect(m.possession).toBe(1);
  });

  test("faute dans la surface : penalty, puis tir", () => {
    const r = structuredClone(reglages);
    r.ballon.fautes.proba = 1;
    r.ballon.tacle.parSeconde = 50;
    const { effectif, adversaire } = chargerEquipes();
    const m = new MatchSim(donnees, r, [effectif, adversaire], 5, true);
    m.demarrer();
    m.pas();
    const b = m.balle!;
    const p = m.joueurs.find((j) => j.camp === 0 && j.poste.ligneDefense === "attaque")!;
    const o = m.joueurs.find((j) => j.camp === 1 && j.poste.id === "DC")!;
    p.pos = { x: W / 2, y: L - 10 };
    o.pos = { x: W / 2 + 1, y: L - 9 };
    m.ballon = { ...p.pos };
    b.porteur = p;
    b.reserve = null;
    (b as unknown as { decisionA: number; arrete: unknown }).decisionA = 1e9;
    (b as unknown as { arrete: unknown }).arrete = null; // engagement considéré comme joué
    m.pas();
    expect(b.stats.penalties[0]).toBe(1);
    expect(m.ballon).toEqual({ x: W / 2, y: L - 11 });
    expect(m.possession).toBe(0);
    for (let i = 0; i < 8 * 30 && b.stats.tirs[0] === 0; i++) m.pas();
    expect(b.stats.tirs[0]).toBe(1);
  });
});

describe("ballon réel : engagement après un but", () => {
  test("chacun regagne son camp avant l'engagement", () => {
    const m = match(6);
    for (let i = 0; i < 30; i++) m.pas();
    const b = m.balle!;
    b.porteur = null;
    b.reserve = null;
    for (const j of m.joueurs) j.pos = { x: j.pos.x, y: j.camp === 0 ? L - 20 : 20 }; // tout le monde dans le camp adverse
    m.ballon = { x: W / 2, y: L - 0.2 };
    b.vit = { x: 0, y: 20 };
    m.pas();
    expect(m.score[0]).toBe(1);
    expect(b.engagement).not.toBeNull();
    while (b.engagement) {
      expect(b.porteur).toBeNull();
      expect(m.ballon).toEqual({ x: W / 2, y: L / 2 });
      m.pas();
    }
    for (const j of m.joueurs) expect(j.camp === 0 ? j.pos.y <= L / 2 + 0.5 : j.pos.y >= L / 2 - 0.5).toBe(true);
  });
});

describe("ballon réel : coup d'envoi", () => {
  test("le joueur qui engage passe à un coéquipier, à côté ou en retrait", () => {
    for (const g of GRAINES) {
      const m = match(g);
      const b = m.balle!;
      let i = 0;
      while (b.stats.passes[0] === 0 && i++ < 6 * 30) m.pas();
      expect(b.stats.passes[0]).toBe(1);
      expect(b.vit.y).toBeLessThan(2); // le camp 0 attaque vers +y : pas de ballon vers l'avant
    }
  });
});

describe("ballon réel : défense de la surface (lot D)", () => {
  test("la plupart des tirs se font avec au moins un défenseur entre le tireur et le but", () => {
    let tirs = 0;
    let seuls = 0;
    for (const g of GRAINES) {
      const m = match(g);
      const b = m.balle!;
      for (let i = 0; i < 180 * 30; i++) {
        const p = b.porteur;
        const avant = p ? { ...p.pos } : null;
        const n = b.stats.tirs[0] + b.stats.tirs[1];
        m.pas();
        if (!p || !avant || b.stats.tirs[0] + b.stats.tirs[1] === n) continue;
        const by = p.camp === 0 ? L : 0;
        const dB = Math.hypot(avant.x - W / 2, avant.y - by);
        tirs++;
        if (!m.joueurs.some((o) => o.camp !== p.camp && o.poste.id !== "G" && Math.hypot(o.pos.x - W / 2, o.pos.y - by) < dB)) seuls++;
      }
    }
    expect(tirs).toBeGreaterThan(10);
    expect(seuls / tirs).toBeLessThan(0.5); // avant le lot D : 75 %
  });
});

describe("ballon réel : touche", () => {
  test("sur une touche, le joueur marque une pause puis fait une passe, sans partir avec le ballon", () => {
    let vues = 0;
    // Plus de graines que les autres tests : il y a peu de touches par match (12/11).
    for (const g of [...GRAINES, 101, 102, 103, 104, 105, 106]) {
      const m = match(g);
      const b = m.balle!;
      let attente = false;
      let tireur: (typeof m.joueurs)[number] | null = null;
      let depuis = 0;
      let depart = { x: 0, y: 0 };
      for (let i = 0; i < 180 * 30; i++) {
        const passes = b.stats.passes[0] + b.stats.passes[1];
        m.pas();
        if (b.evenement?.texte === "Touche" && m.temps - b.evenement.a < 0.05 && !attente) attente = true;
        if (attente && !tireur && b.porteur) {
          tireur = b.porteur;
          depuis = m.temps;
          depart = { ...tireur.pos };
        }
        if (tireur) {
          if (b.stats.passes[0] + b.stats.passes[1] > passes) {
            expect(m.temps - depuis).toBeGreaterThan(0.6); // petite pause
            expect(Math.hypot(tireur.pos.x - depart.x, tireur.pos.y - depart.y)).toBeLessThan(3); // il freine en arrivant, mais ne part pas avec le ballon (en conduite : 6 m en 1 s)
            vues++;
            attente = false;
            tireur = null;
          } else if (b.porteur !== tireur) {
            attente = false;
            tireur = null;
          }
        }
      }
    }
    expect(vues).toBeGreaterThan(2);
  });
});

describe("ballon réel : seul face au but", () => {
  test("un attaquant seul devant le but fonce et tire, sans passe en retrait", () => {
    for (const camp of [0, 1] as const) {
      const m = match(13);
      m.pas();
      const b = m.balle!;
      const sens = camp === 0 ? 1 : -1;
      const yBut = camp === 0 ? L : 0;
      const j = m.joueurs.find((x) => x.camp === camp && x.poste.ligneDefense === "attaque")!;
      j.pos = { x: W / 2, y: yBut - sens * 32 };
      for (const o of m.joueurs)
        if (o.camp !== camp && o.poste.id !== "G") o.pos = { x: o.pos.x, y: yBut - sens * (52 + Math.abs(o.pos.y - L / 2) * 0.1) };
      m.ballon = { ...j.pos };
      b.porteur = j;
      b.reserve = null;
      (b as unknown as { decisionA: number }).decisionA = 0;
      const passes = b.stats.passes[camp];
      for (let i = 0; i < 4 * 30 && b.stats.tirs[camp] === 0; i++) m.pas();
      expect(b.stats.passes[camp]).toBe(passes);
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
          // le presseur, plus au plus un joueur dont la cible date du ballon libre (cibles recalculées par intervalles)
          expect(auBallon).toBeLessThanOrEqual(2);
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
      if (m.balle!.porteur || m.balle!.engagement) libre = 0;
      else if (m.temps > 15) {
        libre += 1 / 30;
        libreMax = Math.max(libreMax, libre);
      }
    }
    return { m, changements, libreMax };
  }
  const parties = GRAINES.map(jouer);

  test("des passes sont jouées, la plupart arrivent (40 à 97 % par équipe et par match)", () => {
    for (const { m } of parties)
      for (const camp of [0, 1] as const) {
        const s = m.balle!.stats;
        expect(s.passes[camp] / MINUTES).toBeGreaterThan(4);
        expect(s.passes[camp] / MINUTES).toBeLessThan(18); // 16 avant le 12/11 au soir (plus de passes vers la surface)
        const taux = s.passesReussies[camp] / s.passes[camp];
        expect(taux).toBeGreaterThan(0.4); // une équipe sur 3 min : peu de passes, forte variance
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

  test("peu de tirs et peu de buts : en moyenne moins de 2 tirs par équipe et par minute", () => {
    const total = parties.reduce((s, { m }) => s + m.balle!.stats.tirs[0] + m.balle!.stats.tirs[1], 0);
    expect(total / (parties.length * 2 * MINUTES)).toBeLessThan(2);
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
        let garde = true; // on juge seulement une possession gardée 2,5 s
        for (let k = 0; k < 75 && garde; k++) {
          m.pas();
          garde = m.possession === camp;
        }
        poss = m.possession;
        if (!garde) continue;
        expect(m.joueurs.filter((j) => j.camp === camp && j.phase === "attaque").length).toBeGreaterThanOrEqual(8);
        vu = true;
      }
    }
    expect(vu).toBe(true);
  });
});

// ---- Mouvements plus réalistes (12/11 : « améliore le moteur pour le rendre
// encore plus réaliste dans les mouvements »). Référence football §5 (appels,
// soutien) et §7 (vitesses : course rapide dès 5,5 m/s, sprint dès 7 m/s).
describe("ballon réel : allures et jeu sans ballon (12/11)", () => {
  const parties = [1, 2, 3, 4, 5, 6].map((g) => {
    const m = match(g);
    const b = m.balle! as unknown as { appel: { joueur: unknown } | null; receveur: unknown };
    let n = 0;
    let vitesse = 0;
    let sprint = 0;
    let marche = 0;
    const appels = new Set<unknown>();
    const servis = new Set<unknown>();
    for (let i = 0; i < 180 * 30; i++) {
      m.pas();
      if (b.appel) {
        appels.add(b.appel);
        if (b.receveur === b.appel.joueur) servis.add(b.appel);
      }
      for (const j of m.joueurs) {
        if (j.poste.id === "G") continue;
        const v = Math.hypot(j.vit.x, j.vit.y);
        n++;
        vitesse += v;
        if (v >= 7) sprint++;
        if (v < 2) marche++;
      }
    }
    return { vitesse: vitesse / n, sprint: sprint / n, marche: marche / n, appels: appels.size, servis: servis.size };
  });

  test("on ne court pas tout le temps : vitesse moyenne sous 4,6 m/s, sprint moins de 18 % du temps, marche plus de 12 %", () => {
    const moy = (k: "vitesse" | "sprint" | "marche") => parties.reduce((s, p) => s + p[k], 0) / parties.length;
    expect(moy("vitesse")).toBeLessThan(4.6); // 4,7 avant les allures
    expect(moy("sprint")).toBeLessThan(0.18); // 18 % avant
    expect(moy("marche")).toBeGreaterThan(0.12);
  });

  test("appels en profondeur : plusieurs par match, et certains sont servis", () => {
    const appels = parties.reduce((s, p) => s + p.appels, 0);
    const servis = parties.reduce((s, p) => s + p.servis, 0);
    expect(appels / parties.length).toBeGreaterThan(2);
    expect(servis).toBeGreaterThan(parties.length / 2);
  });
});
