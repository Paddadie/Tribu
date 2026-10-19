// Ajout d'un ami à une personne : choisir une personne existante ou en créer une.
// Une amitié relie deux personnes quelconques, de la famille ou non ; elle ne crée aucune parenté.

import { accorder, avecDe } from '../modele/liste';
import { ajouterAmitie, sontAmis } from '../modele/modele';
import type { Personne } from '../modele/types';
import { h, icone } from './dom';
import { garderSaisie, lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

export function ajoutAmi(p: Personne): HTMLElement {
  const retour = `#/personne/${p.id}`;

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: 'Origine de l’ami',
    libelleValider: 'Ajouter comme ami',
    indisponible: (d, c) => (sontAmis(d, p.id, c.id) ? accorder(c.sexe, 'Déjà ami', 'Déjà amie', 'Déjà ami(e)') : undefined),
    lier: (d, autre) => ajouterAmitie(d, p.id, autre).donnees,
    apres: () => revenir(retour),
  });
  garderSaisie(selecteur.modifie);

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, `Ami ${avecDe(p.prenom || p.nom)}`),
    ),
    h('div', { class: 'contenu' }, selecteur.onglets, selecteur.zone, selecteur.erreur, selecteur.valider),
  );
}
