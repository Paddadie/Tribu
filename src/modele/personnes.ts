// Personnes : création, modification, personnes visibles ou listées, état de couple. Fonctions pures,
// comme tout le modèle (voir modele.ts).

import type { Donnees, Personne, Sexe, Union } from './types';
import { decesAvantNaissance, estDateSansAnneeValide, estDateValide } from './dates';

export function donneesVides(): Donnees {
  return { version: 6, personnes: [], unions: [], filiations: [], groupes: [] };
}

export function nouvelId(): string {
  return crypto.randomUUID();
}

function personneExiste(d: Donnees, id: string): boolean {
  return d.personnes.some((p) => p.id === id);
}

export function exigerPersonne(d: Donnees, id: string): void {
  if (!personneExiste(d, id)) throw new Error(`Personne introuvable : ${id}`);
}

export interface ChampsPersonne {
  prenom: string;
  nom: string;
  naissance?: string;
  deces?: string;
  /** Interrupteur « Décédé » : sans lui, `deces` est ignoré. Absent : décédée si `deces` est rempli. */
  decede?: boolean;
  sexe?: Sexe;
  nomNaissance?: string;
  note?: string;
  lieuNaissance?: string;
  /** Ignoré pour une personne vivante. */
  lieuDeces?: string;
  ignorerIncomplet?: boolean;
  sansRappel?: boolean;
}

/** Champs que tous les écrans n'envoient pas (création rapide, import ancien) : absents de `ChampsPersonne`, `modifierPersonne` les garde. */
const CHAMPS_GARDES = ['lieuNaissance', 'lieuDeces', 'ignorerIncomplet', 'sansRappel'] as const;

/** Décédée : interrupteur allumé, ou date de décès connue (données d'avant l'interrupteur). */
export function estDecede(p: Pick<Personne, 'deces' | 'decede'>): boolean {
  return !!p.decede || !!p.deces;
}

/** Parent inconnu : personne cachée qui relie des frères et sœurs sans parent connu (voir `Personne.inconnu`). */
export function estInconnu(p: Pick<Personne, 'inconnu'>): boolean {
  return !!p.inconnu;
}

/**
 * Parent « ? » enregistré sans aucune information saisie (note, dates, lieux, sexe, nom de naissance) : il ne tient lieu
 * que d'un « ? » virtuel. Ses liens (unions, groupes) ne sont pas regardés ici.
 */
export function estSansNomVide(p: Personne): boolean {
  return p.sansNom === true && !p.note.trim() && !p.naissance && !p.deces && !p.decede && !p.sexe && !p.nomNaissance && !p.lieuNaissance && !p.lieuDeces;
}

/** Les personnes à montrer (listes, recherche, compteurs) : sans les parents inconnus. */
export function personnesVisibles(d: Donnees): Personne[] {
  return d.personnes.filter((p) => !p.inconnu);
}

/** Les personnes de la liste d'accueil et des choix : sans les parents « ? », qu'on ouvre depuis un proche ou l'arbre. */
export function personnesListees(d: Donnees): Personne[] {
  return personnesVisibles(d).filter((p) => !p.sansNom);
}

function normaliser(champs: ChampsPersonne): Omit<Personne, 'id'> {
  const prenom = champs.prenom.trim();
  const nom = champs.nom.trim();
  if (!prenom && !nom) throw new Error('Un prénom ou un nom est requis');
  const naissance = champs.naissance?.trim();
  if (naissance && !estDateValide(naissance) && !estDateSansAnneeValide(naissance)) {
    throw new Error('Date de naissance invalide (attendu : année, mois et année, date complète, ou jour et mois)');
  }
  const decede = champs.decede ?? !!champs.deces?.trim();
  const deces = decede ? champs.deces?.trim() : undefined;
  if (deces && !estDateValide(deces) && !estDateSansAnneeValide(deces)) {
    throw new Error('Date de décès invalide (attendu : année, mois et année, date complète, ou jour et mois)');
  }
  if (naissance && deces && decesAvantNaissance(naissance, deces)) {
    throw new Error('Le décès ne peut pas précéder la naissance');
  }
  if (champs.sexe !== undefined && champs.sexe !== 'F' && champs.sexe !== 'M') {
    throw new Error('Sexe invalide');
  }
  // Nom de naissance pour tous ; inutile s'il ne diffère pas du nom d'usage.
  const nomNaissance = champs.nomNaissance?.trim();
  const lieuNaissance = champs.lieuNaissance?.trim();
  const lieuDeces = decede ? champs.lieuDeces?.trim() : undefined;
  return {
    prenom,
    nom,
    ...(naissance ? { naissance } : {}),
    ...(deces ? { deces } : {}),
    // La date suffit à dire le décès : le drapeau ne sert qu'en son absence.
    ...(decede && !deces ? { decede: true as const } : {}),
    ...(champs.sexe ? { sexe: champs.sexe } : {}),
    ...(nomNaissance && nomNaissance !== nom ? { nomNaissance } : {}),
    ...(lieuNaissance ? { lieuNaissance } : {}),
    ...(lieuDeces ? { lieuDeces } : {}),
    note: champs.note ?? '',
    ...(champs.ignorerIncomplet ? { ignorerIncomplet: true as const } : {}),
    ...(champs.sansRappel ? { sansRappel: true as const } : {}),
  };
}

