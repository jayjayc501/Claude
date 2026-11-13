"""Catalogue des 60 cartes (13/11) : 5 pays × 12 joueurs fictifs.

VALIDÉ : 5 pays (France, Espagne, Brésil, Argentine, Italie), 12 joueurs par pays
(1 G, 2 DC, 1 DG, 1 DD, 3 MC, 1 AG, 1 AD, 2 BU) ; dans chaque pays, un joueur de
chaque style (4 sur 12), jamais le gardien ; un même style n'est pas au même poste
d'un pays à l'autre. PROPOSITION : prix (3 cartes à 1 pièce, 4 à 2, 2 à 3, 2 à 4,
1 star à 5 par pays), copies dans la réserve (10, 8, 6, 4, 3), notes tirées du
prix, du poste, du style et d'une légère couleur nationale. Gardiens sans notes.

Lancer : python3 scripts/generer-cartes.py  → src/data/cartes.json
"""
import json, random
from pathlib import Path

PAYS = {
    "FRA": ("France", "#1F3A93"), "ESP": ("Espagne", "#B85600"), "BRA": ("Brésil", "#17773F"),
    "ARG": ("Argentine", "#5BA4D9"), "ITA": ("Italie", "#0B7FA8"),
}
# (nom, poste, style, prix) ; AC = buteur (BU).
JOUEURS = {
    "FRA": [("Ollivier", "G", None, 3), ("Garnier", "DC", None, 2), ("Lebrun", "DC", None, 1), ("Delmas", "DG", "TEC", 3),
            ("Marchal", "DD", "REM", 2), ("Ferrand", "MC", None, 4), ("Tessier", "MC", None, 2), ("Brissac", "MC", None, 1),
            ("Mercier", "AG", "RAP", 5), ("Bonnaud", "AD", None, 1), ("Roux", "AC", "REC", 4), ("Perrot", "AC", None, 2)],
    "ESP": [("Ibarra", "G", None, 2), ("Otero", "DC", None, 3), ("Medina", "DC", None, 1), ("Castell", "DG", "REM", 2),
            ("Prieto", "DD", None, 1), ("Arnau", "MC", "TEC", 5), ("Salvat", "MC", None, 4), ("Almar", "MC", None, 2),
            ("Cuesta", "AG", None, 2), ("Robles", "AD", "REC", 3), ("Sanz", "AC", "RAP", 4), ("Galdós", "AC", None, 1)],
    "BRA": [("Caldeira", "G", None, 1), ("Teodoro", "DC", "REC", 3), ("Mattos", "DC", None, 1), ("Valadares", "DG", None, 2),
            ("Brandão", "DD", "RAP", 4), ("Barreto", "MC", "REM", 3), ("Rezende", "MC", None, 2), ("Peixoto", "MC", None, 1),
            ("Lima", "AG", None, 4), ("Amaral", "AD", None, 2), ("Lobo", "AC", "TEC", 5), ("Souto", "AC", None, 2)],
    "ARG": [("Ledesma", "G", None, 2), ("Ferreyra", "DC", None, 3), ("Godoy", "DC", None, 1), ("Quiroga", "DG", "RAP", 3),
            ("Benítez", "DD", None, 1), ("Arrieta", "MC", "REC", 5), ("Bustos", "MC", None, 2), ("Villalba", "MC", None, 1),
            ("Lucero", "AG", "TEC", 4), ("Sosa", "AD", "REM", 2), ("Funes", "AC", None, 4), ("Acosta", "AC", None, 2)],
    "ITA": [("Ferraro", "G", None, 4), ("Monti", "DC", "TEC", 3), ("Vitale", "DC", "REM", 5), ("Bonetti", "DG", None, 1),
            ("Conti", "DD", "REC", 2), ("Vianello", "MC", None, 2), ("Galli", "MC", None, 2), ("Rinaldi", "MC", None, 2),
            ("Serra", "AG", None, 1), ("Fabbri", "AD", "RAP", 4), ("Lombardi", "AC", None, 3), ("Moretti", "AC", None, 1)],
}
COPIES = {1: 10, 2: 8, 3: 6, 4: 4, 5: 3}
NIVEAU = {1: 58, 2: 64, 3: 70, 4: 75, 5: 81}  # note moyenne visée selon le prix
CLES = ["acceleration", "pointe", "passe", "dribble", "precision", "puissance", "duel", "endurance"]
PROFIL = {  # écart à la note moyenne, par poste
    "DC": [-4, -1, -3, -8, -14, -2, 12, 2], "DG": [4, 4, 0, -1, -10, -4, 4, 6], "DD": [4, 4, 0, -1, -10, -4, 4, 6],
    "MC": [-1, -3, 8, 4, 0, -1, 1, 6], "AG": [8, 7, -1, 7, -1, -5, -10, 0], "AD": [8, 7, -1, 7, -1, -5, -10, 0],
    "AC": [2, 2, -6, 2, 12, 8, -2, -4],
}
STYLE = {  # accent du style
    "RAP": [6, 6, 0, 0, 0, 0, -2, 0], "TEC": [0, 0, 5, 6, 0, 0, -3, 0],
    "REM": [-2, 0, 0, -3, 0, 0, 7, 0], "REC": [0, 0, -1, 0, 0, 0, 4, 6],
}
NATION = {  # légère couleur nationale, sans caricature
    "FRA": [2, 2, 0, 0, 0, 0, 0, 0], "ESP": [0, 0, 3, 1, 0, 0, 0, 0], "BRA": [0, 0, 0, 3, 1, 0, 0, 0],
    "ARG": [0, 0, 0, 2, 0, 0, 2, 0], "ITA": [0, 0, 0, 0, 0, 0, 3, 0],
}

