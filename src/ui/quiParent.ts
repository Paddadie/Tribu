// « Qui est ce parent ? » : remplace un parent « ? » (virtuel ou enregistré) par une personne déjà dans Tribu ou
// créée ici. Elle devient parent de tous les enfants du « ? » (`remplacerParent`) ; avec un seul parent connu, les
// deux sont reliés par une union (en couple, mariés ou séparés). La fiche de la personne s'ouvre ensuite.

import { enumerer, nomComplet } from '../modele/liste';
import { unirParents } from '../modele/modele';
import { familleDuInconnu, remplacerParent } from '../modele/parentSansNom';
import { suggestionsParentInconnu } from '../modele/saisie';
import type { Donnees, Personne } from '../modele/types';
import { h, icone } from './dom';
import { apresAjout, garderSaisie, lienRetour } from './navigation';
import { selecteurPersonne, type Selecteur } from './selecteurPersonne';
import { choixUnionParents } from './unionParents';

const appel = (p: Personne) => p.prenom || p.nom;

/** `undefined` si ce « ? » n'a plus d'enfant (déjà remplacé). */
export function quiParent(idInconnu: string, d: Donnees): HTMLElement | undefined {
  const famille = familleDuInconnu(d, idInconnu);
  if (!famille) return undefined;
  const { enfants, parents } = famille;
  const retour = `#/personne/${enfants[0].id}`;

  let selecteur: Selecteur | undefined;
  const autre = () => (selecteur?.mode() === 'existante' ? selecteur.choisie()?.id : undefined) ?? 'nouvelle';
  // Union seulement avec un unique parent connu : avec plusieurs, on ne sait pas avec lequel.
  const union = parents.length === 1 ? choixUnionParents(d, parents[0], autre) : undefined;
  let relie = '';

  selecteur = selecteurPersonne({
    modeInitial: 'existante',
    libelleOrigine: 'Origine du parent',
    libelleValider: (c) => (c ? `C’est ${appel(c)}` : 'Choisis une personne'),
    sexeParDefaut: parents.length === 1 && parents[0].sexe ? (parents[0].sexe === 'F' ? 'M' : 'F') : undefined,
    suggestions: (x) => suggestionsParentInconnu(x, parents, enfants),
    indisponible: (_x, c) => (enfants.some((e) => e.id === c.id) ? 'Enfant de ce parent' : parents.some((pa) => pa.id === c.id) ? 'Déjà parent' : undefined),
    surChoix: () => union?.maj(),
    lier: (x, id) => {
      relie = id;
      const remplace = remplacerParent(x, idInconnu, id);
      const choix = union?.choix();
      return choix ? unirParents(remplace, parents[0].id, id, choix) : remplace;
    },
    apres: (idNouvelle) => apresAjout(retour, idNouvelle ?? relie),
  });
  const choix = selecteur;
  garderSaisie(choix.modifie);

  const deEnfants = enumerer(enfants.map(appel));
  const deParents = parents.length > 0 ? [', ', enfants.length > 1 ? 'enfants de ' : 'enfant de ', h('b', {}, enumerer(parents.map(nomComplet)))] : [];
  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, 'Qui est ce parent ?'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h(
        'p',
        { class: 'contexte' },
        h('span', { class: 'avatar sans-nom' }, '?'),
        h('span', {}, parents.length > 0 ? 'L’autre parent de ' : 'Un parent de ', h('b', {}, deEnfants), ...deParents, '.'),
      ),
      choix.onglets,
      choix.zone,
      union?.noeud,
      choix.pied,
    ),
  );
}
