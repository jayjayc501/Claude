// Fabrique le serveur du 1 contre 1 (15/11) : serveur/moteur.js, un seul fichier
// (moteur, règles, données et stockage Supabase), et son empreinte SHA-256.
//
// La fonction Supabase (serveur/fonction/index.ts) charge ce fichier depuis le
// dépôt GitHub, à un commit précis, et vérifie son empreinte avant de s'en servir :
// pour publier une nouvelle version du serveur, committer serveur/moteur.js,
// pousser, puis redéployer la fonction avec le nouveau commit et la nouvelle
// empreinte (voir serveur/README.md).
//
//   bun run scripts/construire-serveur.ts

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const racine = join(dirname(new URL(import.meta.url).pathname), "..");
const r = await Bun.build({ entrypoints: [join(racine, "src/enligne/fonction.ts")], target: "browser", format: "esm", minify: true });
if (!r.success) {
  for (const log of r.logs) console.error(log);
  process.exit(1);
}
const code = await r.outputs[0]!.text();
if (/\bfrom\s*["']node:|\brequire\(/.test(code)) throw new Error("Le serveur ne doit dépendre ni de Node ni de Bun");
mkdirSync(join(racine, "serveur"), { recursive: true });
writeFileSync(join(racine, "serveur/moteur.js"), code);
const empreinte = createHash("sha256").update(code, "utf8").digest("hex");
writeFileSync(join(racine, "serveur/moteur.sha256"), `${empreinte}\n`);
console.log(`serveur/moteur.js : ${(code.length / 1024).toFixed(1)} Ko, SHA-256 ${empreinte}`);
