// Ajout d'un parent ou d'un enfant à une personne : choisir une personne existante ou en créer une,
// puis préciser le lien (biologique ou adoptif). Les personnes déjà liées ne sont pas choisissables.

import { nomComplet } from '../modele/liste';
import { ajouterFiliation } from '../modele/modele';
import type { Personne, TypeFiliation } from '../modele/types';
import { h, icone } from './dom';
import { lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

export type RoleLien = 'parent' | 'enfant';

const TEXTES = {
  parent: { titre: 'Ajouter un parent', deja: 'Déjà parent', valider: 'Ajouter ce parent', origine: 'Origine du parent' },
  enfant: { titre: 'Ajouter un enfant', deja: 'Déjà enfant', valider: 'Ajouter cet enfant', origine: 'Origine de l’enfant' },
} as const;

export function ajoutLien(p: Personne, role: RoleLien): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const textes = TEXTES[role];
  let type: TypeFiliation = 'biologique';

  // Un même lien ne se crée pas deux fois : `c` est-il déjà relié directement à `p` dans ce rôle ?
  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: textes.origine,
    libelleValider: textes.valider,
    indisponible: (d, c) =>
      d.filiations.some((f) => (role === 'parent' ? f.parent === c.id && f.enfant === p.id : f.parent === p.id && f.enfant === c.id)) ? textes.deja : undefined,
    lier: (d, autre) => (role === 'parent' ? ajouterFiliation(d, autre, p.id, type) : ajouterFiliation(d, p.id, autre, type)).donnees,
    apres: () => revenir(retour),
  });

  const optionType = (valeur: TypeFiliation, libelle: string) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: 'type-lien', value: valeur, checked: valeur === type, onchange: () => (type = valeur) }),
      h('span', {}, libelle),
    );

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, textes.titre),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'secondaire' }, `Pour ${nomComplet(p)}`),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Type de lien'),
        h('div', { class: 'choix-groupe' }, optionType('biologique', 'Biologique'), optionType('adoptif', 'Adoptif')),
      ),
      selecteur.onglets,
      selecteur.zone,
      selecteur.erreur,
      selecteur.valider,
    ),
  );
}
