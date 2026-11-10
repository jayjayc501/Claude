#!/usr/bin/env python3
"""Outil de montage des Shorts de « La Pause Mytho…logique ».

Assemble les clips vidéo (Kling), la voix off (ElevenLabs), une musique
facultative et des sous-titres incrustés en une vidéo verticale 1080x1920.

Commandes :
    python3 monter.py narration shorts/odin-oeil/plan.json
        -> affiche le texte à coller dans ElevenLabs

    python3 monter.py prompts shorts/odin-oeil/plan.json
        -> affiche les prompts Kling complets (avec le style de la chaîne)

    python3 monter.py monter shorts/odin-oeil/plan.json [-o sortie.mp4]
        -> fabrique le Short

    python3 monter.py monter shorts/odin-oeil/plan.json --factice
        -> fabrique des clips et une voix de test pour vérifier le montage

Seul ffmpeg/ffprobe est nécessaire (pas de dépendance Python).
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

LARGEUR, HAUTEUR, IPS = 1080, 1920, 30
DUREE_MAX_SHORT = 180  # secondes

SUFFIXE_PROMPT = (
    "cinematic epic dark fantasy digital painting, deep midnight blue and warm "
    "gold color palette, dramatic golden rim lighting, volumetric mist, highly "
    "detailed, vertical 9:16, slow cinematic camera movement"
)
PROMPT_NEGATIF = (
    "cartoon, anime, text, watermark, logo, blurry, deformed hands, extra limbs, "
    "modern objects, bright daylight colors"
)

# Couleurs ASS au format &HBBGGRR&
OR_ASS = "&H3AB2E8&"
BLANC_ASS = "&HFFFFFF&"


# --------------------------------------------------------------------------
# Texte
# --------------------------------------------------------------------------

def texte_propre(texte: str) -> str:
    """Retire le balisage *mot en or* pour obtenir le texte à lire."""
    return texte.replace("*", "")


def poids_texte(texte: str) -> float:
    """Estimation du temps de lecture : nombre de caractères + bonus de pause."""
    propre = texte_propre(texte)
    pauses = propre.count("…") * 12 + propre.count(".") * 6 + propre.count(":") * 5
    return len(propre) + pauses


def decouper_cartons(texte: str, mots_max: int = 4) -> list[str]:
    """Découpe un segment en cartons de sous-titres courts (3 à 5 mots)."""
    mots = texte.split()
    cartons, courant = [], []
    for mot in mots:
        courant.append(mot)
        fin_phrase = mot.rstrip("*").endswith((".", "…", ":", "?", "!", ","))
        if len(courant) >= mots_max or (fin_phrase and len(courant) >= 2):
            cartons.append(" ".join(courant))
            courant = []
    if courant:
        if cartons and len(courant) == 1:
            cartons[-1] += " " + courant[0]
        else:
            cartons.append(" ".join(courant))
    return cartons


def vers_ass(carton: str) -> str:
    """Convertit un carton en texte ASS : majuscules, mots *balisés* en or."""
    def remplacer(m):
        return "{\\c" + OR_ASS + "}" + m.group(1).upper() + "{\\c" + BLANC_ASS + "}"
    carton = re.sub(r"\*([^*]+)\*", remplacer, carton)
    # Met en majuscules ce qui est hors des balises de style
    morceaux = re.split(r"(\{[^}]*\})", carton)
    return "".join(p if p.startswith("{") else p.upper() for p in morceaux)


def temps_ass(t: float) -> str:
    h, reste = divmod(max(t, 0), 3600)
    m, s = divmod(reste, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


# --------------------------------------------------------------------------
# ffmpeg
# --------------------------------------------------------------------------

def lancer(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        sys.stderr.write(res.stderr[-3000:])
        raise SystemExit(f"Échec de la commande : {' '.join(cmd[:4])} …")
    return res.stdout + res.stderr


def duree(fichier: Path) -> float:
    sortie = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(fichier)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(sortie)


def silences(fichier: Path) -> list[float]:
    """Renvoie le milieu de chaque silence détecté dans la voix off."""
    log = lancer(["ffmpeg", "-hide_banner", "-i", str(fichier), "-af",
                  "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"])
    debuts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    fins = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return [(d + f) / 2 for d, f in zip(debuts, fins)]


def calculer_bornes(segments: list[dict], voix: Path) -> list[float]:
    """Calcule le début de chaque segment (+ la fin) dans la voix off.

    1. Si le plan donne des « debut » explicites, on les utilise.
    2. Sinon on répartit selon la longueur du texte, puis on « aimante »
       chaque frontière sur le silence le plus proche (±1,5 s).
    """
    total = duree(voix)
    if all("debut" in s for s in segments):
        return [float(s["debut"]) for s in segments] + [total]

    poids = [poids_texte(s["texte"]) for s in segments]
    somme = sum(poids)
    bornes, cumul = [0.0], 0.0
    for p in poids[:-1]:
        cumul += p
        bornes.append(total * cumul / somme)
    bornes.append(total)

    pauses = silences(voix)
    for i in range(1, len(bornes) - 1):
        proches = [p for p in pauses
                   if abs(p - bornes[i]) <= 1.5 and bornes[i - 1] + 0.8 < p < bornes[i + 1] - 0.3]
        if proches:
            bornes[i] = min(proches, key=lambda p: abs(p - bornes[i]))
    return bornes


def ecrire_ass(segments, bornes, chemin: Path, police: str):
    entete = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {LARGEUR}
PlayResY: {HAUTEUR}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Carton,{police},84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,1,0,1,6,3,2,80,80,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lignes = []
    for seg, debut, fin in zip(segments, bornes[:-1], bornes[1:]):
        cartons = decouper_cartons(seg["texte"])
        poids = [poids_texte(c) for c in cartons]
        t = debut
        for carton, p in zip(cartons, poids):
            d = (fin - debut) * p / sum(poids)
            # Petite animation d'apparition (zoom 90 % -> 100 %)
            effet = "{\\fscx90\\fscy90\\t(0,120,\\fscx100\\fscy100)}"
            lignes.append(f"Dialogue: 0,{temps_ass(t)},{temps_ass(t + d)},Carton,,0,0,0,,{effet}{vers_ass(carton)}")
            t += d
    chemin.write_text(entete + "\n".join(lignes) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
# Médias factices (test du montage sans crédits Kling/ElevenLabs)
# --------------------------------------------------------------------------

def creer_factices(plan: dict, dossier: Path):
    couleurs = ["0x0f2a3d", "0x16384f", "0xc98a1b", "0x1d4560", "0xe8b23a"]
    n = 0
    for seg in plan["segments"]:
        for clip in seg["clips"]:
            f = dossier / clip["fichier"]
            f.parent.mkdir(parents=True, exist_ok=True)
            if not f.exists():
                c = couleurs[n % len(couleurs)]
                # Clip de 5 s en 16:9 pour vérifier aussi le recadrage
                lancer(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i",
                        f"color=c={c}:s=1280x720:d=5:r=24,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
                        f"text='PLAN {n + 1:02d}':fontsize=120:fontcolor=white:x=(w-tw)/2:y=(h-th)/2",
                        "-pix_fmt", "yuv420p", str(f)])
            n += 1
    voix = dossier / plan["voix"]
    if not voix.exists():
        # Voix factice : un bip par segment, séparés par des silences
        morceaux = []
        for seg in plan["segments"]:
            d = max(2.0, poids_texte(seg["texte"]) / 15)
            morceaux.append(f"sine=f=220:d={d:.2f},volume=0.3")
            morceaux.append("anullsrc=r=44100:cl=mono,atrim=0:0.5")
        filtres = ";".join(f"{m}[a{i}]" for i, m in enumerate(morceaux))
        filtres += ";" + "".join(f"[a{i}]" for i in range(len(morceaux)))
        filtres += f"concat=n={len(morceaux)}:v=0:a=1[out]"
        lancer(["ffmpeg", "-y", "-hide_banner", "-filter_complex", filtres,
                "-map", "[out]", "-ar", "44100", str(voix)])


# --------------------------------------------------------------------------
# Montage
# --------------------------------------------------------------------------

def monter(chemin_plan: Path, sortie: Path | None, factice: bool, police: str):
    plan = json.loads(chemin_plan.read_text(encoding="utf-8"))
    dossier = chemin_plan.parent
    if factice:
        creer_factices(plan, dossier)

    voix = dossier / plan["voix"]
    manquants = [str(dossier / c["fichier"]) for s in plan["segments"] for c in s["clips"]
                 if not (dossier / c["fichier"]).exists()]
    if not voix.exists():
        manquants.insert(0, str(voix))
    if manquants:
        raise SystemExit("Fichiers manquants :\n  " + "\n  ".join(manquants))

    segments = plan["segments"]
    bornes = calculer_bornes(segments, voix)
    queue = 0.6  # petite respiration après la dernière phrase
    duree_totale = bornes[-1] + queue
    if duree_totale > DUREE_MAX_SHORT:
        print(f"⚠ Durée {duree_totale:.1f} s : au-delà de 3 min, YouTube ne le classera pas en Short.")

    # Durée de chaque clip : le segment est partagé à parts égales entre ses clips
    clips = []
    for i, seg in enumerate(segments):
        d_seg = bornes[i + 1] - bornes[i] + (queue if i == len(segments) - 1 else 0)
        for c in seg["clips"]:
            clips.append((dossier / c["fichier"], d_seg / len(seg["clips"])))

    sortie = sortie or dossier / "sortie" / (dossier.name + ".mp4")
    sortie.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        ass = Path(tmp) / "sous-titres.ass"
        ecrire_ass(segments, bornes, ass, police)
        shutil.copy(ass, sortie.with_suffix(".ass"))  # gardé pour retouches

        cmd = ["ffmpeg", "-y", "-hide_banner"]
        for f, _ in clips:
            cmd += ["-stream_loop", "-1", "-i", str(f)]
        cmd += ["-i", str(voix)]
        idx_voix = len(clips)
        musique = plan.get("musique")
        if musique:
            cmd += ["-stream_loop", "-1", "-i", str(dossier / musique)]

        filtres = []
        for i, (_, d) in enumerate(clips):
            filtres.append(
                f"[{i}:v]trim=0:{d:.3f},setpts=PTS-STARTPTS,fps={IPS},"
                f"scale={LARGEUR}:{HAUTEUR}:force_original_aspect_ratio=increase,"
                f"crop={LARGEUR}:{HAUTEUR},setsar=1,format=yuv420p[v{i}]"
            )
        filtres.append("".join(f"[v{i}]" for i in range(len(clips)))
                       + f"concat=n={len(clips)}:v=1:a=0[vc]")
        ass_echappe = str(ass).replace("\\", "/").replace(":", "\\:")
        filtres.append(f"[vc]ass='{ass_echappe}',fade=t=out:st={duree_totale - 0.5:.3f}:d=0.5[vout]")

        if musique:
            vol = plan.get("volume_musique", 0.12)
            filtres.append(f"[{idx_voix}:a]apad,atrim=0:{duree_totale:.3f}[voix]")
            filtres.append(f"[{idx_voix + 1}:a]atrim=0:{duree_totale:.3f},volume={vol},"
                           f"afade=t=out:st={duree_totale - 1.5:.3f}:d=1.5[mus]")
            filtres.append("[voix][mus]amix=inputs=2:duration=first:normalize=0[aout]")
        else:
            filtres.append(f"[{idx_voix}:a]apad,atrim=0:{duree_totale:.3f}[aout]")

        cmd += ["-filter_complex", ";".join(filtres), "-map", "[vout]", "-map", "[aout]",
                "-t", f"{duree_totale:.3f}",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(sortie)]
        lancer(cmd)

    print(f"✔ Short créé : {sortie} ({duree_totale:.1f} s, {len(clips)} plans)")
    for i, seg in enumerate(segments):
        print(f"  {bornes[i]:6.2f}s  {texte_propre(seg['texte'])[:60]}")


# --------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description="Montage des Shorts La Pause Mytho…logique")
    sous = p.add_subparsers(dest="commande", required=True)

    s = sous.add_parser("narration", help="texte à lire pour ElevenLabs")
    s.add_argument("plan", type=Path)

    s = sous.add_parser("prompts", help="prompts Kling complets")
    s.add_argument("plan", type=Path)

    s = sous.add_parser("monter", help="fabrique la vidéo")
    s.add_argument("plan", type=Path)
    s.add_argument("-o", "--sortie", type=Path)
    s.add_argument("--factice", action="store_true",
                   help="crée des clips et une voix de test si absents")
    s.add_argument("--police", default="DejaVu Serif",
                   help="police des sous-titres (installée sur la machine)")

    args = p.parse_args()
    plan = json.loads(args.plan.read_text(encoding="utf-8"))

    if args.commande == "narration":
        texte = "\n\n".join(texte_propre(s["texte"]) for s in plan["segments"])
        mots = len(texte.split())
        print(texte)
        print(f"\n--- {mots} mots, environ {mots / 2.5:.0f} s de lecture ---", file=sys.stderr)
    elif args.commande == "prompts":
        n = 0
        for seg in plan["segments"]:
            for c in seg["clips"]:
                n += 1
                print(f"## Plan {n:02d} → {c['fichier']}\n{c['prompt']}, {SUFFIXE_PROMPT}\n")
        print(f"## Prompt négatif (tous les plans)\n{PROMPT_NEGATIF}")
    else:
        monter(args.plan, args.sortie, args.factice, args.police)


if __name__ == "__main__":
    main()
