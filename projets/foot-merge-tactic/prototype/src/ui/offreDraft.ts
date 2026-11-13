// Draft (13/11) : quand on touche une case vide, quelques joueurs du poste,
// tirés au hasard, s'affichent en cartes. On en choisit un, puis « Recruter ».
// Une carte trop chère reste visible mais grisée.

import { html } from "./dom";
import { PICTOS } from "./pictos";

export interface CarteOffre {
  id: string;
  nom: string;
  pays: { code: string; nom: string; couleur: string };
  poste: string;
  style: { code: string; nom: string } | null;
  prix: number;
  /** Les 4 notes (VIT, TEC, TIR, PHY), ou null (gardien). */
  notes: { code: string; valeur: number }[] | null;
  image: string;
  abordable: boolean;
  /** Copies encore dans la réserve commune. */
  copies: number;
}

const COULEUR_NOTE: Record<string, string> = { VIT: "#F07F1A", TEC: "#2F7FE0", TIR: "#E0474C", PHY: "#23A06A" };

export function ouvrirOffre(o: {
  titre: string;
  sousTitre: string;
  cartes: CarteOffre[];
  choisir: (id: string) => void;
  voirFiche: (id: string) => void;
}): void {
  document.querySelector(".offre-voile")?.remove();
  const voile = html("div", { class: "offre-voile", role: "dialog", "aria-modal": "true", "aria-label": o.titre }, document.body);
  const panneau = html("div", { class: "offre" }, voile);
  const tete = html("div", { class: "offre-tete" }, panneau);
  const t = html("div", {}, tete);
  html("h2", { class: "offre-titre" }, t, o.titre);
  html("span", { class: "offre-sous" }, t, o.sousTitre);
  const fermer = html("button", { type: "button", class: "offre-fermer", "aria-label": "Fermer" }, tete, "✕");

  let choisie: string | null = null;
  const grille = html("div", { class: "offre-grille" }, panneau);
  const boutons: HTMLButtonElement[] = [];
  o.cartes.forEach((c, i) => {
    const b = html("button", { type: "button", class: `offre-carte${c.abordable ? "" : " cher"}`, "aria-label": `${c.nom}, ${c.pays.nom}, ${c.prix} pièces${c.abordable ? "" : ", trop cher"}` }, grille);
    b.style.setProperty("--pays", c.pays.couleur);
    b.style.setProperty("--i", String(i));
    const haut = html("span", { class: "offre-haut" }, b);
    html("span", { class: "offre-drapeau" }, haut, c.pays.code);
    const prix = html("span", { class: "offre-prix" }, haut, String(c.prix));
    prix.prepend(html("i", { "aria-hidden": "true" }));
    html("img", { src: c.image, alt: "", draggable: "false" }, haut);
    if (!c.abordable) html("span", { class: "offre-ruban" }, haut, "Trop cher");
    html("span", { class: "offre-nom" }, b, c.nom);
    const ligne = html("span", { class: "offre-ligne" }, b);
    if (c.style) {
      const s = html("span", { class: "offre-style" }, ligne);
      s.innerHTML = PICTOS[c.style.code] ?? "";
      s.append(c.style.nom);
    } else html("span", { class: "offre-style terne" }, ligne, "Sans style");
    html("span", { class: "offre-copies", title: "Copies restantes dans la réserve" }, ligne, `×${c.copies}`);
    const notes = html("span", { class: "offre-notes" }, b);
    if (c.notes)
      for (const n of c.notes) {
        const p = html("span", { class: "offre-note" }, notes);
        p.style.setProperty("--note", COULEUR_NOTE[n.code] ?? "#5D6B62");
        html("small", {}, p, n.code);
        p.append(String(n.valeur));
      }
    else html("span", { class: "offre-note-vide" }, notes, "Notes du gardien à venir");
    b.addEventListener("click", () => {
      choisie = c.id;
      boutons.forEach((x, j) => x.classList.toggle("choisie", j === i));
      maj();
    });
    boutons.push(b);
  });

  const pied = html("div", { class: "offre-pied" }, panneau);
  const fiche = html("button", { type: "button", class: "offre-lien" }, pied, "Voir la fiche");
  const ok = html("button", { type: "button", class: "offre-ok" }, pied, "Choisis un joueur");
  function maj(): void {
    const c = o.cartes.find((x) => x.id === choisie);
    fiche.disabled = !c;
    ok.disabled = !c || !c.abordable;
    ok.replaceChildren(c ? (c.abordable ? `Recruter ${c.nom} · ${c.prix}` : "Trop cher pour ton budget") : "Choisis un joueur");
    if (c?.abordable) ok.append(html("i", { class: "offre-piece", "aria-hidden": "true" }));
  }
  maj();

  function fermerOffre(): void {
    document.removeEventListener("keydown", clavier);
    voile.classList.add("sortie");
    window.setTimeout(() => voile.remove(), 160);
  }
  const clavier = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !document.querySelector(".fiche-voile")) fermerOffre();
  };
  document.addEventListener("keydown", clavier);
  fermer.addEventListener("click", fermerOffre);
  voile.addEventListener("click", (e) => {
    if (e.target === voile) fermerOffre();
  });
  fiche.addEventListener("click", () => choisie && o.voirFiche(choisie));
  ok.addEventListener("click", () => {
    if (!choisie) return;
    const id = choisie;
    fermerOffre();
    o.choisir(id);
  });
}
