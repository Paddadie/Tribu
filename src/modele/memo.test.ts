import { describe, expect, it } from 'vitest';
import { ageEntre, detailPersonne, libelleAge, libelleAgeDeces, libelleDelai, prochainsAnniversaires } from './age';
import { conjoint, exConjoints, relation } from './deductions';
import { libelleDeces } from './liste';
import { migrer } from './migration';
import {
  aDesLiens,
  ajouterFiliation,
  ajouterUnion,
  creerPersonne,
  donneesVides,
  enCouple,
  modifierPersonne,
  retablirUnion,
  separerUnion,
  supprimerUnion,
} from './modele';
import { estDonneesValides, exporterJson, importerJson } from './stockage';
import type { Donnees, Personne } from './types';

function avec(...noms: string[]): { d: Donnees; ids: string[] } {
  let d = donneesVides();
  const ids: string[] = [];
  for (const prenom of noms) {
    const r = creerPersonne(d, { prenom, nom: 'Test' });
    d = r.donnees;
    ids.push(r.personne.id);
  }
  return { d, ids };
}

/** Date locale, comme `new Date()` sur le téléphone. */
const le = (annee: number, mois: number, jour: number) => new Date(annee, mois - 1, jour);

describe('migration v1 → v2 → v3', () => {
  const v1 = {
    version: 1,
    personnes: [
      { id: 'a', prenom: 'A', nom: 'X', naissance: '1990-05-01', note: '' },
      { id: 'b', prenom: 'B', nom: 'X', note: '' },
      { id: 'c', prenom: 'C', nom: 'X', note: '' },
    ],
    unions: [{ id: 'u1', personneA: 'a', personneB: 'b', marie: true }],
    filiations: [{ id: 'f1', parent: 'a', enfant: 'c', type: 'biologique' }],
  };

  it('donne le statut « actuelle » aux unions, aucune amitié, et passe en version 3, sans rien perdre', () => {
    const v3 = migrer(v1) as Donnees;
    expect(v3.version).toBe(3);
    expect(v3.unions).toEqual([{ id: 'u1', personneA: 'a', personneB: 'b', marie: true, statut: 'actuelle' }]);
    expect(v3.personnes).toEqual(v1.personnes);
    expect(v3.filiations).toEqual(v1.filiations);
    expect(v3.amities).toEqual([]);
    expect(estDonneesValides(v3)).toBe(true);
  });

  it('un contenu v2 reçoit une liste d’amitiés vide, sans rien perdre', () => {
    const v2 = { version: 2, personnes: v1.personnes, unions: [], filiations: v1.filiations };
    const v3 = migrer(v2) as Donnees;
    expect(v3).toEqual({ ...v2, version: 3, amities: [] });
    expect(estDonneesValides(v3)).toBe(true);
    expect(v2.version).toBe(2);
  });

  it('ne modifie pas l’objet reçu', () => {
    migrer(v1);
    expect(v1.version).toBe(1);
    expect(v1.unions[0]).not.toHaveProperty('statut');
  });

  it('laisse un contenu v3 ou inconnu tel quel', () => {
    const v3 = donneesVides();
    expect(migrer(v3)).toBe(v3);
    expect(migrer(null)).toBeNull();
    expect(migrer('x')).toBe('x');
    expect(migrer({ version: 4 })).toEqual({ version: 4 });
  });

  it('un v1 qui avait deux unions pour une personne reste lisible : la seconde devient séparée', () => {
    const deux = { ...v1, unions: [...v1.unions, { id: 'u2', personneA: 'a', personneB: 'c', marie: false }] };
    const v2 = migrer(deux) as Donnees;
    expect(v2.unions.map((u) => u.statut)).toEqual(['actuelle', 'separee']);
    expect(estDonneesValides(v2)).toBe(true);
  });

  it('un ancien export s’importe', () => {
    const d = importerJson(JSON.stringify(v1, null, 2));
    expect(d.version).toBe(3);
    expect(d.unions[0].statut).toBe('actuelle');
  });

  it('un v1 invalide reste refusé', () => {
    expect(() => importerJson(JSON.stringify({ ...v1, unions: [{ id: 'u', personneA: 'a', personneB: 'zzz', marie: false }] }))).toThrow();
  });

  it('un export v2 se réimporte à l’identique', () => {
    const { d, ids } = avec('A', 'B');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    const separes = separerUnion(donnees, union.id);
    expect(importerJson(exporterJson(separes))).toEqual(separes);
  });
});

