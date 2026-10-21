// Contenu commun des lignes de personne (liste, fiche, écrans d'ajout) :
// avatar aux initiales, nom, et détail en seconde ligne s'il y en a un.

import { detailPersonne } from '../modele/age';
import { couleurFamille, initiales, nomComplet } from '../modele/liste';
import { estDecede } from '../modele/modele';
import type { Personne } from '../modele/types';
import { h } from './dom';

/**
 * Avatar aux initiales, au pastel du nom de famille, le même que dans l'arbre (vert pâle si la personne n'a pas de nom).
 * Une personne décédée a partout le même avatar : sa couleur, en plus pâle (classe `decede`).
 */
export function avatarPersonne(p: Personne, grand = false): HTMLElement {
  const k = couleurFamille(p);
  const classes = ['avatar', grand && 'avatar-grand', k !== undefined && 'teinte', estDecede(p) && 'decede'].filter(Boolean).join(' ');
  return h('span', { class: classes, style: k !== undefined && `--a: var(--c${k})` }, initiales(p));
}

/** Par défaut : nom complet, puis naissance et âge (ou « 1941 – 2024 » si décédée). Un détail vide n'affiche pas de seconde ligne. */
export function contenuLigne(p: Personne, nom = nomComplet(p), detail = detailPersonne(p, new Date())): HTMLElement[] {
  return [avatarPersonne(p), h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nom), detail && h('span', { class: 'secondaire' }, detail))];
}
