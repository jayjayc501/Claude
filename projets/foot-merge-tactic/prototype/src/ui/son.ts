// Petits sons du match, générés dans la page (Web Audio, aucun fichier).
// Le contexte audio ne démarre qu'après un geste de l'utilisateur (règle des
// navigateurs) : appeler `activer()` dans un clic.

let ctx: AudioContext | null = null;
let muet = false;

export function activer(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null; // pas de son sur ce navigateur : le match continue sans
  }
}

export function basculerMuet(): boolean {
  muet = !muet;
  return muet;
}

export function estMuet(): boolean {
  return muet;
}

function enveloppe(g: GainNode, debut: number, duree: number, volume: number): void {
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(volume, debut + 0.02);
  g.gain.setValueAtTime(volume, debut + Math.max(0.02, duree - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
}

/** Coup de sifflet : son aigu avec un léger roulement. */
function sifflet(debut: number, duree: number, volume = 0.18): void {
  const c = ctx!;
  const o = c.createOscillator();
  const lfo = c.createOscillator();
  const prof = c.createGain();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = 2900;
  lfo.frequency.value = 32;
  prof.gain.value = 140;
  lfo.connect(prof).connect(o.frequency);
  o.connect(g).connect(c.destination);
  enveloppe(g, debut, duree, volume);
  o.start(debut);
  lfo.start(debut);
  o.stop(debut + duree);
  lfo.stop(debut + duree);
}

/** Petit « toc » discret (touche, corner, six mètres). */
function toc(debut: number, freq: number, volume = 0.12): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(freq, debut);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, debut + 0.12);
  o.connect(g).connect(c.destination);
  enveloppe(g, debut, 0.14, volume);
  o.start(debut);
  o.stop(debut + 0.15);
}

/** Clameur de la foule : bruit filtré qui monte puis retombe. */
function foule(debut: number, duree: number, volume: number, freq = 900): void {
  const c = ctx!;
  const n = Math.floor(c.sampleRate * duree);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(volume, debut + duree * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  src.connect(f).connect(g).connect(c.destination);
  src.start(debut);
}

/** Joue le son d'un événement de match (texte de l'événement du moteur). */
export function jouer(evenement: string): void {
  if (muet || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.01;
  switch (evenement) {
    case "But !":
      sifflet(t, 0.25);
      foule(t + 0.05, 2.2, 0.5, 800);
      break;
    case "Faute":
    case "Hors-jeu":
      sifflet(t, 0.35);
      break;
    case "Penalty":
      sifflet(t, 0.18);
      sifflet(t + 0.25, 0.5);
      foule(t, 1.2, 0.2, 600);
      break;
    case "Engagement":
      sifflet(t, 0.3, 0.12);
      break;
    case "Arrêt":
      foule(t, 0.9, 0.18, 500);
      break;
    case "Corner":
      toc(t, 700);
      toc(t + 0.12, 900);
      break;
    case "Six mètres":
    case "Touche":
      toc(t, 600, 0.08);
      break;
  }
}
