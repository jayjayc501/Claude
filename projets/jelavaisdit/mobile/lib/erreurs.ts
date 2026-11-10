// Traduit les codes d'erreur renvoyés par la base (voir la migration SQL) en messages lisibles.
export type ErreurLisible = {
  message: string;
  moderation: boolean;
  dejaScelle: boolean;
};

export function lireErreur(brute?: string | null): ErreurLisible {
  const code = brute ?? '';
  if (code.includes('deja_scelle_aujourdhui')) {
    return { message: 'Tu as déjà scellé ta prédiction du jour.', moderation: false, dejaScelle: true };
  }
  if (code.includes('moderation:insulte')) {
    return {
      message: 'Ta phrase contient une insulte. Ici, on prédit, on ne clashe pas.',
      moderation: true,
      dejaScelle: false,
    };
  }
  if (code.includes('moderation:donnees_perso')) {
    return {
      message: 'Ta phrase contient un numéro ou une adresse e-mail. Garde les infos perso pour toi.',
      moderation: true,
      dejaScelle: false,
    };
  }
  if (code.includes('longueur_invalide')) {
    return { message: 'Ta phrase doit faire entre 3 et 200 caractères.', moderation: false, dejaScelle: false };
  }
  return {
    message: 'Oups, quelque chose a coincé. Vérifie ta connexion et réessaie.',
    moderation: false,
    dejaScelle: false,
  };
}
