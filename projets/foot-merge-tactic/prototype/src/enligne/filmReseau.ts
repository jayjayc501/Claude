// Film réseau (15/11, 1 contre 1 en ligne) : le film d'une mi-temps, calculé par
// le serveur, passe par le réseau sous une forme compacte, puis redevient un Film
// ordinaire sur le téléphone. L'écran du match ne voit pas la différence.
//
// FORMAT (version 1), compressé en gzip :
//   « FMF1 », longueur L de l'en-tête JSON (uint32), JSON (en-tête du film, nombre
//   d'images, événements, actions, bilan), bourrage jusqu'à un multiple de 4, puis
//   les colonnes du film en float32 (temps, positions, ballon, possessionS, lignes)
//   et l'état en int16.
// Les nombres passent de 64 à 32 bits : au plus 0,01 mm d'écart sur une position
// (un pixel du terrain fait environ 17 cm), le match lui-même ne change pas. Un
// film de mi-temps pèse environ 0,9 Mo (5,2 Mo en JSON). [PROPOSITION]
//
// Vue du camp 1 : l'invité se voit en bas, en bleu, comme l'hôte (l'écran du
// match montre toujours « toi » en camp 0). vuDuCamp1 retourne le terrain d'un
// demi-tour, échange les deux équipes et met ses joueurs en tête de liste.

import { type BilanMiTemps, COLONNES_BALLON, COLONNES_ETAT, ETAT, type EnTeteFilm, Film, type MorceauFilm } from "../match/film";

const MAGIQUE = "FMF1";

interface EnTeteReseau {
  entete: EnTeteFilm;
  n: number;
  evenements: Film["evenements"];
  actions: Film["actions"];
  bilan: BilanMiTemps | null;
}

/** Film complet → octets non compressés. */
export function filmVersOctets(film: Film): Uint8Array {
  const n = film.images;
  const nj = film.entete.joueurs.length;
  const json = new TextEncoder().encode(JSON.stringify({ entete: film.entete, n, evenements: film.evenements, actions: film.actions, bilan: film.bilan } satisfies EnTeteReseau));
  const debut = 8 + json.length;
  const bourrage = (4 - (debut % 4)) % 4;
  const flottants = n * (1 + 2 * nj + COLONNES_BALLON + 2 + 2);
  const total = debut + bourrage + flottants * 4 + n * COLONNES_ETAT * 2;
  const octets = new Uint8Array(total);
  const vue = new DataView(octets.buffer);
  for (let i = 0; i < 4; i++) octets[i] = MAGIQUE.charCodeAt(i);
  vue.setUint32(4, json.length, true);
  octets.set(json, 8);
  let o = debut + bourrage;
  const f32 = new Float32Array(octets.buffer, o, flottants);
  let k = 0;
  for (const [col, largeur] of [[film.temps, 1], [film.positions, 2 * nj], [film.ballon, COLONNES_BALLON], [film.possessionS, 2], [film.lignes, 2]] as const) {
    f32.set(col.subarray(0, n * largeur), k);
    k += n * largeur;
  }
  o += flottants * 4;
  const i16 = new Int16Array(octets.buffer, o, n * COLONNES_ETAT);
  for (let i = 0; i < n * COLONNES_ETAT; i++) i16[i] = film.etat[i]!;
  return octets;
}

/** Octets non compressés → Film complet. */
export function filmDepuisOctets(octets: Uint8Array): Film {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const magique = String.fromCharCode(octets[0]!, octets[1]!, octets[2]!, octets[3]!);
  if (magique !== MAGIQUE) throw new Error("Film illisible");
  const l = vue.getUint32(4, true);
  const tete = JSON.parse(new TextDecoder().decode(octets.subarray(8, 8 + l))) as EnTeteReseau;
  const { n } = tete;
  const nj = tete.entete.joueurs.length;
  const debut = 8 + l;
  const o = debut + ((4 - (debut % 4)) % 4);
  // Copie alignée (le tableau reçu peut commencer n'importe où en mémoire).
  const flottants = n * (1 + 2 * nj + COLONNES_BALLON + 2 + 2);
  const f32 = new Float32Array(octets.slice(o, o + flottants * 4).buffer);
  const i16 = new Int16Array(octets.slice(o + flottants * 4, o + flottants * 4 + n * COLONNES_ETAT * 2).buffer);
  let k = 0;
  const prendre = (largeur: number) => {
    const a = Float64Array.from(f32.subarray(k, k + n * largeur));
    k += n * largeur;
    return a;
  };
  const m: MorceauFilm = {
    premiere: 0,
    n,
    temps: prendre(1),
    positions: prendre(2 * nj),
    ballon: prendre(COLONNES_BALLON),
    possessionS: prendre(2),
    lignes: prendre(2),
    etat: Int32Array.from(i16),
    evenements: tete.evenements,
    actions: tete.actions,
  };
  const film = new Film(tete.entete);
  if (n) film.ajouter(m);
  if (tete.bilan) film.terminer(tete.bilan);
  return film;
}

async function transformer(octets: Uint8Array, flux: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const sortie = new Blob([octets as BlobPart]).stream().pipeThrough(flux);
  return new Uint8Array(await new Response(sortie).arrayBuffer());
}

