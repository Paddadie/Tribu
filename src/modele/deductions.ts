// Liens déduits à partir des unions et filiations. Rien n'est stocké : tout se
// recalcule depuis les données.

import { estDansLeFutur } from './age';
import { comparateur } from './liste';
import { anneeDe, estInconnu, groupesDe, groupesDeLaFamille } from './modele';
import { estParentSansNom } from './parentSansNom';
import type { Donnees, Filiation, GroupeAmis, Personne, Union } from './types';

/** Ordre alphabétique « prénom nom », le même que la liste triée par prénom. */
const parPrenom = comparateur('prenom');

function parId(d: Donnees, ids: Iterable<string>): Personne[] {
  const voulus = new Set(ids);
  return d.personnes.filter((p) => voulus.has(p.id));
}

/** Date croissante, sans date (ou sans année) en fin de liste ; à égalité, ordre alphabétique. */
export function comparerParNaissance(a: Personne, b: Personne): number {
  const [na, nb] = [anneeDe(a.naissance) && a.naissance, anneeDe(b.naissance) && b.naissance];
  if (na && nb) {
    if (na !== nb) return na < nb ? -1 : 1;
  } else if (na) {
    return -1;
  } else if (nb) {
    return 1;
  }
  return parPrenom(a, b);
}

function autreDeLUnion(d: Donnees, union: Union, id: string): { union: Union; personne: Personne } | undefined {
  const idAutre = union.personneA === id ? union.personneB : union.personneA;
  const personne = d.personnes.find((p) => p.id === idAutre);
  return personne && { union, personne };
}

/**
 * Conjoint actuel : une personne n'a qu'une union actuelle à la fois. Les unions séparées n'en font pas
 * partie : c'est ce qui empêche un ex de devenir de la famille par alliance (voir `exConjoints`).
 */
export function conjoint(d: Donnees, id: string): { union: Union; personne: Personne } | undefined {
  const union = d.unions.find((u) => u.statut === 'actuelle' && (u.personneA === id || u.personneB === id));
  return union && autreDeLUnion(d, union, id);
}

/** Ex-conjoints (unions séparées), dans l'ordre des unions ; purement informatif, sans effet sur la parenté. */
export function exConjoints(d: Donnees, id: string): { union: Union; personne: Personne }[] {
  return d.unions.filter((u) => u.statut === 'separee' && (u.personneA === id || u.personneB === id)).flatMap((u) => autreDeLUnion(d, u, id) ?? []);
}

export interface Lien {
  filiation: Filiation;
  personne: Personne;
}

