// Fiche d'une personne : identité (avec le lien avec « Moi »), note, conjoint, enfants, frères et sœurs, parents,
// famille élargie déduite, ajout d'un proche, modification, suppression avec confirmation.

import { conjoint, enfantsDuCouple, familleElargie, fratrie, liensEnfants, liensParents, parentsCommuns, type Lien, type Parent } from '../modele/deductions';
import { avecDe, enumerer, initiales, libelleAdoptif, libelleMarie, libelleNaissance, nomComplet } from '../modele/liste';
import { aDesLiens, enCouple, supprimerPersonne } from '../modele/modele';
import { libelleRelation, lienAvecMoi } from '../modele/parente';
import { ficheMoi } from '../modele/reglages';
import type { Personne } from '../modele/types';
import { confirmer } from './confirmer';
import { h, icone, type Enfant } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { contenuLigne } from './lignePersonne';
import { lienRetour, remplacer } from './navigation';

/** Ligne touchable vers la fiche d'une personne, avec une étiquette et un crayon vers l'écran de gestion du lien. */
function ligneProche(c: Personne, etiquette: Enfant, hrefModifier: string, libelleModifier: string, detail?: string): HTMLElement {
  return h(
    'div',
    { class: 'ligne ligne-union' },
    h('a', { class: 'ligne-lien', href: `#/personne/${c.id}` }, ...contenuLigne(c, undefined, detail), etiquette),
    h('a', { class: 'bouton-icone', href: hrefModifier, 'aria-label': libelleModifier }, icone('crayon', 20)),
  );
}

/** Ligne touchable d'un frère, d'une sœur ou d'un demi : déduite des parents, donc sans crayon. `via` = parents communs (demis). */
function ligneFratrie(c: Personne, via: Personne[] = []): HTMLElement {
  const detail = [libelleNaissance(c.naissance, c.sexe), via.length > 0 && `par ${via.map((x) => x.prenom || x.nom).join(' et ')}`]
    .filter(Boolean)
    .join(' · ');
  return h('div', { class: 'ligne' }, h('a', { class: 'ligne-lien', href: `#/personne/${c.id}` }, ...contenuLigne(c, undefined, detail)));
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

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Lien de la fiche avec ma fiche (« Ta cousine ») ; rien si « Moi » n'est pas choisi ou si le lien n'a pas de nom. */
function lienMoi(p: Personne): string | undefined {
  const moi = ficheMoi(lireReglages(), lireDonnees());
  const lien = moi && lienAvecMoi(lireDonnees(), moi.id, p.id);
  return lien ? majuscule(lien) : undefined;
}

/** Ligne touchable d'une personne de la famille élargie : déduite, donc sans crayon. */
function ligneElargie({ personne, relation }: Parent, belleFamille: boolean): HTMLElement {
  const moi = lireReglages().moi;
  let etiquette: HTMLElement | false = false;
  if (personne.id === moi) etiquette = h('span', { class: 'etiquette' }, 'Toi');
  else if (belleFamille) {
    const libelle = libelleRelation(relation, personne.sexe);
    etiquette = !!libelle && h('span', { class: 'etiquette' }, majuscule(libelle));
  } else if (relation.type === 'alliance') etiquette = h('span', { class: 'etiquette etiquette-adoptif' }, 'Par alliance');
  return h('div', { class: 'ligne' }, h('a', { class: 'ligne-lien', href: `#/personne/${personne.id}` }, ...contenuLigne(personne), etiquette));
}

/** Grands-parents, petits-enfants, oncles et tantes, neveux et nièces, cousins, belle-famille ; une section vide est masquée. */
function sectionsElargies(p: Personne): (HTMLElement | null)[] {
  const f = familleElargie(lireDonnees(), p.id);
  const sec = (titre: string, liens: Parent[], belleFamille = false) =>
    liens.length > 0 ? section(titre, ...liens.map((l) => ligneElargie(l, belleFamille))) : null;
  return [
    sec('GRANDS-PARENTS', f.grandsParents),
    sec('PETITS-ENFANTS', f.petitsEnfants),
    sec('ONCLES ET TANTES', f.onclesTantes),
    sec('NEVEUX ET NIÈCES', f.neveuxNieces),
    sec('COUSINS ET COUSINES', f.cousins),
    sec('BELLE-FAMILLE', f.belleFamille, true),
  ];
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

/** Conjoint actuel (un seul) touchable, avec accès à l'union et le nombre d'enfants du couple ; rien s'il n'y en a pas. */
function sectionConjoint(p: Personne): HTMLElement | null {
  const d = lireDonnees();
  const lien = conjoint(d, p.id);
  if (!lien) return null;
  const { union, personne: c } = lien;
  const n = enfantsDuCouple(d, p.id, c.id).length;
  const detail = [libelleNaissance(c.naissance, c.sexe), n > 0 && `${n} enfant${n > 1 ? 's' : ''} ensemble`].filter(Boolean).join(' · ');
  return section('CONJOINT', ligneProche(c, union.marie && h('span', { class: 'etiquette' }, libelleMarie(c.sexe)), `#/union/${p.id}`, 'Modifier l’union', detail));
}

/**
 * Feuille « Ajouter un proche » : conjoint, parent, enfant, frère ou sœur.
 * Le conjoint est grisé s'il y en a déjà un ; le frère ou la sœur tant qu'aucun parent n'est connu.
 */
function ouvrirChoixProche(p: Personne): void {
  const d = lireDonnees();
  const aConjoint = enCouple(d, p.id);
  const parents = liensParents(d, p.id).map((l) => l.personne.prenom || l.personne.nom);
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
    option('Un frère ou une sœur', parents.length > 0 ? `Enfant ${avecDe(enumerer(parents))}` : 'Ajoutez d’abord un parent', 'cote', `#/frere/${p.id}`, parents.length === 0),
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

export function fiche(p: Personne): HTMLElement {
  const naissance = libelleNaissance(p.naissance, p.sexe);
  const lien = lienMoi(p);
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const supprimer = async () => {
    const message = `Supprimer ${nomComplet(p)} ?` + (aDesLiens(lireDonnees(), p.id) ? ' Ses liens familiaux seront aussi supprimés.' : '');
    if (!(await confirmer(message, 'Supprimer'))) return;
    erreur.hidden = true;
    try {
      modifierDonnees((x) => supprimerPersonne(x, p.id));
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Suppression impossible';
      erreur.hidden = false;
      return;
    }
    remplacer('#/');
  };

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour('#/', { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)),
      h('a', { class: 'bouton bouton-pilule', href: `#/modifier/${p.id}` }, icone('crayon', 18), 'Modifier'),
    ),
    h(
      'div',
      { class: 'identite' },
      h('span', { class: 'avatar avatar-grand' }, initiales(p)),
      h('h1', {}, nomComplet(p)),
      lien && h('span', { class: 'lien-moi' }, lien),
      naissance && h('span', { class: 'secondaire' }, naissance),
    ),
    h(
      'div',
      { class: 'contenu' },
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'NOTE'), h('p', {}, p.note)),
      sectionConjoint(p),
      sectionFiliation('ENFANTS', liensEnfants(lireDonnees(), p.id), p),
      ...sectionsFratrie(p),
      sectionFiliation('PARENTS', liensParents(lireDonnees(), p.id), p),
      ...sectionsElargies(p),
      h('button', { type: 'button', class: 'bouton', onclick: () => ouvrirChoixProche(p) }, icone('plus', 18), 'Ajouter un proche'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
      erreur,
    ),
  );
}
