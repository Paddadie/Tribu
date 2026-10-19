// Ajout d'un conjoint à une personne : choisir une personne existante ou en créer une.
// Une personne n'a qu'un conjoint à la fois ; les personnes déjà en couple ne sont pas choisissables.

import { ajouterUnion, enCouple } from '../modele/modele';
import type { Personne } from '../modele/types';
import { h, icone } from './dom';
import { lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

export function ajoutConjoint(p: Personne): HTMLElement {
  const retour = `#/personne/${p.id}`;

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule' });
  const interrupteur = h(
    'label',
    { class: 'carte interrupteur', for: 'marie' },
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, 'Marié(e)'), h('span', { class: 'secondaire' }, 'À laisser éteint pour un couple non marié')),
    marie,
  );

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: 'Origine du conjoint',
    libelleValider: 'Ajouter ce conjoint',
    // Sexe proposé à l'opposé de celui de la personne ; sans sexe enregistré elle compte comme un homme (défaut du formulaire).
    sexeParDefaut: p.sexe === 'F' ? 'M' : 'F',
    indisponible: (d, c) => (enCouple(d, c.id) ? 'Déjà en couple' : undefined),
    lier: (d, autre) => ajouterUnion(d, p.id, autre, marie.checked).donnees,
    apres: () => revenir(retour),
  });

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, `Conjoint de ${p.prenom || p.nom}`),
    ),
    h('div', { class: 'contenu' }, selecteur.onglets, selecteur.zone, interrupteur, selecteur.erreur, selecteur.valider),
  );
}
