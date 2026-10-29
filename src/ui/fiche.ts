// Fiche d'une personne : identité (avec le lien avec « Moi »), note, conjoint, enfants, frères et sœurs, parents,
// famille élargie déduite, ajout d'un proche, modification, suppression avec confirmation.

import { detailProche, libelleAge, libelleAgeDeces } from '../modele/age';
import {
  chemin,
  nomGroupe,
  conjoint,
  enfantsDuCouple,
  conjointsDefunts,
  exConjoints,
  familleElargie,
  fratrie,
  liensEnfants,
  liensParents,
  parentsCommuns,
  sontFiances,
  type Lien,
  type Parent,
} from '../modele/deductions';
import {
  accorder,
  avecDe,
  comparateur,
  enumerer,
  libelleAdoptif,
  libelleDeces,
  libelleFiance,
  libelleMarie,
  libelleNaissance,
  libelleUnion,
  majuscule,
  nomComplet,
  prenomOuNom,
} from '../modele/liste';
import { aDesLiens, enCouple, estDecede, groupesDe, retirerDuGroupe, supprimerPersonne } from '../modele/modele';
import { etiquette as etiquetteMoi, libelleRelation, optionsLien } from '../modele/parente';
import { estParentSansNom } from '../modele/parentSansNom';
import { ficheMoi } from '../modele/reglages';
import type { GroupeAmis, Personne, Union } from '../modele/types';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { aDuMonde, familleProche } from '../modele/familleProche';
import { dessinChemin, dessinFoyer } from './arbre';
import { confirmer } from './confirmer';
import { h, icone, type Enfant } from './dom';
import { boutonRetour } from './ecran';
import { lireDonnees, lireReglages, modifierDonnees } from './etat';
import { avatarPersonne, contenuLigne } from './lignePersonne';
import { remplacer } from './navigation';
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
  const lien = via.length > 0 ? accorder(c.sexe, 'demi-frère', 'demi-sœur', 'demi-frère ou demi-sœur') : accorder(c.sexe, 'frère', 'sœur', 'frère ou sœur');
  const par = via.length > 0 && `par ${via.map((x) => x.prenom || x.nom).join(' et ')}`;
  const detail = [detailProche(c, new Date(), lien), par].filter(Boolean).join(' · ');
  return h('div', { class: 'ligne' }, h('a', { class: 'ligne-lien', href: `#/personne/${c.id}` }, ...contenuLigne(c, undefined, detail)));
}

/** Parents (avec crayon), puis frères et sœurs et demis (déduits) réunis dans une seule section ; vide, elle est masquée. */
function sectionParentsFratrie(p: Personne): HTMLElement | null {
  const d = lireDonnees();
  const parents = liensParents(d, p.id);
  const { freresSoeurs, demis } = fratrie(d, p.id);
  const lignes = [
    ...parents.map((l) => ligneParent(l, p)),
    ...freresSoeurs.map((f) => ligneFratrie(f)),
    ...demis.map((f) => ligneFratrie(f, parentsCommuns(d, p.id, f.id))),
  ];
  if (lignes.length === 0) return null;
  const fratrieAussi = freresSoeurs.length + demis.length > 0;
  return section(parents.length === 0 ? 'Frères et sœurs' : fratrieAussi ? 'Parents et fratrie' : 'Parents', ...lignes);
}

function ligneParent({ filiation, personne }: Lien, p: Personne): HTMLElement {
  return ligneProche(
    personne,
    filiation.type === 'adoptif' && h('span', { class: 'etiquette etiquette-adoptif' }, libelleAdoptif(personne.sexe)),
    `#/lien/${filiation.id}/${p.id}`,
    'Modifier le lien',
    detailProche(personne, new Date(), accorder(personne.sexe, 'père', 'mère', 'parent')),
  );
}

function section(titre: string, ...lignes: HTMLElement[]): HTMLElement {
  return h('section', {}, h('h2', { class: 'titre-section' }, titre), h('div', { class: 'carte' }, ...lignes));
}

/** Seuil au-delà duquel une section de famille élargie est repliée par défaut (ouverte en dessous). */
const SEUIL_REPLI = 6;

/** Section repliable : au-delà de SEUIL_REPLI lignes, elle est fermée et le titre annonce le nombre de personnes. */
function sectionRepliable(titre: string, ...lignes: HTMLElement[]): HTMLElement {
  if (lignes.length <= SEUIL_REPLI) return section(titre, ...lignes);
  return h('details', { class: 'repli' }, h('summary', { class: 'titre-section' }, `${titre} (${lignes.length})`), h('div', { class: 'carte' }, ...lignes));
}

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
  const f = familleProche(d, p.id, moi);
  const dessin = (titre: string, contenu: HTMLElement) => h('section', {}, h('h2', { class: 'titre-section' }, titre), contenu);
  return [
    etapes && moi && (etapes.length > 2 || estParentSansNom(p)) ? dessin('Lien avec toi', dessinChemin(etapes, moi, d)) : null,
    aDuMonde(f) ? dessin('Famille proche', dessinFoyer(f)) : null,
  ];
}

