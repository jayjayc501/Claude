// Pictogrammes des styles (24 × 24, couleur du texte) : bouclier (Rempart),
// aimant vertical (Récupérateur, il aimante le ballon), ballon (Technicien), éclair (Rapide).
export const PICTO = (corps: string) =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;
export const CORPS_PICTOS: Record<string, string> = {
  REM: '<path d="M12 2.8 L19.5 5.8 V11 C19.5 15.6 16.4 19.3 12 21.2 C7.6 19.3 4.5 15.6 4.5 11 V5.8 Z"/>',
  REC: '<g transform="translate(12 12) scale(0.92) translate(-12 -12)"><path d="M3.5 3.5 H9 V12 C9 13.66 10.34 15 12 15 C13.66 15 15 13.66 15 12 V3.5 H20.5 V12 C20.5 16.7 16.7 20.5 12 20.5 C7.3 20.5 3.5 16.7 3.5 12 Z" stroke-width="1.8"/><path d="M3.5 3.5 H9 V7.6 H3.5 Z M15 3.5 H20.5 V7.6 H15 Z" fill="currentColor" stroke-width="1.8"/></g>',
  TEC: '<circle cx="12" cy="12" r="9"/><path d="M12 8.4 L15.2 10.7 L14 14.4 H10 L8.8 10.7 Z" fill="currentColor"/><path d="M12 8.4 V3 M15.2 10.7 L20.6 9.2 M14 14.4 L17.3 19.1 M10 14.4 L6.7 19.1 M8.8 10.7 L3.4 9.2" stroke-width="1.6"/>',
  RAP: '<path d="M13.5 2.5 L5.5 13.5 H11.5 L10.5 21.5 L18.5 10.5 H12.5 Z" fill="currentColor" stroke-width="1.4"/>',
};
export const PICTOS: Record<string, string> = Object.fromEntries(Object.entries(CORPS_PICTOS).map(([k, c]) => [k, PICTO(c)]));
