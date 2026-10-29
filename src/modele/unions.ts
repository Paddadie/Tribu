// Unions : ajout, date et lieu, mariage et nom, séparation, union de deux parents. Fonctions pures (voir modele.ts).

import type { Donnees, Personne, StatutUnion, Union } from './types';
import { appliquerNomApres, nomApresParDefaut, quiAChangeDeNom } from './nomApres';
import { conjointEnTrop, exigerPersonne, nouvelId, unionAvecVivant } from './personnes';
import { estDateSansAnneeValide, estDateValide } from './dates';

/** Date d'union facultative : vide → absente ; sinon « AAAA », « AAAA-MM », « AAAA-MM-JJ » ou « --MM-JJ » existants. */
function normaliserDateUnion(date: string | undefined): string | undefined {
  const propre = date?.trim();
  if (!propre) return undefined;
  if (!estDateValide(propre) && !estDateSansAnneeValide(propre)) {
    throw new Error('Date d’union invalide (attendu : année, mois et année, date complète, ou jour et mois)');
  }
  return propre;
}

/** Fixe, change ou efface (`undefined` ou vide) la date d'une union. */
export function modifierDateUnion(d: Donnees, id: string, date: string | undefined): Donnees {
  exigerUnion(d, id);
  const propre = normaliserDateUnion(date);
  return {
    ...d,
    unions: d.unions.map((u) => {
      if (u.id !== id) return u;
      const { date: _ancienne, ...reste } = u;
      return propre ? { ...reste, date: propre } : reste;
    }),
  };
}

/** Fixe, change ou efface (`undefined` ou vide) le lieu d'un mariage ; refusé pour une union non mariée. */
export function modifierLieuUnion(d: Donnees, id: string, lieu: string | undefined): Donnees {
  const union = exigerUnion(d, id);
  const propre = lieu?.trim();
  if (propre && !union.marie) throw new Error('Le lieu ne se note que pour un mariage');
  return {
    ...d,
    unions: d.unions.map((u) => {
      if (u.id !== id) return u;
      const { lieu: _ancien, ...reste } = u;
      return propre ? { ...reste, lieu: propre } : reste;
    }),
  };
}

export function ajouterUnion(
  d: Donnees,
  personneA: string,
  personneB: string,
  marie = false,
  statut: StatutUnion = 'actuelle',
  date?: string,
  prendLeNom = true,
): { donnees: Donnees; union: Union } {
  const dateUnion = normaliserDateUnion(date);
  exigerPersonne(d, personneA);
  exigerPersonne(d, personneB);
  if (personneA === personneB) throw new Error('Une union relie deux personnes différentes');
  const doublon = d.unions.some((u) => (u.personneA === personneA && u.personneB === personneB) || (u.personneA === personneB && u.personneB === personneA));
  if (doublon) throw new Error('Ces deux personnes ont déjà une union : rétablis-la depuis leur fiche');
  const union: Union = { id: nouvelId(), personneA, personneB, marie, statut, ...(dateUnion ? { date: dateUnion } : {}) };
  const ajoute = { ...d, unions: [...d.unions, union] };
  // Un seul conjoint actuel vivant par personne ; les ex (union séparée) et les veuvages ne sont pas limités.
  if (conjointEnTrop(ajoute.personnes, ajoute.unions)) throw new Error('Une personne ne peut avoir qu’un seul conjoint à la fois');
  return { donnees: marie && statut === 'actuelle' && prendLeNom ? prendreNomDuConjoint(ajoute, union) : ajoute, union };
}

/**
 * Mariage : chaque femme de l'union (dont le conjoint n'est pas une femme) garde son nom actuel comme nom de jeune fille,
 * sauf si elle en a déjà un, et prend le nom de son conjoint. Sans effet si le conjoint n'a pas de nom ou porte déjà le même.
 */
function prendreNomDuConjoint(d: Donnees, union: Union): Donnees {
  const a = d.personnes.find((p) => p.id === union.personneA);
  const b = d.personnes.find((p) => p.id === union.personneB);
  if (!a || !b) return d;
  const epouse = (femme: Personne, mari: Personne): Personne =>
    femme.sexe !== 'F' || mari.sexe === 'F' || !mari.nom || femme.nom === mari.nom
      ? femme
      : { ...femme, nom: mari.nom, ...(femme.nomNaissance || !femme.nom ? {} : { nomNaissance: femme.nom }) };
  const a2 = epouse(a, b);
  const b2 = epouse(b, a);
  return { ...d, personnes: d.personnes.map((p) => (p.id === a.id ? a2 : p.id === b.id ? b2 : p)) };
}

/**
 * Les personnes de l'union qui portent encore le nom de l'autre (ou le nom composé du couple) et ont un nom de naissance :
 * à la séparation, à la suppression de l'union ou au passage à « non marié », l'écran leur propose de le reprendre (sans l'imposer).
 */
export function quiPeutReprendreSonNom(d: Donnees, idUnion: string): Personne[] {
  return quiAChangeDeNom(d, exigerUnion(d, idUnion));
}

