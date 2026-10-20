import { describe, expect, it } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele';
import type { ChampsPersonne } from './modele';
import type { Donnees } from './types';
import { datesIncoherentes, doublonsProbables, fichesTest, personnesIsolees, verifier } from './verification';

function avec(personnes: ChampsPersonne[]) {
  let d: Donnees = donneesVides();
  const ids = personnes.map((champs) => {
    const r = creerPersonne(d, champs);
    d = r.donnees;
    return r.personne.id;
  });
  return { d, ids };
}

describe('doublonsProbables', () => {
  it('repère même prénom et noms proches, ou même nom et prénoms proches', () => {
    const { d } = avec([
      { prenom: 'Camille', nom: 'Durand' },
      { prenom: 'Camille', nom: 'Durant' },
      { prenom: 'Joseph', nom: 'Martin' },
      { prenom: 'Jos', nom: 'Martin' },
      { prenom: 'Alice', nom: 'Roux' },
    ]);
    expect(doublonsProbables(d).map((x) => x.raison)).toEqual(['Même prénom, noms très proches', 'Même nom, prénoms proches']);
  });

  it('écarte deux années de naissance différentes et un parent avec son enfant', () => {
    const { d, ids } = avec([
      { prenom: 'Jean', nom: 'Martin', naissance: '1960' },
      { prenom: 'Jean', nom: 'Martin', naissance: '1990' },
      { prenom: 'Paul', nom: 'Noel' },
      { prenom: 'Paul', nom: 'Noel' },
    ]);
    const lie = ajouterFiliation(d, ids[2], ids[3], 'biologique').donnees;
    expect(doublonsProbables(lie)).toEqual([]);
  });

  it('mentionne l’année quand les deux la connaissent', () => {
    const { d } = avec([
      { prenom: 'Camille', nom: 'Durand', naissance: '1990-03-14' },
      { prenom: 'Camille', nom: 'Durand', naissance: '1990' },
    ]);
    expect(doublonsProbables(d)[0].raison).toBe('Même prénom et même nom, né(e) en 1990');
  });
});

describe('personnesIsolees', () => {
  it('ne garde que les personnes sans filiation, union ni groupe', () => {
    const { d, ids } = avec([
      { prenom: 'A', nom: 'Un' },
      { prenom: 'B', nom: 'Deux' },
      { prenom: 'C', nom: 'Trois' },
      { prenom: 'D', nom: 'Quatre' },
      { prenom: 'E', nom: 'Cinq' },
    ]);
    let x = ajouterUnion(d, ids[0], ids[1]).donnees;
    x = creerGroupe(x, [ids[2], ids[3]]).donnees;
    expect(personnesIsolees(x).map((p) => p.prenom)).toEqual(['E']);
  });
});

describe('datesIncoherentes', () => {
  it('signale un décès avant la naissance, mais pas des dates partielles compatibles', () => {
    // La saisie refuse ce cas : il ne vient que d'un import, d'où la fabrication directe.
    const { d: base } = avec([
      { prenom: 'A', nom: 'Un', naissance: '2003' },
      { prenom: 'B', nom: 'Deux', naissance: '2003-06-01', deces: '2003' },
    ]);
    const d: Donnees = { ...base, personnes: base.personnes.map((p) => (p.prenom === 'A' ? { ...p, deces: '1998-05', decede: true as const } : p)) };
    expect(datesIncoherentes(d).map((x) => x.raison)).toEqual(['Décès (1998) avant la naissance (2003)']);
  });

  it('signale un parent né après ou trop peu avant son enfant', () => {
    const { d, ids } = avec([
      { prenom: 'P1', nom: 'X', naissance: '2000' },
      { prenom: 'E1', nom: 'X', naissance: '1990' },
      { prenom: 'P2', nom: 'Y', naissance: '1985' },
      { prenom: 'E2', nom: 'Y', naissance: '1992' },
      { prenom: 'P3', nom: 'Z', naissance: '1960' },
      { prenom: 'E3', nom: 'Z', naissance: '1990' },
    ]);
    let x = ajouterFiliation(d, ids[0], ids[1], 'biologique').donnees;
    x = ajouterFiliation(x, ids[2], ids[3], 'biologique').donnees;
    x = ajouterFiliation(x, ids[4], ids[5], 'biologique').donnees;
    const raisons = datesIncoherentes(x).map((r) => r.raison);
    expect(raisons).toHaveLength(2);
    expect(raisons[0]).toContain('après son enfant E1');
    expect(raisons[1]).toContain('Moins de 12 ans avant son enfant E2');
  });

  it('signale une union datée avant une naissance, ignore une date sans année', () => {
    const { d, ids } = avec([
      { prenom: 'A', nom: 'Un', naissance: '1990' },
      { prenom: 'B', nom: 'Deux', naissance: '1992' },
    ]);
    const ancienne = ajouterUnion(d, ids[0], ids[1], true, 'actuelle', '1991').donnees;
    expect(datesIncoherentes(ancienne).map((r) => r.personne.prenom)).toEqual(['B']);
    const sansAnnee = ajouterUnion(d, ids[0], ids[1], true, 'actuelle', '--06-09').donnees;
    expect(datesIncoherentes(sansAnnee)).toEqual([]);
  });

  it('signale une naissance ou un décès dans le futur, pas une union à venir', () => {
    const aujourdhui = new Date(2026, 9, 21);
    const { d, ids } = avec([
      { prenom: 'A', nom: 'Un', naissance: '2027' },
      { prenom: 'B', nom: 'Deux', naissance: '1950', deces: '2026-11-02' },
      { prenom: 'C', nom: 'Trois', naissance: '2026' },
    ]);
    const avecUnion = ajouterUnion(d, ids[1], ids[2], true, 'actuelle', '2027-06-12').donnees;
    expect(datesIncoherentes(avecUnion, aujourdhui).map((r) => r.raison)).toEqual(['Naissance dans le futur (2027)', 'Décès dans le futur (2026)']);
  });
});

describe('fichesTest', () => {
  it('repère le mot « test » seul, pas un nom qui le contient', () => {
    const { d } = avec([
      { prenom: 'Test', nom: '' },
      { prenom: 'Paul', nom: 'Test' },
      { prenom: 'Marie', nom: 'Testa' },
      { prenom: 'Luc', nom: 'Contest' },
    ]);
    expect(fichesTest(d).map((p) => p.prenom)).toEqual(['Test', 'Paul']);
    expect(verifier(d).tests).toHaveLength(2);
  });
});
