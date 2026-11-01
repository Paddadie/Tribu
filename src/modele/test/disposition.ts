// Mesures de l'arbre principal (V4, lot 0) : invariants et métriques pures sur une `Disposition`, sans rien changer
// au placement. Elles servent de seuils de non-régression au lot 4 (points 13 à 15).

import type { Branche, Disposition } from '../arbreGlobal';
import { personnesVisibles } from '../modele';
import { ECART_FAMILLES } from '../partie';
import { preparer } from '../souple';
import { fautesDe } from '../soupleRecherche';
import type { Donnees } from '../types';

const EPS = 1e-6;

/** Portée horizontale du trait commun d'une branche : de l'extrémité gauche à l'extrémité droite de ses départs et enfants. */
function portee(b: Branche): [number, number] {
  const xs = [...b.origines.map((o) => o.x), ...b.enfants.map((e) => e.x)];
  return [Math.min(...xs), Math.max(...xs)];
}

const ligne = (y: number) => Math.round(y * 1000);

export interface FautesDisposition {
  /** Deux personnes d'une même ligne à moins d'une place. */
  chevauchements: string[];
  /** Enfant dont le trait commun n'est pas entre ses parents et lui, ou qui n'est pas à sa place. */
  horsDuBus: string[];
  /** Deux fratries de parents différents qui s'entrelacent sur une ligne (point 13). */
  entrelacements: string[];
  /** Deux traits communs à la même hauteur qui se touchent ou se chevauchent (point 13). */
  busCollés: string[];
  /**
   * Deux fratries sans parent commun voisines sur une ligne (personne entre elles), à moins de `ECART_FAMILLES`, et
   * dont les traits communs sont à la même hauteur : le trait paraît continu, des cousins ou des alliés semblent frères
   * (point 13). Les demi-fratries, qui partagent un parent, ne comptent pas.
   */
  fratriesCollees: string[];
  /** Personne visible reliée à Moi mais absente de l'arbre. */
  absentes: string[];
}

export function fautesDisposition(d: Donnees, moi: string, disp: Disposition): FautesDisposition {
  const placeDe = new Map(disp.places.map((p) => [p.personne.id, p]));
  const chevauchements: string[] = [];
  const parLigne = new Map<number, typeof disp.places>();
  for (const p of disp.places) parLigne.set(ligne(p.y), [...(parLigne.get(ligne(p.y)) ?? []), p]);
  for (const ps of parLigne.values()) {
    const tri = [...ps].sort((a, b) => a.x - b.x);
    for (let i = 1; i < tri.length; i++) {
      if (tri[i].x - tri[i - 1].x < 1 - EPS) chevauchements.push(`${tri[i - 1].personne.id} / ${tri[i].personne.id}`);
    }
  }

  const horsDuBus: string[] = [];
  for (const b of disp.branches) {
    for (const e of b.enfants) {
      const p = placeDe.get(e.id);
      const sousLeBus = b.origines.every((o) => o.y < b.bus - EPS) && e.y > b.bus + EPS;
      if (!sousLeBus || !p || Math.abs(p.x - e.x) > EPS || Math.abs(p.y - e.y) > EPS) horsDuBus.push(e.id);
    }
  }

  const entrelacements: string[] = [];
  const busCollés: string[] = [];
  const fratriesCollees: string[] = [];
  const cle = (b: Branche) => b.enfants.map((e) => e.id).join(',');
  const parentsDe = (b: Branche) => new Set(d.filiations.filter((f) => f.enfant === b.enfants[0]?.id).map((f) => f.parent));
  for (let i = 0; i < disp.branches.length; i++) {
    for (let j = i + 1; j < disp.branches.length; j++) {
      const [a, b] = [disp.branches[i], disp.branches[j]];
      if (a.enfants.some((e) => b.enfants.some((f) => f.id === e.id))) continue;
      const [ea, eb] = [a, b].map((x) => x.enfants.map((e) => e.x));
      if (
        ligne(a.enfants[0]?.y ?? NaN) === ligne(b.enfants[0]?.y ?? NaN) &&
        Math.min(...ea) < Math.max(...eb) - EPS &&
        Math.min(...eb) < Math.max(...ea) - EPS
      ) {
        entrelacements.push(`${cle(a)} | ${cle(b)}`);
      }
      const [pa, pb] = [portee(a), portee(b)];
      const memeBus = Math.abs(a.bus - b.bus) < EPS;
      if (memeBus && pa[0] <= pb[1] + EPS && pb[0] <= pa[1] + EPS) busCollés.push(`${cle(a)} | ${cle(b)}`);
      const y = a.enfants[0]?.y;
      if (y === undefined || ligne(y) !== ligne(b.enfants[0]?.y ?? NaN)) continue;
      const [gauche, droite] = Math.max(...ea) < Math.min(...eb) ? [ea, eb] : [eb, ea];
      const [de, a2] = [Math.max(...gauche), Math.min(...droite)];
      const entre = disp.places.some((p) => ligne(p.y) === ligne(y) && p.x > de + EPS && p.x < a2 - EPS);
      const parentsA = parentsDe(a);
      const commun = [...parentsDe(b)].some((p) => parentsA.has(p));
      if (!entre && !commun && memeBus && a2 - de < ECART_FAMILLES - EPS) {
        fratriesCollees.push(`${cle(a)} | ${cle(b)} : écart ${(a2 - de).toFixed(2)}${a.lignee === b.lignee ? ', même lignée' : ''}`);
      }
    }
  }

  // Composante de Moi par tous les liens (unions, filiations, groupes), parents inconnus compris.
  const voisins = new Map<string, string[]>();
  const lier = (a: string, b: string) => {
    voisins.set(a, [...(voisins.get(a) ?? []), b]);
    voisins.set(b, [...(voisins.get(b) ?? []), a]);
  };
  for (const u of d.unions) lier(u.personneA, u.personneB);
  for (const f of d.filiations) lier(f.parent, f.enfant);
  for (const g of d.groupes) for (const m of g.membres.slice(1)) lier(g.membres[0], m);
  const vus = new Set([moi]);
  const file = [moi];
  while (file.length > 0) for (const v of voisins.get(file.pop()!) ?? []) if (!vus.has(v) && file.push(v)) vus.add(v);
  const absentes = personnesVisibles(d)
    .filter((p) => vus.has(p.id) && !placeDe.has(p.id))
    .map((p) => p.id);

  return { chevauchements, horsDuBus, entrelacements, busCollés, fratriesCollees, absentes };
}

