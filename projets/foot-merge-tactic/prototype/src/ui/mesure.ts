// Outils de mesure de la fluidité (17/11, prompt A2), activés seulement par
// l'adresse de la page :
//   ?ips=1     compteur d'images par seconde en haut à droite ; window.__ips
//              garde les chiffres (images, images lentes, i/s de chaque seconde) ;
//   ?fusions=N à l'écran du match, les N premiers joueurs de chaque équipe sont
//              affichés fusionnés au niveau 3 (affichage seulement : le match ne
//              change pas), pour mesurer ce que coûtent les effets de fusion.
// Sans paramètre, rien ne change.

const PARAMS = (() => {
  try {
    return new URLSearchParams(location.search);
  } catch {
    return new URLSearchParams();
  }
})();

/** Nombre de joueurs de chaque équipe affichés au niveau de fusion 3 (0 : les vrais niveaux). */
export const FUSIONS_FORCEES = Math.max(0, Math.min(11, Math.floor(Number(PARAMS.get("fusions")) || 0)));

/** Chiffres du compteur, lus par les scripts de mesure. */
export interface MesureIps {
  images: number;
  /** Images de plus de 20 ms (moins de 50 i/s). */
  lentes: number;
  /** Images par seconde, seconde après seconde. */
  secondes: number[];
}

/** Lance le compteur d'images par seconde si l'adresse contient ?ips=1. */
export function lancerCompteurIps(): void {
  if (PARAMS.get("ips") !== "1") return;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;top:4px;right:4px;z-index:9999;font:600 12px ui-monospace,monospace;background:rgba(0,0,0,.72);color:#fff;padding:2px 6px;border-radius:6px;pointer-events:none";
  el.textContent = "… i/s";
  document.body.append(el);
  const m: MesureIps = { images: 0, lentes: 0, secondes: [] };
  (window as unknown as { __ips: MesureIps }).__ips = m;
  let debut = performance.now();
  let avant = debut;
  let n = 0;
  const tour = (t: number) => {
    n++;
    m.images++;
    if (t - avant > 20) m.lentes++;
    avant = t;
    if (t - debut >= 1000) {
      const ips = Math.round((n * 1000) / (t - debut));
      m.secondes.push(ips);
      el.textContent = `${ips} i/s`;
      n = 0;
      debut = t;
    }
    requestAnimationFrame(tour);
  };
  requestAnimationFrame(tour);
}