export const compresser = (o: Uint8Array) => transformer(o, new CompressionStream("gzip"));
export const decompresser = (o: Uint8Array) => transformer(o, new DecompressionStream("gzip"));

export async function encoderFilm(film: Film): Promise<Uint8Array> {
  return compresser(filmVersOctets(film));
}

export async function decoderFilm(octets: Uint8Array): Promise<Film> {
  return filmDepuisOctets(await decompresser(octets));
}

const echanger = <T>(p: [T, T]): [T, T] => [p[1], p[0]];

/** Échange les deux camps dans un objet de statistiques (toutes les paires [équipe 0, équipe 1]). */
function echangerStats<T>(s: T): T {
  const o = { ...(s as Record<string, unknown>) };
  for (const [cle, v] of Object.entries(o)) if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number") o[cle] = [v[1], v[0]];
  return o as T;
}

/** Le même film, vu par le camp 1 : terrain retourné d'un demi-tour (largeur L, longueur H),
 *  camps échangés, joueurs du camp 1 en tête (comme le camp 0 dans le moteur). */
export function vuDuCamp1(film: Film, largeurM: number, longueurM: number): Film {
  const e = film.entete;
  const nj = e.joueurs.length;
  // Nouvel ordre : d'abord les joueurs du camp 1, puis ceux du camp 0.
  const ordre = [...e.joueurs.keys()].sort((a, b) => (e.joueurs[b]!.camp - e.joueurs[a]!.camp) || a - b);
  const nouvel = new Map(ordre.map((ancien, i) => [ancien, i]));
  const entete: EnTeteFilm = {
    ...e,
    joueurs: ordre.map((i) => ({ ...e.joueurs[i]!, camp: (1 - e.joueurs[i]!.camp) as 0 | 1 })),
    tactiques: echanger(e.tactiques),
  };
  const n = film.images;
  const pos = new Float64Array(n * 2 * nj);
  for (let k = 0; k < n; k++)
    for (let j = 0; j < nj; j++) {
      const a = (k * nj + ordre[j]!) * 2;
      pos[(k * nj + j) * 2] = largeurM - film.positions[a]!;
      pos[(k * nj + j) * 2 + 1] = longueurM - film.positions[a + 1]!;
    }
  const ballon = film.ballon.slice(0, n * COLONNES_BALLON);
  for (let k = 0; k < n; k++) {
    const o = k * COLONNES_BALLON;
    ballon[o] = largeurM - ballon[o]!;
    ballon[o + 1] = longueurM - ballon[o + 1]!;
    ballon[o + 3] = -ballon[o + 3]!;
    ballon[o + 4] = -ballon[o + 4]!;
  }
  const paire = (src: Float64Array) => {
    const d = src.slice(0, n * 2);
    for (let k = 0; k < n; k++) [d[k * 2], d[k * 2 + 1]] = [d[k * 2 + 1]!, d[k * 2]!];
    return d;
  };
  const etat = film.etat.slice(0, n * COLONNES_ETAT);
  const indice = (i: number) => (i < 0 ? i : nouvel.get(i)!);
  for (let k = 0; k < n; k++) {
    const o = k * COLONNES_ETAT;
    etat[o + ETAT.porteur] = indice(etat[o + ETAT.porteur]!);
    etat[o + ETAT.dernier] = indice(etat[o + ETAT.dernier]!);
    [etat[o + ETAT.score0], etat[o + ETAT.score1]] = [etat[o + ETAT.score1]!, etat[o + ETAT.score0]!];
    etat[o + ETAT.possession] = 1 - etat[o + ETAT.possession]!;
    [etat[o + ETAT.phase0], etat[o + ETAT.phase1]] = [etat[o + ETAT.phase1]!, etat[o + ETAT.phase0]!];
    [etat[o + ETAT.passes0], etat[o + ETAT.passes1]] = [etat[o + ETAT.passes1]!, etat[o + ETAT.passes0]!];
    [etat[o + ETAT.reussies0], etat[o + ETAT.reussies1]] = [etat[o + ETAT.reussies1]!, etat[o + ETAT.reussies0]!];
  }
  const vu = new Film(entete);
  if (n)
    vu.ajouter({
      premiere: 0,
      n,
      temps: film.temps.slice(0, n),
      positions: pos,
      ballon,
      possessionS: paire(film.possessionS),
      lignes: paire(film.lignes),
      etat,
      evenements: film.evenements.map((x) => ({ ...x })),
      actions: film.actions.map((x) => ({ ...x, joueur: indice(x.joueur) })),
    });
  const b = film.bilan;
  if (b) {
    const autre = (c: 0 | 1) => (1 - c) as 0 | 1;
    vu.terminer({
      stats: echangerStats(b.stats),
      buts: b.buts.map((x) => ({ ...x, camp: autre(x.camp) })),
      notes: b.notes.map((x) => ({ ...x, camp: autre(x.camp) })),
      joueurs: b.joueurs.map((x) => ({ ...x, camp: autre(x.camp) })),
    });
  }
  return vu;
}

/** Film d'avant le coup d'envoi (une seule image : la première de la 1re mi-temps). */
export function filmAvantCoupDEnvoi(mt1: Film): Film {
  const f = new Film({ ...mt1.entete, periode: 0 });
  if (mt1.images) f.ajouter({ ...mt1.morceau(0, 1), evenements: [], actions: [] });
  return f;
}
