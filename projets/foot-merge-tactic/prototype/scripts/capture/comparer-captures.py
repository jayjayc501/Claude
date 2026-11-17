# Compare deux séries de rejouable.py (images au pixel près, texte de l'écran).
# Usage : python3 scripts/capture/comparer-captures.py <préfixe avant> <préfixe après>
import sys, glob
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
for f in sorted(glob.glob(f"{a}-*.png")):
    g = b + f[len(a):]
    d = ImageChops.difference(Image.open(f).convert("RGB"), Image.open(g).convert("RGB")).getbbox()
    h1, h2 = open(f[:-4] + ".html").read(), open(g[:-4] + ".html").read()
    print(f[len(a)+1:], "image", "identique" if d is None else f"DIFFÈRE {d}", "| html", "identique" if h1 == h2 else "DIFFÈRE")
