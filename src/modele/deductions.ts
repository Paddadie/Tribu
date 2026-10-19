// Liens déduits à partir des unions et filiations. Rien n'est stocké : tout se
// recalcule depuis les données.

import { comparateur } from './liste';
import type { Donnees, Filiation, Personne, Union } from './types';

/** Ordre alphabétique « prénom nom », le même que la liste triée par prénom. */
const parPrenom = comparateur('prenom');

function parId(d: Donnees, ids: Iterable<string>): Personne[] {
  const voulus = new Set(ids);
  return d.personnes.filter((p) => voulus.has(p.id));
}

/** Date croissante, sans date en fin de liste ; à égalité, ordre alphabétique. */
export function comparerParNaissance(a: Personne, b: Personne): number {
  if (a.naissance && b.naissance) {
    if (a.naissance !== b.naissance) return a.naissance < b.naissance ? -1 : 1;
  } else if (a.naissance) {
    return -1;
  } else if (b.naissance) {
    return 1;
  }
  return parPrenom(a, b);
}

/** Conjoint actuel : une personne n'a qu'une union à la fois (une séparation efface l'union). */
export function conjoint(d: Donnees, id: string): { union: Union; personne: Personne } | undefined {
  const union = d.unions.find((u) => u.personneA === id || u.personneB === id);
  if (!union) return undefined;
  const idConjoint = union.personneA === id ? union.personneB : union.personneA;
  const personne = d.personnes.find((p) => p.id === idConjoint);
  return personne && { union, personne };
}

export interface Lien {
  filiation: Filiation;
  personne: Personne;
}

/** Parents avec leur lien : biologiques d'abord, puis adoptifs ; ordre alphabétique dans chaque groupe. */
export function liensParents(d: Donnees, id: string): Lien[] {
  return d.filiations
    .filter((f) => f.enfant === id)
    .flatMap((filiation) => {
      const personne = d.personnes.find((p) => p.id === filiation.parent);
      return personne ? [{ filiation, personne }] : [];
    })
    .sort((a, b) => {
      if (a.filiation.type !== b.filiation.type) return a.filiation.type === 'biologique' ? -1 : 1;
      return parPrenom(a.personne, b.personne);
    });
}

/** Enfants avec leur lien, du plus âgé au plus jeune. */
export function liensEnfants(d: Donnees, id: string): Lien[] {
  return d.filiations
    .filter((f) => f.parent === id)
    .flatMap((filiation) => {
      const personne = d.personnes.find((p) => p.id === filiation.enfant);
      return personne ? [{ filiation, personne }] : [];
    })
    .sort((a, b) => comparerParNaissance(a.personne, b.personne));
}

/** Enfants ayant les deux personnes pour parents (tout type de filiation confondu). */
export function enfantsDuCouple(d: Donnees, idA: string, idB: string): Personne[] {
  const deA = new Set(d.filiations.filter((f) => f.parent === idA).map((f) => f.enfant));
  const communs = d.filiations.filter((f) => f.parent === idB && deA.has(f.enfant)).map((f) => f.enfant);
  return parId(d, communs).sort(comparerParNaissance);
}

/** Parents que les deux personnes ont en commun (ordre alphabétique). */
export function parentsCommuns(d: Donnees, idA: string, idB: string): Personne[] {
  const deA = new Set(d.filiations.filter((f) => f.enfant === idA).map((f) => f.parent));
  const communs = d.filiations.filter((f) => f.enfant === idB && deA.has(f.parent)).map((f) => f.parent);
  return parId(d, communs).sort(parPrenom);
}

/**
 * Frères et sœurs : mêmes parents (ensemble identique, non vide).
 * Demi-frères et demi-sœurs : au moins un parent en commun, mais pas tous.
 */
