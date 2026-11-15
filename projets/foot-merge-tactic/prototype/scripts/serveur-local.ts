// Serveur local du 1 contre 1 (15/11), pour essayer une partie à deux navigateurs
// sans Supabase : la même logique que la fonction en ligne, avec un magasin en mémoire.
//   bun run construire && bun run scripts/serveur-local.ts [port]
// puis ouvrir http://127.0.0.1:<port>/?serveur=http://127.0.0.1:<port>/api dans deux navigateurs.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { creerServeur } from "../src/enligne/fonction";
import { MagasinMemoire } from "../src/enligne/serveur";

const racine = join(dirname(new URL(import.meta.url).pathname), "..");
const port = Number(process.argv[2] ?? 8787);
const servir = creerServeur({ url: "", cle: "" }, new MagasinMemoire());

Bun.serve({
  port,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api") return servir(req);
    if (url.pathname === "/" || url.pathname === "/index.html") return new Response(readFileSync(join(racine, "dist/index.html")), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    return new Response("introuvable", { status: 404 });
  },
});
console.log(`1 contre 1 local : http://127.0.0.1:${port}/?serveur=http://127.0.0.1:${port}/api`);
