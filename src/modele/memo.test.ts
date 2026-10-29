import { describe, expect, it } from 'vitest';
import { ageEntre, detailPersonne, detailProche, libelleAge, libelleAgeDeces } from './age';
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

describe('migration v1 → v2 → v3 → v4 → v5 → v6', () => {
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

  it('donne le statut « actuelle » aux unions, aucun groupe d’amis, et passe en version 6, sans rien perdre', () => {
    const v3 = migrer(v1) as Donnees;
    expect(v3.version).toBe(6);
    expect(v3.unions).toEqual([{ id: 'u1', personneA: 'a', personneB: 'b', marie: true, statut: 'actuelle' }]);
    expect(v3.personnes).toEqual(v1.personnes);
    expect(v3.filiations).toEqual(v1.filiations);
    expect(v3.groupes).toEqual([]);
    expect(estDonneesValides(v3)).toBe(true);
  });

  it('un contenu v2 reçoit une liste de groupes vide, sans rien perdre', () => {
    const v2 = { version: 2, personnes: v1.personnes, unions: [], filiations: v1.filiations };
    const v3 = migrer(v2) as Donnees;
    expect(v3).toEqual({ ...v2, version: 6, groupes: [] });
    expect(estDonneesValides(v3)).toBe(true);
    expect(v2.version).toBe(2);
  });

  it('ne modifie pas l’objet reçu', () => {
    migrer(v1);
    expect(v1.version).toBe(1);
    expect(v1.unions[0]).not.toHaveProperty('statut');
  });

  it('laisse un contenu v6 ou inconnu tel quel', () => {
    const v5 = donneesVides();
    expect(migrer(v5)).toBe(v5);
    expect(migrer(null)).toBeNull();
    expect(migrer('x')).toBe('x');
    expect(migrer({ version: 7 })).toEqual({ version: 7 });
  });

  it('v4 → v5 : le parent sans nom reçoit `sansNom`, rien d’autre ne change', () => {
    const v4 = {
      version: 4,
      personnes: [
        { id: 'a', prenom: 'Parent inconnu', nom: '', note: '', naissance: '1950' },
        { id: 'b', prenom: 'Parent inconnu', nom: 'Martin', note: '' },
        { id: 'c', prenom: 'Parent inconnu', nom: '', note: '', inconnu: true },
        { id: 'd', prenom: 'Anne', nom: 'X', note: '' },
      ],
      unions: [{ id: 'u', personneA: 'b', personneB: 'd', marie: true, statut: 'actuelle' }],
      filiations: [],
      groupes: [],
    };
    const v5 = migrer(v4) as Donnees;
    expect(v5.version).toBe(6);
    expect(v5.personnes.map((p) => !!p.sansNom)).toEqual([true, false, false, false]);
    expect(v5.unions).toEqual(v4.unions);
    expect(estDonneesValides(v5)).toBe(true);
    expect(v4.personnes[0]).not.toHaveProperty('sansNom');
  });

  it('un v1 qui avait deux unions pour une personne reste lisible : la seconde devient séparée', () => {
    const deux = { ...v1, unions: [...v1.unions, { id: 'u2', personneA: 'a', personneB: 'c', marie: false }] };
    const v2 = migrer(deux) as Donnees;
    expect(v2.unions.map((u) => u.statut)).toEqual(['actuelle', 'separee']);
    expect(estDonneesValides(v2)).toBe(true);
  });

  it('un ancien export s’importe', () => {
    const d = importerJson(JSON.stringify(v1, null, 2));
    expect(d.version).toBe(6);
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

describe('migration v3 → v4 : amitiés en groupes', () => {
  const pers = (id: string) => ({ id, prenom: id.toUpperCase(), nom: 'X', note: '' });
  const v3 = {
    version: 3,
    personnes: ['a', 'b', 'c', 'd', 'e', 'f'].map(pers),
    unions: [],
    filiations: [],
    amities: [
      { id: 'm1', personneA: 'a', personneB: 'b' },
      { id: 'm2', personneA: 'b', personneB: 'c' },
      { id: 'm3', personneA: 'd', personneB: 'e' },
    ],
  };

  it('réunit les amis d’amis en un groupe sans nom, sans toucher aux autres', () => {
    const d = migrer(v3) as Donnees;
    expect(d.version).toBe(6);
    expect(d).not.toHaveProperty('amities');
    expect(d.groupes.map((g) => [...g.membres].sort())).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
    expect(d.groupes.every((g) => g.nom === '' && g.id !== '')).toBe(true);
    expect(d.personnes).toEqual(v3.personnes);
    expect(estDonneesValides(d)).toBe(true);
  });

  it('ne modifie pas l’objet reçu', () => {
    migrer(v3);
    expect(v3.version).toBe(3);
    expect(v3.amities).toHaveLength(3);
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
    expect(libelleDeces('--01-14', 'F')).toBe('décédée le 14 janvier');
    expect(libelleDeces(undefined, 'F', true)).toBe('décédée');
  });

  it('la validation accepte `decede: true` et refuse toute autre valeur', () => {
    const { d } = avec('A');
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], decede: true }] })).toBe(true);
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], decede: false }] })).toBe(false);
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], decede: 'oui' }] })).toBe(false);
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

  it('un décès sans année (ou sans date) ne donne aucun âge, ni actuel ni au décès', () => {
    for (const p of [
      { naissance: '1941-05-03', decede: true as const },
      { naissance: '1941-05-03', deces: '--01-14' },
    ]) {
      expect(libelleAge(p, auj)).toBe('');
      expect(libelleAgeDeces(p, auj)).toBe('');
    }
  });

  it('ligne de liste : naissance et âge, ou années de vie pour un décédé', () => {
    const base: Personne = { id: 'a', prenom: 'A', nom: 'X', note: '', sexe: 'M' };
    expect(detailPersonne({ ...base, naissance: '1963-06-02' }, auj)).toBe('né le 2 juin 1963 · 63 ans');
    expect(detailPersonne({ ...base, naissance: '1963-06-02', deces: '2024-01-14' }, auj)).toBe('1963 – 2024');
    expect(detailPersonne({ ...base, deces: '2024' }, auj)).toBe('décédé en 2024');
    expect(detailPersonne(base, auj)).toBe('');
    // Décès sans année, ou sans date.
    expect(detailPersonne({ ...base, naissance: '1963-06-02', decede: true }, auj)).toBe('1963 – ?');
    expect(detailPersonne({ ...base, naissance: '1963', deces: '--01-14' }, auj)).toBe('1963 – ?');
    expect(detailPersonne({ ...base, sexe: 'F', decede: true }, auj)).toBe('décédée');
  });

  it('ligne d’un proche sur une fiche : lien et âge sans la date, années pour un décédé', () => {
    const base: Personne = { id: 'a', prenom: 'A', nom: 'X', note: '', sexe: 'F' };
    expect(detailProche({ ...base, naissance: '1963-06-02' }, auj, 'sœur')).toBe('sœur · 63 ans');
    expect(detailProche({ ...base, naissance: '1963-06-02' }, auj)).toBe('63 ans');
    expect(detailProche({ ...base, naissance: '1963-06-02', deces: '2024-01-14' }, auj, 'mère')).toBe('mère · 1963 – 2024');
    expect(detailProche(base, auj, 'sœur')).toBe('sœur');
    expect(detailProche(base, auj)).toBe('');
  });
});
