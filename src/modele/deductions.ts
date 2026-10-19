// Liens déduits à partir des unions et filiations. Rien n'est stocké : tout se
// recalcule depuis les données.

import type { Donnees, Filiation, Personne, Union } from './types';

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

/** Conjoint actuel : une personne n'a qu'une union à la fois (une séparation efface l'union). */
export function conjoint(d: Donnees, id: string): { union: Union; personne: Personne } | undefined {
  const union = d.unions.find((u) => u.personneA === id || u.personneB === id);
  if (!union) return undefined;
  const idConjoint = union.personneA === id ? union.personneB : union.personneA;
  const personne = d.personnes.find((p) => p.id === idConjoint);
  return personne && { union, personne };
}

export function parents(d: Donnees, id: string): Personne[] {
  return parId(d, d.filiations.filter((f) => f.enfant === id).map((f) => f.parent));
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
      return `${a.personne.prenom} ${a.personne.nom}`.localeCompare(`${b.personne.prenom} ${b.personne.nom}`, 'fr');
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

/** Parents que les deux personnes ont en commun (ordre alphabétique). */
export function parentsCommuns(d: Donnees, idA: string, idB: string): Personne[] {
  const deA = new Set(d.filiations.filter((f) => f.enfant === idA).map((f) => f.parent));
  const communs = d.filiations.filter((f) => f.enfant === idB && deA.has(f.parent)).map((f) => f.parent);
  return parId(d, communs).sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr'));
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
