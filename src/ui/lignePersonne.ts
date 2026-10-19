// Contenu commun des lignes de personne (liste, fiche, écrans d'ajout) :
// avatar aux initiales, nom, et détail en seconde ligne s'il y en a un.

import { initiales, libelleNaissance, nomComplet } from '../modele/liste';
import type { Personne } from '../modele/types';
import { h } from './dom';

/** Par défaut : nom complet et naissance. Un détail vide n'affiche pas de seconde ligne. */
export function contenuLigne(p: Personne, nom = nomComplet(p), detail = libelleNaissance(p.naissance, p.sexe)): HTMLElement[] {
  return [
    h('span', { class: 'avatar' }, initiales(p)),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nom), detail && h('span', { class: 'secondaire' }, detail)),
  ];
}