describe('unions séparées', () => {
  it('une séparation garde l’union, sans conjoint actuel', () => {
    const { d, ids } = avec('A', 'B');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1], true);
    const apres = separerUnion(donnees, union.id);
    expect(apres.unions).toEqual([{ ...union, statut: 'separee' }]);
    expect(enCouple(apres, ids[0])).toBe(false);
    expect(conjoint(apres, ids[0])).toBeUndefined();
    expect(exConjoints(apres, ids[0]).map((e) => e.personne.id)).toEqual([ids[1]]);
    expect(exConjoints(apres, ids[1]).map((e) => e.personne.id)).toEqual([ids[0]]);
    expect(aDesLiens(apres, ids[0])).toBe(true);
    expect(estDonneesValides(apres)).toBe(true);
  });

  it('un nouveau conjoint est possible, sous un seul conjoint actuel, avec l’ex gardé', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    const apres = ajouterUnion(separerUnion(donnees, union.id), ids[0], ids[2]).donnees;
    expect(conjoint(apres, ids[0])?.personne.id).toBe(ids[2]);
    expect(exConjoints(apres, ids[0]).map((e) => e.personne.id)).toEqual([ids[1]]);
    expect(() => ajouterUnion(apres, ids[0], ids[1])).toThrow('déjà une union');
  });

  it('rétablit un couple séparé, sauf si l’un des deux a un autre conjoint', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    const separes = separerUnion(donnees, union.id);
    expect(conjoint(retablirUnion(separes, union.id), ids[0])?.personne.id).toBe(ids[1]);
    const remplace = ajouterUnion(separes, ids[0], ids[2]).donnees;
    expect(() => retablirUnion(remplace, union.id)).toThrow('autre conjoint');
  });

  it('refuse une union inconnue', () => {
    const { d } = avec('A');
    expect(() => separerUnion(d, 'x')).toThrow('introuvable');
    expect(() => retablirUnion(d, 'x')).toThrow('introuvable');
  });

  it('une union séparée se supprime comme une autre', () => {
    const { d, ids } = avec('A', 'B');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    expect(supprimerUnion(separerUnion(donnees, union.id), union.id).unions).toEqual([]);
  });

  it('la validation refuse deux unions actuelles pour une même personne ou un statut inconnu', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const u = (id: string, a: string, b: string, statut: string) => ({ id, personneA: a, personneB: b, marie: false, statut });
    expect(estDonneesValides({ ...d, unions: [u('1', ids[0], ids[1], 'actuelle'), u('2', ids[0], ids[2], 'actuelle')] })).toBe(false);
    expect(estDonneesValides({ ...d, unions: [u('1', ids[0], ids[1], 'actuelle'), u('2', ids[0], ids[2], 'separee')] })).toBe(true);
    expect(estDonneesValides({ ...d, unions: [u('1', ids[0], ids[1], 'fini')] })).toBe(false);
  });

  it('un ex n’est pas de la famille par alliance (FEAT-06)', () => {
    // A ∞ B ; B est la fille de P. Tant que A et B sont en couple, P est du côté de la belle-famille de A.
    const { d, ids } = avec('A', 'B', 'P');
    const [a, b, p] = ids;
    const avecParent = ajouterFiliation(d, p, b, 'biologique').donnees;
    const { donnees, union } = ajouterUnion(avecParent, a, b);
    expect(relation(donnees, a, p)).toMatchObject({ type: 'alliance' });
    expect(relation(separerUnion(donnees, union.id), a, p)).toBeUndefined();
    expect(relation(retablirUnion(separerUnion(donnees, union.id), union.id), a, p)).toMatchObject({ type: 'alliance' });
  });
});

