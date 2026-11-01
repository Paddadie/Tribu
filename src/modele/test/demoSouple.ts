// Démo des générations souples, reprise de la maquette (mockups/generations-souples) : toutes les personnes sont inventées.

import { migrer } from '../migration';
import type { Donnees } from '../types';

/**
 * Démo de la maquette des générations souples (personnes inventées) : Fournier et Lefèvre liés deux fois, les Roussel
 * en troisième famille, un remariage. L'arbre actuel met Solène loin de ses parents, entre ses cousins Félix et Louise :
 * son trait commun croise le leur. `bloquee` : Félix a deux enfants, sa lignée continue sous lui.
 */
export function demo(bloquee = false): { donnees: Donnees; moi: string } {
  const personnes: object[] = [];
  const unions: object[] = [];
  const filiations: object[] = [];
  const p = (id: string, prenom: string, nom: string, sexe: 'M' | 'F', an: number, nomNaissance?: string) =>
    personnes.push({ id, prenom, nom, note: '', sexe, naissance: `${an}-05-20`, ...(nomNaissance ? { nomNaissance } : {}) });
  const u = (a: string, b: string, statut = 'actuelle') => unions.push({ id: `u-${a}-${b}`, personneA: a, personneB: b, marie: true, statut });
  const e = (parents: string[], enfants: string[]) => {
    for (const c of enfants) for (const parent of parents) filiations.push({ parent, enfant: c, type: 'biologique' });
  };
  p('m1', 'Émile', 'Fournier', 'M', 1890);
  p('m2', 'Berthe', 'Fournier', 'F', 1892, 'Caron');
  u('m1', 'm2');
  p('b1', 'Ambroise', 'Lefèvre', 'M', 1888);
  p('b2', 'Eugénie', 'Lefèvre', 'F', 1891, 'Leroy');
  u('b1', 'b2');
  p('r1', 'Lucien', 'Roussel', 'M', 1893);
  p('r2', 'Marthe', 'Roussel', 'F', 1895, 'Picard');
  u('r1', 'r2');
  e(['m1', 'm2'], ['m3', 'm4', 'm5']);
  p('m3', 'Gaston', 'Fournier', 'M', 1920);
  p('m4', 'Odette', 'Lefèvre', 'F', 1923, 'Fournier');
  p('m5', 'Albert', 'Fournier', 'M', 1926);
  e(['b1', 'b2'], ['b3', 'b4', 'b5']);
  p('b3', 'Raymond', 'Lefèvre', 'M', 1918);
  p('b4', 'Hugo', 'Lefèvre', 'M', 1921);
  p('b5', 'Simone', 'Lefèvre', 'F', 1925);
  e(['r1', 'r2'], ['a1', 'r4']);
  p('a1', 'Yvonne', 'Lefèvre', 'F', 1920, 'Roussel');
  p('r4', 'Arsène', 'Roussel', 'M', 1924);
  p('r3', 'Nadine', 'Fournier', 'F', 1922, 'Vidal');
  u('m3', 'r3');
  u('b4', 'm4');
  u('b3', 'a1');
  e(['m3', 'r3'], ['p1', 'p2']);
  p('p1', 'Bastien', 'Fournier', 'M', 1950);
  p('p2', 'Josette', 'Dubois', 'F', 1953, 'Fournier');
  e(['b3', 'a1'], ['q1']);
  p('q1', 'Solène', 'Fournier', 'F', 1954, 'Lefèvre');
  e(['b4', 'm4'], ['c1', 'c2']);
  p('c1', 'Félix', 'Lefèvre', 'M', 1948);
  p('c2', 'Louise', 'Lefèvre', 'F', 1951);
  p('x1', 'Mireille', 'Garnier', 'F', 1951);
  u('p1', 'x1', 'separee');
  e(['p1', 'x1'], ['s0']);
  u('p1', 'q1');
  e(['p1', 'q1'], ['moi', 's1']);
  p('s0', 'Mathis', 'Fournier', 'M', 1976);
  p('moi', 'Timothée', 'Fournier', 'M', 1982);
  p('s1', 'Elsa', 'Fournier', 'F', 1985);
  if (bloquee) {
    p('c5', 'Ginette', 'Lefèvre', 'F', 1950, 'Bonnet');
    u('c1', 'c5');
    e(['c1', 'c5'], ['c3', 'c4']);
    p('c3', 'Inès', 'Lefèvre', 'F', 1975);
    p('c4', 'Noé', 'Lefèvre', 'M', 1978);
  }
  return { donnees: migrer({ version: 4, personnes, unions, filiations, groupes: [] }) as Donnees, moi: 'moi' };
}
