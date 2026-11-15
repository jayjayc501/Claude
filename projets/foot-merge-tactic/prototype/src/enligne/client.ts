// Côté téléphone du 1 contre 1 (15/11) : parler au serveur, caler son horloge sur
// la sienne, télécharger les films, et l'arbitre « en ligne » que lit l'écran du match.

import configBrut from "../data/enligne.json";
import type { ArbitreMatch } from "../match/arbitre";
import type { Film } from "../match/film";
import type { Requete, VuePartie } from "./serveur";
import { decoderFilm, filmAvantCoupDEnvoi, vuDuCamp1 } from "./filmReseau";

const CONFIG = configBrut as { fonction: string; site: string };

export interface ReponseServeur {
  ok: boolean;
  erreur?: string;
  jeton?: string;
  partie?: VuePartie;
}

/** Adresse de la fonction : celle du jeu, ou ?serveur=… (essais sur un serveur local). */
function adresseFonction(): string {
  try {
    const s = new URLSearchParams(location.search).get("serveur");
    if (s) return s;
  } catch {
    // pas de page : adresse par défaut
  }
  return CONFIG.fonction;
}

/** Lien à envoyer à l'ami : la page du jeu, avec la partie après « # ». */
export function lienPartie(id: string): string {
  const ici = typeof location !== "undefined" && location.protocol.startsWith("http") ? `${location.origin}${location.pathname}${location.search}` : CONFIG.site;
  return `${ici}#p=${id}`;
}

/** Jeton de la partie, gardé sur le téléphone (rouvrir le lien garde sa place). */
export const jetons = {
  lire(id: string): string | null {
    try {
      return localStorage.getItem(`fmt.partie.${id}`);
    } catch {
      return null;
    }
  },
  ecrire(id: string, jeton: string): void {
    try {
      localStorage.setItem(`fmt.partie.${id}`, jeton);
    } catch {
      // stockage indisponible : la partie continue tant que la page reste ouverte
    }
  },
};

export class ClientEnLigne {
  private readonly url = adresseFonction();
  /** Heure du serveur − heure du téléphone (ms), mesurée à la demande la plus rapide. */
  private decalage = 0;
  private meilleurAllerRetour = Infinity;

  /** Heure du serveur (ms). */
  maintenant(): number {
    return Date.now() + this.decalage;
  }

  async demander(r: Requete): Promise<ReponseServeur> {
    const t0 = Date.now();
    let rep: Response;
    try {
      // Corps en texte simple : pas de requête préalable CORS.
      rep = await fetch(this.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(r) });
    } catch {
      return { ok: false, erreur: "Pas de connexion au serveur." };
    }
    const t1 = Date.now();
    let corps: ReponseServeur;
    try {
      corps = (await rep.json()) as ReponseServeur;
    } catch {
      return { ok: false, erreur: `Réponse illisible du serveur (${rep.status}).` };
    }
    const p = corps.partie;
    if (p && t1 - t0 <= this.meilleurAllerRetour + 50) {
      this.meilleurAllerRetour = Math.min(this.meilleurAllerRetour, t1 - t0);
      this.decalage = p.maintenant - (t0 + t1) / 2;
    }
    return corps;
  }

  /** Film d'une mi-temps, vu depuis son camp (le camp 1 voit le terrain retourné). */
  async film(id: string, jeton: string, n: 1 | 2, camp: 0 | 1, largeurM: number, longueurM: number): Promise<Film> {
    for (let essai = 0; ; essai++) {
      try {
        const rep = await fetch(this.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "film", id, jeton, n }) });
        if (!rep.ok) throw new Error(String(rep.status));
        const film = await decoderFilm(new Uint8Array(await rep.arrayBuffer()));
        return camp === 1 ? vuDuCamp1(film, largeurM, longueurM) : film;
      } catch (e) {
        if (essai >= 4) throw e;
        await new Promise((r) => setTimeout(r, 800 * (essai + 1)));
      }
    }
  }
}

/** Arbitre du 1 contre 1 : le match est calculé par le serveur ; l'écran lit les
 *  films déjà téléchargés (même interface que l'arbitre local). */
export class ArbitreEnLigne implements ArbitreMatch {
  mt1: Film | null = null;
  mt2: Film | null = null;

  nouveauMatch(): Film {
    return filmAvantCoupDEnvoi(this.filmPret(this.mt1));
  }
  premiereMiTemps(): Film {
    return this.filmPret(this.mt1);
  }
  secondeMiTemps(): Film {
    return this.filmPret(this.mt2);
  }
  arreter(): void {}

  private filmPret(f: Film | null): Film {
    if (!f) throw new Error("Film pas encore reçu");
    return f;
  }
}
