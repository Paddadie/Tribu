// Fiche d'une personne : identité (avec le lien avec « Moi »), note, conjoint, enfants, frères et sœurs, parents,
// famille élargie déduite, ajout d'un proche, modification, suppression avec confirmation.

import { detailPersonne, libelleAge, libelleAgeDeces } from '../modele/age';
import { amis, chemin, conjoint, enfantsDuCouple, exConjoints, familleElargie, foyer, fratrie, liensEnfants, liensParents, parentsCommuns, type Lien, type Parent } from '../modele/deductions';
import { avecDe, enumerer, libelleAdoptif, libelleDeces, libelleMarie, libelleNaissance, nomComplet } from '../modele/liste';
import { aDesLiens, enCouple, supprimerAmitie, supprimerPersonne } from '../modele/modele';
import { etiquette as etiquetteMoi, libelleRelation } from '../modele/parente';
import { ficheMoi } from '../modele/reglages';
import type { Personne, Union } from '../modele/types';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { dessinChemin, dessinFoyer } from './arbre';
import { confirmer } from './confirmer';
import { h, icone, type Enfant } from './dom';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { avatarPersonne, contenuLigne } from './lignePersonne';
import { lienRetour, remplacer } from './navigation';
import { eclairer } from './surbrillance';

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
  const detail = [detailPersonne(c, new Date()), via.length > 0 && `par ${via.map((x) => x.prenom || x.nom).join(' et ')}`]
    .filter(Boolean)
    .join(' · ');
  return h('div', { class: 'ligne' }, h('a', { class: 'ligne-lien', href: `#/personne/${c.id}` }, ...contenuLigne(c, undefined, detail)));
}

/** Frères et sœurs, puis demi-frères et demi-sœurs ; une section vide est masquée. */
function sectionsFratrie(p: Personne): (HTMLElement | null)[] {
  const d = lireDonnees();
  const { freresSoeurs, demis } = fratrie(d, p.id);
  const freres = freresSoeurs.length > 0 ? section('Frères et sœurs', ...freresSoeurs.map((f) => ligneFratrie(f))) : null;
  // Cible de la pile de la fratrie dans le dessin « Famille proche ».
  if (freres) freres.id = 'section-fratrie';
  return [
    freres,
    demis.length > 0 ? section('Demi-frères et demi-sœurs', ...demis.map((f) => ligneFratrie(f, parentsCommuns(d, p.id, f.id)))) : null,
  ];
}

