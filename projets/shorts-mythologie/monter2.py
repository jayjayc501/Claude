#!/usr/bin/env python3
"""Montage « timeline » des Shorts de La Pause Mytho…logique (v2).

Suit une timeline précise décrite dans un fichier montage.json :

- plans avec début/fin exacts (calés sur la voix), mouvement de caméra par
  plan ("push", "punch", "pull", "fixe"), vitesse, miroir horizontal ;
- intro : la voix peut démarrer après un court temps (« decalage_voix ») ;
- texte incrusté minimal : titre d'accroche + mots clés dorés (« mots_cles »),
  le texte complet part dans un fichier .srt à importer dans YouTube (CC) ;
- noms des personnages en surimpression (image dorée sur fond noir rendue
  transparente) ;
- son : voix + musique + bruitages des clips enchaînés en fondu, le fond
  s'efface doucement sous la voix, loudness YouTube (−14 LUFS) ;
- étalonnage léger (vignettage, grain facultatif, netteté adaptative) ;
- rendu à la résolution voulue (« resolution », 2160x3840 conseillé : YouTube
  réserve alors son meilleur codec, VP9/AV1, même aux spectateurs en 1080p)
  et à la cadence native des clips (« ips », 24 pour Kling) ;
- carte de fin de chaîne facultative (« fin ») : fondu enchaîné depuis le
  dernier plan, logo animé ligne par ligne (logo_anime.py).

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

import logo_anime

# Repère de travail : toutes les positions (texte, noms, logo) sont données
# pour du 1080x1920 et mises à l'échelle de la résolution de sortie.
BL, BH = 1080, 1920
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


def est_image(f):
    return Path(f).suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")


# ---------------------------------------------------------------- texte

def propre(t):
    return t.replace("*", "")


def t_ass(t):
    h, r = divmod(max(t, 0), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def t_srt(t):
    ms = int(round(max(t, 0) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def vers_ass(c, couleur_mot=OR_ASS, couleur=BLANC_ASS):
    def rep(m):
        return "{\\c" + couleur_mot + "}" + m.group(1).upper() + "{\\c" + couleur + "}"
    c = re.sub(r"\*([^*]+)\*", rep, c)
    parts = re.split(r"(\{[^}]*\})", c)
    return "".join(p if p.startswith("{") else p.upper() for p in parts)


def ecrire_ass(cfg, chemin, decalage):
    police = cfg.get("police_texte", "Inter Display Black")
    entete = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {BL}
PlayResY: {BH}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Titre,{police},104,&H003AB2E8,&H003AB2E8,&H00101010,&H96000000,0,0,0,0,92,100,2,0,1,7,5,5,70,70,0,1
Style: Mot,{police},128,&H003AB2E8,&H003AB2E8,&H00101010,&H96000000,0,0,0,0,92,100,3,0,1,8,5,2,60,60,560,1
Style: Carton,{police},96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,95,100,1,0,1,7,4,2,60,60,600,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lignes = []
    # Titre d'accroche (temps absolus de la vidéo)
    if cfg.get("titre_accroche"):
        ta = cfg["titre_accroche"]
        anim = "{\\pos(540,780)\\fad(120,200)\\fscx70\\fscy70\\t(0,180,\\fscx92\\fscy100)}"
        lignes.append(f"Dialogue: 1,{t_ass(ta['debut'])},{t_ass(ta['fin'])},Titre,,0,0,0,,{anim}{ta['texte'].upper()}")
    # Mots clés (temps de la voix, décalés)
    for mc in cfg.get("mots_cles", []):
        d, f = mc["debut"] + decalage, mc["fin"] + decalage
        taille = f"\\fs{mc['taille']}" if mc.get("taille") else ""
        pop = "{" + taille + "\\fad(60,160)\\fscx60\\fscy60\\t(0,110,\\fscx100\\fscy108)\\t(110,200,\\fscx92\\fscy100)}"
        lignes.append(f"Dialogue: 0,{t_ass(d)},{t_ass(f)},Mot,,0,0,0,,{pop}{mc['texte'].upper()}")
    # Sous-titres complets incrustés (désactivés par défaut)
    if cfg.get("sous_titres_incrustes", False):
        for ph in cfg["sous_titres"]:
            lignes.append(f"Dialogue: 0,{t_ass(ph['debut'] + decalage)},{t_ass(ph['fin'] + decalage)},"
                          f"Carton,,0,0,0,,{vers_ass(ph['texte'])}")
    chemin.write_text(entete + "\n".join(lignes) + "\n", encoding="utf-8")


def ecrire_srt(phrases, chemin, decalage, max_car=42):
    """Fichier de sous-titres YouTube : phrases longues découpées aux virgules."""
    blocs = []
    for ph in phrases:
        texte = propre(ph["texte"])
        morceaux = [texte]
        if len(texte) > max_car:
            morceaux, cur = [], ""
            for part in re.split(r"(?<=[,:…])\s+", texte):
                if cur and len(cur) + len(part) + 1 > max_car:
                    morceaux.append(cur)
                    cur = part
                else:
                    cur = (cur + " " + part).strip()
            if cur:
                morceaux.append(cur)
        total = sum(len(m) for m in morceaux)
        t = ph["debut"]
        for m in morceaux:
            d = (ph["fin"] - ph["debut"]) * len(m) / total
            blocs.append((t + decalage, t + d + decalage, m))
            t += d
    with open(chemin, "w", encoding="utf-8") as f:
        for i, (a, b, m) in enumerate(blocs, 1):
            f.write(f"{i}\n{t_srt(a)} --> {t_srt(b)}\n{m}\n\n")


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
                "-f", "lavfi", "-i", "anoisesrc=d=5:a=0.05", "-shortest",
                "-pix_fmt", "yuv420p", str(f)])
    for n in cfg.get("noms", []):
        f = dossier / n["image"]
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            lancer(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i", "color=c=black:s=1200x600",
                    "-vf", f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf:"
                    f"text='{f.stem}':fontsize=200:fontcolor=0xE8B23A:x=(w-tw)/2:y=(h-th)/2",
                    "-frames:v", "1", str(f)])
    fin = cfg.get("fin")
    if fin and not (dossier / fin["fichier"]).exists():
        f = dossier / fin["fichier"]
        f.parent.mkdir(parents=True, exist_ok=True)
        lancer(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i", f"color=c=0x0f2a3d:s={L}x{H}",
                "-vf", "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf:"
                "text='CARTE DE FIN':fontsize=90:fontcolor=0xE8B23A:x=(w-tw)/2:y=(h-th)/2",
                "-frames:v", "1", str(f)])


# ---------------------------------------------------------------- montage

def _zoom(mvt, d):
    if mvt == "punch":
        return f"if(lt(t,0.35),1+0.12*t/0.35,1.12+0.03*(t-0.35)/{d})"
    if mvt == "pull":
        return f"1.10-0.08*t/{d}"
    if mvt == "fixe":
        return "1"
    return f"1+0.07*t/{d}"


def _cadrer(nf, d, vit, depart, z, miroir=False, extra=""):
    """Chaîne vidéo d'un plan : extrait → format 9:16 sans rééchantillonnage →
    nf images exactement → un seul redimensionnement lanczos (zoom compris)."""
    return (f"trim=start={depart}:duration={d * vit + 0.3},setpts=(PTS-STARTPTS)/{vit},fps={IPS},"
            f"crop='min(iw,ih*{L}/{H})':'min(ih,iw*{H}/{L})'{',hflip' if miroir else ''},setsar=1,"
            f"tpad=stop_mode=clone:stop_duration={d + 1},trim=end_frame={nf},setpts=PTS-STARTPTS,"
            f"scale=w='ceil({L}*({z})/2)*2':h=-2:eval=frame:flags=lanczos+accurate_rnd,"
            f"crop={L}:{H},setsar=1{extra},format=yuv420p")


def monter(chemin_cfg, sortie, factice):
    """Montage en deux temps pour tenir en mémoire même en 4K :
    1) chaque plan (et la carte de fin) est rendu seul en fichier intermédiaire
       quasi sans perte, au nombre d'images exact (pas de dérive de synchro) ;
    2) les plans sont mis bout à bout, puis noms, texte et son sont posés."""
    global L, H, IPS
    cfg = json.loads(chemin_cfg.read_text(encoding="utf-8"))
    dossier = chemin_cfg.parent
    L, H = cfg.get("resolution", [BL, BH])
    IPS = cfg.get("ips", 30)
    k = L / BL
    if factice:
        factices(cfg, dossier)

    voix = dossier / cfg["voix"]
    dec = cfg.get("decalage_voix", 0.0)
    plans = cfg["plans"]
    fin_carte = cfg.get("fin")
    d_fin = fin_carte["duree"] if fin_carte else 0.0
    fondu = fin_carte.get("fondu", 0.0) if fin_carte else 0.0

    def im(t):
        return int(round(t * IPS))

    n_total = im(plans[-1]["fin"]) + (im(d_fin) - im(fondu) if fin_carte else 0)
    total = n_total / IPS
    sortie = sortie or dossier / "sortie" / f"{dossier.name}.mp4"
    sortie.parent.mkdir(parents=True, exist_ok=True)

    grain, nettete = cfg.get("grain", 0), cfg.get("nettete", 0)
    etalonnage = (",eq=contrast=1.06:saturation=1.05,vignette=angle=PI/5"
                  + (f",noise=alls={grain}:allf=t" if grain else "")
                  + (f",cas=strength={nettete}" if nettete else ""))
    inter = ["-r", str(IPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "8",
             "-pix_fmt", "yuv420p", "-an"]

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        ass = tmp / "st.ass"
        ecrire_ass(cfg, ass, dec)
        sortie.with_suffix(".ass").write_text(ass.read_text(encoding="utf-8"), encoding="utf-8")
        if cfg.get("sous_titres"):
            ecrire_srt(cfg["sous_titres"], sortie.with_suffix(".srt"), dec)

        # --- 1) plans, un fichier chacun
        segments, n_images = [], []
        for j, p in enumerate(plans):
            src = dossier / p["fichier"]
            nf = im(p["fin"]) - im(p["debut"])
            d = nf / IPS
            entree = (["-loop", "1", "-t", str(d + 1)] if est_image(src) else []) + ["-i", str(src)]
            vf = _cadrer(nf, d, p.get("vitesse", 1.0), p.get("depart", 0.0),
                         _zoom(p.get("mouvement", "push"), d), p.get("miroir", False), etalonnage)
            seg = tmp / f"plan_{j:02d}.mkv"
            lancer(["ffmpeg", "-y", "-hide_banner", *entree, "-vf", vf, *inter, str(seg)])
            segments.append(seg)
            n_images.append(nf)
            print(f"  plan {j + 1}/{len(plans)} ✓", flush=True)

        # --- carte de fin : décor + logo (animé ou fixe), puis fondu enchaîné avec le dernier plan
        if fin_carte:
            nfin = im(d_fin)
            dfin = nfin / IPS
            src = dossier / fin_carte["fichier"]
            cmd = ["ffmpeg", "-y", "-hide_banner"]
            cmd += (["-loop", "1", "-t", str(dfin + 1)] if est_image(src) else []) + ["-i", str(src)]
            entree_fondu = "" if fondu else ",fade=t=in:st=0:d=0.25"
            fc = [f"[0:v]{_cadrer(nfin, dfin, fin_carte.get('vitesse', 1.0), 0.0, f'1+0.04*t/{dfin}')}"
                  f"{entree_fondu}[f0]"]
            if fin_carte.get("logo"):
                lw = int(round(fin_carte.get("logo_largeur", 760) * k))
                if fin_carte.get("logo_anime"):
                    motif, marge = logo_anime.generer(dossier / fin_carte["logo"], tmp / "logo", lw, IPS, dfin,
                                                      depart=fin_carte.get("logo_depart", 0.35))
                    cmd += ["-framerate", str(IPS), "-i", str(motif)]
                    fc.append("[1:v]format=rgba,setpts=PTS-STARTPTS[logo]")
                else:
                    marge = 0
                    cmd += ["-loop", "1", "-t", str(dfin + 1), "-i", str(dossier / fin_carte["logo"])]
                    fc.append(f"[1:v]scale={lw}:-2:flags=lanczos,format=rgba,"
                              f"fade=t=in:st=0.15:d=0.35:alpha=1[logo]")
                ly = int(fin_carte.get("logo_y", 520) * k) - marge
                fc.append(f"[f0][logo]overlay=x=(W-w)/2:y={ly}:format=auto:eof_action=repeat,"
                          f"trim=end_frame={nfin},format=yuv420p[v]")
            else:
                fc.append("[f0]null[v]")
            seg_fin = tmp / "fin.mkv"
            lancer(cmd + ["-filter_complex", ";".join(fc), "-map", "[v]", *inter, str(seg_fin)])
            if fondu:
                nfd = im(fondu)
                decalage = (n_images[-1] - nfd) / IPS
                seg = tmp / "fin_fondu.mkv"
                lancer(["ffmpeg", "-y", "-hide_banner", "-i", str(segments[-1]), "-i", str(seg_fin),
                        "-filter_complex",
                        f"[0:v]settb=AVTB,fps={IPS}[a];[1:v]settb=AVTB,fps={IPS}[b];"
                        f"[a][b]xfade=transition=fade:duration={nfd / IPS:.4f}:offset={decalage:.4f},"
                        f"format=yuv420p[v]", "-map", "[v]", *inter, str(seg)])
                segments[-1] = seg
            else:
                segments.append(seg_fin)
            print("  carte de fin ✓", flush=True)

        liste = tmp / "liste.txt"
        liste.write_text("".join(f"file '{s}'\n" for s in segments), encoding="utf-8")

        # --- 2) assemblage : plans bout à bout + noms + texte + son
        cmd = ["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", str(liste)]
        f = [f"[0:v]settb=AVTB,setpts=N/{IPS}/TB[vbase]"]
        noms = cfg.get("noms", [])
        courant = "vbase"
        for j, nm in enumerate(noms):
            cmd += ["-loop", "1", "-t", str(nm["fin"] - nm["debut"] + 0.1), "-i", str(dossier / nm["image"])]
            idx = 1 + j
            hauteur = int(round(nm.get("hauteur", 190) * k / 2)) * 2
            x, y = nm.get("x", f"W-w-{int(45 * k)}"), int(nm.get("y", 210) * k)
            dn = nm["fin"] - nm["debut"]
            f.append(
                f"[{idx}:v]scale=-2:{hauteur}:flags=lanczos,format=rgb24,split[nc{j}][na{j}];"
                f"[na{j}]format=gray,lut=c0='clip(val*2.6,0,255)'[nl{j}];"
                f"[nc{j}][nl{j}]alphamerge,format=rgba,"
                f"fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st={dn - 0.35:.3f}:d=0.35:alpha=1,"
                f"setpts=PTS-STARTPTS+{nm['debut']}/TB[nom{j}]")
            f.append(f"[{courant}][nom{j}]overlay=x={x}:y={y}:eof_action=pass:format=auto[ov{j}]")
            courant = f"ov{j}"
        f.append(f"[{courant}]format=yuv420p,ass='{ass}'[vout]")

        i_voix = 1 + len(noms)
        cmd += ["-i", str(voix)]
        musique = cfg.get("musique")
        i_mus = i_voix + 1
        if musique:
            cmd += ["-i", str(dossier / musique)]
        prochain = i_mus + (1 if musique else 0)

        # bruitages : son d'origine des clips (vidéo ignorée à la lecture), posés avec fondus croisés
        vol_sfx = cfg.get("son_plans", 0)
        xf = 0.25
        if vol_sfx:
            pistes = []
            for j, p in enumerate(plans):
                src = dossier / p["fichier"]
                if est_image(src) or not a_de_l_audio(src):
                    continue
                cmd += ["-vn", "-i", str(src)]
                idx, prochain = prochain, prochain + 1
                d = p["fin"] - p["debut"]
                vit = p.get("vitesse", 1.0)
                tempo = f",atempo={vit}" if vit != 1.0 else ""
                debut = max(p["debut"] - xf / 2, 0)
                longueur = d + xf
                f.append(f"[{idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                         f"atrim=start={p.get('depart', 0.0)},asetpts=PTS-STARTPTS{tempo},"
                         f"apad,atrim=0:{longueur},afade=t=in:d={xf},afade=t=out:st={longueur - xf}:d={xf},"
                         f"adelay={int(debut * 1000)}:all=1[s{j}]")
                pistes.append(f"[s{j}]")
            if pistes:
                f.append("".join(pistes) + f"amix=inputs={len(pistes)}:duration=longest:normalize=0,"
                         f"apad,atrim=0:{total},volume={vol_sfx}[sfx]")
            else:
                vol_sfx = 0

        vol_mus = cfg.get("volume_musique", 0.3)
        f.append(f"[{i_voix}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                 f"adelay={int(dec * 1000)}:all=1,apad,atrim=0:{total},asplit=2[v1][vsc]")
        fonds = []
        if musique:
            f.append(f"[{i_mus}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                     f"atrim=start={cfg.get('depart_musique', 0)}:duration={total},asetpts=PTS-STARTPTS,"
                     f"volume={vol_mus},afade=t=out:st={total - 0.6}:d=0.6[m0]")
            fonds.append("[m0]")
        if vol_sfx:
            fonds.append("[sfx]")
        if fonds:
            f.append("".join(fonds) + f"amix=inputs={len(fonds)}:duration=first:normalize=0[fond]")
            # ducking doux : seuil plus haut, ratio modéré, relâchement lent → pas de « pompage »
            f.append("[fond][vsc]sidechaincompress=threshold=0.06:ratio=3:attack=60:release=900:knee=6[fduck]")
            f.append("[v1][fduck]amix=inputs=2:duration=first:normalize=0,"
                     "loudnorm=I=-14:TP=-1.0:LRA=11[aout]")
        else:
            f.append("[v1]loudnorm=I=-14:TP=-1.0:LRA=11[aout]")
            f.append("[vsc]anullsink")

        cmd += ["-filter_complex", ";".join(f), "-map", "[vout]", "-map", "[aout]",
                "-frames:v", str(n_total), "-t", f"{total:.3f}", "-r", str(IPS),
                "-c:v", "libx264", "-preset", cfg.get("preset", "medium"), "-crf", str(cfg.get("crf", 19)),
                "-tune", "film", "-pix_fmt", "yuv420p", "-profile:v", "high",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", str(sortie)]
        print("  assemblage…", flush=True)
        lancer(cmd)
    print(f"✔ {sortie} ({total:.2f} s, {len(plans)} plans, {L}x{H} {IPS} i/s)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("montage", type=Path)
    ap.add_argument("-o", "--sortie", type=Path)
    ap.add_argument("--factice", action="store_true")
    a = ap.parse_args()
    monter(a.montage, a.sortie, a.factice)


if __name__ == "__main__":
    main()
