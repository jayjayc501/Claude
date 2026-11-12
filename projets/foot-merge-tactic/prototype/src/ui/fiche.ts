// Fiche d'un joueur (12/11, demande du concepteur : « une fiche à la Clash Royale,
// un truc joli, avec le détail ») : en-tête aux couleurs du pays, buste, poste,
// style, puis les 4 notes et leurs 2 sous-notes en barres. Le gardien n'a pas
// encore de caractéristiques (elles viendront plus tard).

import { NOTES, notesDe } from "../sim/notes";
import type { Notes } from "../sim/types";
import { BUSTES } from "./bustes";
import { html } from "./dom";
import { PICTOS } from "./pictos";

export interface InfoFiche {
  id: string;
  nom: string;
  pays: { code: string; nom: string; couleur: string };
  poste: string;
  style: { code: string; nom: string } | null;
  notes: Partial<Notes> | null;
  fusions: number;
}

const POSTES: Record<string, string> = {
  G: "Gardien",
  DC: "Défenseur central",
  DG: "Latéral gauche",
  DD: "Latéral droit",
  MC: "Milieu",
  AG: "Ailier gauche",
  AD: "Ailier droit",
  AC: "Buteur",
};
const ABREGE: Record<string, string> = { AC: "BU" };

/** Couleur et pictogramme (24 × 24, trait blanc) de chaque note. */
const STYLE_NOTE: Record<string, { couleur: string; icone: string }> = {
  VIT: { couleur: "#F07F1A", icone: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>' },
  TEC: { couleur: "#2F7FE0", icone: '<path d="M6 4h5l1 6 6 2.2a3 3 0 0 1 2 2.8V17H6z"/><path d="M6 17v2.5M10 17v2.5M14 17v2.5M18 17v2.5"/>' },
  TIR: { couleur: "#E0474C", icone: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="#fff"/>' },
  PHY: { couleur: "#23A06A", icone: '<path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11"/>' },
};
const SOUS: Record<keyof Notes, string> = {
  acceleration: "Accélération",
  pointe: "Pointe",
  passe: "Passe",
  dribble: "Dribble",
  precision: "Précision",
  puissance: "Puissance",
  duel: "Duel",
  endurance: "Endurance",
};
const AURA = ["", "#5EC8FF", "#FFC400", "#C04BFF"];

/** Palier de couleur d'une note : élite (80+, violet), bon (70+, vert), moyen (60+, jaune), faible (rouge). */
function palier(v: number): string {
  return v >= 80 ? "elite" : v >= 70 ? "bon" : v >= 60 ? "moyen" : "faible";
}

function icone(corps: string): string {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;
}

/** Ouvre la fiche par-dessus l'écran ; elle se ferme d'un toucher à côté, sur ✕ ou avec Échap. */
export function ouvrirFiche(info: InfoFiche): void {
  document.querySelector(".fiche-voile")?.remove();
  const voile = html("div", { class: "fiche-voile", role: "dialog", "aria-modal": "true", "aria-label": `Fiche de ${info.nom}` }, document.body);
  const carte = html("div", { class: "fiche" }, voile);
  carte.style.setProperty("--pays", info.pays.couleur);

  // En-tête aux couleurs du pays.
  const tete = html("div", { class: "fiche-tete" }, carte);
  html("span", { class: "fiche-filigrane", "aria-hidden": "true" }, tete, info.pays.code);
  html("span", { class: "fiche-pays" }, tete, info.pays.nom);
  html("h2", { class: "fiche-nom" }, tete, info.nom);
  const puces = html("div", { class: "fiche-puces" }, tete);
  html("span", { class: "fiche-puce" }, puces, `${ABREGE[info.poste] ?? info.poste} · ${POSTES[info.poste] ?? info.poste}`);
  if (info.style) {
    const s = html("span", { class: "fiche-puce" }, puces);
    s.innerHTML = PICTOS[info.style.code] ?? "";
    s.append(info.style.nom);
  } else html("span", { class: "fiche-puce terne" }, puces, "Sans style");
  if (info.fusions > 0) {
    const f = html("span", { class: "fiche-puce fusion" }, puces, `Fusion ${info.fusions}`);
    f.style.setProperty("--aura", AURA[Math.min(3, info.fusions)] ?? AURA[3]!);
  }

  // Buste sur son socle, qui déborde de l'en-tête.
  const buste = html("div", { class: "fiche-buste" }, carte);
  html("span", { class: "fiche-socle" }, buste);
  const img = html("img", { src: BUSTES[info.id] ?? "", alt: "", draggable: "false" }, buste);
  if (info.fusions > 0) img.style.filter = `drop-shadow(0 0 6px ${AURA[Math.min(3, info.fusions)]}) drop-shadow(0 0 2px ${AURA[Math.min(3, info.fusions)]})`;

  const fermer = html("button", { type: "button", class: "fiche-fermer", "aria-label": "Fermer" }, carte, "✕");

  // Les 4 notes et leurs sous-notes.
  const corps = html("div", { class: "fiche-corps" }, carte);
  if (info.poste === "G" || !info.notes) {
    const v = html("div", { class: "fiche-vide" }, corps);
    html("strong", {}, v, info.poste === "G" ? "Caractéristiques du gardien" : "Pas encore de notes");
    html("span", {}, v, info.poste === "G" ? "Ses 4 notes arrivent bientôt." : "Ce joueur n'a pas encore été noté.");
  } else {
    const n = notesDe({ id: info.id, nom: info.nom, postes: [info.poste], notes: info.notes });
    NOTES.forEach(({ code, nom, sous }, i) => {
      const st = STYLE_NOTE[code]!;
      const valeur = Math.round((n[sous[0]] + n[sous[1]]) / 2);
      const ligne = html("div", { class: "fiche-note" }, corps);
      ligne.style.setProperty("--note", st.couleur);
      ligne.style.setProperty("--i", String(i));
      const ic = html("span", { class: "fiche-icone" }, ligne);
      ic.innerHTML = icone(st.icone);
      const milieu = html("div", { class: "fiche-detail" }, ligne);
      html("span", { class: "fiche-libelle" }, milieu, nom);
      for (const cle of sous) {
        const l = html("div", { class: "fiche-sous" }, milieu);
        html("span", { class: "fiche-sous-nom" }, l, SOUS[cle]);
        const barre = html("span", { class: "fiche-barre" }, l);
        const plein = html("i", {}, barre);
        plein.style.width = `${Math.max(4, Math.min(100, n[cle]))}%`;
        html("span", { class: "fiche-sous-valeur" }, l, String(n[cle]));
      }
      html("span", { class: `fiche-valeur ${palier(valeur)}`, "aria-label": `${nom} ${valeur}` }, ligne, String(valeur));
    });
  }

  const clavier = (e: KeyboardEvent) => {
    if (e.key === "Escape") fermerFiche();
  };
  function fermerFiche(): void {
    document.removeEventListener("keydown", clavier);
    voile.classList.add("sortie");
    window.setTimeout(() => voile.remove(), 160);
  }
  document.addEventListener("keydown", clavier);
  fermer.addEventListener("click", fermerFiche);
  voile.addEventListener("click", (e) => {
    if (e.target === voile) fermerFiche();
  });
  fermer.focus({ preventScroll: true });
}
