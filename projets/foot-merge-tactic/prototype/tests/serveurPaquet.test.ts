// Le serveur construit (serveur/moteur.js, celui que charge Supabase) : il répond
// comme le code source, par HTTP (15/11). Lancer d'abord scripts/construire-serveur.ts.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const fichier = join(import.meta.dir, "../serveur/moteur.js");

describe("serveur construit", () => {
  test.skipIf(!existsSync(fichier))("empreinte à jour et partie jusqu'au film de la 1re mi-temps", async () => {
    const code = readFileSync(fichier, "utf8");
    expect(readFileSync(join(import.meta.dir, "../serveur/moteur.sha256"), "utf8").trim()).toBe(createHash("sha256").update(code, "utf8").digest("hex"));
    const mod = (await import(fichier)) as typeof import("../src/enligne/fonction");
    const servir = mod.creerServeur({ url: "", cle: "" }, new mod.MagasinMemoire());
    const poster = async (corps: unknown) => servir(new Request("http://x/", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(corps) }));
    const options = await servir(new Request("http://x/", { method: "OPTIONS" }));
    expect(options.status).toBe(204);
    expect(options.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const c = (await (await poster({ action: "creer" })).json()) as { jeton: string; partie: { id: string } };
    const id = c.partie.id;
    const j = (await (await poster({ action: "rejoindre", id })).json()) as { jeton: string };
    // Une équipe vide est refusée ; la partie attend toujours les équipes.
    const refus = await poster({ action: "equipe", id, jeton: c.jeton, equipe: { effectif: [], composition: [] } });
    expect(refus.status).toBe(400);
    const e = (await (await poster({ action: "etat", id, jeton: j.jeton })).json()) as { partie: { etat: string; finEquipes: number } };
    expect(e.partie.etat).toBe("equipes");
    expect((await poster({ action: "film", id, jeton: j.jeton, n: 1 })).status).toBe(409);
  });
});
