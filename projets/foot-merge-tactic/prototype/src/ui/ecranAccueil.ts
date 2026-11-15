// Premier écran (15/11, concepteur : « il fallait qu'on choisisse si on faisait un
// match de poule ou un lien pour faire un match 1 contre 1 pour tester ; sur le
// premier écran, propose quelque chose ») : choix du mode de jeu. On y revient par
// le bouton ⌂ de la préparation, pour changer de mode.
//
// Le 1 contre 1 en ligne est en construction : le match sera calculé sur un serveur
// (Supabase) et le jeu publié sur un site public (dépôt FootMergTactic).

import { html } from "./dom";

export interface ActionsAccueil {
  championnat(): void;
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
    const t = html("div", { class: "accueil-carte-titre" }, duel, "🤝 1 contre 1 avec un ami");
    html("span", { class: "accueil-badge" }, t, "Bientôt");
    html("p", { class: "accueil-carte-texte" }, duel, "Crée une partie et envoie le lien sur WhatsApp. Chacun fait son équipe en 10 minutes, puis vous regardez le même match en même temps.");
    const l = html("div", { class: "accueil-ligne" }, duel);
    html("button", { type: "button", class: "accueil-bouton", disabled: true }, l, "Créer une partie");
    html("button", { type: "button", class: "accueil-bouton secondaire", disabled: true }, l, "Rejoindre");
    html("p", { class: "accueil-note" }, duel, "En construction : le match sera calculé sur un serveur et le jeu aura sa propre adresse.");
  }
}
