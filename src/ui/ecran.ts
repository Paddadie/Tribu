// En-tête commun des écrans : flèche Retour (ou Annuler) et titre.

import { h, icone, type Enfant } from './dom';
import { lienRetour } from './navigation';

/** « Annuler » sur un écran de saisie, « Retour » ailleurs : nom lu de la flèche (`aria-label`). */
export type LibelleRetour = 'Retour' | 'Annuler';

/** Flèche en haut à gauche : revient en arrière (`lienRetour`), `defaut` faute d'historique. */
export function boutonRetour(defaut: string, libelle: LibelleRetour = 'Retour'): HTMLAnchorElement {
  return lienRetour(defaut, { class: 'bouton-icone', 'aria-label': libelle }, icone('retour', 26));
}

/** Barre du haut d'un écran : flèche, puis titre. */
export function barreEcran(defaut: string, titre: Enfant, libelle: LibelleRetour = 'Retour'): HTMLDivElement {
  return h('div', { class: 'barre' }, boutonRetour(defaut, libelle), h('h1', { class: 'titre-formulaire' }, titre));
}