describe('date de décès', () => {
  it('s’enregistre, partielle ou complète, et se retire', () => {
    const { d, ids } = avec('A');
    const mort = modifierPersonne(d, ids[0], { prenom: 'A', nom: 'Test', naissance: '1941-05-03', deces: '2024-01' });
    expect(mort.personnes[0].deces).toBe('2024-01');
    const vivant = modifierPersonne(mort, ids[0], { prenom: 'A', nom: 'Test', naissance: '1941-05-03', deces: '' });
    expect(vivant.personnes[0]).not.toHaveProperty('deces');
  });

  it('refuse une date impossible ou antérieure à la naissance', () => {
    const base = { prenom: 'A', nom: 'Test' };
    const { d } = avec('A');
    expect(() => creerPersonne(d, { ...base, deces: '2024-02-30' })).toThrow('Date de décès invalide');
    expect(() => creerPersonne(d, { ...base, naissance: '1990-05-03', deces: '1990-05-02' })).toThrow('précéder');
    expect(() => creerPersonne(d, { ...base, naissance: '1990-05-03', deces: '1989' })).toThrow('précéder');
    // Dates partielles : comparées sur ce qu'elles ont en commun.
    expect(() => creerPersonne(d, { ...base, naissance: '1990-05-03', deces: '1990' })).not.toThrow();
    expect(() => creerPersonne(d, { ...base, naissance: '1990', deces: '1990-01-01' })).not.toThrow();
    expect(() => creerPersonne(d, { ...base, naissance: '1990-05-03', deces: '1990-05-03' })).not.toThrow();
  });

  it('la validation accepte un décès texte et refuse un autre type', () => {
    const { d } = avec('A');
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], deces: '2024' }] })).toBe(true);
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], deces: 2024 }] })).toBe(false);
  });

  it('se formule avec l’accord du sexe', () => {
    expect(libelleDeces('2024-01-14', 'F')).toBe('décédée le 14 janvier 2024');
    expect(libelleDeces('2024-01', 'M')).toBe('décédé en janvier 2024');
    expect(libelleDeces('2024')).toBe('décédé(e) en 2024');
    expect(libelleDeces(undefined)).toBe('');
  });
});

describe('âge', () => {
  it('compte les années entières, la veille et le jour de l’anniversaire', () => {
    expect(ageEntre('1991-11-12', '2026-11-11')).toEqual({ annees: 34, approximatif: false });
    expect(ageEntre('1991-11-12', '2026-11-12')).toEqual({ annees: 35, approximatif: false });
    expect(ageEntre('2000-02-29', '2001-02-28')).toEqual({ annees: 0, approximatif: false });
    expect(ageEntre('2000-02-29', '2001-03-01')).toEqual({ annees: 1, approximatif: false });
  });

  it('est approximatif quand les dates sont trop partielles', () => {
    // Né en 1991, le 19 octobre 2026 : 35 ans, sauf s'il est né après le 19 octobre (34). Le plus probable est affiché.
    expect(ageEntre('1991', '2026-10-19')).toEqual({ annees: 35, approximatif: true });
    expect(ageEntre('1991', '2026-02-01')).toEqual({ annees: 34, approximatif: true });
    expect(ageEntre('1991-03', '2026-10-19')).toEqual({ annees: 35, approximatif: false });
    expect(ageEntre('1991-10', '2026-10-19')).toEqual({ annees: 35, approximatif: true });
    expect(ageEntre('1941-05-03', '2024')).toEqual({ annees: 83, approximatif: true });
  });

  it('est indéfini si la date précède la naissance', () => {
    expect(ageEntre('2026-10-19', '2026-10-18')).toBeUndefined();
    expect(ageEntre('2027', '2026-10-19')).toBeUndefined();
  });

  const auj = le(2026, 10, 19);

  it('s’écrit « 34 ans », « environ 34 ans », « 1 an », « moins d’un an »', () => {
    expect(libelleAge({ naissance: '1992-03-12' }, auj)).toBe('34 ans');
    expect(libelleAge({ naissance: '1992' }, auj)).toBe('environ 34 ans');
    expect(libelleAge({ naissance: '2025-03-12' }, auj)).toBe('1 an');
    expect(libelleAge({ naissance: '2026-03-12' }, auj)).toBe('moins d’un an');
    expect(libelleAge({}, auj)).toBe('');
  });

  it('une personne décédée n’a pas d’âge actuel, mais un âge au décès', () => {
    const p = { naissance: '1941-05-03', deces: '2024-01-14' };
    expect(libelleAge(p, auj)).toBe('');
    expect(libelleAgeDeces({ ...p, sexe: 'F' as const }, auj)).toBe('Morte à 82 ans');
    expect(libelleAgeDeces({ ...p, sexe: 'M' as const }, auj)).toBe('Mort à 82 ans');
    expect(libelleAgeDeces(p, auj)).toBe('Mort(e) à 82 ans');
    expect(libelleAgeDeces({ ...p, deces: '2024' }, auj)).toBe('Mort(e) à environ 83 ans');
    expect(libelleAgeDeces({ deces: '2024' }, auj)).toBe('');
    expect(libelleAgeDeces({ naissance: '1941' }, auj)).toBe('');
  });

  it('ligne de liste : naissance et âge, ou années de vie pour un décédé', () => {
    const base: Personne = { id: 'a', prenom: 'A', nom: 'X', note: '', sexe: 'M' };
    expect(detailPersonne({ ...base, naissance: '1963-06-02' }, auj)).toBe('né le 2 juin 1963 · 63 ans');
    expect(detailPersonne({ ...base, naissance: '1963-06-02', deces: '2024-01-14' }, auj)).toBe('1963 – 2024');
    expect(detailPersonne({ ...base, deces: '2024' }, auj)).toBe('décédé en 2024');
    expect(detailPersonne(base, auj)).toBe('');
  });
});