export interface Metriques {
  /** Largeur totale, en places. */
  largeur: number;
  /** Écart moyen entre le milieu des départs et le milieu des enfants d'une branche (point 14). */
  ecartMoyen: number;
  /** Traits parent → bus → enfant qui ne sont pas droits : aucun départ juste au-dessus de l'enfant (point 15). */
  coudes: number;
  /** Coudes de moins d'une demi-place : un enfant presque, mais pas tout à fait, à l'aplomb d'un départ (point 15). */
  petitsCoudes: number;
  /** Paires de branches dont un trait vertical traverse le trait commun de l'autre (point 15). */
  croisements: number;
}

export function metriques(disp: Disposition): Metriques {
  const xs = disp.places.map((p) => p.x);
  const largeur = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0;
  const avecDeparts = disp.branches.filter((b) => b.origines.length > 0 && b.enfants.length > 0);
  const milieu = (vs: number[]) => (Math.min(...vs) + Math.max(...vs)) / 2;
  const ecartMoyen =
    avecDeparts.length === 0
      ? 0
      : avecDeparts.reduce((s, b) => s + Math.abs(milieu(b.origines.map((o) => o.x)) - milieu(b.enfants.map((e) => e.x))), 0) / avecDeparts.length;
  const coudes = disp.branches.reduce((s, b) => s + b.enfants.filter((e) => !b.origines.some((o) => Math.abs(o.x - e.x) < EPS)).length, 0);
  const petitsCoudes = disp.branches.reduce(
    (s, b) =>
      s +
      b.enfants.filter((e) => {
        const ecart = Math.min(...b.origines.map((o) => Math.abs(o.x - e.x)));
        return ecart > EPS && ecart < 0.5;
      }).length,
    0,
  );

  const verticaux = (b: Branche) => [
    ...b.origines.map((o) => ({ x: o.x, haut: o.y, bas: b.bus })),
    ...b.enfants.map((e) => ({ x: e.x, haut: b.bus, bas: e.y })),
  ];
  const traverse = (a: Branche, b: Branche) => {
    const [lo, hi] = portee(a);
    return verticaux(b).some((v) => v.x > lo + EPS && v.x < hi - EPS && v.haut < a.bus - EPS && v.bas > a.bus + EPS);
  };
  let croisements = 0;
  for (let i = 0; i < disp.branches.length; i++) {
    for (let j = i + 1; j < disp.branches.length; j++) {
      if (traverse(disp.branches[i], disp.branches[j]) || traverse(disp.branches[j], disp.branches[i])) croisements++;
    }
  }
  return { largeur, ecartMoyen, coudes, petitsCoudes, croisements };
}

// Les quatre critères de la disposition, dans l'ordre de priorité : croisements, proximité de Moi, coudes en trop,
// enfants uniques décentrés. Toutes en places (1 = PAS_X) sauf les croisements, comptés sur le dessin en pixels.

/**
 * Critère 1 : croisements du dessin tel qu'il s'affiche (la disposition, générations souples comprises si elles y sont
 * déjà appliquées). Traits de couple et de filiation de la famille, bulle des amis exclue ; un croisement franc entre
 * deux traits de groupes différents (groupe = les parents d'une fratrie, ou les deux conjoints d'un couple), sans les
 * contacts en T ni les traits d'une même fratrie. Définition de `fautesDe` (soupleRecherche.ts).
 */