/** Parents avec leur lien, parents inconnus compris (pour la parenté, jamais pour l'affichage). */
function tousLiensParents(d: Donnees, id: string): Lien[] {
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

/** Parents avec leur lien : biologiques d'abord, puis adoptifs ; ordre alphabétique dans chaque groupe. Sans les parents inconnus. */
export function liensParents(d: Donnees, id: string): Lien[] {
  return tousLiensParents(d, id).filter((l) => !estInconnu(l.personne));
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
  return parId(d, communs)
    .filter((p) => !estInconnu(p))
    .sort(parPrenom);
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
 * `marie` : l'union qui fait l'alliance est un mariage (faux = « copine de », pas « belle-sœur »).
 */
export type Relation =
  | { type: 'soi' }
  | { type: 'conjoint'; marie: boolean; fiance?: boolean }
  | Sang
  | { type: 'alliance'; cote: 'conjoint' | 'sien'; base: Sang; marie?: boolean; fiance?: boolean };

/** `{ fiance: true }` pour des fiancés, sinon rien (le champ n'est présent que s'il est vrai). */
const fiances = (u: Union) => (sontFiances(u) ? { fiance: true } : {});

/** Union actuelle dont la date est à venir : un mariage annoncé, les deux sont « fiancés » (et non copain, compagne ou époux). */
export const sontFiances = (u: Union, aujourdhui = new Date()) => u.statut === 'actuelle' && estDansLeFutur(u.date, aujourdhui);

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
  const direct = montee === 1 && descente === 0 ? { parent: vers, enfant: de } : montee === 0 && descente === 1 ? { parent: de, enfant: vers } : undefined;
  const adoptif = !!direct && d.filiations.some((f) => f.parent === direct.parent && f.enfant === direct.enfant && f.type === 'adoptif');
  return { type: 'sang', montee, descente, demi, adoptif };
}

const distance = (s: Sang) => s.montee + s.descente;

function calculer(d: Donnees, parents: Parents, de: string, vers: string): Relation | undefined {
  if (de === vers) return { type: 'soi' };
  const monConjoint = conjoint(d, de);
  if (monConjoint?.personne.id === vers) return { type: 'conjoint', marie: monConjoint.union.marie, ...fiances(monConjoint.union) };
  const direct = sang(d, parents, de, vers);
  if (direct) return direct;
  // Alliance : uniquement par le conjoint actuel (`conjoint`), jamais en parcourant les unions.
  const parConjoint = monConjoint && sang(d, parents, monConjoint.personne.id, vers);
  const sonConjoint = conjoint(d, vers);
  const parSien = sonConjoint && sonConjoint.personne.id !== de ? sang(d, parents, de, sonConjoint.personne.id) : undefined;
  if (parConjoint && (!parSien || distance(parConjoint) <= distance(parSien)))
    return { type: 'alliance', cote: 'conjoint', base: parConjoint, marie: monConjoint!.union.marie };
  if (parSien) {
    // Le futur(e) marié(e) d'un proche se dit « fiancée de … », pas « belle-sœur » : comme un partenaire non marié.
    const fiance = sontFiances(sonConjoint!.union);
    return { type: 'alliance', cote: 'sien', base: parSien, marie: sonConjoint!.union.marie && !fiance, ...(fiance && { fiance }) };
  }
  return undefined;
}

/** Ce que `vers` est pour `de`, ou undefined s'ils ne sont pas parents (ni par le sang, ni par un conjoint). */
export function relation(d: Donnees, de: string, vers: string): Relation | undefined {
  return calculer(d, indexParents(d), de, vers);
}

/** Le même lien vu depuis l'autre personne. */
export function inverser(r: Relation): Relation {
  if (r.type === 'sang') return { ...r, montee: r.descente, descente: r.montee };
  if (r.type === 'alliance')
    return {
      type: 'alliance',
      cote: r.cote === 'conjoint' ? 'sien' : 'conjoint',
      base: inverser(r.base) as Sang,
      marie: r.marie,
      ...(r.fiance && { fiance: true }),
    };
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
  for (const personne of d.personnes.filter((p) => !estInconnu(p)).sort(comparerParNaissance)) {
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

// --- Amis et chemin depuis « Moi » (FEAT-09) ----------------------------------

/** Amis de la personne (les autres membres de ses groupes), dans l'ordre alphabétique. Une amitié ne crée aucune parenté. */
export function amis(d: Donnees, id: string): Personne[] {
  const ids = new Set(d.groupes.filter((g) => g.membres.includes(id)).flatMap((g) => g.membres));
  ids.delete(id);
  return d.personnes.filter((p) => ids.has(p.id)).sort(parPrenom);
}

/** Nom d'un groupe d'amis ; sans nom, « Groupe de Paul, Julie ». */
export function nomGroupe(d: Donnees, g: GroupeAmis): string {
  if (g.nom.trim()) return g.nom.trim();
  const prenoms = d.personnes
    .filter((p) => g.membres.includes(p.id))
    .sort(parPrenom)
    .map((p) => p.prenom || p.nom);
  return `Groupe de ${prenoms.slice(0, 3).join(', ')}${prenoms.length > 3 ? '…' : ''}`;
}

/**
 * Pourquoi une personne ne peut pas entrer dans un groupe : elle est déjà groupée, ou un membre de sa famille
 * appartient à un autre groupe (toute la famille d'un membre compte dans son groupe). `cible` : le groupe visé, s'il existe.
 */
export function raisonGroupe(d: Donnees, c: Personne, cible?: GroupeAmis, moi?: string): string | undefined {
  // « Moi » peut être dans tous les groupes, et sa famille n'est pas « famille d'un membre ».
  if (c.id === moi) return cible?.membres.includes(c.id) ? 'Déjà dans le groupe' : undefined;
  const propre = groupesDe(d, c.id)[0];
  if (propre) return propre.id === cible?.id ? 'Déjà dans le groupe' : `Déjà dans « ${nomGroupe(d, propre)} »`;
  const autre = groupesDeLaFamille(d, c.id, moi).find((g) => g.id !== cible?.id);
  return autre ? `Famille d’un membre de « ${nomGroupe(d, autre)} »` : undefined;
}

/**
 * Comment on passe d'une étape à la suivante : la personne est le parent, l'enfant, le conjoint, l'ami
 * ou le frère ou la sœur de la précédente (par des parents inconnus, jamais nommés dans le chemin).
 */
export type Pas = 'parent' | 'enfant' | 'conjoint' | 'ami' | 'frere';

export interface Etape {
  personne: Personne;
  /** Absent pour la première étape (« Moi »). */
  par?: Pas;
  /** Union mariée, pour une étape `conjoint`. */
  marie?: boolean;
  /** Union actuelle à date future (`sontFiances`), pour une étape `conjoint`. */
  fiance?: boolean;
}

/** Les personnes classées de la plus proche en âge de `annee` à la plus éloignée ; naissance inconnue en dernier, ordre conservé à égalité. */
function parProximiteAge(personnes: Personne[], annee: number | undefined): Personne[] {
  if (annee === undefined) return personnes;
  const ecart = (p: Personne) => {
    const n = anneeDe(p.naissance);
    return n === undefined ? Infinity : Math.abs(Number(n) - annee);
  };
  return [...personnes].sort((x, y) => ecart(x) - ecart(y));
}

/** Plus court chemin de `de` à `vers` (parcours en largeur), par les parents, enfants, conjoint actuel et, au besoin, les amis. */
function parcours(d: Donnees, de: string, vers: string, avecAmis: boolean): Etape[] | undefined {
  // Entre deux amis à égale distance, celui dont l'âge est le plus proche du mien sert de détour (« beau-frère de Léa »).
  const naissanceDe = anneeDe(d.personnes.find((p) => p.id === de)?.naissance);
  const anneeNaissance = naissanceDe === undefined ? undefined : Number(naissanceDe);
  const precedent = new Map<string, { de: string; etape: Etape } | null>([[de, null]]);
  const file = [de];
  for (let i = 0; i < file.length && !precedent.has(vers); i++) {
    const courant = file[i];
    const voisins: Etape[] = [
      ...tousLiensParents(d, courant).map(({ personne }) => ({ personne, par: 'parent' as const })),
      ...liensEnfants(d, courant).map(({ personne }) => ({ personne, par: 'enfant' as const })),
    ];
    const c = conjoint(d, courant);
    if (c) voisins.push({ personne: c.personne, par: 'conjoint', marie: c.union.marie, fiance: sontFiances(c.union) });
    if (avecAmis) voisins.push(...parProximiteAge(amis(d, courant), anneeNaissance).map((personne) => ({ personne, par: 'ami' as const })));
    for (const v of voisins) {
      if (precedent.has(v.personne.id)) continue;
      precedent.set(v.personne.id, { de: courant, etape: v });
      file.push(v.personne.id);
    }
  }
  if (!precedent.has(vers)) return undefined;
  const etapes: Etape[] = [];
  for (let x = precedent.get(vers); x; x = precedent.get(x.de)) etapes.unshift(x.etape);
  // Un parent inconnu disparaît du chemin : l'étape suivante (son autre enfant) devient un frère ou une sœur.
  const visibles: Etape[] = [];
  let viaInconnu = false;
  for (const e of etapes) {
    if (estInconnu(e.personne)) {
      viaInconnu = true;
      continue;
    }
    visibles.push(viaInconnu ? { ...e, par: 'frere' } : e);
    viaInconnu = false;
  }
  // Hors des amis, un parent suivi de son autre enfant : des frères et sœurs, directement (chemin le plus court).
  const dernierAmi = visibles.map((e) => e.par).lastIndexOf('ami');
  const compacts: Etape[] = visibles.slice(0, dernierAmi + 1);
  for (let i = compacts.length; i < visibles.length; i++) {
    const suivant = visibles[i + 1];
    if (visibles[i].par === 'parent' && suivant?.par === 'enfant') {
      compacts.push({ ...suivant, par: 'frere' });
      i++;
    } else compacts.push(visibles[i]);
  }
  const depart = d.personnes.find((p) => p.id === de);
  return depart && [{ personne: depart }, ...compacts];
}

/**
 * Chemin de « Moi » (`moi`) jusqu'à `vers`, première étape comprise. Pour la famille (`relation` trouve un lien),
 * le chemin ne passe que par la famille ; sinon, il passe par au moins une amitié. Undefined pour soi-même,
 * ou sans chemin (personne sans lien, ou reliée seulement par des unions qui ne font pas de parenté).
 */
export function chemin(d: Donnees, moi: string, vers: string): Etape[] | undefined {
  if (moi === vers) return undefined;
  const cible = d.personnes.find((p) => p.id === vers);
  if (relation(d, moi, vers) || (cible && estParentSansNom(cible))) return parcours(d, moi, vers, false);
  const etapes = parcours(d, moi, vers, true);
  return etapes?.some((e) => e.par === 'ami') ? etapes : undefined;
}

/**
 * L'autre parent des enfants quand l'un des deux est un parent sans nom (« ? ») : sans lui, la fiche de l'un
 * ne montrerait pas l'autre. Undefined si aucun des deux n'est sans nom.
 */
export function autreParent(d: Donnees, id: string): Personne | undefined {
  const moi = d.personnes.find((p) => p.id === id);
  if (!moi) return undefined;
  const sansNom = estParentSansNom(moi);
  for (const { personne: enfant } of liensEnfants(d, id)) {
    for (const { personne } of liensParents(d, enfant.id)) {
      if (personne.id !== id && !estInconnu(personne) && (sansNom || estParentSansNom(personne))) return personne;
    }
  }
  return undefined;
}

/** Contenu du dessin « Famille proche » d'une fiche. */
export interface Foyer {
  /** Deux parents au plus : les premiers de `liensParents` (biologiques d'abord). */
  parents: { personne: Personne; adoptif: boolean }[];
  /** Case « + Parent » à montrer (0 ou 1) : seulement pour la famille, quand il manque un parent. */
  manque: number;
  /** Les deux parents dessinés ont une union terminée (trait pointillé entre eux). */
  parentsSepares: boolean;
  /** `separe` : pas d'union actuelle, c'est l'autre parent des enfants d'un parent sans nom, ou l'ex avec qui il a des enfants (trait pointillé). */
  conjoint?: { personne: Personne; marie: boolean; separe?: boolean };
  /** Ex avec qui il a des enfants, quand il a aussi un conjoint actuel : dessiné de l'autre côté de la personne (trait pointillé). */
  ex?: { personne: Personne; marie: boolean };
  /** Frères et sœurs (mêmes parents), du plus âgé au plus jeune. */
  fratrie: Personne[];
  /** Demi-frères et demi-sœurs qui ont exactement un parent dessiné en commun (`parent` : son id), du plus âgé au plus jeune ; `autre` : leur autre parent, s'il est connu (`autreSepare` : leur union est terminée). */
  demis: { personne: Personne; parent: string; autre?: Personne; autreSepare?: boolean }[];
  /** Enfants : ceux d'une autre union d'abord, puis ceux du couple ; du plus âgé au plus jeune dans chaque groupe. */
  enfants: { personne: Personne; adoptif: boolean; duCouple: boolean; duEx: boolean }[];
}

/** Famille proche de `id`. `moi` absent : tout le monde compte comme de la famille (case « + Parent » comprise). */
export function foyer(d: Donnees, id: string, moi?: string): Foyer {
  const tousParents = liensParents(d, id);
  const famille = !moi || moi === id || relation(d, moi, id) !== undefined;
  const c = conjoint(d, id);
  const autre = c ? undefined : autreParent(d, id);
  const uniAutre = autre && d.unions.find((u) => (u.personneA === id && u.personneB === autre.id) || (u.personneA === autre.id && u.personneB === id));
  const liens = liensEnfants(d, id);
  // L'ex avec qui il a des enfants (le premier) est dessiné en pointillé : à la place du conjoint s'il n'en a pas, sinon de l'autre côté.
  const exParent = autre
    ? undefined
    : exConjoints(d, id).find((e) => liens.some((l) => d.filiations.some((f) => f.parent === e.personne.id && f.enfant === l.personne.id)));
  const cj = c
    ? { personne: c.personne, marie: c.union.marie }
    : autre
      ? { personne: autre, marie: !!uniAutre?.marie, separe: true }
      : exParent && { personne: exParent.personne, marie: exParent.union.marie, separe: true };
  const ex = c && exParent ? { personne: exParent.personne, marie: exParent.union.marie } : undefined;
  const enfants = liens.map(({ filiation, personne }) => ({
    personne,
    adoptif: filiation.type === 'adoptif',
    duCouple: !!cj && d.filiations.some((f) => f.parent === cj.personne.id && f.enfant === personne.id),
    duEx: !!ex && d.filiations.some((f) => f.parent === ex.personne.id && f.enfant === personne.id),
  }));
  const dessines = tousParents.slice(0, 2);
  const fr = fratrie(d, id);
  const demis = fr.demis.flatMap((personne) => {
    const communs = dessines.filter(({ personne: par }) => d.filiations.some((f) => f.parent === par.id && f.enfant === personne.id));
    if (communs.length !== 1) return [];
    const autre = liensParents(d, personne.id).find(({ personne: par }) => par.id !== communs[0].personne.id)?.personne;
    const commun = communs[0].personne.id;
    const autreSepare =
      !!autre &&
      d.unions.some(
        (u) => u.statut === 'separee' && ((u.personneA === commun && u.personneB === autre.id) || (u.personneA === autre.id && u.personneB === commun)),
      );
    return [{ personne, parent: commun, autre, autreSepare }];
  });
  return {
    parents: dessines.map(({ filiation, personne }) => ({ personne, adoptif: filiation.type === 'adoptif' })),
    manque: famille && tousParents.length < 2 ? 1 : 0,
    parentsSepares:
      tousParents.length >= 2 &&
      d.unions.some((u) => {
        const [a, b] = [tousParents[0].personne.id, tousParents[1].personne.id];
        return u.statut === 'separee' && ((u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a));
      }),
    conjoint: cj,
    ex,
    fratrie: fr.freresSoeurs,
    demis,
    enfants: [...enfants.filter((e) => !e.duCouple), ...enfants.filter((e) => e.duCouple)],
  };
}
