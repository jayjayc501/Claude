// Écran d'attente du 1 contre 1 (15/11) : lien à envoyer à l'ami (WhatsApp,
// copier, partager), puis les moments où l'on attend le serveur ou l'ami.

import { html } from "./dom";

export interface ContenuSalon {
  titre: string;
  texte?: string;
  /** Lien de la partie : boutons WhatsApp, copier, partager. */
  lien?: string;
  /** Ligne d'attente, avec un petit ballon qui tourne. */
  attente?: string;
  erreur?: boolean;
  boutons?: { texte: string; action: () => void; secondaire?: boolean }[];
}

export class EcranSalon {
  readonly racine = html("section", { class: "accueil salon" });
  private ligneAttente: HTMLElement | null = null;

  montrer(c: ContenuSalon): void {
    const r = this.racine;
    r.replaceChildren();
    const tete = html("header", { class: "accueil-tete" }, r);
    html("div", { class: "accueil-ballon", "aria-hidden": "true" }, tete, c.erreur ? "⚠️" : "🤝");
    html("h1", { class: "accueil-titre salon-titre" }, tete, c.titre);
    const carte = html("div", { class: "accueil-carte" }, r);
    if (c.texte) html("p", { class: `accueil-carte-texte${c.erreur ? " salon-erreur" : ""}` }, carte, c.texte);
    if (c.lien) this.rendreLien(carte, c.lien);
    this.ligneAttente = null;
    if (c.attente) {
      const l = html("p", { class: "salon-attente", role: "status", "aria-live": "polite" }, carte);
      html("span", { class: "salon-tourne", "aria-hidden": "true" }, l, "⚽");
      this.ligneAttente = html("span", {}, l, c.attente);
    }
    for (const b of c.boutons ?? []) {
      const e = html("button", { type: "button", class: `accueil-bouton${b.secondaire ? " secondaire" : ""}` }, carte, b.texte);
      e.addEventListener("click", b.action);
    }
  }

  /** Change seulement la ligne d'attente (chrono), sans redessiner. */
  majAttente(texte: string): void {
    if (this.ligneAttente && this.ligneAttente.textContent !== texte) this.ligneAttente.textContent = texte;
  }

  private rendreLien(parent: HTMLElement, lien: string): void {
    const boite = html("div", { class: "salon-lien" }, parent);
    html("span", { class: "salon-lien-texte" }, boite, lien);
    const message = `Viens jouer contre moi à Foot Merge Tactic (1 contre 1, sans compte) : ${lien}`;
    const wa = html("a", { class: "accueil-bouton salon-whatsapp", href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: "_blank", rel: "noopener" }, parent, "Envoyer sur WhatsApp");
    wa.setAttribute("role", "button");
    const l = html("div", { class: "accueil-ligne" }, parent);
    const copier = html("button", { type: "button", class: "accueil-bouton secondaire" }, l, "Copier le lien");
    copier.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lien);
        copier.textContent = "Lien copié ✓";
      } catch {
        // presse-papiers refusé : on sélectionne le lien pour le copier à la main
        const sel = getSelection();
        const range = document.createRange();
        range.selectNodeContents(boite);
        sel?.removeAllRanges();
        sel?.addRange(range);
        copier.textContent = "Lien sélectionné";
      }
    });
    if (typeof navigator.share === "function") {
      const partager = html("button", { type: "button", class: "accueil-bouton secondaire" }, l, "Partager…");
      partager.addEventListener("click", () => navigator.share({ title: "Foot Merge Tactic", text: message }).catch(() => {}));
    }
  }
}
