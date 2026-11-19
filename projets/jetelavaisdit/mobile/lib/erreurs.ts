// Traduit les codes d'erreur renvoyés par la base (voir la migration SQL) en messages lisibles.
export type ErreurLisible = {
  message: string;
  moderation: boolean;
  dejaScelle: boolean;
  /** L'erreur porte sur le témoin (prénom, lien) : on la montre sous ces champs. */
  temoin?: boolean;
};

export function lireErreur(brute?: string | null): ErreurLisible {
  const code = brute ?? '';
  if (code.includes('deja_scelle_aujourdhui')) {
    return { message: 'Tu as déjà scellé ta certitude du jour.', moderation: false, dejaScelle: true };
  }
  if (code.includes('moderation:insulte')) {
    return {
      message: 'Ta phrase contient une insulte. Ici, on a des certitudes, pas des clashs.',
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
  if (code.includes('moderation:temoin')) {
    return {
      message: 'Le prénom ou votre lien contient un mot refusé (ou un numéro, une adresse e-mail). Change-le.',
      moderation: false,
      dejaScelle: false,
      temoin: true,
    };
  }
  if (code.includes('temoin_invalide:prenom')) {
    return {
      message: 'Le prénom ne peut contenir que des lettres, des espaces, des tirets et des apostrophes (20 au maximum).',
      moderation: false,
      dejaScelle: false,
      temoin: true,
    };
  }
  if (code.includes('temoin_invalide')) {
    return { message: 'Votre lien fait 30 caractères au maximum, sans adresse web.', moderation: false, dejaScelle: false, temoin: true };
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
