// Messages communs à l'import d'une sauvegarde (Réglages et écran d'accueil vide).

import type { BilanFusion } from '../modele/fusion';

export const pluriel = (n: number) => `${n} ${n > 1 ? 'personnes' : 'personne'}`;

/** « 3 personnes importées. » */
export const messageImport = (n: number) => `${pluriel(n)} importée${n > 1 ? 's' : ''}.`;

/** « Fusion faite : 2 personnes ajoutées, 1 déjà présente, 1 lien ignoré. » */
export function messageFusion(b: Pick<BilanFusion, 'ajoutees' | 'fusionnees' | 'ignores'>): string {
  const parties = [`${pluriel(b.ajoutees)} ajoutée${b.ajoutees > 1 ? 's' : ''}`, `${b.fusionnees} déjà présente${b.fusionnees > 1 ? 's' : ''}`];
  if (b.ignores > 0) parties.push(`${b.ignores} lien${b.ignores > 1 ? 's' : ''} ignoré${b.ignores > 1 ? 's' : ''}`);
  return `Fusion faite : ${parties.join(', ')}.`;
}
