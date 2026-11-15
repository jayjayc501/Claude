// Sons du match (15/11 : « les sons sont quand même pas terribles », « une ambiance
// qui varie suivant le ballon »). Vrais sons générés avec ElevenLabs (projets/foot-
// merge-tactic/sons/, découpés et compressés), inclus dans la page :
// - ambiance du stade en boucle, plus forte quand le ballon approche d'un but ;
// - frappes de balle (plus fortes pour un tir que pour une passe) ;
// - « ooh » de la foule sur un arrêt ou une frappe qui passe près du but ;
// - clameur sur un but ; sifflet de l'arbitre (court, ou long à la mi-temps et à la fin).
// Le contexte audio ne démarre qu'après un geste de l'utilisateur (règle des
// navigateurs) : appeler `activer()` dans un clic.

import sonAmbiance from "../sons/ambiance.mp3";
import sonBut from "../sons/but.mp3";
import sonFrappe from "../sons/frappe.mp3";
import sonOoh from "../sons/ooh.mp3";
import sonSifflet from "../sons/sifflet.mp3";
import sonSiffletLong from "../sons/sifflet-long.mp3";

const FICHIERS = { ambiance: sonAmbiance, but: sonBut, frappe: sonFrappe, ooh: sonOoh, sifflet: sonSifflet, siffletLong: sonSiffletLong } as const;
type NomSon = keyof typeof FICHIERS;

/** Volumes (réglages en PROPOSITION). */
const VOLUME = { ambianceCalme: 0.22, ambianceChaude: 0.6, but: 0.9, ooh: 0.6, sifflet: 0.5, frappeMin: 0.12, frappeMax: 0.5 };

let ctx: AudioContext | null = null;
let maitre: GainNode | null = null;
let muet = false;
const tampons: Partial<Record<NomSon, AudioBuffer>> = {};
let chargement: Promise<void> | null = null;
let ambiance: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let ambianceVoulue = false;

export function activer(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      maitre = ctx.createGain();
      maitre.gain.value = muet ? 0 : 1;
      maitre.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    chargement ??= charger();
  } catch {
    ctx = null; // pas de son sur ce navigateur : le match continue sans
  }
}

async function charger(): Promise<void> {
  const c = ctx!;
  await Promise.all(
    (Object.keys(FICHIERS) as NomSon[]).map(async (nom) => {
      try {
        const octets = await (await fetch(FICHIERS[nom])).arrayBuffer();
        tampons[nom] = await c.decodeAudioData(octets);
      } catch {
        // son illisible sur ce navigateur : on s'en passe
      }
    }),
  );
  if (ambianceVoulue) demarrerAmbiance();
}

export function basculerMuet(): boolean {
  muet = !muet;
  if (maitre && ctx) maitre.gain.setTargetAtTime(muet ? 0 : 1, ctx.currentTime, 0.05);
  return muet;
}

export function estMuet(): boolean {
  return muet;
}

function pret(): boolean {
  return !!ctx && !!maitre && ctx.state === "running";
}

/** Joue un son une fois. `vitesse` change un peu la hauteur, pour varier les frappes. */
function lancer(nom: NomSon, volume: number, debut = 0, vitesse = 1, duree?: number): void {
  const b = tampons[nom];
  if (!pret() || !b) return;
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = vitesse;
  const g = c.createGain();
  g.gain.value = volume;
  src.connect(g).connect(maitre!);
  const t = c.currentTime + 0.01 + debut;
  src.start(t);
  if (duree !== undefined) {
    g.gain.setValueAtTime(volume, t + Math.max(0, duree - 0.08));
    g.gain.linearRampToValueAtTime(0, t + duree);
    src.stop(t + duree + 0.02);
  }
}

/** Ambiance du stade : boucle continue tant que le match est à l'écran. */
export function demarrerAmbiance(): void {
  ambianceVoulue = true;
  const b = tampons.ambiance;
  if (!pret() || !b || ambiance) return;
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = b;
  src.loop = true;
  // On saute le petit silence qu'un MP3 garde au début et à la fin : boucle sans trou.
  src.loopStart = 0.06;
  src.loopEnd = Math.max(0.2, b.duration - 0.06);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(VOLUME.ambianceCalme, c.currentTime + 1.2);
  src.connect(gain).connect(maitre!);
  src.start(0, 0.06);
  ambiance = { src, gain };
}

export function arreterAmbiance(): void {
  ambianceVoulue = false;
  if (!ambiance || !ctx) return;
  const a = ambiance;
  ambiance = null;
  a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  a.src.stop(ctx.currentTime + 1.5);
}

/** Intensité de l'ambiance, de 0 (ballon au milieu) à 1 (ballon dans une surface). */
export function intensiteAmbiance(i: number): void {
  if (!ambiance || !ctx) return;
  const v = VOLUME.ambianceCalme + (VOLUME.ambianceChaude - VOLUME.ambianceCalme) * Math.max(0, Math.min(1, i));
  ambiance.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.6);
}

/** Frappe de balle : `force` de 0 (petite passe) à 1 (tir puissant). */
export function frappe(force: number): void {
  const f = Math.max(0, Math.min(1, force));
  lancer("frappe", VOLUME.frappeMin + (VOLUME.frappeMax - VOLUME.frappeMin) * f, 0, 0.92 + Math.random() * 0.16);
}

/** « Ooh » de la foule (occasion manquée, arrêt). */
export function occasion(): void {
  lancer("ooh", VOLUME.ooh);
}

/** Joue le son d'un événement de match (texte de l'événement du moteur). */
export function jouer(evenement: string): void {
  if (!pret()) return;
  switch (evenement) {
    case "But !":
      lancer("sifflet", VOLUME.sifflet * 0.8);
      lancer("but", VOLUME.but, 0.05);
      break;
    case "Mi-temps":
    case "Fin du match":
      lancer("siffletLong", VOLUME.sifflet); // un seul coup, long
      break;
    case "2e mi-temps":
    case "Engagement":
    case "Faute":
    case "Hors-jeu":
      lancer("sifflet", VOLUME.sifflet);
      break;
    case "Penalty":
      lancer("siffletLong", VOLUME.sifflet, 0, 1, 0.8);
      lancer("ooh", VOLUME.ooh * 0.7, 0.3);
      break;
    case "Arrêt":
      occasion();
      break;
    // Touche, six mètres, corner : pas de sifflet (comme au stade), l'ambiance suffit.
  }
}
