# Mesure des images par seconde pendant un match (17/11, A2) : draft, coup d'envoi,
# puis processeur ralenti (CDP) et 15 s de jeu comptées par le compteur ?ips=1.
# Usage : python3 scripts/capture/mesurer-ips.py <dist/index.html absolu> <joueurs fusionnés par équipe> <ralenti>
import sys, json, statistics
from playwright.sync_api import sync_playwright
page_html, fusions, ralenti = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
import os
draft = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "draft.js")).read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 750}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    pg.goto(f"file://{page_html}?ips=1&fusions={fusions}")
    pg.wait_for_timeout(1500)
    pg.evaluate(draft)
    pg.evaluate("document.querySelector('.partie-jouer-gros').dispatchEvent(new MouseEvent('click', { bubbles: true }))")
    pg.wait_for_timeout(5000)  # bandeau des bonus, calcul du film
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": ralenti})
    pg.wait_for_timeout(2000)
    pg.evaluate("window.__ips.secondes = []; window.__ips.images = 0; window.__ips.lentes = 0")
    pg.wait_for_timeout(15000)
    m = pg.evaluate("window.__ips")
    feux = pg.evaluate("document.querySelectorAll('.match-feu.niveau-3').length")
    s = m["secondes"]
    print(json.dumps({"fusions": fusions, "ralenti": ralenti, "feux_niveau3": feux, "ips_median": statistics.median(s), "ips_min": min(s), "images_lentes_pct": round(100 * m["lentes"] / max(1, m["images"]))}))
    b.close()
