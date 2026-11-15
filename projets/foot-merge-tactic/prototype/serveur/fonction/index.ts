// Fonction Supabase « partie » du 1 contre 1 (15/11). Elle charge le serveur
// construit (serveur/moteur.js) depuis le dépôt GitHub, à un commit précis, vérifie
// son empreinte SHA-256, puis lui passe chaque demande. Tout le code du serveur est
// donc dans le dépôt, relu et testé ; ce fichier ne change qu'avec SOURCE et EMPREINTE.
// Déploiement : voir serveur/README.md (verify_jwt désactivé : la fonction vérifie
// elle-même le jeton de chaque joueur).

const SOURCE = "https://raw.githubusercontent.com/jayjayc501/Claude/__COMMIT__/projets/foot-merge-tactic/prototype/serveur/moteur.js";
const EMPREINTE = "__EMPREINTE__";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info" };

let servir: ((r: Request) => Promise<Response>) | null = null;

async function charger(): Promise<(r: Request) => Promise<Response>> {
  const r = await fetch(SOURCE);
  if (!r.ok) throw new Error(`moteur introuvable (${r.status})`);
  const octets = new Uint8Array(await r.arrayBuffer());
  const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", octets)), (x) => x.toString(16).padStart(2, "0")).join("");
  if (h !== EMPREINTE) throw new Error("empreinte du moteur différente");
  let b = "";
  for (let i = 0; i < octets.length; i += 0x8000) b += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  const mod = await import(`data:text/javascript;base64,${btoa(b)}`);
  return mod.creerServeur({ url: Deno.env.get("SUPABASE_URL")!, cle: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    servir ??= await charger();
    return await servir(req);
  } catch (e) {
    console.error("chargement", e);
    return new Response(JSON.stringify({ ok: false, erreur: "Serveur indisponible, réessaie dans un instant." }), { status: 503, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
