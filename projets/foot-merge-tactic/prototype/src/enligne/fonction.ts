// Fonction serveur du 1 contre 1 (15/11), telle qu'elle tourne sur Supabase :
// la logique de serveur.ts, plus le stockage Supabase (table « parties » par
// l'API REST, films dans le compartiment privé « films »). Rien de propre à Deno :
// le même fichier tourne sous Bun pour les essais.
//
// Construite en un seul fichier (scripts/construire-serveur.ts → serveur/moteur.js),
// chargée par la petite fonction Supabase serveur/fonction/index.ts.

import { type Magasin, type PartieASupprimer, type PartieEnLigne, type Requete, cheminsFilms, contexte, traiter } from "./serveur";

export const ENTETES_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

/** Stockage Supabase, avec la clé de service (jamais envoyée aux téléphones). */
export class MagasinSupabase implements Magasin {
  constructor(
    private readonly url: string,
    private readonly cle: string,
  ) {}

  private entetes(plus: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.cle, Authorization: `Bearer ${this.cle}`, ...plus };
  }

  async lire(id: string): Promise<PartieEnLigne | null> {
    const r = await fetch(`${this.url}/rest/v1/parties?id=eq.${encodeURIComponent(id)}&select=donnees`, { headers: this.entetes() });
    if (!r.ok) throw new Error(`lecture ${r.status}`);
    const l = (await r.json()) as { donnees: PartieEnLigne }[];
    return l[0]?.donnees ?? null;
  }

  private ligne(p: PartieEnLigne) {
    return { id: p.id, version: p.version, etat: p.etat, jeton_hote: p.jetons[0], jeton_invite: p.jetons[1], maj_le: new Date(p.majLe).toISOString(), origine: p.origine ?? null, donnees: p };
  }

  async creer(p: PartieEnLigne): Promise<boolean> {
    const r = await fetch(`${this.url}/rest/v1/parties`, { method: "POST", headers: this.entetes({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(this.ligne(p)) });
    if (r.status === 409) return false;
    if (!r.ok) throw new Error(`création ${r.status} ${await r.text()}`);
    return true;
  }

  async ecrire(p: PartieEnLigne, versionLue: number): Promise<boolean> {
    const r = await fetch(`${this.url}/rest/v1/parties?id=eq.${encodeURIComponent(p.id)}&version=eq.${versionLue}&select=id`, {
      method: "PATCH",
      headers: this.entetes({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(this.ligne(p)),
    });
    if (!r.ok) throw new Error(`écriture ${r.status} ${await r.text()}`);
    return ((await r.json()) as unknown[]).length === 1;
  }

  async deposerFilm(chemin: string, octets: Uint8Array): Promise<void> {
    const r = await fetch(`${this.url}/storage/v1/object/films/${chemin}`, {
      method: "POST",
      headers: this.entetes({ "Content-Type": "application/octet-stream", "x-upsert": "true" }),
      body: octets as BodyInit,
    });
    if (!r.ok) throw new Error(`dépôt du film ${r.status} ${await r.text()}`);
  }

  async lireFilm(chemin: string): Promise<Uint8Array | null> {
    const r = await fetch(`${this.url}/storage/v1/object/films/${chemin}`, { headers: this.entetes() });
    if (r.status === 400 || r.status === 404) return null;
    if (!r.ok) throw new Error(`lecture du film ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }

  async creationsDepuis(origine: string, depuis: number): Promise<number> {
    const r = await fetch(`${this.url}/rest/v1/parties?origine=eq.${encodeURIComponent(origine)}&cree_le=gt.${new Date(depuis).toISOString()}&select=id&limit=100`, { headers: this.entetes() });
    if (!r.ok) throw new Error(`comptage ${r.status}`);
    return ((await r.json()) as unknown[]).length;
  }

  async anciennes(avant: number, max: number): Promise<PartieASupprimer[]> {
    const r = await fetch(`${this.url}/rest/v1/parties?maj_le=lt.${new Date(avant).toISOString()}&select=id,secret:donnees->>secret&order=maj_le&limit=${max}`, { headers: this.entetes() });
    if (!r.ok) throw new Error(`ménage ${r.status}`);
    return ((await r.json()) as { id: string; secret: string }[]).map((p) => ({ id: p.id, films: cheminsFilms(p) }));
  }

  /** Les films d'abord (par l'API du stockage : la base refuse de les effacer elle-même), puis la ligne. */
  async supprimer(p: PartieASupprimer): Promise<void> {
    const f = await fetch(`${this.url}/storage/v1/object/films`, { method: "DELETE", headers: this.entetes({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: p.films }) });
    if (!f.ok) throw new Error(`films ${f.status} ${await f.text()}`);
    const r = await fetch(`${this.url}/rest/v1/parties?id=eq.${encodeURIComponent(p.id)}`, { method: "DELETE", headers: this.entetes({ Prefer: "return=minimal" }) });
    if (!r.ok) throw new Error(`suppression ${r.status}`);
  }
}

/** Empreinte de la connexion (adresse IP) pour la limite de créations : HMAC-SHA-256
 *  avec la clé du serveur, tronquée ; on ne range jamais l'adresse elle-même. */
export async function empreinteOrigine(req: Request, cle: string): Promise<string | null> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (!ip) return null;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(cle), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(ip)));
  return Array.from(s.subarray(0, 12), (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Le gestionnaire HTTP : POST, corps JSON (envoyé en texte simple pour éviter la
 *  requête préalable CORS), réponse JSON ou octets du film. */
export function creerServeur(env: { url: string; cle: string }, magasin: Magasin = new MagasinSupabase(env.url, env.cle)): (req: Request) => Promise<Response> {
  const ctx = contexte();
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ENTETES_CORS });
    if (req.method !== "POST") return new Response(JSON.stringify({ ok: true, service: "foot-merge-tactic 1 contre 1" }), { headers: { ...ENTETES_CORS, "Content-Type": "application/json" } });
    let demande: Requete;
    try {
      demande = JSON.parse(await req.text()) as Requete;
    } catch {
      return new Response(JSON.stringify({ ok: false, erreur: "Demande illisible." }), { status: 400, headers: { ...ENTETES_CORS, "Content-Type": "application/json" } });
    }
    try {
      const origine = demande.action === "creer" ? await empreinteOrigine(req, env.cle) : null;
      const r = await traiter(demande, magasin, ctx, Date.now(), origine);
      if (r.type === "octets") return new Response(r.corps as BodyInit, { headers: { ...ENTETES_CORS, "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } });
      return new Response(JSON.stringify(r.corps), { status: r.statut, headers: { ...ENTETES_CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    } catch (e) {
      console.error("partie", e);
      return new Response(JSON.stringify({ ok: false, erreur: "Erreur du serveur, réessaie." }), { status: 500, headers: { ...ENTETES_CORS, "Content-Type": "application/json" } });
    }
  };
}

/** Magasin en mémoire, pour essayer le fichier construit sans Supabase. */
export { MagasinMemoire } from "./serveur";
