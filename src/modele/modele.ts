// Opérations de création / modification / suppression. Fonctions pures :
// elles renvoient de nouvelles données sans modifier les anciennes, et lèvent
// une Error (message en français) quand une règle du modèle est violée.

import type { Donnees, Filiation, Personne, Sexe, TypeFiliation, Union } from './types';

export const MAX_PARENTS_PAR_TYPE = 2;

export function donneesVides(): Donnees {
  return { version: 1, personnes: [], unions: [], filiations: [] };
}

function nouvelId(): string {
  return crypto.randomUUID();
}

function personneExiste(d: Donnees, id: string): boolean {
  return d.personnes.some((p) => p.id === id);
}

function exigerPersonne(d: Donnees, id: string): void {
  if (!personneExiste(d, id)) throw new Error(`Personne introuvable : ${id}`);
}

export interface ChampsPersonne {
  prenom: string;
  nom: string;
  naissance?: string;
  sexe?: Sexe;
  note?: string;
}

/** Date « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » existante au calendrier (année de 1 à 9999). */
export function estDateValide(date: string): boolean {
  const m = date.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return false;
  const annee = Number(m[1]);
  if (annee < 1) return false;
  if (m[2] === undefined) return true;
  const mois = Number(m[2]);
  if (mois < 1 || mois > 12) return false;
  if (m[3] === undefined) return true;
  const jour = Number(m[3]);
  return jour >= 1 && jour <= joursDuMois(annee, mois);
}

function joursDuMois(annee: number, mois: number): number {
  if (mois === 2) return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

function normaliser(champs: ChampsPersonne): Omit<Personne, 'id'> {
  const prenom = champs.prenom.trim();
  const nom = champs.nom.trim();
  if (!prenom && !nom) throw new Error('Un prénom ou un nom est requis');
  const naissance = champs.naissance?.trim();
  if (naissance && !estDateValide(naissance)) {
    throw new Error('Date de naissance invalide (attendu : année, mois et année, ou date complète)');
  }
  if (champs.sexe !== undefined && champs.sexe !== 'F' && champs.sexe !== 'M') {
    throw new Error('Sexe invalide');
  }
  return {
    prenom,
    nom,
    ...(naissance ? { naissance } : {}),
    ...(champs.sexe ? { sexe: champs.sexe } : {}),
    note: champs.note ?? '',
  };
}

export function creerPersonne(d: Donnees, champs: ChampsPersonne): { donnees: Donnees; personne: Personne } {
  const personne: Personne = { id: nouvelId(), ...normaliser(champs) };
  return { donnees: { ...d, personnes: [...d.personnes, personne] }, personne };
}

export function modifierPersonne(d: Donnees, id: string, champs: ChampsPersonne): Donnees {
  exigerPersonne(d, id);
  const maj: Personne = { id, ...normaliser(champs) };
  return { ...d, personnes: d.personnes.map((p) => (p.id === id ? maj : p)) };
}

/** Retire la personne ainsi que toutes ses unions et filiations. */
export function supprimerPersonne(d: Donnees, id: string): Donnees {
  exigerPersonne(d, id);
  return {
    ...d,
    personnes: d.personnes.filter((p) => p.id !== id),
    unions: d.unions.filter((u) => u.personneA !== id && u.personneB !== id),
    filiations: d.filiations.filter((f) => f.parent !== id && f.enfant !== id),
  };
}

export function ajouterUnion(
  d: Donnees,
  personneA: string,
  personneB: string,
  marie = false,
): { donnees: Donnees; union: Union } {
  exigerPersonne(d, personneA);
  exigerPersonne(d, personneB);
  if (personneA === personneB) throw new Error('Une union relie deux personnes différentes');
  const doublon = d.unions.some(
    (u) =>
      (u.personneA === personneA && u.personneB === personneB) ||
      (u.personneA === personneB && u.personneB === personneA),
  );
  if (doublon) throw new Error('Ces deux personnes sont déjà en couple');
  const union: Union = { id: nouvelId(), personneA, personneB, marie };
  return { donnees: { ...d, unions: [...d.unions, union] }, union };
}

export function modifierUnion(d: Donnees, id: string, marie: boolean): Donnees {
  if (!d.unions.some((u) => u.id === id)) throw new Error(`Union introuvable : ${id}`);
  return { ...d, unions: d.unions.map((u) => (u.id === id ? { ...u, marie } : u)) };
}

export function supprimerUnion(d: Donnees, id: string): Donnees {
  if (!d.unions.some((u) => u.id === id)) throw new Error(`Union introuvable : ${id}`);
  return { ...d, unions: d.unions.filter((u) => u.id !== id) };
}

export function ajouterFiliation(
  d: Donnees,
  parent: string,
  enfant: string,
  type: TypeFiliation,
): { donnees: Donnees; filiation: Filiation } {
  exigerPersonne(d, parent);
  exigerPersonne(d, enfant);
  if (parent === enfant) throw new Error('Une personne ne peut pas être son propre parent');
  if (d.filiations.some((f) => f.parent === parent && f.enfant === enfant)) {
    throw new Error('Ce lien parent-enfant existe déjà');
  }
  const memeType = d.filiations.filter((f) => f.enfant === enfant && f.type === type);
  if (memeType.length >= MAX_PARENTS_PAR_TYPE) {
    throw new Error(`Un enfant a au plus ${MAX_PARENTS_PAR_TYPE} parents ${type === 'biologique' ? 'biologiques' : 'adoptifs'}`);
  }
  const filiation: Filiation = { id: nouvelId(), parent, enfant, type };
  return { donnees: { ...d, filiations: [...d.filiations, filiation] }, filiation };
}

export function supprimerFiliation(d: Donnees, id: string): Donnees {
  if (!d.filiations.some((f) => f.id === id)) throw new Error(`Filiation introuvable : ${id}`);
  return { ...d, filiations: d.filiations.filter((f) => f.id !== id) };
}
