"""Partie entière de 1 contre 1 à deux navigateurs (15/11), au format téléphone.

Deux téléphones (Chrome sans fenêtre) : l'hôte crée la partie, l'invité ouvre le
lien, chacun prend une équipe automatique et appuie sur « Prêt » ; ils regardent
la 1re mi-temps, l'hôte fait un changement de tactique à la mi-temps, puis la 2e
mi-temps. Le script vérifie que les deux écrans montrent le même moment du match
(chrono et score, chacun vu de son côté) et le même score final, et enregistre des
captures dans le dossier de sortie.

    bun run construire && bun run scripts/serveur-local.ts 8787 &
    python3 scripts/capture/un-contre-un.py http://127.0.0.1:8787/?serveur=http://127.0.0.1:8787/api /tmp/1c1

Avec le vrai serveur (Supabase), donner l'adresse du site sans ?serveur=.
Une partie dure environ 3 minutes (deux mi-temps d'environ 51 s, marges comprises).
"""

import re
import sys
import time

from playwright.sync_api import sync_playwright

page_url, sortie = sys.argv[1], sys.argv[2]
import os

os.makedirs(sortie, exist_ok=True)


def telephone(b, nom, erreurs):
    ctx = b.new_context(viewport={"width": 390, "height": 750}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: erreurs.append(f"{nom}: {e}"))
    pg.on("console", lambda m: m.type == "error" and erreurs.append(f"{nom} console: {m.text}"))
    return pg


def capture(pg, nom):
    pg.screenshot(path=f"{sortie}/{nom}.png")


def instant(pg):
    return pg.evaluate("() => ({ chrono: document.querySelector('.match-chrono')?.textContent, score: document.querySelector('.match-score')?.textContent })")


erreurs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    hote = telephone(b, "hôte", erreurs)
    hote.goto(page_url)
    hote.wait_for_timeout(800)
    capture(hote, "01-accueil")
    hote.click("text=Créer une partie")
    hote.wait_for_selector(".salon-lien", timeout=20000)
    lien = hote.inner_text(".salon-lien").strip()
    print("lien :", lien)
    capture(hote, "02-lien")

    invite = telephone(b, "invité", erreurs)
    invite.goto(lien)
    invite.wait_for_selector(".prepa", timeout=20000)
    hote.wait_for_selector(".prepa", timeout=20000)
    invite.wait_for_timeout(600)
    capture(invite, "03-invite-draft")
    capture(hote, "03-hote-draft")

    for pg, q in ((hote, "★★★ Haute qualité"), (invite, "★★ Moyenne")):
        pg.click(f"text={q}")
        pg.wait_for_timeout(400)
    capture(hote, "04-hote-equipe")
    hote.click(".partie-jouer-gros")
    hote.wait_for_selector("text=Équipe envoyée", timeout=15000)
    capture(hote, "05-hote-attente")
    invite.click(".partie-jouer-gros")

    for pg in (hote, invite):
        pg.wait_for_selector(".match-terrain", timeout=40000)
    print("match ouvert sur les deux téléphones")
    time.sleep(12)
    a, c = instant(hote), instant(invite)
    print("après 12 s :", a, c)
    capture(hote, "06-hote-match")
    capture(invite, "06-invite-match")
    sa = re.findall(r"\d+", a["score"] or "")
    sc = re.findall(r"\d+", c["score"] or "")
    assert a["chrono"] == c["chrono"] or abs(int(a["chrono"].split(":")[0]) - int(c["chrono"].split(":")[0])) <= 1, (a, c)
    assert sa == sc[::-1], (a, c)

    for pg in (hote, invite):
        pg.wait_for_selector(".match-panneau >> text=Mi-temps", timeout=90000)
    print("mi-temps :", instant(hote), instant(invite))
    capture(hote, "07-hote-mi-temps")
    capture(invite, "07-invite-mi-temps")
    hote.click("text=⇄ Changements, places, fatigue")
    hote.wait_for_selector(".prepa", timeout=10000)
    hote.wait_for_timeout(500)
    capture(hote, "08-hote-changements")
    # Tactique changée sur l'écran de préparation, puis « Prêt ».
    tact = hote.query_selector(".prepa select")
    if tact:
        tact.select_option(index=3)
    hote.click(".partie-jouer-gros")
    hote.wait_for_selector(".match-panneau", timeout=10000)
    capture(hote, "09-hote-pret")
    invite.click(".match-panneau .match-jouer")

    for pg in (hote, invite):
        pg.wait_for_function("() => !document.querySelector('.match-panneau')", timeout=60000)
    print("2e mi-temps lancée")
    time.sleep(15)
    a, c = instant(hote), instant(invite)
    print("2e mi-temps après 15 s :", a, c)
    capture(hote, "10-hote-2e")
    capture(invite, "10-invite-2e")
    for pg in (hote, invite):
        pg.wait_for_selector(".match-panneau >> text=Fin du match", timeout=90000)
    fa = hote.inner_text(".match-panneau-score")
    fc = invite.inner_text(".match-panneau-score")
    print("fin :", fa.replace("\n", " "), "|", fc.replace("\n", " "))
    capture(hote, "11-hote-fin")
    capture(invite, "11-invite-fin")
    sa = re.findall(r"\d+", fa)
    sc = re.findall(r"\d+", fc)
    assert sa == sc[::-1], (fa, fc)
    b.close()

print("erreurs JS :", erreurs or "aucune")
print("PARTIE ENTIÈRE OK")