export function croisementsDessin(disp: Disposition, moi: string): number {
  const S = preparer(disp, moi);
  if (!S) return 0;
  const n = S.brs.length;
  return fautesDe(S, new Array<number>(n).fill(0), new Array<boolean>(n).fill(false)).croisements;
}

/** Rangs de parenté du critère 2, du plus proche au plus éloigné. */
export const RANGS = ['parents', 'grandsParents', 'fratrie', 'oncles', 'cousins'] as const;
export type Rang = (typeof RANGS)[number];

/**
 * Rang de parenté avec Moi, par les filiations (biologiques et adoptives), parents inconnus exclus : parents,
 * grands-parents, frères et sœurs (demi compris), oncles et tantes (autres enfants des grands-parents), cousins
 * (leurs enfants). Une personne a son rang le plus proche ; les autres (conjoints, arrière-grands-parents…) n'en ont pas.
 */
export function rangsDeParente(d: Donnees, moi: string): Map<string, Rang> {
  const inconnu = new Set(d.personnes.filter((p) => p.inconnu).map((p) => p.id));
  // Parents inconnus compris dans le parcours : ils relient des frères et sœurs, mais n'ont pas de rang.
  const parentsDe = (ids: string[]) => [...new Set(d.filiations.filter((f) => ids.includes(f.enfant)).map((f) => f.parent))];
  const enfantsDe = (ids: string[]) => [...new Set(d.filiations.filter((f) => ids.includes(f.parent)).map((f) => f.enfant))];
  const rangs = new Map<string, Rang>();
  const mettre = (ids: string[], r: Rang) => ids.forEach((id) => id !== moi && !inconnu.has(id) && !rangs.has(id) && rangs.set(id, r));
  const parents = parentsDe([moi]);
  const gp = parentsDe(parents);
  mettre(parents, 'parents');
  mettre(gp, 'grandsParents');
  mettre(enfantsDe(parents), 'fratrie');
  const oncles = enfantsDe(gp).filter((id) => !parents.includes(id));
  mettre(oncles, 'oncles');
  mettre(enfantsDe(oncles), 'cousins');
  return rangs;
}

/**
 * Critère 2 : distance horizontale moyenne à Moi (|x − x de Moi|, en places) de chaque rang de parenté présent dans
 * l'arbre ; un rang absent vaut 0. Se compare rang par rang, le plus proche d'abord.
 */
export function proximiteMoi(d: Donnees, moi: string, disp: Disposition): Record<Rang, number> {
  const placeDe = new Map(disp.places.map((p) => [p.personne.id, p]));
  const xMoi = placeDe.get(moi)?.x ?? 0;
  const sommes = Object.fromEntries(RANGS.map((r) => [r, [0, 0]])) as Record<Rang, [number, number]>;
  for (const [id, r] of rangsDeParente(d, moi)) {
    const p = placeDe.get(id);
    if (!p || p.bulle) continue;
    sommes[r][0] += Math.abs(p.x - xMoi);
    sommes[r][1]++;
  }
  return Object.fromEntries(RANGS.map((r) => [r, sommes[r][1] ? sommes[r][0] / sommes[r][1] : 0])) as Record<Rang, number>;
}

/** Départs dessinés d'une branche (un parent inconnu n'a pas de trait), sans doublon d'abscisse. */
const departsDessines = (b: Branche) => [...new Set(b.origines.filter((o) => !o.inconnu).map((o) => Math.round(o.x / EPS) * EPS))];

/**
 * Critère 3 : coudes au-delà du minimum. Un enfant fait un coude quand aucun départ dessiné n'est juste au-dessus de lui
 * (son trait change deux fois de direction). Minimum d'une branche : enfants − départs dessinés (chaque départ ne peut
 * avoir qu'un enfant à son aplomb). Une fratrie sans départ dessiné (parents inconnus) ne compte pas.
 */
export function coudesEnTrop(disp: Disposition): number {
  let total = 0;
  for (const b of disp.branches) {
    const departs = departsDessines(b);
    if (departs.length === 0) continue;
    const coudes = b.enfants.filter((e) => !departs.some((x) => Math.abs(x - e.x) < 1e-3)).length;
    total += coudes - Math.max(0, b.enfants.length - departs.length);
  }
  return total;
}

/**
 * Critère 4 : enfants uniques décentrés. Pour une branche d'un seul enfant et d'un seul départ dessiné (le milieu d'un
 * couple voisin, ou un parent seul) : l'écart |x du départ − x de l'enfant|, en places, s'il dépasse 0,01. Une branche
 * à deux départs séparés (parents éloignés) est à part : centrer l'enfant y ajouterait un coude (critère 3).
 */
export function enfantsUniquesDecentres(disp: Disposition): { id: string; ecart: number }[] {
  const res: { id: string; ecart: number }[] = [];
  for (const b of disp.branches) {
    const departs = departsDessines(b);
    if (b.enfants.length !== 1 || departs.length !== 1) continue;
    const ecart = Math.abs(departs[0] - b.enfants[0].x);
    if (ecart > 0.01) res.push({ id: b.enfants[0].id, ecart });
  }
  return res;
}
