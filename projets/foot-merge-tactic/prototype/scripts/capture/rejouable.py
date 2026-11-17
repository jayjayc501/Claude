# Captures rejouables de l'écran du match (17/11, A2) : hasard à graine dès le
# chargement, puis horloge virtuelle (performance.now, requestAnimationFrame,
# setTimeout) pendant le match. Sortie : PNG + texte de l'écran à 0,5 s, 2 s… et à la
# mi-temps. Deux passages sur la même page donnent les mêmes octets : pour vérifier
# qu'un découpage ne change rien, comparer avec comparer-captures.py.
# Usage : python3 scripts/capture/rejouable.py <dist/index.html absolu> <préfixe> [light|dark]
import sys, hashlib, json
from playwright.sync_api import sync_playwright
page_html, sortie, theme = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "light")
import os
draft = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "draft.js")).read()
GRAINE = """(() => { let a = 12345; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();"""
HORLOGE = """(() => {
  window.__tv = 0; const q = []; const timers = []; let id = 1;
  performance.now = () => window.__tv;
  window.requestAnimationFrame = (cb) => { q.push(cb); return id++; };
  window.setTimeout = (cb, ms) => { timers.push({ t: window.__tv + (ms || 0), cb, id }); return id++; };
  window.clearTimeout = (i) => { const k = timers.findIndex((x) => x.id === i); if (k >= 0) timers.splice(k, 1); };
  const echeances = () => { for (let n = 0; n < 100000; n++) { timers.sort((a, b) => a.t - b.t || a.id - b.id); if (!timers.length || timers[0].t > window.__tv) return; const x = timers.shift(); x.cb(); } };
  window.__avancer = (ms) => { const fin = window.__tv + ms; while (window.__tv < fin - 1e-9) { window.__tv = Math.min(fin, window.__tv + 1000 / 60); echeances(); const cbs = q.splice(0); for (const cb of cbs) cb(window.__tv); } };
})();"""
FIGER = "() => { for (const s of document.querySelectorAll('svg')) { try { s.pauseAnimations(); s.setCurrentTime(0); } catch (e) {} } }"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 750}, device_scale_factor=2, color_scheme=theme, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    erreurs = []
    pg.on("pageerror", lambda e: erreurs.append(str(e)))
    pg.add_init_script(GRAINE)
    pg.goto("file://" + page_html)
    pg.wait_for_timeout(1500)
    pg.evaluate(draft)
    pg.wait_for_timeout(300)
    pg.evaluate(HORLOGE)
    pg.evaluate("document.querySelector('.partie-jouer-gros').dispatchEvent(new MouseEvent('click', { bubbles: true }))")
    for _ in range(200):
        etat = pg.evaluate("[!!document.querySelector('.match'), document.querySelector('.match-stade')?.getAttribute('href') || '']")
        if etat[1]: break
        pg.wait_for_timeout(100)
    else:
        raise SystemExit(f"stade jamais prêt : {etat}")
    resume = {}
    t = 0
    for cible in [0.5, 2, 4.5, 10, 20, 30, 45, "mi-temps"]:
        if cible == "mi-temps":
            for _ in range(240):
                if pg.evaluate("!!document.querySelector('.match-panneau')"): break
                pg.evaluate("window.__avancer(500)"); t += 0.5
            nom = "mi-temps"
        else:
            pg.evaluate(f"window.__avancer({(cible - t) * 1000})"); t = cible
            nom = f"t{cible:05.1f}"
        pg.evaluate(FIGER)
        pg.screenshot(path=f"{sortie}-{nom}.png", animations="disabled")
        import re
        texte = re.sub(r"blob:[^\"' )]+", "blob:X", pg.evaluate("document.querySelector('.match').outerHTML"))
        open(f"{sortie}-{nom}.html", "w").write(texte)
        resume[nom] = hashlib.sha256(texte.encode()).hexdigest()[:12]
    print(json.dumps(resume), "| erreurs JS :", erreurs or "aucune")
    b.close()
