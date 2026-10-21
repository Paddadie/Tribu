// Ajout d'un conjoint à une personne : choisir une personne existante ou en créer une.
// Une personne n'a qu'un conjoint à la fois ; les personnes déjà en couple ne sont pas choisissables.
// Mode « ex » : union déjà terminée, ajoutable même si l'un ou l'autre est en couple.

import { avecDe, nomComplet } from '../modele/liste';
import { ajouterUnion, enCouple } from '../modele/modele';
import { suggestions } from '../modele/saisie';
import type { Personne } from '../modele/types';
import { champDate } from './champsPersonne';
import { h, icone } from './dom';
import { avatarPersonne } from './lignePersonne';
import { garderSaisie, lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

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

  const prendLeNom = h('input', { id: 'prend-nom', type: 'checkbox', class: 'bascule', checked: true });
  const lignePrendLeNom = h(
    'label',
    { class: 'carte interrupteur', for: 'prend-nom', hidden: true },
    h(
      'span',
      { class: 'ligne-texte' },
      h('span', { class: 'ligne-nom' }, 'Prend le nom du conjoint'),
      h('span', { class: 'secondaire' }, 'La femme du couple garde son nom de jeune fille'),
    ),
    prendLeNom,
  );
  const majPrendLeNom = () => (lignePrendLeNom.hidden = ex || !marie.checked);
  marie.addEventListener('change', majPrendLeNom);

  const date = champDate('-union', 'de l’union', undefined, true);
  const champDateUnion = h('div', { class: 'champ' }, h('label', { for: 'jour-union' }, 'Date de l’union (facultative)'), date.groupe);

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: ex ? 'Origine de l’ex' : 'Origine du conjoint',
    libelleValider: ex ? 'Ajouter cet ex' : 'Ajouter ce conjoint',
    // Sexe proposé à l'opposé de celui de la personne ; sans sexe enregistré elle compte comme un homme (défaut du formulaire).
    sexeParDefaut: p.sexe === 'F' ? 'M' : 'F',
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
    lier: (d, autre) => ajouterUnion(d, p.id, autre, marie.checked, ex ? 'separee' : 'actuelle', date.lire(), prendLeNom.checked).donnees,
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
      h('h1', { class: 'titre-formulaire' }, `${ex ? 'Ex' : 'Conjoint'} ${avecDe(p.prenom || p.nom)}`),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'contexte' }, avatarPersonne(p), 'pour ', h('b', {}, nomComplet(p))),
      selecteur.onglets,
      selecteur.zone,
      interrupteur,
      lignePrendLeNom,
      champDateUnion,
      selecteur.pied,
    ),
  );
}
