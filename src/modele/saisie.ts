// Aides à la saisie des écrans d'ajout : nom prérempli d'un nouvel enfant et
// personnes suggérées en tête des listes de choix. Fonctions pures.

import { conjoint, conjointsDefunts, exConjoints } from './deductions';
import { accorder, avecDe, comparateur, memeNom } from './liste';
import { anneeDe, enCouple } from './modele';
import type { Donnees, Personne, Sexe, Union } from './types';

export interface NomPropose {
  nom: string;
  /** Parent qui porte ce nom. */
  de: Personne;
}

/**
 * Noms proposés pour un nouvel enfant de `parents` (la fiche ouverte d'abord) ; le premier est prérempli.
 * Couple homme-femme : le père, puis la mère. Sinon (un seul parent, sexe non précisé, même sexe) : l'ordre reçu.
 * Les noms vides et les doublons sont retirés.
 */
export function nomsEnfant(parents: Personne[]): NomPropose[] {
  const [a, b] = parents;
  const ordre = a && b && a.sexe && b.sexe && a.sexe !== b.sexe ? (a.sexe === 'M' ? [a, b] : [b, a]) : parents;
  const vus = new Set<string>();
  return ordre.flatMap((de) => {
    const nom = de.nom.trim();
    if (!nom || vus.has(nom)) return [];
    vus.add(nom);
    return [{ nom, de }];
  });
}

/**
 * Noms proposés pour un frère ou une sœur de `fiche` : son nom de naissance d'abord (celui de la fratrie), puis ceux des
 * parents cochés (`nomsEnfant`). Les noms vides et les doublons sont retirés.
 */
export function nomsFratrie(fiche: Personne, parents: Personne[]): NomPropose[] {
  const sien = (fiche.nomNaissance ?? fiche.nom).trim();
  const premier: NomPropose[] = sien ? [{ nom: sien, de: fiche }] : [];
  return [...premier, ...nomsEnfant(parents).filter((n) => n.nom !== sien)];
}

/** Nom proposé pour un nouveau parent de `fiche` : son nom de naissance (celui d'une femme avant le mariage), sinon son nom. */
export function nomsParent(fiche: Personne): NomPropose[] {
  return nomsFratrie(fiche, []);
}

export interface AutreParent {
  personne: Personne;
  /** Pourquoi elle est proposée (« Ex · 2 enfants ensemble », « Mère de Tristan »). */
  detail: string;
  /** Leur union, s'il y en a une. */
  union?: Union;
}

const estConnu = (p: Personne) => !p.inconnu && !p.sansNom;

/** Enfants que `a` et `b` ont ensemble. */
function enfantsCommuns(d: Donnees, a: string, b: string): Personne[] {
  const deB = new Set(d.filiations.filter((f) => f.parent === b).map((f) => f.enfant));
  const ids = d.filiations.filter((f) => f.parent === a && deB.has(f.enfant)).map((f) => f.enfant);
  return d.personnes.filter((p) => ids.includes(p.id));
}

/**
 * Autre parent possible d'un nouvel enfant de `id` : son conjoint actuel, ses conjoints défunts, ses ex, puis les autres
 * parents de ses enfants sans union avec lui. Les parents inconnus et les « ? » sont écartés.
 */
