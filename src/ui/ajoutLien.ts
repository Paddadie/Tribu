// Ajout d'un parent, d'un enfant ou d'un frère / d'une sœur à une personne : choisir une personne
// existante ou en créer une, puis préciser le lien (biologique ou adoptif).
// Enfant : l'autre parent se choisit parmi le conjoint, les conjoints défunts, les ex et les coparents (`autresParents`).
// Parent : le nouveau parent l'est aussi de la fratrie présumée (cases cochées d'office) ; si l'enfant n'avait qu'un
// parent, les deux sont reliés par une union (en couple, mariés ou séparés), avec un avertissement si une union en cours
// passe en « séparés ».
// Frère ou sœur : enfant des parents cochés (un seul coché : demi-frère ou demi-sœur) ; sans parent connu,
// pas de case : le lien passe par un parent inconnu créé en coulisse.
// Les personnes déjà liées ne sont pas choisissables. Après une création, la fiche de la nouvelle personne s'ouvre.

import { fratrie, liensParents } from '../modele/deductions';
import { accorder, avecDe, enumerer, nomComplet, prenomOuNom } from '../modele/liste';
import { ajouterFiliations, ajouterFrereSansParent, fratriePresumee, unirParents } from '../modele/modele';
import { autresParents, nomsEnfant, nomsFratrie, nomsParent, suggestions } from '../modele/saisie';
import type { Donnees, Personne, TypeFiliation } from '../modele/types';
import { h, icone } from './dom';
import { avatarPersonne } from './lignePersonne';
import { apresAjout, garderSaisie, lienRetour } from './navigation';
import { selecteurPersonne, type Selecteur } from './selecteurPersonne';
import { choixUnionParents } from './unionParents';

export type RoleLien = 'parent' | 'enfant' | 'frere';

const TEXTES = {
  parent: { titre: 'Ajouter un parent', valider: 'Ajouter ce parent', origine: 'Origine du parent' },
  enfant: { titre: 'Ajouter un enfant', valider: 'Ajouter cet enfant', origine: 'Origine de l’enfant' },
  frere: { titre: 'Ajouter un frère ou une sœur', valider: 'Ajouter à la fratrie', origine: 'Origine du frère ou de la sœur' },
} as const;