describe('prochains anniversaires', () => {
  const auj = le(2026, 10, 19);
  const p = (prenom: string, naissance?: string, deces?: string): Personne => ({
    id: prenom,
    prenom,
    nom: 'X',
    note: '',
    ...(naissance ? { naissance } : {}),
    ...(deces ? { deces } : {}),
  });
  const noms = (l: Personne[], max?: number, jours?: number) => prochainsAnniversaires(l, auj, jours, max).map((a) => a.personne.prenom);

  it('classe du plus proche au plus lointain, avec l’âge atteint et les jours restants', () => {
    const l = [p('Théo', '1991-11-12'), p('Léa', '2018-10-19'), p('Paulette', '1959-10-24')];
    expect(prochainsAnniversaires(l, auj)).toEqual([
      { personne: l[1], dans: 0, age: 8, date: '19 octobre' },
      { personne: l[2], dans: 5, age: 67, date: '24 octobre' },
      { personne: l[0], dans: 24, age: 35, date: '12 novembre' },
    ]);
  });

  it('s’arrête à 30 jours (bornes comprises) et à 3 personnes', () => {
    expect(noms([p('Limite', '1990-11-18'), p('Après', '1990-11-19')])).toEqual(['Limite']);
    const quatre = ['A', 'B', 'C', 'D'].map((n, i) => p(n, `1990-10-${20 + i}`));
    expect(noms(quatre)).toEqual(['A', 'B', 'C']);
    expect(noms(quatre, 4)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('passe l’année : fin décembre vers janvier', () => {
    const fin = le(2026, 12, 28);
    const l = [p('Nouvel an', '1980-01-02'), p('Hier', '1980-12-27')];
    const r = prochainsAnniversaires(l, fin);
    expect(r.map((a) => [a.personne.prenom, a.dans, a.age])).toEqual([['Nouvel an', 5, 47]]);
  });

  it('ignore les décédés, les dates partielles, les sans date et les nés aujourd’hui ou plus tard', () => {
    const l = [
      p('Mort', '1950-10-20', '2020'),
      p('Année', '1950'),
      p('Mois', '1950-10'),
      p('Sans'),
      p('Né aujourd’hui', '2026-10-19'),
      p('Futur', '2027-10-20'),
      p('Vivant', '1950-10-20'),
    ];
    expect(noms(l)).toEqual(['Vivant']);
  });

  it('place un 29 février le 28 les années non bissextiles, le 29 sinon', () => {
    const l = [p('Bissextile', '2000-02-29')];
    expect(prochainsAnniversaires(l, le(2027, 2, 20))[0]).toMatchObject({ dans: 8, age: 27, date: '28 février' });
    expect(prochainsAnniversaires(l, le(2028, 2, 20))[0]).toMatchObject({ dans: 9, age: 28, date: '29 février' });
  });

  it('à égalité de date, l’ordre est alphabétique', () => {
    expect(noms([p('Zoé', '1990-10-25'), p('Anne', '1991-10-25')])).toEqual(['Anne', 'Zoé']);
  });

  it('se dit « Aujourd’hui », « Demain », « Dans 5 jours »', () => {
    expect([0, 1, 5].map(libelleDelai)).toEqual(['Aujourd’hui', 'Demain', 'Dans 5 jours']);
  });
});
