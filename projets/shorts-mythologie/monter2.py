#!/usr/bin/env python3
"""Montage « timeline » des Shorts de La Pause Mytho…logique (v2).

Contrairement à monter.py (répartition automatique), cette version suit une
timeline précise décrite dans un fichier montage.json :

- chaque plan a un début et une fin exacts (calés sur la voix) ;
- mouvement de caméra par plan : "push" (lent zoom avant), "punch" (zoom
  rapide sur un mot fort) ou "pull" (zoom arrière) ;
- vitesse par plan (ralenti pour étirer un clip trop court) ;
- noms des personnages en surimpression (image dorée sur fond noir, fusion
  « screen » : le noir devient transparent), avec apparition en fondu ;
- sous-titres dynamiques : 1 à 3 mots, mot clé (*entre étoiles*) en or ;
- musique mixée sous la voix avec « ducking » automatique ;
- étalonnage léger (vignettage + grain) ;
- coupe sèche à la fin pour boucler sur le début.

Usage :
    python3 monter2.py shorts/odin-oeil/montage.json [-o sortie.mp4] [--factice]
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

L, H, IPS = 1080, 1920, 30
OR_ASS = "&H3AB2E8&"     # or #E8B23A au format ASS (BBGGRR)
BLANC_ASS = "&HFFFFFF&"


def lancer(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:])
        raise SystemExit("Échec ffmpeg")
    return r.stderr


def duree(f):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(f)], capture_output=True, text=True).stdout)


def a_de_l_audio(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                          "-show_entries", "stream=index", "-of", "csv=p=0", str(f)],
                         capture_output=True, text=True).stdout.strip()
    return bool(out)


# ---------------------------------------------------------------- sous-titres

def propre(t):
    return t.replace("*", "")


def poids(t):
    t = propre(t)
    return len(t) + t.count("…") * 10 + t.count(",") * 4 + t.count(":") * 4 + t.count(".") * 4


def cartons(texte, mots_max=3):
    """Découpe une phrase en cartons de 1 à 3 mots (rythme Shorts)."""
    mots, res, cur = texte.split(), [], []
    for m in mots:
        cur.append(m)
        fin = propre(m).endswith((".", "…", ":", "?", "!", ","))
        if len(cur) >= mots_max or fin:
            res.append(" ".join(cur))
            cur = []
    if cur:
        res.append(" ".join(cur))
    return res


def vers_ass(c):
    def rep(m):
        return "{\\c" + OR_ASS + "}" + m.group(1).upper() + "{\\c" + BLANC_ASS + "}"
    c = re.sub(r"\*([^*]+)\*", rep, c)
    parts = re.split(r"(\{[^}]*\})", c)
    return "".join(p if p.startswith("{") else p.upper() for p in parts)


def t_ass(t):
    h, r = divmod(max(t, 0), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def ecrire_ass(phrases, chemin, police):
    entete = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {L}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Carton,{police},106,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,1,0,0,0,100,100,1,0,1,8,4,2,60,60,600,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lignes = []
    for ph in phrases:
        cs = cartons(ph["texte"])
        ps = [poids(c) for c in cs]
        t, d_tot = ph["debut"], ph["fin"] - ph["debut"]
        for c, p in zip(cs, ps):
            d = d_tot * p / sum(ps)
            pop = "{\\fscx80\\fscy80\\t(0,90,\\fscx108\\fscy108)\\t(90,160,\\fscx100\\fscy100)}"
            lignes.append(f"Dialogue: 0,{t_ass(t)},{t_ass(t + d)},Carton,,0,0,0,,{pop}{vers_ass(c)}")
            t += d
    chemin.write_text(entete + "\n".join(lignes) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- factices

def factices(cfg, dossier):
    coul = ["0x0f2a3d", "0xc98a1b", "0x16384f", "0x7a2e12", "0x1d4560"]
    for i, p in enumerate(cfg["plans"]):
        f = dossier / p["fichier"]
        if f.exists():
            continue
        f.parent.mkdir(parents=True, exist_ok=True)
        lancer(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i",
                f"color=c={coul[i % 5]}:s={L}x{H}:d=5:r=24,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
                f"text='{Path(p['fichier']).stem}':fontsize=160:fontcolor=white:x=(w-tw)/2:y=(h-th)/2",
                "-pix_fmt", "yuv420p", str(f)])
    for n in cfg.get("noms", []):
        f = dossier / n["image"]
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            lancer(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i", "color=c=black:s=1536x1024",
                    "-vf", f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf:"
                    f"text='{f.stem}':fontsize=260:fontcolor=0xE8B23A:x=(w-tw)/2:y=(h-th)/2",
                    "-frames:v", "1", str(f)])


# ---------------------------------------------------------------- montage

def monter(chemin_cfg, sortie, factice, police):
    cfg = json.loads(chemin_cfg.read_text(encoding="utf-8"))
    dossier = chemin_cfg.parent
    if factice:
        factices(cfg, dossier)

    voix = dossier / cfg["voix"]
    total = cfg.get("duree") or duree(voix)
    plans = cfg["plans"]
    sortie = sortie or dossier / "sortie" / f"{dossier.name}.mp4"
    sortie.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        ass = Path(tmp) / "st.ass"
        ecrire_ass(cfg["sous_titres"], ass, police)
        (sortie.with_suffix(".ass")).write_text(ass.read_text(encoding="utf-8"), encoding="utf-8")

        cmd = ["ffmpeg", "-y", "-hide_banner"]
        f = []
        # Entrées : plans
        for p in plans:
            cmd += ["-i", str(dossier / p["fichier"])]
        n = len(plans)
        # Entrées : noms
        noms = cfg.get("noms", [])
        for nm in noms:
            cmd += ["-loop", "1", "-t", str(nm["fin"] - nm["debut"] + 0.1), "-i", str(dossier / nm["image"])]
        i_voix = n + len(noms)
        cmd += ["-i", str(voix)]
        musique = cfg.get("musique")
        i_mus = i_voix + 1
        if musique:
            cmd += ["-i", str(dossier / musique)]

        # --- vidéo : chaque plan recadré, accéléré/ralenti, zoomé, à la bonne durée
        for k, p in enumerate(plans):
            d = p["fin"] - p["debut"]
            depart = p.get("depart", 0.0)
            vit = p.get("vitesse", 1.0)
            mvt = p.get("mouvement", "push")
            if mvt == "punch":   # zoom rapide 1.0 -> 1.12 sur 0,35 s puis lent
                z = f"if(lt(t,0.35),1+0.12*t/0.35,1.12+0.03*(t-0.35)/{d})"
            elif mvt == "pull":
                z = f"1.10-0.08*t/{d}"
            elif mvt == "fixe":
                z = "1"
            else:                # push lent
                z = f"1+0.07*t/{d}"
            f.append(
                f"[{k}:v]trim=start={depart}:duration={d * vit + 0.2},setpts=(PTS-STARTPTS)/{vit},"
                f"fps={IPS},scale={L}:{H}:force_original_aspect_ratio=increase,crop={L}:{H},"
                f"tpad=stop_mode=clone:stop_duration={d},trim=duration={d},setpts=PTS-STARTPTS,"
                f"scale=w='ceil({L}*({z})/2)*2':h=-2:eval=frame,crop={L}:{H},setsar=1,format=yuv420p[p{k}]"
            )
        f.append("".join(f"[p{k}]" for k in range(n)) + f"concat=n={n}:v=1:a=0[vbase]")

        # étalonnage léger : contraste doux, vignettage, grain
        f.append("[vbase]eq=contrast=1.06:saturation=1.05,vignette=angle=PI/5,"
                 "noise=alls=3:allf=t[vgrade]")

        # --- noms dorés (fusion screen)
        courant = "vgrade"
        for j, nm in enumerate(noms):
            idx = n + j
            hauteur = nm.get("hauteur", 190)
            x, y = nm.get("x", f"W-w-45"), nm.get("y", 210)
            dn = nm["fin"] - nm["debut"]
            # Alpha = luminosité amplifiée : le noir devient transparent, l'or et sa lueur restent.
            f.append(
                f"[{idx}:v]scale=-2:{hauteur},format=rgb24,split[nc{j}][na{j}];"
                f"[na{j}]format=gray,lut=c0='clip(val*2.6,0,255)'[nl{j}];"
                f"[nc{j}][nl{j}]alphamerge,format=rgba,"
                f"fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st={dn - 0.35:.3f}:d=0.35:alpha=1,"
                f"setpts=PTS-STARTPTS+{nm['debut']}/TB[nom{j}]")
            f.append(f"[{courant}][nom{j}]overlay=x={x}:y={y}:eof_action=pass:format=auto[ov{j}]")
            courant = f"ov{j}"
        f.append(f"[{courant}]format=yuv420p,ass='{ass}'[vout]")

        # --- bruitages : son d'origine de chaque clip, calé sur la timeline
        vol_sfx = cfg.get("son_plans", 0)
        if vol_sfx:
            for k, p in enumerate(plans):
                d = p["fin"] - p["debut"]
                vit = p.get("vitesse", 1.0)
                fichier = dossier / p["fichier"]
                if a_de_l_audio(fichier):
                    tempo = f",atempo={vit}" if vit != 1.0 else ""
                    f.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                             f"atrim=start={p.get('depart', 0.0)}:duration={d * vit},asetpts=PTS-STARTPTS{tempo},"
                             f"apad,atrim=0:{d},afade=t=in:d=0.04,afade=t=out:st={max(d - 0.06, 0)}:d=0.06[s{k}]")
                else:
                    f.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{d}[s{k}]")
            f.append("".join(f"[s{k}]" for k in range(n)) + f"concat=n={n}:v=0:a=1,volume={vol_sfx}[sfx]")

        # --- audio : voix + musique (+ bruitages) avec ducking
        vol_mus = cfg.get("volume_musique", 0.35)
        f.append(f"[{i_voix}:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:{total},asplit=2[v1][vsc]")
        fonds = []
        if musique:
            f.append(f"[{i_mus}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                     f"atrim=start={cfg.get('depart_musique', 0)}:duration={total},asetpts=PTS-STARTPTS,"
                     f"volume={vol_mus}[m0]")
            fonds.append("[m0]")
        if vol_sfx:
            fonds.append("[sfx]")
        if fonds:
            f.append("".join(fonds) + f"amix=inputs={len(fonds)}:duration=first:normalize=0[fond]")
            f.append("[fond][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[fduck]")
            f.append("[v1][fduck]amix=inputs=2:duration=first:normalize=0,"
                     "loudnorm=I=-14:TP=-1.0:LRA=9[aout]")
        else:
            f.append("[v1]loudnorm=I=-14:TP=-1.0:LRA=9[aout]")
            f.append("[vsc]anullsink")

        graphe = ";".join(f)
        cmd += ["-filter_complex", graphe, "-map", "[vout]", "-map", "[aout]",
                "-t", f"{total:.3f}", "-r", str(IPS),
                "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "film", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", str(sortie)]
        lancer(cmd)
    print(f"✔ {sortie} ({total:.2f} s, {n} plans)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("montage", type=Path)
    ap.add_argument("-o", "--sortie", type=Path)
    ap.add_argument("--factice", action="store_true")
    ap.add_argument("--police", default="Poppins")
    a = ap.parse_args()
    monter(a.montage, a.sortie, a.factice, a.police)


if __name__ == "__main__":
    main()
