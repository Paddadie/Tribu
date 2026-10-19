// Ajout d'un parent, d'un enfant ou d'un frère / d'une sœur à une personne : choisir une personne
// existante ou en créer une, puis préciser le lien (biologique ou adoptif).
// Enfant d'une personne en couple : le conjoint peut être ajouté comme second parent dans la même saisie.
// Frère ou sœur : enfant des parents cochés (un seul coché : demi-frère ou demi-sœur).
// Les personnes déjà liées ne sont pas choisissables.

import { conjoint, liensParents } from '../modele/deductions';
import { avecDe, enumerer, nomComplet } from '../modele/liste';
import { ajouterFiliation, ajouterFiliations } from '../modele/modele';
import { nomsEnfant, suggestions } from '../modele/saisie';
import type { Donnees, Personne, TypeFiliation } from '../modele/types';
import { h, icone } from './dom';
import { garderSaisie, lienRetour, revenir } from './navigation';
import { selecteurPersonne } from './selecteurPersonne';

export type RoleLien = 'parent' | 'enfant' | 'frere';

const TEXTES = {
  parent: { titre: 'Ajouter un parent', valider: 'Ajouter ce parent', origine: 'Origine du parent' },
  enfant: { titre: 'Ajouter un enfant', valider: 'Ajouter cet enfant', origine: 'Origine de l’enfant' },
  frere: { titre: 'Ajouter un frère ou une sœur', valider: 'Ajouter à la fratrie', origine: 'Origine du frère ou de la sœur' },
} as const;

const appel = (p: Personne) => p.prenom || p.nom;

/** Case à cocher en carte : libellé et précision. */
function caseACocher(libelle: string, detail: string, onchange: () => void): { noeud: HTMLElement; boite: HTMLInputElement } {
  const boite = h('input', { type: 'checkbox', class: 'boite', checked: true, onchange });
  const noeud = h('label', { class: 'case' }, boite, h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, libelle), detail && h('span', { class: 'secondaire' }, detail)));
  return { noeud, boite };
}

export function ajoutLien(p: Personne, role: RoleLien, d: Donnees): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const textes = TEXTES[role];
  let type: TypeFiliation = 'biologique';

  // Enfant : le conjoint éventuel, second parent coché d'office.
  const couple = role === 'enfant' ? conjoint(d, p.id)?.personne : undefined;
  const caseConjoint =
    couple &&
    caseACocher(`Ajouter aussi ${appel(couple)} comme parent`, couple.sexe === 'F' ? 'Sa conjointe' : 'Son conjoint', () => selecteur.rafraichir());

  // Frère ou sœur : une case par parent connu, toutes cochées.
  const parentsConnus = role === 'frere' ? liensParents(d, p.id).map((l) => l.personne) : [];
  const casesParents = parentsConnus.map((pa) => ({ pa, ...caseACocher(nomComplet(pa), '', () => selecteur.rafraichir()) }));
  const parentsCoches = () => casesParents.filter((c) => c.boite.checked).map((c) => c.pa);

  /** Parents du nouvel enfant (rôle enfant ou frère). */
  const parentsDuLien = (): Personne[] => (role === 'frere' ? parentsCoches() : couple && caseConjoint?.boite.checked ? [p, couple] : [p]);

  const indisponible = (x: Donnees, c: Personne): string | undefined => {
    const estParent = (parent: string, enfant: string) => x.filiations.some((f) => f.parent === parent && f.enfant === enfant);
    if (role === 'parent') return estParent(c.id, p.id) ? 'Déjà parent' : undefined;
    if (role === 'enfant') return estParent(p.id, c.id) ? 'Déjà enfant' : undefined;
    if (estParent(c.id, p.id)) return `Parent ${avecDe(appel(p))}`;
    const coches = parentsCoches();
    if (coches.length > 0 && coches.every((pa) => estParent(pa.id, c.id))) return `Déjà enfant ${avecDe(enumerer(coches.map(appel)))}`;
    return undefined;
  };

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: textes.origine,
    libelleValider: textes.valider,
    // Enfant : nom du père (ou de la fiche), bouton pour l'autre parent. Parent, frère ou sœur : nom de la fiche.
    noms: () => nomsEnfant(role === 'enfant' ? parentsDuLien() : [p]),
    suggestions: role === 'frere' ? undefined : (x) => suggestions(x, p.id, role),
    indisponible,
    pret: role === 'frere' ? () => parentsCoches().length > 0 : undefined,
    lier: (x, autre) =>
      role === 'parent'
        ? ajouterFiliation(x, autre, p.id, type).donnees
        : ajouterFiliations(
            x,
            parentsDuLien().map((pa) => pa.id),
            autre,
            type,
          ),
    apres: () => revenir(retour),
  });
  garderSaisie(selecteur.modifie);

  const optionType = (valeur: TypeFiliation, libelle: string) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: 'type-lien', value: valeur, checked: valeur === type, onchange: () => (type = valeur) }),
      h('span', {}, libelle),
    );

  const champsParents =
    role === 'frere' &&
    h(
      'fieldset',
      { class: 'champ' },
      h('legend', {}, 'Enfant de'),
      h('div', { class: 'carte' }, ...casesParents.map((c) => c.noeud)),
      casesParents.length > 1 && h('p', { class: 'aide' }, 'Décochez un parent pour un demi-frère ou une demi-sœur.'),
    );

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Annuler' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, textes.titre),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('p', { class: 'secondaire' }, `Pour ${nomComplet(p)}`),
      champsParents,
      caseConjoint && h('div', { class: 'carte' }, caseConjoint.noeud),
      h(
        'fieldset',
        { class: 'champ' },
        h('legend', {}, 'Type de lien'),
        h('div', { class: 'choix-groupe' }, optionType('biologique', 'Biologique'), optionType('adoptif', 'Adoptif')),
      ),
      selecteur.onglets,
      selecteur.zone,
      selecteur.erreur,
      selecteur.valider,
    ),
  );
}
