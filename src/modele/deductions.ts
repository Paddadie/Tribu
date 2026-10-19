// Liens déduits à partir des unions et filiations. Rien n'est stocké : tout se
// recalcule depuis les données.

import type { Donnees, Personne } from './types';

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
  return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr');
}

export function conjoints(d: Donnees, id: string): Personne[] {
  const ids = d.unions
    .filter((u) => u.personneA === id || u.personneB === id)
    .map((u) => (u.personneA === id ? u.personneB : u.personneA));
  return parId(d, ids);
}

export function parents(d: Donnees, id: string): Personne[] {
  return parId(d, d.filiations.filter((f) => f.enfant === id).map((f) => f.parent));
}

/** Enfants de la personne, du plus âgé au plus jeune. */
export function enfants(d: Donnees, id: string): Personne[] {
  return parId(d, d.filiations.filter((f) => f.parent === id).map((f) => f.enfant)).sort(comparerParNaissance);
}

/** Enfants ayant les deux personnes pour parents (tout type de filiation confondu). */
export function enfantsDuCouple(d: Donnees, idA: string, idB: string): Personne[] {
  const deA = new Set(d.filiations.filter((f) => f.parent === idA).map((f) => f.enfant));
  const communs = d.filiations.filter((f) => f.parent === idB && deA.has(f.enfant)).map((f) => f.enfant);
  return parId(d, communs).sort(comparerParNaissance);
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
