# Planche contact des bustes : python3 scripts/capture/planche-bustes.py sortie.png ENG GER …
# (une rangée couleur du pays et une rangée version rouge par pays).
import sys, json
from PIL import Image
from pathlib import Path
ici=Path(__file__).resolve().parent.parent.parent  # dossier prototype
d=ici/'src/images/joueurs'
c=json.load(open(ici/'src/data/cartes.json'))['cartes']
rows=[]
for pays in sys.argv[2:]:
    ids=[x['id'] for x in c if x['pays']==pays]
    for suf in ['', '-rouge']:
        ims=[Image.open(d/f'{i}{suf}.webp') for i in ids]
        o=Image.new('RGBA',(192*12,194),(205,225,205,255))
        for k,im in enumerate(ims): o.alpha_composite(im,(192*k,0))
        rows.append(o)
O=Image.new('RGBA',(rows[0].width,194*len(rows)),(255,255,255,255))
for k,r in enumerate(rows): O.alpha_composite(r,(0,194*k))
O.convert('RGB').resize((O.width//2,O.height//2)).save(sys.argv[1])
