// Messages communs à l'import d'une sauvegarde (Réglages et écran d'accueil vide).

export const pluriel = (n: number) => `${n} ${n > 1 ? 'personnes' : 'personne'}`;

/** « 3 personnes importées. » */
export const messageImport = (n: number) => `${pluriel(n)} importée${n > 1 ? 's' : ''}.`;
