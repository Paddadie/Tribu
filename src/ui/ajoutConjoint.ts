// Ajout d'un conjoint à une personne : choisir une personne existante ou en créer une.
// Une personne n'a qu'un conjoint à la fois ; les personnes déjà en couple ne sont pas choisissables.
// Mode « ex » : union déjà terminée, ajoutable même si l'un ou l'autre est en couple.

import { avecDe, nomComplet, prenomOuNom } from '../modele/liste';
import { ajouterUnion, enCouple, modifierLieuUnion } from '../modele/modele';
import { appliquerNomApres } from '../modele/nomApres';
import { nomsConjointSelonEnfants, suggestions } from '../modele/saisie';
import type { Personne } from '../modele/types';
import { champDate } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees } from './etat';
import { avatarPersonne } from './lignePersonne';
import { apresAjout, garderSaisie, lienRetour } from './navigation';
import { champLieuUnion, choixNomApres, defautNomApres, type Membre } from './nomApresMariage';
import { selecteurPersonne, type Selecteur } from './selecteurPersonne';

export function ajoutConjoint(p: Personne, ex = false): HTMLElement {
  const retour = `#/personne/${p.id}`;

  const marie = h('input', { id: 'marie', type: 'checkbox', class: 'bascule' });
  const interrupteur = h(
    'label',
    { class: 'carte interrupteur', for: 'marie' },
    h(
      'span',
      { class: 'ligne-texte' },
      h('span', { class: 'ligne-nom' }, 'Marié(e)'),
      h('span', { class: 'secondaire' }, 'À laisser éteint pour un couple non marié'),
    ),
    marie,
  );

  let selecteur: Selecteur | undefined;
  // L'autre membre du couple : la personne cochée, ou celle en cours de saisie (sans id avant sa création).
  const autre = (): Membre => {
    if (selecteur?.mode() === 'existante') {
      const c = selecteur.choisie();
      if (c) return { id: c.id, prenom: c.prenom, sexe: c.sexe, origine: c.nom };
    }
    const identite = selecteur?.identite;
    return { id: 'nouvelle', prenom: identite?.lirePrenom().trim() ?? '', sexe: identite?.sexe(), origine: identite?.lireNom().trim() ?? '' };
  };
  const nomApres = choixNomApres(() => [{ id: p.id, prenom: p.prenom, sexe: p.sexe, origine: p.nom }, autre()], defautNomApres);
  const lieu = champLieuUnion(undefined);

  // Nom après le mariage pour un mariage en cours seulement ; le lieu pour tout mariage (décision 9).
  const majMariage = () => {
    nomApres.noeud.hidden = ex || !marie.checked;
    lieu.noeud.hidden = !marie.checked;
    nomApres.rafraichir();
  };
  marie.addEventListener('change', majMariage);

  const date = champDate('-union', 'de l’union', undefined, true);
  const champDateUnion = h('div', { class: 'champ' }, h('label', { for: 'jour-union' }, 'Date de l’union'), date.groupe);

  selecteur = selecteurPersonne({
    surChoix: majMariage,
    personne: p,
    libelleOrigine: ex ? 'Origine de l’ex' : 'Origine du conjoint',
    libelleValider: ex ? 'Ajouter cet ex' : 'Ajouter ce conjoint',
    // Sexe proposé à l'opposé de celui de la personne ; sans sexe enregistré elle compte comme un homme (défaut du formulaire).
    sexeParDefaut: p.sexe === 'F' ? 'M' : 'F',
    // Un homme prend d'avance le nom des enfants du couple (pas pour un ex : leurs enfants peuvent être d'une autre union).
    noms: (sexe) => (ex ? [] : nomsConjointSelonEnfants(lireDonnees(), p.id, sexe)),
    suggestions: (d) => suggestions(d, p.id, 'conjoint'),
    // Un ex peut être en couple avec quelqu'un d'autre ; seule une union existante déjà avec cette personne l'exclut.
    indisponible: (d, c) =>
      ex
        ? d.unions.some((u) => (u.personneA === p.id && u.personneB === c.id) || (u.personneA === c.id && u.personneB === p.id))
          ? 'Déjà un couple'
          : undefined
        : enCouple(d, c.id)
          ? 'Déjà en couple'
          : undefined,
    lier: (d, idAutre) => {
      const { donnees, union } = ajouterUnion(d, p.id, idAutre, marie.checked, ex ? 'separee' : 'actuelle', date.lire(), false);
      if (!marie.checked) return donnees;
      const nommes = ex ? donnees : appliquerNomApres(donnees, union.id, nomApres.lire(p.id, idAutre));
      return modifierLieuUnion(nommes, union.id, lieu.lire());
    },
    apres: (idNouvelle) => apresAjout(retour, idNouvelle),
  });
  const choix = selecteur;
  // Le nom ou le prénom saisis changent les libellés du choix de nom.
  choix.zone.addEventListener('input', () => nomApres.rafraichir());
  majMariage();
  garderSaisie(choix.modifie);

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, `${ex ? 'Ex' : 'Conjoint'} ${avecDe(prenomOuNom(p))}`),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'contexte' }, avatarPersonne(p), 'pour ', h('b', {}, nomComplet(p))),
      choix.onglets,
      choix.zone,
      interrupteur,
      nomApres.noeud,
      champDateUnion,
      lieu.noeud,
      choix.pied,
    ),
  );
}