/**
 * Amis de la personne, par groupe : le nom du groupe (lien vers sa gestion), ses autres membres, et une croix
 * pour quitter le groupe (annulable). Rien si la personne n'est dans aucun groupe. Un échec s'affiche dans `erreur`.
 */
function sectionAmis(p: Personne, erreur: HTMLElement): HTMLElement | null {
  const d = lireDonnees();
  const groupes = groupesDe(d, p.id);
  if (groupes.length === 0) return null;
  const quitter = (g: GroupeAmis) => {
    try {
      const nom = nomGroupe(d, g);
      changerAvecAnnulation((x) => retirerDuGroupe(x, g.id, p.id), `${prenomOuNom(p)} a quitté « ${nom} ».`, 'Groupe rétabli.');
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Retrait impossible';
      erreur.hidden = false;
      return;
    }
    rafraichirEcran();
  };
  return section(
    'Amis',
    ...groupes.map((g) =>
      h(
        'div',
        { class: 'groupe-amis' },
        h(
          'div',
          { class: 'groupe-amis-titre' },
          h('a', { class: 'groupe-amis-nom', href: `#/groupe/${g.id}` }, nomGroupe(d, g)),
          h(
            'button',
            { type: 'button', class: 'bouton-icone', 'aria-label': `Quitter le groupe ${nomGroupe(d, g)}`, onclick: () => quitter(g) },
            icone('croix', 20),
          ),
        ),
        ...d.personnes
          .filter((m) => g.membres.includes(m.id) && m.id !== p.id)
          .sort(comparateur('prenom'))
          .map((m) => h('div', { class: 'ligne ligne-union' }, h('a', { class: 'ligne-lien', href: `#/personne/${m.id}` }, ...contenuLigne(m)))),
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
    const libelle = libelleRelation(relation, personne.sexe, optionsLien(lireDonnees(), relation, personne));
    etiquette = !!libelle && h('span', { class: 'etiquette' }, majuscule(libelle));
  } else if (relation.type === 'alliance') etiquette = h('span', { class: 'etiquette etiquette-adoptif' }, 'Par alliance');
  return h(
    'div',
    { class: 'ligne' },
    h('a', { class: 'ligne-lien', href: `#/personne/${personne.id}` }, ...contenuLigne(personne, undefined, detailProche(personne, new Date())), etiquette),
  );
}

/** Grands-parents, petits-enfants, oncles et tantes, neveux et nièces, cousins, belle-famille ; une section vide est masquée. */
function sectionsElargies(p: Personne): (HTMLElement | null)[] {
  const f = familleElargie(lireDonnees(), p.id);
  const sec = (titre: string, liens: Parent[], belleFamille = false) =>
    liens.length > 0 ? (liens.length > SEUIL_REPLI ? sectionRepliable : section)(titre, ...liens.map((l) => ligneElargie(l, belleFamille))) : null;
  return [
    sec('Grands-parents', f.grandsParents),
    sec('Petits-enfants', f.petitsEnfants),
    sec('Oncles et tantes', f.onclesTantes),
    sec('Neveux et nièces', f.neveuxNieces),
    sec('Cousins et cousines', f.cousins),
    sec('Belle-famille', f.belleFamille, true),
  ];
}

/** Enfants de la fiche ; rien n'est affiché s'il n'y en a pas. */
function sectionEnfants(liens: Lien[], p: Personne): HTMLElement | null {
  if (liens.length === 0) return null;
  return section(
    'Enfants',
    ...liens.map(({ filiation, personne }) =>
      ligneProche(
        personne,
        filiation.type === 'adoptif' && h('span', { class: 'etiquette etiquette-adoptif' }, libelleAdoptif(personne.sexe)),
        `#/lien/${filiation.id}/${p.id}`,
        'Modifier le lien',
        detailProche(personne, new Date()),
      ),
    ),
  );
}

/** Ligne d'un conjoint ou d'un ex : naissance, âge, enfants du couple, étiquette « Marié(e) » ; le crayon ouvre l'union. */
function ligneUnion(p: Personne, { union, personne: c }: { union: Union; personne: Personne }): HTMLElement {
  const n = enfantsDuCouple(lireDonnees(), p.id, c.id).length;
  const detail = [
    detailProche(c, new Date()),
    (union.date || union.lieu) && `Union ${libelleUnion(union.date, union.lieu)}`,
    n > 0 && `${n} enfant${n > 1 ? 's' : ''} ensemble`,
  ]
    .filter(Boolean)
    .join(' · ');
  const statut = sontFiances(union) ? libelleFiance(c.sexe) : union.marie && libelleMarie(c.sexe);
  return ligneProche(c, statut && h('span', { class: 'etiquette' }, statut), `#/union/${union.id}/${p.id}`, 'Modifier l’union', detail);
}

/** Conjoint actuel (un seul) touchable, le conjoint défunt d'un remarié, puis les ex-conjoints ; rien s'il n'y en a pas. */
function sectionsConjoint(p: Personne): (HTMLElement | null)[] {
  const d = lireDonnees();
  const actuel = conjoint(d, p.id);
  const defunts = conjointsDefunts(d, p.id);
  const ex = exConjoints(d, p.id);
  return [
    actuel ? section('Conjoint', ligneUnion(p, actuel)) : null,
    defunts.length > 0 ? section(defunts.length > 1 ? 'Conjoints décédés' : 'Conjoint décédé', ...defunts.map((e) => ligneUnion(p, e))) : null,
    ex.length > 0 ? section(ex.length > 1 ? 'Ex-conjoints' : 'Ex-conjoint', ...ex.map((e) => ligneUnion(p, e))) : null,
  ];
}

/**
 * Feuille « Ajouter un proche » : conjoint, parent, enfant, frère ou sœur, ami.
 * Le conjoint est grisé s'il y en a déjà un de vivant (veuf ou veuve, on peut en ajouter un nouveau). Un frère ou une sœur s'ajoute même sans parent connu (parent inconnu en coulisse).
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
    h('h2', { class: 'feuille-titre' }, `Qui ajouter pour ${prenomOuNom(p)} ?`),
    option('Un conjoint', aConjoint ? 'Un seul conjoint à la fois' : 'Déjà dans la liste ou nouveau', 'coeur', `#/conjoint/${p.id}`, aConjoint),
    option('Un ex', 'Une union terminée, même en couple aujourd’hui', 'coeurBrise', `#/ex/${p.id}`),
    option('Un parent', 'Biologique ou adoptif', 'haut', `#/parent/${p.id}`),
    option('Un enfant', 'Biologique ou adoptif', 'bas', `#/enfant/${p.id}`),
    option('Un frère ou une sœur', parents.length > 0 ? `Enfant ${avecDe(enumerer(parents))}` : 'Parents inconnus', 'cote', `#/frere/${p.id}`),
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
  const dates = [libelleNaissance(p.naissance, p.sexe, p.lieuNaissance), libelleDeces(p.deces, p.sexe, estDecede(p), p.lieuDeces)]
    .filter(Boolean)
    .map((t) => h('span', {}, majuscule(t)));
  const age = estDecede(p) ? libelleAgeDeces(p, maintenant) : libelleAge(p, maintenant);
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
      { class: 'barre barre-fiche' },
      boutonRetour('#/'),
      h(
        'div',
        { class: 'identite' },
        avatarPersonne(p, true),
        h('h1', {}, nomComplet(p)),
        dates.length > 0 && h('span', { class: 'dates secondaire' }, ...dates),
        (p.nomNaissance || lien) &&
          h(
            'span',
            { class: 'pastilles' },
            p.nomNaissance && h('span', { class: 'lien-moi' }, `${accorder(p.sexe, 'né', 'née', 'né(e)')} ${p.nomNaissance}`),
            lien && h('span', { class: 'lien-moi' }, lien),
          ),
      ),
      h('a', { class: 'bouton-icone', href: `#/modifier/${p.id}`, 'aria-label': 'Modifier' }, icone('crayon', 22), h('span', { class: 'sr-only' }, 'Modifier')),
    ),
    h(
      'div',
      { class: 'contenu' },
      h('button', { type: 'button', class: 'bouton bouton-contour', onclick: () => ouvrirChoixProche(p) }, icone('plus', 18), 'Ajouter un proche'),
      p.note && h('div', { class: 'carte note' }, h('h2', { class: 'titre-section titre-note' }, 'Note'), h('p', {}, p.note)),
      ...sectionsDessins(p),
      ...sectionsConjoint(p),
      sectionEnfants(liensEnfants(lireDonnees(), p.id), p),
      sectionParentsFratrie(p),
      ...sectionsElargies(p),
      sectionAmis(p, erreur),
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: supprimer }, icone('corbeille', 18), 'Supprimer cette personne'),
      erreur,
    ),
  );
  eclairer(ecran);
  return ecran;
}
