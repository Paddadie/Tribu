// Gestion de l'union d'une personne : indicateur « marié » et fin de l'union (séparation).
// Mettre fin à l'union l'efface ; les deux personnes restent dans la liste.

import { conjoint } from '../modele/deductions';
import { nomComplet } from '../modele/liste';
import { modifierUnion, supprimerUnion } from '../modele/modele';
import type { Personne } from '../modele/types';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';

export function ecranUnion(p: Personne, naviguer: (route: string) => void): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const lien = conjoint(lireDonnees(), p.id);
  if (!lien) {
    // Union déjà effacée (ou jamais créée) : retour à la fiche.
    naviguer(retour);
    return h('div', { class: 'ecran' });
  }
  const { union, personne: autre } = lien;

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (e: unknown, defaut: string) => {
    erreur.textContent = e instanceof Error ? e.message : defaut;
    erreur.hidden = false;
  };

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule', checked: union.marie });

  const enregistrer = () => {
    try {
      modifierDonnees((d) => modifierUnion(d, union.id, marie.checked));
      naviguer(retour);
    } catch (e) {
      afficherErreur(e, 'Enregistrement impossible');
    }
  };

  const finir = async () => {
    const message = `Mettre fin à l’union de ${nomComplet(p)} et ${nomComplet(autre)} ? Les deux fiches sont conservées.`;
    if (!(await confirmer(message, 'Mettre fin'))) return;
    try {
      modifierDonnees((d) => supprimerUnion(d, union.id));
      naviguer(retour);
    } catch (e) {
      afficherErreur(e, 'Suppression impossible');
    }
  };

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      h('a', { class: 'bouton-icone', href: retour, 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, 'Union'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'resume-union' }, `${nomComplet(p)} et ${nomComplet(autre)}`),
      h(
        'label',
        { class: 'carte interrupteur', for: 'marie' },
        h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, 'Marié(e)'), h('span', { class: 'secondaire' }, 'Éteint pour un couple non marié')),
        marie,
      ),
      erreur,
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: enregistrer }, 'Enregistrer'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: finir }, 'Mettre fin à l’union'),
    ),
  );
}
