// Petites aides pour créer des éléments HTML et SVG.

const NS = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number | boolean | undefined>;

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== false) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

export function html<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
  texte?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") e.className = String(v);
    else e.setAttribute(k, String(v));
  }
  if (texte !== undefined) e.textContent = texte;
  parent?.appendChild(e);
  return e;
}

export function initiales(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

/** Dessine les lignes d'un terrain. `X` et `Y` convertissent des mètres
 *  (repère de l'équipe du bas : y = 0 sur sa ligne de but) en unités SVG. */
export function dessinerLignes(
  g: SVGGElement,
  X: (m: number) => number,
  Y: (m: number) => number,
  moitieSeulement: boolean,
): void {
  const L = 105;
  const W = 68;
  const yHaut = moitieSeulement ? L / 2 : L;
  svg("rect", { x: X(0), y: Y(yHaut), width: X(W) - X(0), height: Y(0) - Y(yHaut), class: "pelouse" }, g);
  const lignes = svg("g", { class: "lignes" }, g);
  svg("rect", { x: X(0), y: Y(yHaut), width: X(W) - X(0), height: Y(0) - Y(yHaut) }, lignes);
  const surface = (versLeHaut: boolean) => {
    const y0 = versLeHaut ? L : 0;
    const s = versLeHaut ? -1 : 1;
    const yA = Math.min(Y(y0), Y(y0 + s * 16.5));
    svg("rect", { x: X(13.84), y: yA, width: X(54.16) - X(13.84), height: Math.abs(Y(y0 + s * 16.5) - Y(y0)) }, lignes);
    const yB = Math.min(Y(y0), Y(y0 + s * 5.5));
    svg("rect", { x: X(24.84), y: yB, width: X(43.16) - X(24.84), height: Math.abs(Y(y0 + s * 5.5) - Y(y0)) }, lignes);
    svg("circle", { cx: X(34), cy: Y(y0 + s * 11), r: 1.2, class: "point" }, lignes);
    const yBut = versLeHaut ? Y(L) - 6 : Y(0);
    svg("rect", { x: X(30.34), y: yBut, width: X(37.66) - X(30.34), height: 6, class: "but" }, lignes);
    // 14/11 : arc de la surface (9,15 m autour du point de penalty, hors de la surface).
    const rx = X(9.15) - X(0);
    const ry = Math.abs(Y(9.15) - Y(0));
    const dx = Math.sqrt(9.15 * 9.15 - 5.5 * 5.5);
    const yArc = Y(y0 + s * 16.5);
    svg("path", { d: `M ${X(34 - dx)} ${yArc} A ${rx} ${ry} 0 0 ${versLeHaut ? 0 : 1} ${X(34 + dx)} ${yArc}`, class: "arc" }, lignes);
    // Arcs de coin (1 m).
    const rc = X(1) - X(0);
    for (const [xc, sens] of [[0, 1], [W, -1]] as const) {
      const yc = Y(y0);
      svg("path", { d: `M ${X(xc + sens)} ${yc} A ${rc} ${rc} 0 0 ${(sens > 0) !== versLeHaut ? 0 : 1} ${X(xc)} ${yc - s * rc}`, class: "arc" }, lignes);
    }
  };
  surface(false);
  if (!moitieSeulement) {
    surface(true);
    svg("line", { x1: X(0), y1: Y(L / 2), x2: X(W), y2: Y(L / 2) }, lignes);
    svg("ellipse", { cx: X(34), cy: Y(L / 2), rx: X(9.15) - X(0), ry: Math.abs(Y(9.15) - Y(0)) }, lignes);
    svg("circle", { cx: X(34), cy: Y(L / 2), r: 1.2, class: "point" }, lignes);
  } else {
    const rx = X(9.15) - X(0);
    const ry = Math.abs(Y(9.15) - Y(0));
    const cx = X(34);
    const cy = Y(L / 2);
    svg("path", { d: `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}` }, lignes);
  }
}