export function autresParents(d: Donnees, id: string): AutreParent[] {
  const resultat: AutreParent[] = [];
  const ajouter = (personne: Personne, detail: string, union?: Union) => {
    if (!estConnu(personne) || resultat.some((r) => r.personne.id === personne.id)) return;
    const n = enfantsCommuns(d, id, personne.id).length;
    const ensemble = n === 0 || !union ? '' : ` · ${n} ${n > 1 ? 'enfants' : 'enfant'} ensemble`;
    resultat.push({ personne, detail: detail + ensemble, ...(union ? { union } : {}) });
  };
  const actuel = conjoint(d, id);
  if (actuel) ajouter(actuel.personne, accorder(actuel.personne.sexe, 'Conjoint', 'Conjointe', 'Conjoint(e)'), actuel.union);
  for (const c of conjointsDefunts(d, id)) ajouter(c.personne, accorder(c.personne.sexe, 'Conjoint', 'Conjointe', 'Conjoint(e)'), c.union);
  for (const c of exConjoints(d, id)) ajouter(c.personne, 'Ex', c.union);
  for (const f of d.filiations.filter((x) => x.parent === id)) {
    const enfant = d.personnes.find((p) => p.id === f.enfant);
    for (const g of d.filiations.filter((x) => x.enfant === f.enfant && x.parent !== id)) {
      const autre = d.personnes.find((p) => p.id === g.parent);
      if (autre && enfant) ajouter(autre, `${accorder(autre.sexe, 'Père', 'Mère', 'Parent')} ${avecDe(appel(enfant))}`);
    }
  }
  return resultat;
}

/**
 * « Qui est ce parent ? » : personnes probables pour l'autre parent des `enfants`, dont les parents connus sont `parents` :
 * leurs conjoints (actuel, défunts), leurs ex, puis les autres parents de leurs autres enfants. Sans doublon.
 */
export function suggestionsParentInconnu(d: Donnees, parents: Personne[], enfants: Personne[]): Suggestion[] {
  const exclus = new Set([...parents, ...enfants].map((p) => p.id));
  const vues = new Map<string, Suggestion>();
  for (const pa of parents) {
    for (const a of autresParents(d, pa.id)) {
      if (exclus.has(a.personne.id) || vues.has(a.personne.id)) continue;
      const detail = a.union ? `${a.detail.split(' · ')[0]} ${avecDe(appel(pa))}` : a.detail;
      vues.set(a.personne.id, { personne: a.personne, detail });
    }
  }
  return [...vues.values()];
}

/**
 * Nom proposé pour un nouveau conjoint de `parent` : celui de leurs enfants, s'il est homme (une femme garde son nom,
 * le mariage le change ensuite). Les noms vides et les doublons sont retirés ; `de` est l'enfant qui le porte.
 */
export function nomsConjointSelonEnfants(d: Donnees, parent: string, sexe: Sexe | undefined): NomPropose[] {
  if (sexe !== 'M') return [];
  const vus = new Set<string>();
  return d.filiations
    .filter((f) => f.parent === parent)
    .flatMap((f) => {
      const enfant = d.personnes.find((p) => p.id === f.enfant);
      const nom = enfant?.nom.trim();
      if (!enfant || !nom || vus.has(nom)) return [];
      vus.add(nom);
      return [{ nom, de: enfant }];
    });
}

export type RoleSuggere = 'conjoint' | 'parent' | 'enfant' | 'frere';

/** Écart d'années minimal entre un parent et son enfant, au-dessous duquel on ne propose pas la personne. */
const ECART_PARENT_MIN = 12;
/** Écart d'années maximal entre deux frères et sœurs proposés d'après leur seul nom. */
const ECART_FRATRIE_MAX = 30;

export interface Suggestion {
  personne: Personne;
  /** Pourquoi elle est proposée (« Conjoint de Léa »). */
  detail: string;
}

const appel = (p: Personne) => p.prenom || p.nom;

/** Au moins un nom en commun, nom actuel ou nom de naissance : un lien de famille possible. */
const partageNom = (a: Personne, b: Personne) =>
  [a.nom, a.nomNaissance ?? ''].some((x) => [b.nom, b.nomNaissance ?? ''].some((y) => memeNom(x, y)));

/**
 * Personnes probables pour le lien à créer depuis la fiche `id` :
 * parent → le conjoint d'un parent déjà saisi ; enfant → les enfants du conjoint, puis des ex, qui ne sont pas encore les siens ;
 * conjoint → l'autre parent de ses enfants, s'il n'est pas en couple. Ordre alphabétique, sans doublon.
 * Parent, enfant, frère ou sœur : viennent ensuite les personnes de même nom de famille, sauf ascendants, descendants
 * et celles dont l'année de naissance rend le lien invraisemblable.
 */
