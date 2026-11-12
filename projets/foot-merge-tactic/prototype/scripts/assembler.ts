// Fabrique dist/index.html : une seule page autonome (code, styles et données
// inclus), qu'on peut ouvrir dans un navigateur ou publier telle quelle.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const racine = join(dirname(new URL(import.meta.url).pathname), "..");

const resultat = await Bun.build({
  entrypoints: [join(racine, "src/main.ts")],
  target: "browser",
  minify: true,
  plugins: [
    {
      // Images PNG incluses dans la page (le chargeur « dataurl » de Bun les rend vides).
      name: "png-en-data-url",
      setup(b) {
        b.onLoad({ filter: /\.png$/ }, ({ path }) => ({
          contents: `export default ${JSON.stringify(`data:image/png;base64,${readFileSync(path).toString("base64")}`)};`,
          loader: "js",
        }));
      },
    },
  ],
});
if (!resultat.success) {
  for (const log of resultat.logs) console.error(log);
  process.exit(1);
}
const code = (await resultat.outputs[0]!.text()).replaceAll("</script", "<\\/script");
const style = readFileSync(join(racine, "src/style.css"), "utf8");
const gabarit = readFileSync(join(racine, "src/index.html"), "utf8");
const page = gabarit.replace("/*STYLE*/", () => style).replace("/*SCRIPT*/", () => code);

mkdirSync(join(racine, "dist"), { recursive: true });
writeFileSync(join(racine, "dist/index.html"), page);
console.log(`dist/index.html : ${(page.length / 1024).toFixed(1)} Ko`);
