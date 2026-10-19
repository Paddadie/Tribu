// Fiche d'une personne : identité, conjoint, enfants, frères et sœurs, parents, note, modification, suppression avec confirmation.

import { conjoint, fratrie, liensEnfants, liensParents, parentsCommuns, type Lien } from '../modele/deductions';
import { initiales, libelleAdoptif, libelleMarie, libelleNaissance, nomComplet } from '../modele/liste';
import { supprimerPersonne } from '../modele/modele';
import type { Personne } from '../modele/types';
import { confirmer } from './confirmer';
import { h, icone, type Enfant } from './dom';
import { lireDonnees, modifierDonnees } from './etat';

/** Ligne touchable vers la fiche d'une personne, avec une étiquette et un crayon vers l'écran de gestion du lien. */
function ligneProche(c: Personne, etiquette: Enfant, hrefModifier: string, libelleModifier: string): HTMLElement {
  const detail = libelleNaissance(c.naissance, c.sexe);
  return h(
    'div',
    { class: 'ligne ligne-union' },
    h(
      'a',
      { class: 'ligne-lien', href: `#/personne/${c.id}` },
      h('span', { class: 'avatar' }, initiales(c)),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(c)), detail && h('span', { class: 'secondaire' }, detail)),
      etiquette,
    ),
    h('a', { class: 'bouton-icone', href: hrefModifier, 'aria-label': libelleModifier }, icone('crayon', 20)),
  );
}

/** Ligne touchable d'un frère, d'une sœur ou d'un demi : déduite des parents, donc sans crayon. `via` = parents communs (demis). */
function ligneFratrie(c: Personne, via: Personne[] = []): HTMLElement {
  const detail = [libelleNaissance(c.naissance, c.sexe), via.length > 0 && `par ${via.map((x) => x.prenom || x.nom).join(' et ')}`]
    .filter(Boolean)
    .join(' · ');
  return h(
    'div',
    { class: 'ligne' },
    h(
      'a',
      { class: 'ligne-lien', href: `#/personne/${c.id}` },
      h('span', { class: 'avatar' }, initiales(c)),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(c)), detail && h('span', { class: 'secondaire' }, detail)),
    ),
  );
}

/** Frères et sœurs, puis demi-frères et demi-sœurs ; une section vide est masquée. */
function sectionsFratrie(p: Personne): (HTMLElement | null)[] {
  const d = lireDonnees();
  const { freresSoeurs, demis } = fratrie(d, p.id);
  return [
    freresSoeurs.length > 0 ? section('FRÈRES ET SŒURS', ...freresSoeurs.map((f) => ligneFratrie(f))) : null,
    demis.length > 0 ? section('DEMI-FRÈRES ET DEMI-SŒURS', ...demis.map((f) => ligneFratrie(f, parentsCommuns(d, p.id, f.id)))) : null,
  ];
}

function section(titre: string, ...lignes: HTMLElement[]): HTMLElement {
  return h('section', {}, h('h2', { class: 'titre-section' }, titre), h('div', { class: 'carte' }, ...lignes));
}

/** Parents ou enfants d'un côté de la fiche ; rien n'est affiché s'il n'y en a pas. */
function sectionFiliation(titre: string, liens: Lien[], p: Personne): HTMLElement | null {
  if (liens.length === 0) return null;
  return section(
    titre,
    ...liens.map(({ filiation, personne }) =>
      ligneProche(
        personne,
        filiation.type === 'adoptif' && h('span', { class: 'etiquette etiquette-adoptif' }, libelleAdoptif(personne.sexe)),
        `#/lien/${filiation.id}/${p.id}`,
        'Modifier le lien',
      ),
    ),
  );
}

/** Conjoint actuel (un seul) touchable, avec accès à l'union ; rien s'il n'y en a pas. */
function sectionConjoint(p: Personne): HTMLElement | null {
  const lien = conjoint(lireDonnees(), p.id);
  if (!lien) return null;
  const { union, personne: c } = lien;
  return section('CONJOINT', ligneProche(c, union.marie && h('span', { class: 'etiquette' }, libelleMarie(c.sexe)), `#/union/${p.id}`, 'Modifier l’union'));
}

