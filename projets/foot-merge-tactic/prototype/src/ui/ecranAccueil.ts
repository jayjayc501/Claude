// Premier écran (15/11, concepteur : « il fallait qu'on choisisse si on faisait un
// match de poule ou un lien pour faire un match 1 contre 1 pour tester ; sur le
// premier écran, propose quelque chose ») : choix du mode de jeu. On y revient par
// le bouton ⌂ de la préparation, pour changer de mode.
//
// 1 contre 1 en ligne (15/11) : « Créer une partie » donne un lien à envoyer ;
// « Rejoindre » accepte le lien ou le code reçu (l'ami peut aussi ouvrir le lien).

import { html } from "./dom";

export interface ActionsAccueil {
  championnat(): void;
  creer(): void;
  /** Lien ou code de la partie reçue. */
  rejoindre(lienOuCode: string): void;
}

export class EcranAccueil {
  readonly racine: HTMLElement;

  constructor(actions: ActionsAccueil) {
    const r = html("section", { class: "accueil" });
    this.racine = r;
    const tete = html("header", { class: "accueil-tete" }, r);
    html("div", { class: "accueil-ballon", "aria-hidden": "true" }, tete, "⚽");
    html("h1", { class: "accueil-titre" }, tete, "Foot Merge Tactic");
    html("p", { class: "accueil-sous" }, tete, "Choisis ton mode de jeu");

    const champ = html("div", { class: "accueil-carte" }, r);
    html("div", { class: "accueil-carte-titre" }, champ, "🏆 Championnat");
    html("p", { class: "accueil-carte-texte" }, champ, "Toi contre 3 ordinateurs, 3 journées. Draft, mercato et fusions entre les matchs.");
    const b1 = html("button", { type: "button", class: "accueil-bouton" }, champ, "Jouer ▶");
    b1.addEventListener("click", () => actions.championnat());

    const duel = html("div", { class: "accueil-carte duel" }, r);
    html("div", { class: "accueil-carte-titre" }, duel, "🤝 1 contre 1 avec un ami");
    html("p", { class: "accueil-carte-texte" }, duel, "Crée une partie et envoie le lien sur WhatsApp. Chacun fait son équipe en 10 minutes, puis vous regardez le même match en même temps.");
    const l = html("div", { class: "accueil-ligne" }, duel);
    const creer = html("button", { type: "button", class: "accueil-bouton" }, l, "Créer une partie");
    creer.addEventListener("click", () => actions.creer());
    const rej = html("button", { type: "button", class: "accueil-bouton secondaire" }, l, "Rejoindre");
    // Rejoindre : coller le lien ou taper le code reçu.
    const zone = html("form", { class: "accueil-rejoindre", hidden: true }, duel);
    const saisie = html("input", { type: "text", class: "accueil-champ", placeholder: "Lien ou code de la partie", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Lien ou code de la partie" }, zone);
    html("button", { type: "submit", class: "accueil-bouton petit" }, zone, "OK");
    rej.addEventListener("click", () => {
      zone.hidden = false;
      saisie.focus();
    });
    zone.addEventListener("submit", (e) => {
      e.preventDefault();
      if (saisie.value.trim()) actions.rejoindre(saisie.value.trim());
    });
  }
}
