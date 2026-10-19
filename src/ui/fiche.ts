// Fiche d'une personne : identité, conjoint, note, modification, suppression avec confirmation.
// Les sections enfants, fratrie et parents arrivent aux étapes 6 et 7.

import { conjoint } from '../modele/deductions';
import { initiales, libelleNaissance, nomComplet } from '../modele/liste';
import { supprimerPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';

/** Conjoint actuel (un seul) touchable, avec accès à l'union ; sinon bouton d'ajout. */
function sectionConjoint(p: Personne): HTMLElement {
  const lien = conjoint(lireDonnees(), p.id);
  if (!lien) {
    return h('a', { class: 'bouton', href: `#/conjoint/${p.id}` }, icone('plus', 18), 'Ajouter un conjoint');
  }
  const { union, personne: c } = lien;
  const detail = libelleNaissance(c.naissance, c.sexe);
  return h(
    'section',
    {},
    h('h2', { class: 'titre-section' }, 'CONJOINT'),
    h(
      'div',
      { class: 'carte' },
      h(
        'div',
        { class: 'ligne ligne-union' },
        h(
          'a',
          { class: 'ligne-lien', href: `#/personne/${c.id}` },
          h('span', { class: 'avatar' }, initiales(c)),
          h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(c)), detail && h('span', { class: 'secondaire' }, detail)),
          union.marie && h('span', { class: 'etiquette' }, 'Marié'),
        ),
        h('a', { class: 'bouton-icone', href: `#/union/${p.id}`, 'aria-label': 'Modifier l’union' }, icone('crayon', 20)),
      ),
    ),
  );
}

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
      sectionConjoint(p),
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'NOTE'), h('p', {}, p.note)),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
    ),
  );
}
