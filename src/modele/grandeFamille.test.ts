import { expect, it } from 'vitest';
import { disposerArbre } from './arbreGlobal';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import type { Donnees } from './types';

function alea(graine: number) {
  let s = graine;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** Grande famille aléatoire (graine fixe) : couples, beaux-parents, enfants, quatre groupes d'amis avec famille. */
function genere(graine: number, taille: number) {
  const r = alea(graine);
  let d: Donnees = donneesVides();
  let n = 0;
  const pers = (annee: number) => {
    const res = creerPersonne(d, { prenom: `P${n++}`, nom: `N${Math.floor(r() * 6)}`, sexe: r() < 0.5 ? 'M' : 'F', naissance: String(annee) });
    d = res.donnees;
    return res.personne.id;
  };
  const tous: { id: string; g: number }[] = [];
  const couple = (a: string, b: string) => (d = ajouterUnion(d, a, b).donnees);
  const racines = [pers(1920), pers(1920)];
  couple(racines[0], racines[1]);
  let couples: [string, string, number][] = [[racines[0], racines[1], 0]];
  for (let g = 1; g <= 4 && tous.length < taille; g++) {
    const suivants: [string, string, number][] = [];
    for (const [p1, p2] of couples) {
      const k = 1 + Math.floor(r() * 4);
      for (let i = 0; i < k; i++) {
        const e = pers(1920 + g * 28 + i);
        tous.push({ id: e, g });
        d = ajouterFiliation(d, p1, e, 'biologique').donnees;
        d = ajouterFiliation(d, p2, e, 'biologique').donnees;
        if (r() < 0.8) {
          const c = pers(1920 + g * 28 + i);
          tous.push({ id: c, g });
          if (r() < 0.3) {
            const [pa, pb] = [pers(1900 + g * 28), pers(1900 + g * 28)];
            couple(pa, pb);
            d = ajouterFiliation(d, pa, c, 'biologique').donnees;
            d = ajouterFiliation(d, pb, c, 'biologique').donnees;
          }
          couple(e, c);
          suivants.push([e, c, g]);
        }
      }
    }
    couples = suivants;
  }
  // Amis : quelques groupes avec familles.
  const moi = tous.filter((t) => t.g === 3)[0].id;
  for (let i = 0; i < 4; i++) {
    const a = pers(1990);
    const b = pers(1991);
    const e = pers(2020);
    couple(a, b);
    d = ajouterFiliation(d, a, e, 'biologique').donnees;
    d = ajouterFiliation(d, b, e, 'biologique').donnees;
    d = creerGroupe(d, [moi, a]).donnees;
  }
  return { d, moi };
}

it('ne superpose jamais deux traits communs de la même ligne, même dans une grande famille', () => {
  for (const [graine, taille] of [[1, 40], [2, 80], [3, 120], [4, 200], [5, 200]]) {
    const { d, moi } = genere(graine, taille);
    const brs = disposerArbre(d, moi).branches;
    const portee = (b: (typeof brs)[number]) => {
      const xs = [...b.origines.filter((o) => !o.inconnu).map((o) => o.x), ...b.enfants.map((e) => e.x)];
      return [Math.min(...xs), Math.max(...xs)];
    };
    for (let i = 0; i < brs.length; i++) {
      for (let j = i + 1; j < brs.length; j++) {
        if (Math.abs(brs[i].bus - brs[j].bus) > 1e-9) continue;
        const [a, b] = [portee(brs[i]), portee(brs[j])];
        expect(Math.min(a[1], b[1]) - Math.max(a[0], b[0]), `graine ${graine}`).toBeLessThanOrEqual(0.01);
      }
    }
  }
});
