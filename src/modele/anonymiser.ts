// Anonymisation d'un export pour en faire une fixture versionnée (ARCH-05) : la forme de l'arbre reste, rien
// ne permet de reconnaître quelqu'un. Prénoms, noms et noms de groupes deviennent des mots inventés qui se
// trient dans le même ordre ; les dates de naissance, des années inventées dans le même ordre ; les notes et
// les dates de décès disparaissent (seul « décédé » reste) ; les ids sont renumérotés, Moi devient « moi ».
// L'ordre des tableaux est gardé : la disposition de l'arbre global ne doit pas changer.

import { anneeDe } from './modele';
import { estParentSansNom, PARENT_INCONNU } from './parentSansNom';
import type { Donnees, Personne } from './types';

/** Id de Moi dans une fixture anonymisée. */
export const ID_MOI = 'moi';

const CONSONNES = 'bdfglmnprstv';
const VOYELLES = 'aeiou';
const SYLLABES = [...CONSONNES].flatMap((c) => [...VOYELLES].map((v) => c + v));

/** Mot inventé de `n` syllabes, au rang `rang` sur `total` : les mots se trient comme leurs rangs. */
function motInvente(rang: number, total: number, n: number): string {
  const places = SYLLABES.length ** n;
  let k = Math.floor(((rang + 0.5) * places) / total);
  let mot = '';
  for (let i = 0; i < n; i++) {
    mot = SYLLABES[k % SYLLABES.length] + mot;
    k = Math.floor(k / SYLLABES.length);
  }
  return mot[0].toUpperCase() + mot.slice(1);
}

/** Table valeur → mot inventé, dans l'ordre alphabétique des valeurs ; le vide reste vide. */
function tableDeMots(valeurs: string[], n: number, gardees: string[] = []): Map<string, string> {
  const distinctes = [...new Set(valeurs.map((v) => v.trim()))].filter((v) => v && !gardees.includes(v)).sort((a, b) => a.localeCompare(b, 'fr'));
  const table = new Map(distinctes.map((v, i) => [v, motInvente(i, distinctes.length, n)]));
  for (const v of gardees) table.set(v, v);
  table.set('', '');
  return table;
}

/** Années inventées dans l'ordre des dates de naissance (qui se comparent comme des textes, voir `comparerParNaissance`). */
function tableDAnnees(dates: string[]): Map<string, string> {
  const distinctes = [...new Set(dates)].sort();
  const n = distinctes.length;
  return new Map(distinctes.map((v, i) => [v, String(n <= 121 ? 1900 + Math.floor(((i + 0.5) * 121) / n) : 1900 + i)]));
}

export function anonymiser(d: Donnees, moi: string): Donnees {
  const ids = new Map(d.personnes.map((p, i) => [p.id, p.id === moi ? ID_MOI : `p${i + 1}`]));
  const prenoms = tableDeMots(
    d.personnes.map((p) => p.prenom),
    2,
    [PARENT_INCONNU],
  );
  const noms = tableDeMots(
    d.personnes.flatMap((p) => [p.nom, p.nomNaissance ?? '']),
    3,
  );
  const naissances = tableDAnnees(d.personnes.flatMap((p) => (p.naissance && anneeDe(p.naissance) ? [p.naissance] : [])));
  const groupes = tableDeMots(
    d.groupes.map((g) => g.nom),
    2,
  );

  const personnes = d.personnes.map((p): Personne => {
    const naissance = p.naissance && naissances.get(p.naissance);
    const nomNaissance = p.nomNaissance && noms.get(p.nomNaissance.trim());
    return {
      id: ids.get(p.id)!,
      prenom: prenoms.get(p.prenom.trim())!,
      nom: noms.get(p.nom.trim())!,
      ...(naissance ? { naissance } : {}),
      ...(p.deces || p.decede ? { decede: true as const } : {}),
      ...(p.sexe ? { sexe: p.sexe } : {}),
      ...(nomNaissance ? { nomNaissance } : {}),
      note: '',
      ...(p.inconnu ? { inconnu: true as const } : {}),
      ...(estParentSansNom(p) ? { sansNom: true as const } : {}),
    };
  });
  const connu = (...xs: string[]) => xs.every((x) => ids.has(x));
  return {
    version: 6,
    personnes,
    unions: d.unions
      .filter((u) => connu(u.personneA, u.personneB))
      .map((u, i) => ({ id: `u${i + 1}`, personneA: ids.get(u.personneA)!, personneB: ids.get(u.personneB)!, marie: u.marie, statut: u.statut })),
    filiations: d.filiations
      .filter((f) => connu(f.parent, f.enfant))
      .map((f, i) => ({ id: `f${i + 1}`, parent: ids.get(f.parent)!, enfant: ids.get(f.enfant)!, type: f.type })),
    groupes: d.groupes.map((g, i) => ({
      id: `g${i + 1}`,
      nom: groupes.get(g.nom.trim())!,
      membres: g.membres.filter((m) => ids.has(m)).map((m) => ids.get(m)!),
    })),
  };
}
