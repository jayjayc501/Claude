// Traduit les codes d'erreur renvoyés par la base (voir la migration SQL) en messages lisibles.
export type ErreurLisible = {
  message: string;
  moderation: boolean;
  dejaScelle: boolean;
  /** L'erreur porte sur le témoin (à qui, lien, signature) : on la montre près de ces champs. */
  temoin?: boolean;
};

export function lireErreur(brute?: string | null): ErreurLisible {
  const code = brute ?? '';
  if (code.includes('deja_scelle_aujourdhui')) {
    return { message: 'Tu as déjà scellé 20 certitudes aujourd\'hui. Pause, la suite demain !', moderation: false, dejaScelle: true };
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
      message: 'Ce que tu as écrit dans « à qui » contient un mot refusé, un numéro ou une adresse e-mail. Change-le.',
      moderation: false,
      dejaScelle: false,
      temoin: true,
    };
  }
  if (code.includes('temoin_invalide:texte')) {
    return { message: '« À qui » : 30 caractères au maximum, sans adresse web.', moderation: false, dejaScelle: false, temoin: true };
  }
  if (code.includes('temoin_invalide:signature')) {
    return { message: "La signature n'a pas pu être enregistrée. Efface et recommence.", moderation: false, dejaScelle: false, temoin: true };
  }
  if (code.includes('signature_trop_tard')) {
    return {
      message: 'Trop tard pour signer : la signature se fait sur place, dans les 15 minutes après le scellement.',
      moderation: false,
      dejaScelle: false,
      temoin: true,
    };
  }
  if (code.includes('signature_impossible')) {
    return { message: 'Cette certitude ne peut plus être signée.', moderation: false, dejaScelle: false, temoin: true };
  }
  if (code.includes('temoin_invalide')) {
    return { message: 'Ce lien n\'existe pas. Choisis une des cases.', moderation: false, dejaScelle: false, temoin: true };
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
