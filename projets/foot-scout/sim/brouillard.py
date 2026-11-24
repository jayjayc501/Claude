# Vérifie le modèle de brouillard : combien de matchs pour cerner un attribut, et si la fourchette dit vrai.
import random, math, statistics as st
K = 1.3          # largeur de la fourchette en écarts-types
FORME = 5        # forme du jour, commune à tout le match
def sigma(spe, oeil): return max(4, (10 if spe else 15) - oeil)
def run(spe, oeil, n, trials=20000):
    cov = 0; widths = []
    for _ in range(trials):
        vrai = random.randint(40, 90)
        s = sigma(spe, oeil); tot = math.hypot(s, FORME)
        ind = [vrai + random.gauss(0, FORME) + random.gauss(0, s) for _ in range(n)]
        c = st.mean(ind); h = min(30, K * tot / math.sqrt(n))
        cov += (c - h <= vrai <= c + h); widths.append(2 * h)
    return cov / trials, st.mean(widths)
random.seed(1)
print("spécialité | œil | matchs | fourchette moyenne | vraie valeur dedans")
for spe in (True, False):
    for oeil in (0, 3):
        for n in (1, 2, 3, 4, 6, 8):
            c, w = run(spe, oeil, n, 6000)
            print(f"{'oui' if spe else 'non'} | {oeil} | {n} | {w:.0f} pts | {c*100:.0f} %")
# matchs pour atteindre ±8 (solide) et ±5 (sûr)
for spe in (True, False):
    for oeil in (0, 3, 5):
        tot = math.hypot(sigma(spe, oeil), FORME)
        print('solide', spe, oeil, math.ceil((K*tot/8)**2), 'sûr', math.ceil((K*tot/5)**2))
