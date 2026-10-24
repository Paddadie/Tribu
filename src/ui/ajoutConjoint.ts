// Ajout d'un conjoint à une personne : choisir une personne existante ou en créer une.
// Une personne n'a qu'un conjoint à la fois ; les personnes déjà en couple ne sont pas choisissables.
// Mode « ex » : union déjà terminée, ajoutable même si l'un ou l'autre est en couple.

import { avecDe, nomComplet } from '../modele/liste';
import { ajouterUnion, enCouple } from '../modele/modele';
import { nomsConjointSelonEnfants, suggestions } from '../modele/saisie';
import type { Personne } from '../modele/types';
import { champDate } from './champsPersonne';
import { h, icone } from './dom';
import { lireDonnees } from './etat';
import { avatarPersonne } from './lignePersonne';
import { garderSaisie, lienRetour, revenir } from './navigation';
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

  const prendLeNom = h('input', { id: 'prend-nom', type: 'checkbox', class: 'bascule', checked: true });
  const lignePrendLeNom = h(
    'label',
    { class: 'carte interrupteur', for: 'prend-nom', hidden: true },
    h(
      'span',
      { class: 'ligne-texte' },
      h('span', { class: 'ligne-nom' }, 'Prend le nom du mari'),
      h('span', { class: 'secondaire' }, 'Éteint, elle garde son nom de jeune fille'),
    ),
    prendLeNom,
  );
  let selecteur: Selecteur | undefined;
  // Seule une femme qui épouse un homme prend son nom : la ligne n'existe pas pour un mari, ni pour un couple de femmes.
  const prendLeNomPossible = () => !ex && marie.checked && p.sexe !== 'F' && selecteur?.sexeChoisi() === 'F';
  // Nouvelle épouse : son nom devient celui du mari dans le formulaire, l'ancien passant en nom de jeune fille (s'il est libre).
  let avant: { nom: string; nomNaissance: string } | undefined;
  const majPrendLeNom = () => {
    lignePrendLeNom.hidden = !prendLeNomPossible();
    if (!selecteur) return;
    const { identite } = selecteur;
    const poser = selecteur.mode() === 'nouvelle' && !lignePrendLeNom.hidden && prendLeNom.checked && !!p.nom.trim();
    if (poser && !avant) {
      avant = { nom: identite.lireNom(), nomNaissance: identite.lireNomNaissance() };
      identite.definirNom(p.nom);
      if (avant.nom.trim() && !avant.nomNaissance.trim() && avant.nom.trim() !== p.nom.trim()) identite.definirNomNaissance(avant.nom.trim());
    } else if (!poser && avant) {
      if (identite.lireNom() === p.nom) identite.definirNom(avant.nom);
      identite.definirNomNaissance(avant.nomNaissance);
      avant = undefined;
    }
  };
  marie.addEventListener('change', majPrendLeNom);
  prendLeNom.addEventListener('change', majPrendLeNom);

  const date = champDate('-union', 'de l’union', undefined, true);
  const champDateUnion = h('div', { class: 'champ' }, h('label', { for: 'jour-union' }, 'Date de l’union (facultative)'), date.groupe);

  selecteur = selecteurPersonne({
    surChoix: majPrendLeNom,
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
    lier: (d, autre) => ajouterUnion(d, p.id, autre, marie.checked, ex ? 'separee' : 'actuelle', date.lire(), prendLeNomPossible() && prendLeNom.checked).donnees,
    apres: () => revenir(retour),
  });
  const choix = selecteur;
  garderSaisie(choix.modifie);

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
      choix.onglets,
      choix.zone,
      interrupteur,
      lignePrendLeNom,
      champDateUnion,
      choix.pied,
    ),
  );
}
