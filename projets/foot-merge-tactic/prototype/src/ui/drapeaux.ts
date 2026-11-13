// Petits drapeaux des pays (13/11, demande du concepteur : « un petit drapeau du
// pays sur la fiche ou le maillot »). Dessinés en SVG, sans image.

const CORPS: Record<string, string> = {
  FRA: '<rect width="9" height="6" fill="#EF4135"/><rect width="6" height="6" fill="#fff"/><rect width="3" height="6" fill="#0055A4"/>',
  ITA: '<rect width="9" height="6" fill="#CE2B37"/><rect width="6" height="6" fill="#fff"/><rect width="3" height="6" fill="#009246"/>',
  ESP: '<rect width="9" height="6" fill="#C60B1E"/><rect y="1.5" width="9" height="3" fill="#FFC400"/>',
  ARG: '<rect width="9" height="6" fill="#74ACDF"/><rect y="2" width="9" height="2" fill="#fff"/><circle cx="4.5" cy="3" r="0.7" fill="#F6B40E"/>',
  BRA: '<rect width="9" height="6" fill="#009C3B"/><path d="M4.5 0.7 L8.2 3 L4.5 5.3 L0.8 3 Z" fill="#FFDF00"/><circle cx="4.5" cy="3" r="1.25" fill="#002776"/>',
};

/** Drapeau du pays en SVG (largeur en pixels ; proportions 3:2), ou chaîne vide. */
export function drapeau(code: string, largeur = 18): string {
  const c = CORPS[code];
  if (!c) return "";
  return `<svg class="drapeau" width="${largeur}" height="${(largeur * 2) / 3}" viewBox="0 0 9 6" aria-hidden="true"><clipPath id="d-${code}"><rect width="9" height="6" rx="0.9"/></clipPath><g clip-path="url(#d-${code})">${c}</g><rect x="0.15" y="0.15" width="8.7" height="5.7" rx="0.8" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="0.3"/></svg>`;
}