export function fratrie(d: Donnees, id: string): { freresSoeurs: Personne[]; demis: Personne[] } {
  const parentsDe = (x: string) => new Set(d.filiations.filter((f) => f.enfant === x).map((f) => f.parent));
  const miens = parentsDe(id);
  const freres: string[] = [];
  const demis: string[] = [];
  if (miens.size > 0) {
    for (const autre of d.personnes) {
      if (autre.id === id) continue;
      const siens = parentsDe(autre.id);
      const communs = [...siens].filter((p) => miens.has(p)).length;
      if (communs === 0) continue;
      if (communs === miens.size && communs === siens.size) freres.push(autre.id);
      else demis.push(autre.id);
    }
  }
  return {
    freresSoeurs: parId(d, freres).sort(comparerParNaissance),
    demis: parId(d, demis).sort(comparerParNaissance),
  };
}

// --- Parenté : lien entre deux personnes quelconques -------------------------
// Une seule fonction, `relation`, sert au lien avec « Moi » (FEAT-01) et aux
// sections de la famille élargie (FEAT-02) : les deux ne peuvent pas diverger.

/** Lien de sang : on monte de `montee` générations jusqu'à l'ancêtre commun le plus proche, puis on descend de `descente`. */
export interface Sang {
  type: 'sang';
  montee: number;
  descente: number;
  /** Frères et sœurs (1, 1) qui n'ont pas tous leurs parents en commun. */
  demi: boolean;
  /** Parent ou enfant direct par adoption. */
  adoptif: boolean;
}

/**
 * Lien de `de` vers `vers` (ce que `vers` est pour `de`) :
 * - conjoint : le conjoint actuel ;
 * - sang : biologique et adoptif comptent pareil ;
 * - alliance « conjoint » : `vers` est de la famille de sang de mon conjoint (`base` = lien conjoint → vers) ;
 * - alliance « sien » : `vers` est le conjoint de quelqu'un de ma famille de sang (`base` = lien de → conjoint de vers).
 */
export type Relation =
  | { type: 'soi' }
  | { type: 'conjoint'; marie: boolean }
  | Sang
  | { type: 'alliance'; cote: 'conjoint' | 'sien'; base: Sang };

type Parents = Map<string, Set<string>>;

function indexParents(d: Donnees): Parents {
  const index: Parents = new Map();
  for (const f of d.filiations) {
    if (!index.has(f.enfant)) index.set(f.enfant, new Set());
    index.get(f.enfant)!.add(f.parent);
  }
  return index;
}

/** Ancêtres avec leur distance minimale en générations (soi = 0). Parcours en largeur : tolère une boucle venue d'un import. */
function ancetres(parents: Parents, id: string): Map<string, number> {
  const distances = new Map([[id, 0]]);
  const file = [id];
  for (let i = 0; i < file.length; i++) {
    const courant = file[i];
    for (const p of parents.get(courant) ?? []) {
      if (distances.has(p)) continue;
      distances.set(p, distances.get(courant)! + 1);
      file.push(p);
    }
  }
  return distances;
}

function sang(d: Donnees, parents: Parents, de: string, vers: string): Sang | undefined {
  if (de === vers) return undefined;
  const miens = ancetres(parents, de);
  const siens = ancetres(parents, vers);
  let meilleur: [number, number] | undefined;
  for (const [ancetre, montee] of miens) {
    const descente = siens.get(ancetre);
    if (descente === undefined) continue;
    if (!meilleur || montee + descente < meilleur[0] + meilleur[1]) meilleur = [montee, descente];
  }
  if (!meilleur) return undefined;
  const [montee, descente] = meilleur;
  // Même règle que `fratrie` : frères et sœurs si les ensembles de parents sont identiques.
  const pDe = parents.get(de) ?? new Set<string>();
  const pVers = parents.get(vers) ?? new Set<string>();
  const demi = montee === 1 && descente === 1 && (pDe.size !== pVers.size || [...pDe].some((p) => !pVers.has(p)));
  const direct =
    montee === 1 && descente === 0 ? { parent: vers, enfant: de } : montee === 0 && descente === 1 ? { parent: de, enfant: vers } : undefined;
  const adoptif = !!direct && d.filiations.some((f) => f.parent === direct.parent && f.enfant === direct.enfant && f.type === 'adoptif');
  return { type: 'sang', montee, descente, demi, adoptif };
}