/** Reprise du nom de naissance : il redevient le nom d'usage, et le champ du nom de naissance est vidé. */
export function reprendreNomDeNaissance(d: Donnees, id: string): Donnees {
  exigerPersonne(d, id);
  const p = d.personnes.find((x) => x.id === id)!;
  if (!p.nomNaissance) throw new Error('Aucun nom de naissance à reprendre');
  const { nomNaissance, ...reste } = p;
  return { ...d, personnes: d.personnes.map((x) => (x.id === id ? { ...reste, nom: nomNaissance } : x)) };
}

function exigerUnion(d: Donnees, id: string): Union {
  const union = d.unions.find((u) => u.id === id);
  if (!union) throw new Error(`Union introuvable : ${id}`);
  return union;
}

export function modifierUnion(d: Donnees, id: string, marie: boolean, prendLeNom = true): Donnees {
  const avant = exigerUnion(d, id);
  // Le lieu ne se note que pour un mariage : une union qui n'est plus mariée le perd.
  const sansLieu = ({ lieu: _lieu, ...reste }: Union): Union => reste;
  const maj = { ...d, unions: d.unions.map((u) => (u.id === id ? (marie ? { ...u, marie } : { ...sansLieu(u), marie }) : u)) };
  // Seul le passage à « marié » d'un couple actuel change les noms, et seulement si la case « Prend le nom » reste cochée.
  return marie && !avant.marie && avant.statut === 'actuelle' && prendLeNom ? prendreNomDuConjoint(maj, { ...avant, marie }) : maj;
}

/** Une séparation garde l'union, au statut « séparée » : la personne n'a plus de conjoint actuel. */
export function separerUnion(d: Donnees, id: string): Donnees {
  exigerUnion(d, id);
  return { ...d, unions: d.unions.map((u) => (u.id === id ? { ...u, statut: 'separee' } : u)) };
}

/** Remet une union séparée en union actuelle, si aucun des deux n'a entre-temps un autre conjoint. */
export function retablirUnion(d: Donnees, id: string): Donnees {
  exigerUnion(d, id);
  const maj: Donnees = { ...d, unions: d.unions.map((u) => (u.id === id ? { ...u, statut: 'actuelle' } : u)) };
  if (conjointEnTrop(maj.personnes, maj.unions)) throw new Error('L’un des deux a déjà un autre conjoint');
  return maj;
}

export function supprimerUnion(d: Donnees, id: string): Donnees {
  if (!d.unions.some((u) => u.id === id)) throw new Error(`Union introuvable : ${id}`);
  return { ...d, unions: d.unions.filter((u) => u.id !== id) };
}

/** Union notée en reliant deux parents d'un même enfant. */
export type ChoixUnion = 'couple' | 'marie' | 'separee';

/** Union actuelle avec un vivant que `unirParents(d, a, b, choix)` ferait passer en « séparée ». */
export function unionsQuiSeSepareraient(d: Donnees, a: string, b: string, choix: ChoixUnion): Union[] {
  if (choix === 'separee' || unionEntre(d, a, b)) return [];
  return d.unions.filter((u) => unionAvecVivant(d, u, a) || unionAvecVivant(d, u, b));
}

export function unionEntre(d: Donnees, a: string, b: string): Union | undefined {
  return d.unions.find((u) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a));
}

/**
 * Note l'union des deux parents `a` et `b`, sans effet s'ils en ont déjà une. En couple ou mariés, leurs unions actuelles
 * avec d'autres vivants passent d'abord en « séparées ». Un mariage donne le nom proposé d'office (celui de l'homme).
 */
export function unirParents(d: Donnees, a: string, b: string, choix: ChoixUnion): Donnees {
  if (unionEntre(d, a, b)) return d;
  const separe = unionsQuiSeSepareraient(d, a, b, choix).reduce((x, u) => separerUnion(x, u.id), d);
  const { donnees, union } = ajouterUnion(separe, a, b, choix === 'marie', choix === 'separee' ? 'separee' : 'actuelle', undefined, false);
  if (choix !== 'marie') return donnees;
  const pa = donnees.personnes.find((p) => p.id === a)!;
  const pb = donnees.personnes.find((p) => p.id === b)!;
  return appliquerNomApres(donnees, union.id, nomApresParDefaut(pa, pb));
}

/**
 * Mariage de deux parents sans union actuelle (l'un d'eux est un parent sans nom) : l'union est créée « séparée »
 * si elle manque, car ils ne sont pas un couple actuel ; décochée, une union séparée disparaît.
 */
export function definirMariageParents(d: Donnees, a: string, b: string, marie: boolean): Donnees {
  const u = d.unions.find((x) => (x.personneA === a && x.personneB === b) || (x.personneA === b && x.personneB === a));
  if (u) return u.statut === 'separee' && !marie ? supprimerUnion(d, u.id) : modifierUnion(d, u.id, marie);
  return marie ? ajouterUnion(d, a, b, true, 'separee').donnees : d;
}
