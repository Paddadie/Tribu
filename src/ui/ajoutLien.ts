// Ajout d'un parent, d'un enfant ou d'un frère / d'une sœur à une personne : choisir une personne
// existante ou en créer une, puis préciser le lien (biologique ou adoptif).
// Enfant d'une personne en couple : le conjoint peut être ajouté comme second parent dans la même saisie.
// Frère ou sœur : enfant des parents cochés (un seul coché : demi-frère ou demi-sœur) ; sans parent connu,
// pas de case : le lien passe par un parent inconnu créé en coulisse.
// Les personnes déjà liées ne sont pas choisissables.

import { conjoint, fratrie, liensParents } from '../modele/deductions';
import { avecDe, enumerer, nomComplet } from '../modele/liste';
import { ajouterFiliation, ajouterFiliations, ajouterFrereSansParent, ajouterUnion } from '../modele/modele';
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
  const noeud = h(
    'label',
    { class: 'case' },
    boite,
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, libelle), detail && h('span', { class: 'secondaire' }, detail)),
  );
  return { noeud, boite };
}

export function ajoutLien(p: Personne, role: RoleLien, d: Donnees): HTMLElement {
  const retour = `#/personne/${p.id}`;
  const textes = TEXTES[role];
  let type: TypeFiliation = 'biologique';

  // Enfant : le conjoint éventuel, second parent coché d'office.
  const couple = role === 'enfant' ? conjoint(d, p.id)?.personne : undefined;
  const caseConjoint =
    couple && caseACocher(`Ajouter aussi ${appel(couple)} comme parent`, couple.sexe === 'F' ? 'Sa conjointe' : 'Son conjoint', () => selecteur.rafraichir());

  // Frère ou sœur : une case par parent connu, toutes cochées.
  const parentsConnus = role === 'frere' ? liensParents(d, p.id).map((l) => l.personne) : [];
  const casesParents = parentsConnus.map((pa) => ({ pa, ...caseACocher(nomComplet(pa), '', () => selecteur.rafraichir()) }));
  const sansParentConnu = role === 'frere' && parentsConnus.length === 0;
  const parentsCoches = () => casesParents.filter((c) => c.boite.checked).map((c) => c.pa);

  // Parent : si l'enfant n'en a qu'un, proposer de relier les deux par une union passée (pointillés dans les arbres).
  const parentActuel = role === 'parent' && liensParents(d, p.id).length === 1 ? liensParents(d, p.id)[0].personne : undefined;
  const caseCouple =
    parentActuel && caseACocher(`${appel(parentActuel)} et ce parent ont été en couple`, 'Union terminée, reliée par un trait pointillé', () => undefined);
  /** Union passée entre le parent actuel et le nouveau, sauf si la case est décochée ou s'ils sont déjà liés. */
  const avecUnionPassee = (x: Donnees, nouveau: string): Donnees => {
    if (!parentActuel || !caseCouple?.boite.checked) return x;
    const lies = x.unions.some((u) => [u.personneA, u.personneB].includes(parentActuel.id) && [u.personneA, u.personneB].includes(nouveau));
    return lies ? x : ajouterUnion(x, parentActuel.id, nouveau, false, 'separee').donnees;
  };

  /** Parents du nouvel enfant (rôle enfant ou frère). */
  const parentsDuLien = (): Personne[] => (role === 'frere' ? parentsCoches() : couple && caseConjoint?.boite.checked ? [p, couple] : [p]);

  const indisponible = (x: Donnees, c: Personne): string | undefined => {
    const estParent = (parent: string, enfant: string) => x.filiations.some((f) => f.parent === parent && f.enfant === enfant);
    if (role === 'parent') return estParent(c.id, p.id) ? 'Déjà parent' : undefined;
    if (role === 'enfant') return estParent(p.id, c.id) ? 'Déjà enfant' : undefined;
    if (estParent(c.id, p.id)) return `Parent ${avecDe(appel(p))}`;
    if (estParent(p.id, c.id)) return `Enfant ${avecDe(appel(p))}`;
    if (sansParentConnu && fratrie(x, p.id).freresSoeurs.some((f) => f.id === c.id)) return 'Déjà frère ou sœur';
    const coches = parentsCoches();
    if (coches.length > 0 && coches.every((pa) => estParent(pa.id, c.id))) return `Déjà enfant ${avecDe(enumerer(coches.map(appel)))}`;
    return undefined;
  };

  const selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: textes.origine,
    libelleValider: textes.valider,
    // Un parent n'en compte que deux : le choix multiple ne vaut que pour les enfants et la fratrie.
    libelleValiderPlusieurs: role === 'enfant' ? (n) => `Ajouter ${n} enfants` : role === 'frere' ? (n) => `Ajouter ${n} à la fratrie` : undefined,
    // Enfant, frère ou sœur : nom du père (ou de la fiche), bouton pour l'autre parent ; la fratrie prend les parents cochés,
    // la fiche seulement si aucun n'est connu (la personne a pu changer de nom). Parent : nom de la fiche.
    noms: () => {
      const parents = role === 'enfant' || role === 'frere' ? parentsDuLien() : [];
      return nomsEnfant(parents.length > 0 ? parents : [p]);
    },
    suggestions: (x) => suggestions(x, p.id, role),
    indisponible,
    pret: role === 'frere' && !sansParentConnu ? () => parentsCoches().length > 0 : undefined,
    lier: (x, autre) =>
      role === 'parent'
        ? avecUnionPassee(ajouterFiliation(x, autre, p.id, type).donnees, autre)
        : sansParentConnu
          ? ajouterFrereSansParent(x, p.id, autre)
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
    !sansParentConnu &&
    h(
      'fieldset',
      { class: 'champ' },
      h('legend', {}, 'Enfant de'),
      h('div', { class: 'carte' }, ...casesParents.map((c) => c.noeud)),
      casesParents.length > 1 && h('p', { class: 'aide' }, 'Décoche un parent pour un demi-frère ou une demi-sœur.'),
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
      caseCouple && h('div', { class: 'carte' }, caseCouple.noeud),
      !sansParentConnu &&
        h(
          'fieldset',
          { class: 'champ' },
          h('legend', {}, 'Type de lien'),
          h('div', { class: 'choix-groupe' }, optionType('biologique', 'Biologique'), optionType('adoptif', 'Adoptif')),
        ),
      sansParentConnu &&
        h('p', { class: 'aide' }, 'Parents inconnus : les deux seront frères ou sœurs. Ajoute un parent à l’un d’eux, il le deviendra pour tous.'),
      selecteur.onglets,
      selecteur.zone,
      selecteur.pied,
    ),
  );
}