def main():
    rng = random.Random(1311)
    cartes = []
    for code, joueurs in JOUEURS.items():
        for nom, poste, style, prix in joueurs:
            notes = None
            if poste != "G":
                base = NIVEAU[prix] + rng.randint(-1, 1)
                ecarts = [p + s + n for p, s, n in zip(PROFIL[poste], STYLE.get(style, [0] * 8), NATION[code])]
                # recentrer : la moyenne des sous-notes reste proche du niveau du prix
                m = sum(ecarts) / 8
                notes = {k: max(35, min(95, round(base + e - m + rng.randint(-2, 2)))) for k, e in zip(CLES, ecarts)}
            ident = f"{code}-{nom.upper().replace('Ã', 'A').replace('Ó', 'O').replace('Í', 'I')}"
            cartes.append({"id": ident, "nom": nom, "pays": code, "poste": poste, "style": style, "prix": prix,
                           "copies": COPIES[prix], "notes": notes})
    sortie = {
        "_note": "Catalogue de 60 cartes (13/11), généré par scripts/generer-cartes.py. 5 pays × 12 joueurs (VALIDÉ) ; prix, copies et notes : PROPOSITION. Gardiens sans notes pour l'instant.",
        "pays": {c: {"nom": n, "couleur": col} for c, (n, col) in PAYS.items()},
        "copiesParPrix": COPIES,
        "cartes": cartes,
    }
    chemin = Path(__file__).resolve().parent.parent / "src" / "data" / "cartes.json"
    chemin.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    # contrôles
    from collections import Counter
    for code in JOUEURS:
        cs = [c for c in cartes if c["pays"] == code]
        assert Counter(c["poste"] for c in cs) == Counter({"G": 1, "DC": 2, "DG": 1, "DD": 1, "MC": 3, "AG": 1, "AD": 1, "AC": 2}), code
        assert sorted(c["style"] for c in cs if c["style"]) == ["RAP", "REC", "REM", "TEC"], code
        assert Counter(c["prix"] for c in cs) == Counter({1: 3, 2: 4, 3: 2, 4: 2, 5: 1}), code
        assert all(c["poste"] != "G" for c in cs if c["style"])
    # Chaque poste a au moins une carte à 1 pièce : on peut toujours finir son équipe.
    for poste in ["G", "DC", "DG", "DD", "MC", "AG", "AD", "AC"]:
        assert any(c["prix"] == 1 for c in cartes if c["poste"] == poste), poste
    for s in ["RAP", "REC", "REM", "TEC"]:
        postes = [c["poste"] for c in cartes if c["style"] == s]
        assert len(set(postes)) == 5, (s, postes)
    print(f"{len(cartes)} cartes → {chemin}")
    for c in cartes:
        n = c["notes"]
        moy = "" if not n else " ".join(f"{(n[a] + n[b]) // 2:>2}" for a, b in [("acceleration", "pointe"), ("passe", "dribble"), ("precision", "puissance"), ("duel", "endurance")])
        print(f"{c['pays']} {c['nom']:<10} {c['poste']:<2} {c['style'] or '—':<3} {c['prix']} {moy}")

main()