export function suggestions(d: Donnees, id: string, role: RoleSuggere): Suggestion[] {
  const personne = (x: string) => d.personnes.find((p) => p.id === x);
  const parentsDe = (x: string) => d.filiations.filter((f) => f.enfant === x).map((f) => f.parent);
  const enfantsDe = (x: string) => d.filiations.filter((f) => f.parent === x).map((f) => f.enfant);
  const trouvees = new Map<string, string>();
  const proposer = (x: string, detail: string) => {
    if (x !== id && !trouvees.has(x)) trouvees.set(x, detail);
  };

  if (role === 'parent') {
    const miens = parentsDe(id);
    for (const pa of miens) {
      const c = conjoint(d, pa);
      if (c && !miens.includes(c.personne.id)) proposer(c.personne.id, `Conjoint ${avecDe(appel(personne(pa) as Personne))}`);
    }
  } else if (role === 'enfant') {
    const c = conjoint(d, id);
    const miens = enfantsDe(id);
    if (c) for (const e of enfantsDe(c.personne.id)) if (!miens.includes(e)) proposer(e, `Enfant ${avecDe(appel(c.personne))}`);
    for (const ex of exConjoints(d, id)) for (const e of enfantsDe(ex.personne.id)) if (!miens.includes(e)) proposer(e, `Enfant ${avecDe(appel(ex.personne))}`);
  } else if (!enCouple(d, id)) {
    for (const e of enfantsDe(id)) {
      for (const pa of parentsDe(e)) if (pa !== id && !enCouple(d, pa)) proposer(pa, `Parent ${avecDe(appel(personne(e) as Personne))}`);
    }
  }

  const parNom = comparateur('prenom');
  const enSuggestions = (liens: Map<string, string>): Suggestion[] =>
    [...liens]
      .flatMap(([x, detail]) => {
        const p = personne(x);
        return p ? [{ personne: p, detail }] : [];
      })
      .sort((a, b) => parNom(a.personne, b.personne));

  // Après les liens déduits : les personnes de même nom de famille dont l'âge est plausible.
  const moi = personne(id);
  const memeFamille = new Map<string, string>();
  if (moi && role !== 'conjoint') {
    const lignee = ascendanceEtDescendance(d, id);
    const mien = Number(anneeDe(moi.naissance));
    for (const p of d.personnes) {
      if (p.id === id || trouvees.has(p.id) || !partageNom(p, moi)) continue;
      if (lignee.has(p.id)) continue;
      const ecart = mien && anneeDe(p.naissance) ? Number(anneeDe(p.naissance)) - mien : undefined;
      if (ecart !== undefined) {
        // ecart > 0 : la personne est plus jeune que la fiche.
        if (role === 'parent' && ecart > -ECART_PARENT_MIN) continue;
        if (role === 'enfant' && ecart < ECART_PARENT_MIN) continue;
        if (role === 'frere' && Math.abs(ecart) > ECART_FRATRIE_MAX) continue;
      }
      memeFamille.set(p.id, `Même nom : ${p.nom.trim()}`);
    }
  }
  return [...enSuggestions(trouvees), ...enSuggestions(memeFamille)];
}

/** Ancêtres et descendants de `id` : jamais proposés d'après le seul nom (un lien avec eux serait refusé). */
function ascendanceEtDescendance(d: Donnees, id: string): Set<string> {
  const parcourir = (depart: string, voisins: (x: string) => string[]) => {
    const vus = new Set<string>();
    const pile = [depart];
    for (let x = pile.pop(); x !== undefined; x = pile.pop()) {
      for (const v of voisins(x)) if (!vus.has(v)) vus.add(v), pile.push(v);
    }
    return vus;
  };
  const ancetres = parcourir(id, (x) => d.filiations.filter((f) => f.enfant === x).map((f) => f.parent));
  const descendants = parcourir(id, (x) => d.filiations.filter((f) => f.parent === x).map((f) => f.enfant));
  return new Set([...ancetres, ...descendants]);
}