export function creerPersonne(d: Donnees, champs: ChampsPersonne): { donnees: Donnees; personne: Personne } {
  const personne: Personne = { id: nouvelId(), ...normaliser(champs) };
  return { donnees: { ...d, personnes: [...d.personnes, personne] }, personne };
}

export function modifierPersonne(d: Donnees, id: string, champs: ChampsPersonne): Donnees {
  exigerPersonne(d, id);
  const avant = d.personnes.find((p) => p.id === id)!;
  const gardes: Partial<ChampsPersonne> = {};
  for (const cle of CHAMPS_GARDES) if (!(cle in champs) && avant[cle] !== undefined) Object.assign(gardes, { [cle]: avant[cle] });
  const champsNormalises = normaliser({ ...gardes, ...champs });
  // Un parent sans nom le reste tant qu'on ne lui a donné ni prénom ni nom.
  const resteSansNom = avant.sansNom && champsNormalises.prenom === avant.prenom && !champsNormalises.nom;
  const maj: Personne = { id, ...champsNormalises, ...(resteSansNom ? { sansNom: true as const } : {}) };
  const apres = { ...d, personnes: d.personnes.map((p) => (p.id === id ? maj : p)) };
  // Retirer un décès peut redonner deux conjoints vivants à son veuf ou sa veuve remariée.
  if (estDecede(avant) && !estDecede(maj) && conjointEnTrop(apres.personnes, apres.unions)) {
    throw new Error('Son conjoint s’est remarié depuis : passe d’abord l’une des deux unions en séparée');
  }
  return apres;
}

/**
 * Union actuelle avec un partenaire vivant, vue depuis `id`. Une personne n'en a qu'une à la fois ; une union actuelle
 * avec un défunt (veuvage) n'en est pas une : elle reste dessinée en trait plein, et n'empêche pas une nouvelle union.
 */
export function unionAvecVivant(d: Pick<Donnees, 'personnes'>, u: Union, id: string): boolean {
  if (u.statut !== 'actuelle' || (u.personneA !== id && u.personneB !== id)) return false;
  const autre = d.personnes.find((p) => p.id === (u.personneA === id ? u.personneB : u.personneA));
  return !!autre && !estDecede(autre);
}

/** La personne a un conjoint actuel vivant (un seul à la fois ; les séparées et les veuvages ne comptent pas). */
export function enCouple(d: Donnees, id: string): boolean {
  return d.unions.some((u) => unionAvecVivant(d, u, id));
}

/** Première personne qui aurait deux unions actuelles avec des vivants, sinon `undefined`. */
export function conjointEnTrop(personnes: Personne[], unions: Union[]): string | undefined {
  const d = { personnes };
  const vus = new Set<string>();
  for (const u of unions) {
    for (const id of [u.personneA, u.personneB]) {
      if (!unionAvecVivant(d, u, id)) continue;
      if (vus.has(id)) return id;
      vus.add(id);
    }
  }
  return undefined;
}

/** La personne a au moins une union (même séparée), une filiation (parent ou enfant) ou une amitié. */
export function aDesLiens(d: Donnees, id: string): boolean {
  return (
    d.unions.some((u) => u.personneA === id || u.personneB === id) ||
    d.filiations.some((f) => f.parent === id || f.enfant === id) ||
    d.groupes.some((g) => g.membres.includes(id))
  );
}
