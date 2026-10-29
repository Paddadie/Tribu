// Outils des tests de liaison (V4, lot 0) : forme canonique des données (à l'identifiant près) et permutations.

import type { Donnees, Personne } from '../types';
import { verifierInvariants } from './invariants';

/** Toutes les permutations de `xs` (n! : à garder pour de petits n). */
export function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((reste) => [x, ...reste]));
}

/**
 * Données décrites sans leurs ids (tirés au hasard par le modèle) : chaque personne par son prénom, un parent inconnu
 * ou un « ? » par les enfants qu'il relie. Deux états égaux à l'identifiant près ont la même forme canonique.
 */
export function canonique(d: Donnees): string[] {
  const parId = new Map(d.personnes.map((p) => [p.id, p]));
  const enfants = (id: string) =>
    d.filiations
      .filter((f) => f.parent === id)
      .map((f) => parId.get(f.enfant)?.prenom ?? '?')
      .sort()
      .join(',');
  const nom = (id: string) => {
    const p = parId.get(id);
    if (!p) return `absent:${id}`;
    if (p.inconnu) return `inconnu(${enfants(id)})`;
    if (p.sansNom) return `?(${enfants(id)})`;
    return p.prenom;
  };
  const decrire = (p: Personne) =>
    `${nom(p.id)} : ${p.nom}${p.nomNaissance ? ` né ${p.nomNaissance}` : ''}${p.sexe ? ` ${p.sexe}` : ''}${p.deces || p.decede ? ' †' : ''}`;
  return [
    ...d.personnes.map(decrire),
    ...d.unions.map((u) => `${[nom(u.personneA), nom(u.personneB)].sort().join(' + ')} ${u.marie ? 'mariés' : 'en couple'} ${u.statut}`),
    ...d.filiations.map((f) => `${nom(f.parent)} > ${nom(f.enfant)} ${f.type}`),
    ...d.groupes.map((g) => `groupe ${g.nom} : ${g.membres.map(nom).sort().join(',')}`),
  ].sort();
}

export type Etape = (d: Donnees) => Donnees;

/** Joue les étapes dans l'ordre et lève une erreur dès qu'un invariant tombe. */
export function jouer(d: Donnees, etapes: Etape[]): Donnees {
  return etapes.reduce((x, etape, i) => {
    const suivant = etape(x);
    const fautes = verifierInvariants(suivant);
    if (fautes.length > 0) throw new Error(`invariants après l’étape ${i + 1} : ${fautes.join(' ; ')}`);
    return suivant;
  }, d);
}

/** Forme canonique finale de chaque ordre des étapes, regroupée : un seul groupe si l'ordre est indifférent. */
export function finsSelonLOrdre(d: Donnees, etapes: Etape[], avant: Etape[] = []): Map<string, number[][]> {
  const fins = new Map<string, number[][]>();
  for (const ordre of permutations(etapes.map((_, i) => i))) {
    const fin = canonique(jouer(d, [...avant, ...ordre.map((i) => etapes[i])])).join('\n');
    fins.set(fin, [...(fins.get(fin) ?? []), ordre]);
  }
  return fins;
}
