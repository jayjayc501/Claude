# Vérifie le modèle de brouillard : combien de matchs pour cerner un attribut, et si la fourchette dit vrai.
# Le scout juge tous les postes de la même façon : seul son niveau d'expérience (0 à 5) compte.
import random, math, statistics as st
K = 1.3          # largeur de la fourchette en écarts-types
FORME = 5        # forme du jour, commune à tout le match
def sigma(exp): return max(4, 12 - 1.5 * exp)
def run(exp, n, trials=6000):
    cov = 0; widths = []
    for _ in range(trials):
        vrai = random.randint(40, 90)
        tot = math.hypot(sigma(exp), FORME)
        ind = [vrai + random.gauss(0, FORME) + random.gauss(0, sigma(exp)) for _ in range(n)]
        c = st.mean(ind); h = min(30, K * tot / math.sqrt(n))
        cov += (c - h <= vrai <= c + h); widths.append(2 * h)
    return cov / trials, st.mean(widths)
random.seed(1)
print("expérience | matchs | fourchette moyenne | vraie valeur dedans")
for exp in (0, 3, 5):
    for n in (1, 3, 6):
        c, w = run(exp, n)
        print(f"{exp} | {n} | {w:.0f} pts | {c*100:.0f} %")
# matchs pour atteindre ±8 (solide) et ±5 (sûr)
for exp in range(6):
    tot = math.hypot(sigma(exp), FORME)
    print('expérience', exp, 'solide', math.ceil((K*tot/8)**2), 'sûr', math.ceil((K*tot/5)**2))
