// Formulaire de création / modification d'une personne.

import { creerPersonne, modifierPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { champsIdentite } from './champsPersonne';
import { h } from './dom';
import { modifierDonnees } from './etat';
import { lienRetour, remplacer, revenir } from './navigation';

/** `existante` absente = création : la fiche créée prend la place du formulaire. */
export function formulaire(existante: Personne | undefined): HTMLElement {
  const identite = champsIdentite(existante, true);
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const retour = existante ? `#/personne/${existante.id}` : '#/';

  const enregistrer = (e: Event) => {
    e.preventDefault();
    try {
      const champs = identite.lire();
      let id = existante?.id ?? '';
      modifierDonnees((d) => {
        if (existante) return modifierPersonne(d, existante.id, champs);
        const r = creerPersonne(d, champs);
        id = r.personne.id;
        return r.donnees;
      });
      if (existante) revenir(retour);
      else remplacer(`#/personne/${id}`);
    } catch (err) {
      erreur.textContent = err instanceof Error ? err.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  };

  return h(
    'div',
    { class: 'ecran' },
    h('div', { class: 'barre' }, h('h1', { class: 'titre-formulaire' }, existante ? 'Modifier' : 'Nouvelle personne')),
    h(
      'form',
      { class: 'contenu', onsubmit: enregistrer, novalidate: true },
      ...identite.noeuds,
      erreur,
      h('button', { type: 'submit', class: 'bouton bouton-plein' }, 'Enregistrer'),
      lienRetour(retour, { class: 'bouton' }, 'Annuler'),
    ),
  );
}