function section(titre: string, ...lignes: HTMLElement[]): HTMLElement {
  return h('section', {}, h('h2', { class: 'titre-section' }, titre), h('div', { class: 'carte' }, ...lignes));
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Lien de la fiche avec ma fiche, sans possessif (« Cousine », « Toi », « Compagne de Karim ») ; rien si « Moi » n'est pas choisi ou sans lien nommé. */
function lienMoi(p: Personne): string | undefined {
  const moi = ficheMoi(lireReglages(), lireDonnees());
  return moi && etiquetteMoi(lireDonnees(), moi.id, p.id);
}

/** Dessins « Lien avec toi » (seulement à partir de deux étapes) et « Famille proche » (s'il y a un parent, un conjoint ou un enfant). */
function sectionsDessins(p: Personne): (HTMLElement | null)[] {
  const d = lireDonnees();
  const moi = ficheMoi(lireReglages(), d)?.id;
  const etapes = moi ? chemin(d, moi, p.id) : undefined;
  const f = foyer(d, p.id, moi);
  const dessin = (titre: string, contenu: HTMLElement) => h('section', {}, h('h2', { class: 'titre-section' }, titre), contenu);
  return [
    etapes && moi && etapes.length > 2 ? dessin('Lien avec toi', dessinChemin(etapes, moi)) : null,
    f.parents.length > 0 || f.conjoint || f.enfants.length > 0 ? dessin('Famille proche', dessinFoyer(p, f, moi)) : null,
  ];
}

/** Amis de la personne, chacun avec une croix pour retirer l'amitié (annulable) ; rien s'il n'y en a pas. Un échec s'affiche dans `erreur`. */
function sectionAmis(p: Personne, erreur: HTMLElement): HTMLElement | null {
  const liste = amis(lireDonnees(), p.id);
  if (liste.length === 0) return null;
  const retirer = (id: string, ami: Personne) => {
    try {
      changerAvecAnnulation((x) => supprimerAmitie(x, id), `${p.prenom || p.nom} et ${ami.prenom || ami.nom} ne sont plus amis.`, 'Amitié rétablie.');
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Retrait impossible';
      erreur.hidden = false;
      return;
    }
    rafraichirEcran();
  };
  return section(
    'Amis',
    ...liste.map(({ amitie, personne }) =>
      h(
        'div',
        { class: 'ligne ligne-union' },
        h('a', { class: 'ligne-lien', href: `#/personne/${personne.id}` }, ...contenuLigne(personne)),
        h(
          'button',
          { type: 'button', class: 'bouton-icone', 'aria-label': `Retirer ${personne.prenom || personne.nom} des amis`, onclick: () => retirer(amitie.id, personne) },
          icone('croix', 20),
        ),
      ),
    ),
  );
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
    sec('Grands-parents', f.grandsParents),
    sec('Petits-enfants', f.petitsEnfants),
    sec('Oncles et tantes', f.onclesTantes),
    sec('Neveux et nièces', f.neveuxNieces),
    sec('Cousins et cousines', f.cousins),
    sec('Belle-famille', f.belleFamille, true),
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

/** Ligne d'un conjoint ou d'un ex : naissance, âge, enfants du couple, étiquette « Marié(e) » ; le crayon ouvre l'union. */
function ligneUnion(p: Personne, { union, personne: c }: { union: Union; personne: Personne }): HTMLElement {
  const n = enfantsDuCouple(lireDonnees(), p.id, c.id).length;
  const detail = [detailPersonne(c, new Date()), n > 0 && `${n} enfant${n > 1 ? 's' : ''} ensemble`].filter(Boolean).join(' · ');
  return ligneProche(c, union.marie && h('span', { class: 'etiquette' }, libelleMarie(c.sexe)), `#/union/${union.id}/${p.id}`, 'Modifier l’union', detail);
}

/** Conjoint actuel (un seul) touchable, puis les ex-conjoints sous leur propre titre ; rien s'il n'y en a pas. */
function sectionsConjoint(p: Personne): (HTMLElement | null)[] {
  const d = lireDonnees();
  const actuel = conjoint(d, p.id);
  const ex = exConjoints(d, p.id);
  return [
    actuel ? section('Conjoint', ligneUnion(p, actuel)) : null,
    ex.length > 0 ? section(ex.length > 1 ? 'Ex-conjoints' : 'Ex-conjoint', ...ex.map((e) => ligneUnion(p, e))) : null,
  ];
}

/**
 * Feuille « Ajouter un proche » : conjoint, parent, enfant, frère ou sœur, ami.
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
    option('Un ami', 'Déjà dans la liste ou nouveau', 'ami', `#/ami/${p.id}`),
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
  const maintenant = new Date();
  // Naissance, décès, puis âge (« 34 ans » ou « Morte à 82 ans ») sur sa propre ligne, plus appuyée.
  const dates = [libelleNaissance(p.naissance, p.sexe), libelleDeces(p.deces, p.sexe)]
    .filter(Boolean)
    .map((t) => h('span', {}, majuscule(t)));
  const age = p.deces ? libelleAgeDeces(p, maintenant) : libelleAge(p, maintenant);
  if (age) dates.push(h('span', { class: 'age' }, majuscule(age)));
  const lien = lienMoi(p);
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const supprimer = async () => {
    const message = `Supprimer ${nomComplet(p)} ?` + (aDesLiens(lireDonnees(), p.id) ? ' Ses liens seront aussi supprimés.' : '');
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

  const ecran = h(
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
      avatarPersonne(p, true),
      h('h1', {}, nomComplet(p)),
      lien && h('span', { class: 'lien-moi' }, lien),
      dates.length > 0 && h('span', { class: 'dates secondaire' }, ...dates),
    ),
    h(
      'div',
      { class: 'contenu' },
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'Note'), h('p', {}, p.note)),
      ...sectionsDessins(p),
      ...sectionsConjoint(p),
      sectionFiliation('Enfants', liensEnfants(lireDonnees(), p.id), p),
      ...sectionsFratrie(p),
      sectionFiliation('Parents', liensParents(lireDonnees(), p.id), p),
      ...sectionsElargies(p),
      sectionAmis(p, erreur),
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => ouvrirChoixProche(p) }, icone('plus', 18), 'Ajouter un proche'),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
      erreur,
    ),
  );
  eclairer(ecran);
  return ecran;
}
