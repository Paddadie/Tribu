// Gestion d'un lien parent-enfant depuis la fiche d'une des deux personnes : changer son type
// (biologique ou adoptif) ou le retirer. Retirer le lien ne supprime aucune fiche ; le bandeau permet de l'annuler.

import { nomComplet } from '../modele/liste';
import { modifierFiliation, supprimerFiliation } from '../modele/modele';
import type { Personne, TypeFiliation } from '../modele/types';
import { changerAvecAnnulation } from './annulation';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';
import { signaler } from './surbrillance';
import { lienRetour, remplacer, revenir } from './navigation';

export function ecranLien(idFiliation: string, depuis: Personne): HTMLElement {
  const retour = `#/personne/${depuis.id}`;
  const d = lireDonnees();
  const filiation = d.filiations.find((f) => f.id === idFiliation);
  const parent = d.personnes.find((x) => x.id === filiation?.parent);
  const enfant = d.personnes.find((x) => x.id === filiation?.enfant);
  if (!filiation || !parent || !enfant) {
    // Lien déjà retiré (ou personne supprimée) : retour à la fiche.
    remplacer(retour);
    return h('div', { class: 'ecran' });
  }

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (e: unknown, defaut: string) => {
    erreur.textContent = e instanceof Error ? e.message : defaut;
    erreur.hidden = false;
  };

  let type: TypeFiliation = filiation.type;
  const onglet = (valeur: TypeFiliation, libelle: string) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: 'type-lien', value: valeur, checked: valeur === type, onchange: () => (type = valeur) }),
      h('span', {}, libelle),
    );

  const enregistrer = () => {
    try {
      modifierDonnees((x) => modifierFiliation(x, filiation.id, type));
      signaler(depuis.id === parent.id ? enfant.id : parent.id);
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Enregistrement impossible');
    }
  };

  const retirer = () => {
    const autre = depuis.id === parent.id ? enfant : parent;
    try {
      changerAvecAnnulation((x) => supprimerFiliation(x, filiation.id), `Lien avec ${autre.prenom || autre.nom} retiré.`, 'Lien rétabli.');
      revenir(retour);
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
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, 'Lien parent-enfant'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'resume-union' }, `${nomComplet(parent)}, parent de ${nomComplet(enfant)}`),
      h('fieldset', { class: 'champ' }, h('legend', {}, 'Type de lien'), h('div', { class: 'choix-groupe' }, onglet('biologique', 'Biologique'), onglet('adoptif', 'Adoptif'))),
      erreur,
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: enregistrer }, 'Enregistrer'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: retirer }, 'Retirer ce lien'),
    ),
  );
}
