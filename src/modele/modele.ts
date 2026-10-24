// Opérations de création / modification / suppression. Fonctions pures :
// elles renvoient de nouvelles données sans modifier les anciennes, et lèvent
// une Error (message en français) quand une règle du modèle est violée.

import type { Donnees, Filiation, GroupeAmis, Personne, Sexe, StatutUnion, TypeFiliation, Union } from './types';

export const MAX_PARENTS_PAR_TYPE = 2;

export function donneesVides(): Donnees {
  return { version: 5, personnes: [], unions: [], filiations: [], groupes: [] };
}

export function nouvelId(): string {
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
  deces?: string;
  /** Interrupteur « Décédé » : sans lui, `deces` est ignoré. Absent : décédée si `deces` est rempli. */
  decede?: boolean;
  sexe?: Sexe;
  nomNaissance?: string;
  note?: string;
}

/** Décédée : interrupteur allumé, ou date de décès connue (données d'avant l'interrupteur). */
export function estDecede(p: Pick<Personne, 'deces' | 'decede'>): boolean {
  return !!p.decede || !!p.deces;
}

/** Forme d'une date partielle : « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » (groupes : année, mois, jour). Sans drapeau g : partageable. */
export const MOTIF_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Date « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » existante au calendrier (année de 1 à 9999). */
export function estDateValide(date: string): boolean {
  const m = date.match(MOTIF_DATE);
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

/** Jour et mois sans année, « --MM-JJ » (notation ISO 8601) : un anniversaire connu sans la naissance (groupes : mois, jour). */
export const MOTIF_SANS_ANNEE = /^--(\d{2})-(\d{2})$/;

/** « --MM-JJ » existant au calendrier ; le 29 février est admis. */
export function estDateSansAnneeValide(date: string): boolean {
  const m = date.match(MOTIF_SANS_ANNEE);
  if (!m) return false;
  const [mois, jour] = [Number(m[1]), Number(m[2])];
  return mois >= 1 && mois <= 12 && jour >= 1 && jour <= joursDuMois(2000, mois);
}

/** Année d'une date partielle (« 1961 ») ; undefined pour une date sans année ou absente. */
export function anneeDe(date: string | undefined): string | undefined {
  return date?.match(MOTIF_DATE)?.[1];
}

export function joursDuMois(annee: number, mois: number): number {
  if (mois === 2) return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

/**
 * Le décès ne précède pas la naissance ; deux dates partielles se comparent sur ce qu'elles ont en commun.
 * Une naissance ou un décès sans année ne permet pas de trancher : jamais en défaut.
 */
export function decesAvantNaissance(naissance: string, deces: string): boolean {
  if (!anneeDe(naissance) || !anneeDe(deces)) return false;
  const n = Math.min(naissance.length, deces.length);
  return deces.slice(0, n) < naissance.slice(0, n);
}

/** Parent inconnu : personne cachée qui relie des frères et sœurs sans parent connu (voir `Personne.inconnu`). */
export function estInconnu(p: Pick<Personne, 'inconnu'>): boolean {
  return !!p.inconnu;
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
  return {
    prenom,
    nom,
    ...(naissance ? { naissance } : {}),
    ...(deces ? { deces } : {}),
    // La date suffit à dire le décès : le drapeau ne sert qu'en son absence.
    ...(decede && !deces ? { decede: true as const } : {}),
    ...(champs.sexe ? { sexe: champs.sexe } : {}),
    ...(champs.sexe === 'F' && champs.nomNaissance?.trim() ? { nomNaissance: champs.nomNaissance.trim() } : {}),
    note: champs.note ?? '',
  };
}

export function creerPersonne(d: Donnees, champs: ChampsPersonne): { donnees: Donnees; personne: Personne } {
  const personne: Personne = { id: nouvelId(), ...normaliser(champs) };
  return { donnees: { ...d, personnes: [...d.personnes, personne] }, personne };
}

export function modifierPersonne(d: Donnees, id: string, champs: ChampsPersonne): Donnees {
  exigerPersonne(d, id);
  const avant = d.personnes.find((p) => p.id === id)!;
  const champsNormalises = normaliser(champs);
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
function unionAvecVivant(d: Pick<Donnees, 'personnes'>, u: Union, id: string): boolean {
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

/** Retire la personne ainsi que toutes ses unions, filiations et appartenances à des groupes d'amis. */
export function supprimerPersonne(d: Donnees, id: string): Donnees {
  exigerPersonne(d, id);
  const voisins = new Set([
    ...d.unions.flatMap((u) => (u.personneA === id ? [u.personneB] : u.personneB === id ? [u.personneA] : [])),
    ...d.filiations.flatMap((f) => (f.parent === id ? [f.enfant] : f.enfant === id ? [f.parent] : [])),
  ]);
  const reste = retirerInconnusOrphelins({
    ...d,
    personnes: d.personnes.filter((p) => p.id !== id),
    unions: d.unions.filter((u) => u.personneA !== id && u.personneB !== id),
    filiations: d.filiations.filter((f) => f.parent !== id && f.enfant !== id),
    groupes: sansPersonne(d.groupes, id),
  });
  return retirerSansNomOrphelins(reste, voisins);
}

/**
 * Un parent « ? » enregistré, lié à la personne supprimée, qui n'a plus aucun lien et aucune information saisie
 * n'a plus de raison d'être : il est retiré. Avec une note, une date ou un sexe, il reste (Paul l'a renseigné).
 */
function retirerSansNomOrphelins(d: Donnees, candidats: Set<string>): Donnees {
  const orphelin = (p: Personne) =>
    p.sansNom === true &&
    candidats.has(p.id) &&
    !aDesLiens(d, p.id) &&
    !p.note.trim() &&
    !p.naissance &&
    !p.deces &&
    !p.decede &&
    !p.sexe &&
    !p.nomNaissance;
  return d.personnes.some(orphelin) ? { ...d, personnes: d.personnes.filter((p) => !orphelin(p)) } : d;
}

/** Un parent inconnu n'a de sens que s'il relie au moins deux enfants : sinon, il est retiré avec ses liens. */
function retirerInconnusOrphelins(d: Donnees): Donnees {
  const orphelins = new Set(d.personnes.filter((p) => p.inconnu && d.filiations.filter((f) => f.parent === p.id).length < 2).map((p) => p.id));
  if (orphelins.size === 0) return d;
  return {
    ...d,
    personnes: d.personnes.filter((p) => !orphelins.has(p.id)),
    filiations: d.filiations.filter((f) => !orphelins.has(f.parent)),
  };
}

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

function exigerUnion(d: Donnees, id: string): Union {
  const union = d.unions.find((u) => u.id === id);
  if (!union) throw new Error(`Union introuvable : ${id}`);
  return union;
}

export function modifierUnion(d: Donnees, id: string, marie: boolean, prendLeNom = true): Donnees {
  const avant = exigerUnion(d, id);
  const maj = { ...d, unions: d.unions.map((u) => (u.id === id ? { ...u, marie } : u)) };
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

export function ajouterFiliation(d: Donnees, parent: string, enfant: string, type: TypeFiliation): { donnees: Donnees; filiation: Filiation } {
  exigerPersonne(d, parent);
  exigerPersonne(d, enfant);
  if (parent === enfant) throw new Error('Une personne ne peut pas être son propre parent');
  if (d.filiations.some((f) => f.parent === parent && f.enfant === enfant)) {
    throw new Error('Ce lien parent-enfant existe déjà');
  }
  const base = reprendreParentsInconnus(d, parent, enfant);
  exigerPlaceParent(base, enfant, type);
  if (estDescendant(base, parent, enfant)) {
    throw new Error('Ce lien créerait une boucle : le parent descend déjà de cet enfant');
  }
  const filiation: Filiation = { id: nouvelId(), parent, enfant, type };
  return { donnees: { ...base, filiations: [...base.filiations, filiation] }, filiation };
}

/** Parents inconnus de `enfant`, et les autres enfants qu'ils relient (ses frères et sœurs sans parent connu). */
function groupeInconnu(d: Donnees, enfant: string): { inconnus: Set<string>; freres: Filiation[] } {
  const inconnus = new Set(d.filiations.filter((f) => f.enfant === enfant && d.personnes.some((p) => p.id === f.parent && p.inconnu)).map((f) => f.parent));
  return { inconnus, freres: d.filiations.filter((f) => inconnus.has(f.parent) && f.enfant !== enfant) };
}

/**
 * Un vrai parent ajouté à un enfant qui n'a que des parents inconnus les remplace pour toute la fratrie :
 * les frères et sœurs deviennent enfants de ce parent, le parent inconnu disparaît (sinon ils deviendraient des demis).
 */
function reprendreParentsInconnus(d: Donnees, parent: string, enfant: string): Donnees {
  if (d.personnes.some((p) => p.id === parent && p.inconnu)) return d;
  const { inconnus, freres } = groupeInconnu(d, enfant);
  if (inconnus.size === 0) return d;
  for (const f of freres) {
    if (f.enfant === parent || estDescendant(d, parent, f.enfant)) {
      throw new Error('Ce lien créerait une boucle : le parent descend déjà d’un frère ou d’une sœur de cet enfant');
    }
  }
  const reprises = freres.filter((f) => !d.filiations.some((g) => g.parent === parent && g.enfant === f.enfant)).map((f) => ({ ...f, parent }));
  return {
    ...d,
    personnes: d.personnes.filter((p) => !inconnus.has(p.id)),
    filiations: [...d.filiations.filter((f) => !inconnus.has(f.parent)), ...reprises],
  };
}

/**
 * Relie `enfant` à plusieurs parents d'un coup (enfant d'un couple, frère ou sœur), avec le même type.
 * Un parent déjà relié à l'enfant est passé ; au moins un parent est demandé.
 * Si l'enfant avait des frères et sœurs sans parent connu, les parents sont aussi les leurs.
 */
export function ajouterFiliations(d: Donnees, parents: string[], enfant: string, type: TypeFiliation): Donnees {
  if (parents.length === 0) throw new Error('Coche au moins un parent');
  const fratrie = [enfant, ...new Set(groupeInconnu(d, enfant).freres.map((f) => f.enfant))];
  const relier = (x: Donnees, parent: string, e: string) =>
    x.filiations.some((f) => f.parent === parent && f.enfant === e) ? x : ajouterFiliation(x, parent, e, type).donnees;
  return parents.reduce((x, parent) => fratrie.reduce((y, e) => relier(y, parent, e), x), d);
}

/**
 * Frère ou sœur sans parent connu : `a` (la fiche) n'a aucun parent connu. Si `b` en a, `a` devient leur enfant ;
 * sinon, les deux sont reliés à un parent inconnu créé en coulisse (réutilisé s'ils en ont déjà un, fusionné s'ils en ont deux).
 */
export function ajouterFrereSansParent(d: Donnees, a: string, b: string): Donnees {
  exigerPersonne(d, a);
  exigerPersonne(d, b);
  if (a === b) throw new Error('Une personne ne peut pas être son propre frère ou sa propre sœur');
  const estInconnuId = (id: string) => d.personnes.some((p) => p.id === id && p.inconnu);
  const reels = (id: string) => d.filiations.filter((f) => f.enfant === id && !estInconnuId(f.parent));
  const inconnuDe = (id: string) => d.filiations.find((f) => f.enfant === id && estInconnuId(f.parent))?.parent;
  if (reels(a).length > 0) throw new Error('Cette personne a des parents connus : coche-les pour lui ajouter un frère ou une sœur');
  const parentsDeB = reels(b);
  if (parentsDeB.length > 0) {
    return ajouterFiliations(
      d,
      parentsDeB.map((f) => f.parent),
      a,
      'biologique',
    );
  }
  const [pa, pb] = [inconnuDe(a), inconnuDe(b)];
  if (pa && pa === pb) throw new Error('Ces deux personnes sont déjà frères ou sœurs');
  const inconnu: Personne = { id: pa ?? pb ?? nouvelId(), prenom: '', nom: '', note: '', inconnu: true };
  // Un groupe existant l'emporte ; deux groupes distincts fusionnent dans celui de `a`.
  const fusion = pa && pb ? pb : undefined;
  const personnes = pa || pb ? d.personnes : [...d.personnes, inconnu];
  const filiations = d.filiations.map((f) => (f.parent === fusion ? { ...f, parent: inconnu.id } : f));
  for (const enfant of [a, b]) {
    if (!filiations.some((f) => f.parent === inconnu.id && f.enfant === enfant)) {
      filiations.push({ id: nouvelId(), parent: inconnu.id, enfant, type: 'biologique' });
    }
  }
  return { ...d, personnes: personnes.filter((p) => p.id !== fusion), filiations };
}

/** Change le type (biologique/adoptif) d'un lien existant, sous la même limite de deux parents par type. */
export function modifierFiliation(d: Donnees, id: string, type: TypeFiliation): Donnees {
  const lien = d.filiations.find((f) => f.id === id);
  if (!lien) throw new Error(`Filiation introuvable : ${id}`);
  if (lien.type === type) return d;
  exigerPlaceParent(d, lien.enfant, type);
  return { ...d, filiations: d.filiations.map((f) => (f.id === id ? { ...f, type } : f)) };
}

function exigerPlaceParent(d: Donnees, enfant: string, type: TypeFiliation): void {
  const memeType = d.filiations.filter((f) => f.enfant === enfant && f.type === type);
  if (memeType.length >= MAX_PARENTS_PAR_TYPE) {
    throw new Error(`Un enfant a au plus ${MAX_PARENTS_PAR_TYPE} parents ${type === 'biologique' ? 'biologiques' : 'adoptifs'}`);
  }
}

/** Vrai si `id` descend (à n'importe quel degré) de `ancetre`. */
function estDescendant(d: Donnees, id: string, ancetre: string): boolean {
  const vus = new Set<string>();
  const pile = [id];
  while (pile.length > 0) {
    const courant = pile.pop() as string;
    for (const f of d.filiations) {
      if (f.enfant !== courant || vus.has(f.parent)) continue;
      if (f.parent === ancetre) return true;
      vus.add(f.parent);
      pile.push(f.parent);
    }
  }
  return false;
}

export function supprimerFiliation(d: Donnees, id: string): Donnees {
  if (!d.filiations.some((f) => f.id === id)) throw new Error(`Filiation introuvable : ${id}`);
  return retirerInconnusOrphelins({ ...d, filiations: d.filiations.filter((f) => f.id !== id) });
}

// --- Groupes d'amis ------------------------------------------------------------

/** Groupes dont la personne est membre. */
export function groupesDe(d: Donnees, id: string): GroupeAmis[] {
  return d.groupes.filter((g) => g.membres.includes(id));
}

/**
 * Groupes dont `id` ou un membre de sa famille fait partie (liens de filiation et d'union, de proche en proche).
 * `moi` est dans tous les groupes : ses groupes ne comptent pas, sinon toute sa famille serait « famille d'un membre » partout.
 */
export function groupesDeLaFamille(d: Donnees, id: string, moi?: string): GroupeAmis[] {
  const voisins = new Map<string, string[]>();
  const lier = (a: string, b: string) => {
    voisins.set(a, [...(voisins.get(a) ?? []), b]);
    voisins.set(b, [...(voisins.get(b) ?? []), a]);
  };
  for (const f of d.filiations) lier(f.parent, f.enfant);
  for (const u of d.unions) lier(u.personneA, u.personneB);
  const vus = new Set([id]);
  const file = [id];
  const trouves = new Set<GroupeAmis>();
  for (let i = 0; i < file.length; i++) {
    if (file[i] !== moi) groupesDe(d, file[i]).forEach((g) => trouves.add(g));
    for (const v of voisins.get(file[i]) ?? []) {
      if (vus.has(v)) continue;
      vus.add(v);
      file.push(v);
    }
  }
  return [...trouves];
}

function exigerGroupe(d: Donnees, id: string): GroupeAmis {
  const g = d.groupes.find((x) => x.id === id);
  if (!g) throw new Error(`Groupe d'amis introuvable : ${id}`);
  return g;
}

/** Remplace un groupe ; un groupe qui n'a plus deux membres disparaît. */
function avecGroupe(d: Donnees, g: GroupeAmis): Donnees {
  return { ...d, groupes: d.groupes.flatMap((x) => (x.id !== g.id ? [x] : g.membres.length >= 2 ? [g] : [])) };
}

/** Groupe d'amis de deux personnes au moins, qui deviennent toutes amies entre elles. `moi`, s'il est donné, en est membre d'office. */
export function creerGroupe(d: Donnees, membres: string[], nom = '', moi?: string): { donnees: Donnees; groupe: GroupeAmis } {
  const distincts = [...new Set(moi ? [...membres, moi] : membres)];
  distincts.forEach((id) => exigerPersonne(d, id));
  if (distincts.length < 2) throw new Error('Un groupe d’amis compte au moins deux personnes');
  const groupe: GroupeAmis = { id: nouvelId(), nom: nom.trim(), membres: distincts };
  return { donnees: { ...d, groupes: [...d.groupes, groupe] }, groupe };
}

export function ajouterAuGroupe(d: Donnees, groupe: string, personne: string): Donnees {
  const g = exigerGroupe(d, groupe);
  exigerPersonne(d, personne);
  if (g.membres.includes(personne)) throw new Error('Cette personne est déjà dans ce groupe');
  return avecGroupe(d, { ...g, membres: [...g.membres, personne] });
}

/** Retire un membre ; le groupe est supprimé s'il lui reste moins de deux membres. */
export function retirerDuGroupe(d: Donnees, groupe: string, personne: string): Donnees {
  const g = exigerGroupe(d, groupe);
  if (!g.membres.includes(personne)) throw new Error('Cette personne n’est pas dans ce groupe');
  return avecGroupe(d, { ...g, membres: g.membres.filter((m) => m !== personne) });
}

export function renommerGroupe(d: Donnees, groupe: string, nom: string): Donnees {
  return avecGroupe(d, { ...exigerGroupe(d, groupe), nom: nom.trim() });
}

export function supprimerGroupe(d: Donnees, id: string): Donnees {
  exigerGroupe(d, id);
  return { ...d, groupes: d.groupes.filter((g) => g.id !== id) };
}

/** Retire une personne de tous les groupes ; ceux qui n'ont plus deux membres disparaissent. */
function sansPersonne(groupes: GroupeAmis[], id: string): GroupeAmis[] {
  return groupes.map((g) => ({ ...g, membres: g.membres.filter((m) => m !== id) })).filter((g) => g.membres.length >= 2);
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
