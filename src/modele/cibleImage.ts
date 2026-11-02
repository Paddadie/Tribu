// Cibles de l'export PNG (Réglages → Partager) : qui dessiner, sous quel titre et dans quel fichier.
// « Tout l'arbre » et la ligne directe viennent de ligneDirecte.ts ; « Toute la famille » est la famille de la liste
// (filtres.ts : liens de parenté et d'union, ex compris, sans amis) ; un groupe d'amis garde ses membres, la famille
// de chacun, et Moi avec sa famille proche (`procheDeMoi`), d'où part toujours l'arbre.

import type { Disposition } from './arbreGlobal';
import { conjoint, fratrie, liensEnfants, liensParents, nomGroupe } from './deductions';
import { familleDe } from './filtres';
import { AFFICHAGES, garderPour, type Affichage } from './ligneDirecte';
import { personnesVisibles } from './modele';
import { estVirtuel } from './parentSansNom';
import type { Donnees, Personne } from './types';

export type Cible = Affichage | 'famille' | 'groupe';

const libelle = (a: Affichage) => AFFICHAGES.find((x) => x.valeur === a)!.libelle;

/** Dans l'ordre du choix de Réglages : deux colonnes, « Toute la famille » à côté de « Tout l'arbre ». */
export const CIBLES: [Cible, string][] = [
  ['tout', libelle('tout')],
  ['famille', 'Toute la famille'],
  ['directe', libelle('directe')],
  ['fratries', libelle('fratries')],
  ['conjoints', libelle('conjoints')],
  ['groupe', 'Un groupe d’amis'],
];

/**
 * Moi et sa famille proche, pour l'export d'un groupe : ses parents et leurs conjoints, ses frères et sœurs (demis
 * compris), leurs parents (beau-père, belle-mère : l'ex d'un parent, autre parent d'un demi), leurs conjoints et
 * leurs enfants, son conjoint et ses enfants. Ni grands-parents, ni cousins, ni la famille du conjoint, ni un ex sans
 * enfant d'un demi.
 */
export function procheDeMoi(d: Donnees, moi: string): Set<string> {
  const parents = liensParents(d, moi).map((l) => l.personne.id);
  const { freresSoeurs, demis } = fratrie(d, moi);
  const freres = [...freresSoeurs, ...demis].map((p) => p.id);
  const garder = new Set([moi, ...parents, ...freres]);
  for (const id of freres) for (const l of liensParents(d, id)) garder.add(l.personne.id);
  for (const id of [moi, ...parents, ...freres]) {
    const c = conjoint(d, id);
    if (c) garder.add(c.personne.id);
  }
  for (const id of [moi, ...freres]) for (const l of liensEnfants(d, id)) garder.add(l.personne.id);
  return garder;
}

/**
 * Membres du groupe, la famille de chacun, Moi et sa famille proche, plus l'id du groupe pour que `restreindre` le
 * garde. Un membre de la famille de Moi vient seul : sinon toute la famille suivrait. Vide si le groupe n'existe pas.
 */
export function personnesDuGroupe(d: Donnees, groupe: string, moi: string): Set<string> {
  const g = d.groupes.find((x) => x.id === groupe);
  if (!g) return new Set();
  const deMoi = familleDe(d, moi);
  const garder = new Set([...procheDeMoi(d, moi), groupe]);
  for (const m of g.membres) {
    if (garder.has(m)) continue;
    if (deMoi.has(m)) garder.add(m);
    else for (const id of familleDe(d, m)) garder.add(id);
  }
  return garder;
}

/** Ce que garde l'arbre pour la cible (voir `disposerArbre`) ; undefined pour tout l'arbre. */
export function garderCible(d: Donnees, moi: string, cible: Cible, groupe?: string): Set<string> | undefined {
  if (cible === 'famille') return familleDe(d, moi);
  if (cible === 'groupe') return groupe ? personnesDuGroupe(d, groupe, moi) : new Set();
  return garderPour(d, moi, cible);
}

/** Personnes annoncées dans le résumé : toutes les fiches visibles pour tout l'arbre, sinon celles dessinées. */
export function personnesDessinees(d: Donnees, cible: Cible, disp: Disposition): number {
  return cible === 'tout' ? personnesVisibles(d).length : disp.places.filter((p) => !estVirtuel(p.personne.id) && !p.personne.inconnu).length;
}

/** Titre en haut de l'image. */
export function titreImage(d: Donnees, moi: Personne, cible: Cible, groupe?: string): string {
  const g = cible === 'groupe' ? d.groupes.find((x) => x.id === groupe) : undefined;
  if (g) return `Amis : ${nomGroupe(d, g)}`;
  const nom = [moi.prenom, moi.nom].filter(Boolean).join(' ');
  return cible === 'famille' ? `Famille de ${nom}` : `Arbre de ${nom}`;
}

/** Texte réduit à des minuscules sans accents et des tirets, pour un nom de fichier ; 40 caractères au plus. */
export function pourFichier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
}

/** Nom du fichier PNG : « tribu-arbre » (tout l'arbre, ligne directe), « tribu-famille » ou « tribu-amis-<groupe> ». */
export function nomFichierImage(d: Donnees, cible: Cible, jour: Date, groupe?: string): string {
  const date = jour.toISOString().slice(0, 10);
  if (cible === 'famille') return `tribu-famille-${date}.png`;
  if (cible === 'groupe') {
    const g = d.groupes.find((x) => x.id === groupe);
    const nom = g ? pourFichier(nomGroupe(d, g)) : '';
    return nom ? `tribu-amis-${nom}-${date}.png` : `tribu-amis-${date}.png`;
  }
  return `tribu-arbre-${date}.png`;
}