/** Case (ou bouton radio) en carte : libellé et précision. */
function caseACocher(
  libelle: string,
  detail: string,
  onchange: () => void,
  radio?: { name: string; checked: boolean },
): { noeud: HTMLElement; boite: HTMLInputElement } {
  const boite = h('input', { type: radio ? 'radio' : 'checkbox', name: radio?.name, class: 'boite', checked: radio ? radio.checked : true, onchange });
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
  // Le sélecteur prévient d'un changement de choix dès sa construction : il n'existe pas encore à ce moment-là.
  let selecteur: Selecteur | undefined;
  const rafraichir = () => selecteur?.rafraichir();

  // Enfant : l'autre parent, le premier proposé coché d'office ; la dernière option n'en ajoute aucun.
  const candidats = role === 'enfant' ? autresParents(d, p.id) : [];
  const optionsAutre = candidats.map((c, i) => ({
    personne: c.personne,
    ...caseACocher(nomComplet(c.personne), c.detail, rafraichir, { name: 'autre-parent', checked: i === 0 }),
  }));
  const sansAutre = caseACocher('Autre parent ou inconnu', '', rafraichir, { name: 'autre-parent', checked: false });
  const autreParent = () => optionsAutre.find((o) => o.boite.checked)?.personne;

  // Frère ou sœur : une case par parent connu, toutes cochées.
  const parentsConnus = role === 'frere' ? liensParents(d, p.id).map((l) => l.personne) : [];
  const casesParents = parentsConnus.map((pa) => ({
    pa,
    ...caseACocher(nomComplet(pa), accorder(pa.sexe, 'Son père', 'Sa mère', 'Son parent'), rafraichir),
  }));
  const sansParentConnu = role === 'frere' && parentsConnus.length === 0;
  const parentsCoches = () => casesParents.filter((c) => c.boite.checked).map((c) => c.pa);

  // Parent : l'unique parent connu de l'enfant, à relier au nouveau par une union.
  const liens = role === 'parent' ? liensParents(d, p.id) : [];
  const parentActuel = liens.length === 1 ? liens[0].personne : undefined;

  // Parent : fratrie présumée (enfants du même seul parent connu), cochée d'office et recalculée selon le type de lien.
  const carteFreres = h('div', { class: 'carte' });
  let casesFreres: { f: Personne; noeud: HTMLElement; boite: HTMLInputElement }[] = [];
  const blocFreres = h(
    'fieldset',
    { class: 'champ' },
    h('legend', {}, 'Aussi parent de'),
    carteFreres,
    h('p', { class: 'aide' }, 'Décoche pour un demi-frère ou une demi-sœur.'),
  );
  const dessinerFreres = () => {
    const presumes = role === 'parent' ? fratriePresumee(d, p.id, type) : [];
    const seul = parentActuel ? ` · même seul parent connu, ${prenomOuNom(parentActuel)}` : '';
    casesFreres = presumes.map((f) => ({
      f,
      ...caseACocher(nomComplet(f), `${accorder(f.sexe, 'Frère', 'Sœur', 'Frère ou sœur')} ${avecDe(prenomOuNom(p))}${seul}`, () => undefined),
    }));
    carteFreres.replaceChildren(...casesFreres.map((c) => c.noeud));
    blocFreres.hidden = casesFreres.length === 0;
  };
  dessinerFreres();

  // Parent : union avec le parent actuel (une personne créée n'a pas encore d'union).
  const nouveauParent = () => (selecteur?.mode() === 'existante' ? selecteur.choisie()?.id : undefined) ?? 'nouvelle';
  const union = parentActuel && choixUnionParents(d, parentActuel, nouveauParent);

  /** Parents du nouvel enfant (rôle enfant ou frère). */
  const parentsDuLien = (): Personne[] => {
    if (role === 'frere') return parentsCoches();
    const autre = autreParent();
    return autre ? [p, autre] : [p];
  };

  const indisponible = (x: Donnees, c: Personne): string | undefined => {
    const estParent = (parent: string, enfant: string) => x.filiations.some((f) => f.parent === parent && f.enfant === enfant);
    if (role === 'parent') return estParent(c.id, p.id) ? 'Déjà parent' : undefined;
    if (role === 'enfant') return estParent(p.id, c.id) ? 'Déjà enfant' : undefined;
    if (estParent(c.id, p.id)) return `Parent ${avecDe(prenomOuNom(p))}`;
    if (estParent(p.id, c.id)) return `Enfant ${avecDe(prenomOuNom(p))}`;
    if (sansParentConnu && fratrie(x, p.id).freresSoeurs.some((f) => f.id === c.id)) return 'Déjà frère ou sœur';
    const coches = parentsCoches();
    if (coches.length > 0 && coches.every((pa) => estParent(pa.id, c.id))) return `Déjà enfant ${avecDe(enumerer(coches.map(prenomOuNom)))}`;
    return undefined;
  };

  const lierParent = (x: Donnees, autre: string): Donnees => {
    const relie = ajouterFiliations(
      x,
      [autre],
      p.id,
      type,
      casesFreres.filter((c) => c.boite.checked).map((c) => c.f.id),
    );
    const choix = union?.choix();
    return parentActuel && choix ? unirParents(relie, parentActuel.id, autre, choix) : relie;
  };

  selecteur = selecteurPersonne({
    personne: p,
    libelleOrigine: textes.origine,
    libelleValider: textes.valider,
    // Un parent n'en compte que deux : le choix multiple ne vaut que pour les enfants et la fratrie.
    libelleValiderPlusieurs: role === 'enfant' ? (n) => `Ajouter ${n} enfants` : role === 'frere' ? (n) => `Ajouter ${n} à la fratrie` : undefined,
    // Enfant : nom du père (ou de la fiche), bouton pour l'autre parent. Frère ou sœur : nom de naissance de la fiche
    // d'abord, puis ceux des parents cochés. Parent : nom de naissance de la fiche.
    noms: () => (role === 'frere' ? nomsFratrie(p, parentsCoches()) : role === 'enfant' ? nomsEnfant(parentsDuLien()) : nomsParent(p)),
    suggestions: (x) => suggestions(x, p.id, role),
    indisponible,
    pret: role === 'frere' && !sansParentConnu ? () => parentsCoches().length > 0 : undefined,
    surChoix: () => union?.maj(),
    lier: (x, autre) =>
      role === 'parent'
        ? lierParent(x, autre)
        : sansParentConnu
          ? ajouterFrereSansParent(x, p.id, autre)
          : ajouterFiliations(
              x,
              parentsDuLien().map((pa) => pa.id),
              autre,
              type,
            ),
    apres: (idNouvelle) => apresAjout(retour, idNouvelle),
  });
  const choix = selecteur;
  garderSaisie(choix.modifie);

  const optionType = (valeur: TypeFiliation, libelle: string) =>
    h(
      'label',
      { class: 'choix' },
      h('input', {
        type: 'radio',
        name: 'type-lien',
        value: valeur,
        checked: valeur === type,
        onchange: () => {
          type = valeur;
          dessinerFreres();
        },
      }),
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

  const champAutreParent =
    optionsAutre.length > 0 &&
    h('fieldset', { class: 'champ' }, h('legend', {}, 'Autre parent'), h('div', { class: 'carte' }, ...optionsAutre.map((o) => o.noeud), sansAutre.noeud));

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
      h('p', { class: 'contexte' }, avatarPersonne(p), 'pour ', h('b', {}, nomComplet(p))),
      champsParents,
      champAutreParent,
      role === 'parent' && blocFreres,
      sansParentConnu &&
        h('p', { class: 'aide' }, 'Parents inconnus : les deux seront frères ou sœurs. Ajoute un parent à l’un d’eux, il le deviendra pour tous.'),
      choix.onglets,
      choix.zone,
      union?.noeud,
      !sansParentConnu &&
        h(
          'fieldset',
          { class: 'champ' },
          h('legend', {}, 'Type de lien'),
          h('div', { class: 'choix-groupe' }, optionType('biologique', 'Biologique'), optionType('adoptif', 'Adoptif')),
        ),
      choix.pied,
    ),
  );
}