const distance = (s: Sang) => s.montee + s.descente;

function calculer(d: Donnees, parents: Parents, de: string, vers: string): Relation | undefined {
  if (de === vers) return { type: 'soi' };
  const monConjoint = conjoint(d, de);
  if (monConjoint?.personne.id === vers) return { type: 'conjoint', marie: monConjoint.union.marie };
  const direct = sang(d, parents, de, vers);
  if (direct) return direct;
  // Alliance : uniquement par le conjoint actuel (`conjoint`), jamais en parcourant les unions.
  const parConjoint = monConjoint && sang(d, parents, monConjoint.personne.id, vers);
  const sonConjoint = conjoint(d, vers);
  const parSien = sonConjoint && sonConjoint.personne.id !== de ? sang(d, parents, de, sonConjoint.personne.id) : undefined;
  if (parConjoint && (!parSien || distance(parConjoint) <= distance(parSien))) return { type: 'alliance', cote: 'conjoint', base: parConjoint };
  if (parSien) return { type: 'alliance', cote: 'sien', base: parSien };
  return undefined;
}

/** Ce que `vers` est pour `de`, ou undefined s'ils ne sont pas parents (ni par le sang, ni par un conjoint). */
export function relation(d: Donnees, de: string, vers: string): Relation | undefined {
  return calculer(d, indexParents(d), de, vers);
}

/** Le même lien vu depuis l'autre personne. */
export function inverser(r: Relation): Relation {
  if (r.type === 'sang') return { ...r, montee: r.descente, descente: r.montee };
  if (r.type === 'alliance') return { type: 'alliance', cote: r.cote === 'conjoint' ? 'sien' : 'conjoint', base: inverser(r.base) as Sang };
  return r;
}

export interface Parent {
  personne: Personne;
  relation: Relation;
}

export interface FamilleElargie {
  grandsParents: Parent[];
  petitsEnfants: Parent[];
  onclesTantes: Parent[];
  neveuxNieces: Parent[];
  cousins: Parent[];
  /** Beaux-parents (parents du conjoint), puis enfants du conjoint qui ne sont pas les miens. */
  belleFamille: Parent[];
}

/** Sections déduites de la fiche, chacune du plus âgé au plus jeune (vides comprises : à masquer à l'affichage). */
export function familleElargie(d: Donnees, id: string): FamilleElargie {
  const parents = indexParents(d);
  const f: FamilleElargie = { grandsParents: [], petitsEnfants: [], onclesTantes: [], neveuxNieces: [], cousins: [], belleFamille: [] };
  const beauxParents: Parent[] = [];
  const enfantsConjoint: Parent[] = [];
  for (const personne of [...d.personnes].sort(comparerParNaissance)) {
    const r = calculer(d, parents, id, personne.id);
    if (!r || r.type === 'soi' || r.type === 'conjoint') continue;
    const s = r.type === 'sang' ? r : r.base;
    const forme = `${s.montee},${s.descente}`;
    const entree = { personne, relation: r };
    if (r.type === 'sang') {
      if (forme === '2,0') f.grandsParents.push(entree);
      else if (forme === '0,2') f.petitsEnfants.push(entree);
      else if (forme === '2,1') f.onclesTantes.push(entree);
      else if (forme === '1,2') f.neveuxNieces.push(entree);
      else if (forme === '2,2') f.cousins.push(entree);
    } else {
      if (forme === '2,1') f.onclesTantes.push(entree);
      else if (forme === '1,2') f.neveuxNieces.push(entree);
      else if (r.cote === 'conjoint' && forme === '1,0') beauxParents.push(entree);
      else if (r.cote === 'conjoint' && forme === '0,1') enfantsConjoint.push(entree);
    }
  }
  f.belleFamille = [...beauxParents, ...enfantsConjoint];
  return f;
}
