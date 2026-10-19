// Formulaire de création / modification d'une personne. Création : curseur dans le prénom,
// confirmation si une fiche porte déjà ce prénom et ce nom. Modification : annulable par le bandeau.
// Retour avec une saisie en cours demande confirmation.

import { avecDe, nomComplet } from '../modele/liste';
import { creerPersonne, modifierPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { changerAvecAnnulation } from './annulation';
import { accepterHomonyme, champsIdentite } from './champsPersonne';
import { h } from './dom';
import { lireDonnees, modifierDonnees } from './etat';
import { garderSaisie, lienRetour, remplacer, revenir } from './navigation';

/** `existante` absente = création : la fiche créée prend la place du formulaire. */
export function formulaire(existante: Personne | undefined): HTMLElement {
  const identite = champsIdentite(existante, true);
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const retour = existante ? `#/personne/${existante.id}` : '#/';
  garderSaisie(identite.modifie);

  const enregistrer = async (e: Event) => {
    e.preventDefault();
    erreur.hidden = true;
    try {
      const champs = identite.lire();
      if (existante) {
        if (identite.modifie()) changerAvecAnnulation((d) => modifierPersonne(d, existante.id, champs), `Fiche ${nomComplet(champs) ? avecDe(nomComplet(champs)) : 'de cette personne'} modifiée.`, 'Modification annulée.');
        revenir(retour);
        return;
      }
      if (!(await accepterHomonyme(lireDonnees().personnes, champs))) return;
      let id = '';
      modifierDonnees((d) => {
        const r = creerPersonne(d, champs);
        id = r.personne.id;
        return r.donnees;
      });
      remplacer(`#/personne/${id}`);
    } catch (err) {
      erreur.textContent = err instanceof Error ? err.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  };

  if (!existante) queueMicrotask(identite.viserPrenom);

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
