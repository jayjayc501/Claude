// Capture au format téléphone (390 × 750, Chrome sans fenêtre, sans dépendance).
// node scripts/capture/capture.mjs dist/index.html sortie.png "sélecteur@n" "js:<code>" …
// Chaque argument après la sortie : un sélecteur CSS à toucher (@n = n-ième élément), ou du JavaScript
// à exécuter dans la page (préfixe js:, les promesses sont attendues). Capture à la fin.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const [pageArg, sortieArg, ...clics] = process.argv.slice(2);
const page = resolve(pageArg), sortie = resolve(sortieArg);
const chrome = spawn("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--remote-debugging-port=9335", "--window-size=400,760", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "about:blank"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const cibles = await (await fetch("http://127.0.0.1:9335/json")).json();
const ws = new WebSocket(cibles.find((c) => c.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const att = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (att.has(d.id)) { att.get(d.id)(d.result); att.delete(d.id); } };
const env = (method, params = {}) => new Promise((r) => { const i = ++id; att.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await env("Emulation.setDeviceMetricsOverride", { width: 390, height: 750, deviceScaleFactor: 2, mobile: true });
await env("Page.navigate", { url: "file://" + page });
await new Promise((r) => setTimeout(r, 2500));
for (const sel of clics) {
  if (sel.startsWith("js:")) { const rr = await env("Runtime.evaluate", { expression: sel.slice(3), awaitPromise: true, returnByValue: true }); if (rr?.result?.value !== undefined) console.log("js:", rr.result.value); if (rr?.exceptionDetails) console.log("err:", JSON.stringify(rr.exceptionDetails).slice(0,300)); await new Promise((r) => setTimeout(r, 400)); continue; }
  const [s, n] = sel.split("@");
  const res = await env("Runtime.evaluate", { expression: `(() => { const e = document.querySelectorAll(${JSON.stringify(s)})[${Number(n ?? 0)}]; if (!e) return 'absent'; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2}); })()`, returnByValue: true });
  if (res.result.value === "absent") { console.log("absent:", sel); continue; }
  const p = JSON.parse(res.result.value);
  for (const type of ["mousePressed", "mouseReleased"]) await env("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: "left", clickCount: 1 });
  await new Promise((r) => setTimeout(r, 700));
}
await new Promise((r) => setTimeout(r, 800));
const shot = await env("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 390, height: 750, scale: 1 } });
writeFileSync(sortie, Buffer.from(shot.data, "base64"));
ws.close(); chrome.kill();
