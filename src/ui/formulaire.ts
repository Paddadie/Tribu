// Formulaire de création / modification d'une personne.

import { creerPersonne, modifierPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { champsIdentite } from './champsPersonne';
import { h } from './dom';
import { modifierDonnees } from './etat';

/** `existante` absente = création. `naviguer` remplace la route courante (pas d'empilement dans l'historique). */
export function formulaire(existante: Personne | undefined, naviguer: (route: string) => void): HTMLElement {
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
      naviguer(`#/personne/${id}`);
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
      h('a', { class: 'bouton', href: retour }, 'Annuler'),
    ),
  );
}
