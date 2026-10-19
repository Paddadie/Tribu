// Gestion d'une union : indicateur « marié », séparation (l'union est gardée, au statut « séparée »),
// rétablissement d'un couple séparé, suppression d'une union saisie par erreur.
// Séparation et suppression sont annulables depuis le bandeau.

import { nomComplet } from '../modele/liste';
import { modifierUnion, retablirUnion, separerUnion, supprimerUnion } from '../modele/modele';
import type { Personne } from '../modele/types';
import { changerAvecAnnulation } from './annulation';
import { h, icone } from './dom';
import { lireDonnees, modifierDonnees } from './etat';
import { lienRetour, remplacer, revenir } from './navigation';

/** Écran de l'union `idUnion`, ouvert depuis la fiche de `p`. */
export function ecranUnion(p: Personne, idUnion: string): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const d = lireDonnees();
  const union = d.unions.find((u) => u.id === idUnion && (u.personneA === p.id || u.personneB === p.id));
  const autre = union && d.personnes.find((x) => x.id === (union.personneA === p.id ? union.personneB : union.personneA));
  if (!union || !autre) {
    // Union déjà supprimée (ou jamais créée) : retour à la fiche.
    remplacer(retour);
    return h('div', { class: 'ecran' });
  }
  const separee = union.statut === 'separee';
  const prenomAutre = autre.prenom || autre.nom;

  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const afficherErreur = (e: unknown, defaut: string) => {
    erreur.textContent = e instanceof Error ? e.message : defaut;
    erreur.hidden = false;
  };

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule', checked: union.marie });

  const enregistrer = () => {
    try {
      modifierDonnees((x) => modifierUnion(x, union.id, marie.checked));
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Enregistrement impossible');
    }
  };

  const separer = () => {
    try {
      changerAvecAnnulation((x) => separerUnion(x, union.id), `Séparation d’avec ${prenomAutre} enregistrée.`, 'Couple rétabli.');
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Séparation impossible');
    }
  };

  const retablir = () => {
    try {
      modifierDonnees((x) => retablirUnion(x, union.id));
      revenir(retour);
    } catch (e) {
      afficherErreur(e, 'Rétablissement impossible');
    }
  };

  const supprimer = () => {
    try {
      changerAvecAnnulation((x) => supprimerUnion(x, union.id), `Union avec ${prenomAutre} supprimée.`, 'Union rétablie.');
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
      h('h1', { class: 'titre-formulaire' }, separee ? 'Ex-conjoint' : 'Union'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'resume-union' }, `${nomComplet(p)} et ${nomComplet(autre)}${separee ? ' sont séparés.' : ''}`),
      h(
        'label',
        { class: 'carte interrupteur', for: 'marie' },
        h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, 'Marié(e)'), h('span', { class: 'secondaire' }, 'Éteint pour un couple non marié')),
        marie,
      ),
      erreur,
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: enregistrer }, 'Enregistrer'),
      separee
        ? h('button', { type: 'button', class: 'bouton', onclick: retablir }, 'Rétablir le couple')
        : h('button', { type: 'button', class: 'bouton', onclick: separer }, 'Se sont séparés'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, 'Supprimer l’union'),
    ),
  );
}
