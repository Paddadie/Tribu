// Contenu commun des lignes de personne (liste, fiche, écrans d'ajout) :
// avatar aux initiales, nom, et détail en seconde ligne s'il y en a un.

import { detailPersonne } from '../modele/age';
import { initiales, nomComplet, teinteFamille } from '../modele/liste';
import type { Personne } from '../modele/types';
import { h } from './dom';

/** Avatar aux initiales, à la teinte du nom de famille (neutre si le nom est vide). */
export function avatarPersonne(p: Personne, grand = false): HTMLElement {
  const teinte = teinteFamille(p.nom);
  return h('span', { class: grand ? 'avatar avatar-grand' : 'avatar', style: teinte !== undefined && `--h: ${teinte}` }, initiales(p));
}

/** Par défaut : nom complet, puis naissance et âge (ou « 1941 – 2024 » si décédée). Un détail vide n'affiche pas de seconde ligne. */
export function contenuLigne(p: Personne, nom = nomComplet(p), detail = detailPersonne(p, new Date())): HTMLElement[] {
  return [
    avatarPersonne(p),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nom), detail && h('span', { class: 'secondaire' }, detail)),
  ];
}
