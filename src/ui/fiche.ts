// Fiche d'une personne : identité, note, modification, suppression avec confirmation.
// Les sections de proches (conjoints, enfants, fratrie, parents) arrivent aux étapes 5 à 7.

import { initiales, libelleNaissance, nomComplet } from '../modele/liste';
import { supprimerPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';

export function fiche(p: Personne, naviguer: (route: string) => void): HTMLElement {
  const naissance = libelleNaissance(p.naissance, p.sexe);

  const supprimer = async () => {
    const d = lireDonnees();
    const aDesLiens =
      d.unions.some((u) => u.personneA === p.id || u.personneB === p.id) ||
      d.filiations.some((f) => f.parent === p.id || f.enfant === p.id);
    const message = `Supprimer ${nomComplet(p)} ?` + (aDesLiens ? ' Ses liens familiaux seront aussi supprimés.' : '');
    if (!(await confirmer(message, 'Supprimer'))) return;
    try {
      modifierDonnees((x) => supprimerPersonne(x, p.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible');
      return;
    }
    naviguer('#/');
  };

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      h('a', { class: 'bouton-icone', href: '#/', 'aria-label': 'Retour à la liste' }, icone('retour', 26)),
      h('a', { class: 'bouton bouton-pilule', href: `#/modifier/${p.id}` }, icone('crayon', 18), 'Modifier'),
    ),
    h(
      'div',
      { class: 'identite' },
      h('span', { class: 'avatar avatar-grand' }, initiales(p)),
      h('h1', {}, nomComplet(p)),
      naissance && h('span', { class: 'secondaire' }, naissance),
    ),
    h(
      'div',
      { class: 'contenu' },
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'NOTE'), h('p', {}, p.note)),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
    ),
  );
}