/** Feuille « Ajouter un proche » : conjoint, parent ou enfant. Le conjoint est grisé s'il y en a déjà un. */
function ouvrirChoixProche(p: Personne): void {
  const aConjoint = conjoint(lireDonnees(), p.id) !== undefined;
  const fermer = () => {
    dialogue.close();
    dialogue.remove();
  };
  const option = (libelle: string, aide: string, trace: Parameters<typeof icone>[0], href: string, inactive = false) => {
    const contenu = [
      h('span', { class: 'pastille' }, icone(trace, 20)),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, libelle), h('span', { class: 'secondaire' }, aide)),
    ];
    return inactive
      ? h('div', { class: 'option inactive', 'aria-disabled': 'true' }, ...contenu)
      : h('a', { class: 'option', href, onclick: fermer }, ...contenu);
  };
  const dialogue = h(
    'dialog',
    { class: 'feuille', 'aria-label': 'Ajouter un proche', oncancel: fermer },
    h('h2', { class: 'feuille-titre' }, `Qui ajouter pour ${p.prenom || p.nom} ?`),
    option('Un conjoint', aConjoint ? 'Un seul conjoint à la fois' : 'Déjà dans la liste ou nouveau', 'coeur', `#/conjoint/${p.id}`, aConjoint),
    option('Un parent', 'Biologique ou adoptif', 'haut', `#/parent/${p.id}`),
    option('Un enfant', 'Biologique ou adoptif', 'bas', `#/enfant/${p.id}`),
    h('button', { type: 'button', class: 'bouton', onclick: fermer }, 'Annuler'),
  );
  // Un toucher sur le fond (hors de la feuille) ferme aussi.
  dialogue.addEventListener('click', (e) => {
    const r = dialogue.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) fermer();
  });
  document.body.append(dialogue);
  dialogue.showModal();
}

export function fiche(p: Personne, naviguer: (route: string) => void): HTMLElement {
  const naissance = libelleNaissance(p.naissance, p.sexe);
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const supprimer = async () => {
    const d = lireDonnees();
    const aDesLiens =
      d.unions.some((u) => u.personneA === p.id || u.personneB === p.id) ||
      d.filiations.some((f) => f.parent === p.id || f.enfant === p.id);
    const message = `Supprimer ${nomComplet(p)} ?` + (aDesLiens ? ' Ses liens familiaux seront aussi supprimés.' : '');
    if (!(await confirmer(message, 'Supprimer'))) return;
    erreur.hidden = true;
    try {
      modifierDonnees((x) => supprimerPersonne(x, p.id));
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Suppression impossible';
      erreur.hidden = false;
      return;
    }
    naviguer('#/');
  };

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      h('a', { class: 'bouton-icone', href: '#/', 'aria-label': 'Retour à la liste' }, icone('retour', 26)),
      h('a', { class: 'bouton bouton-pilule', href: `#/modifier/${p.id}` }, icone('crayon', 18), 'Modifier'),
    ),
    h(
      'div',
      { class: 'identite' },
      h('span', { class: 'avatar avatar-grand' }, initiales(p)),
      h('h1', {}, nomComplet(p)),
      naissance && h('span', { class: 'secondaire' }, naissance),
    ),
    h(
      'div',
      { class: 'contenu' },
      sectionConjoint(p),
      sectionFiliation('ENFANTS', liensEnfants(lireDonnees(), p.id), p),
      ...sectionsFratrie(p),
      sectionFiliation('PARENTS', liensParents(lireDonnees(), p.id), p),
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => ouvrirChoixProche(p) }, icone('plus', 18), 'Ajouter un proche'),
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'NOTE'), h('p', {}, p.note)),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
      erreur,
    ),
  );
}
