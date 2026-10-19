import { describe, expect, it } from 'vitest';
import {
  ajouterFiliation,
  ajouterUnion,
  creerPersonne,
  donneesVides,
  modifierPersonne,
  modifierUnion,
  supprimerFiliation,
  supprimerPersonne,
  supprimerUnion,
} from './modele';
import type { Donnees } from './types';

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

describe('personnes', () => {
  it('crée une personne avec champs nettoyés et note vide par défaut', () => {
    const { donnees, personne } = creerPersonne(donneesVides(), { prenom: ' Anne ', nom: 'Martin' });
    expect(personne).toMatchObject({ prenom: 'Anne', nom: 'Martin', note: '' });
    expect(personne.naissance).toBeUndefined();
    expect(donnees.personnes).toHaveLength(1);
  });

  it('refuse une personne sans prénom ni nom', () => {
    expect(() => creerPersonne(donneesVides(), { prenom: ' ', nom: '' })).toThrow();
  });

  it('accepte une date de naissance valide, refuse une date mal formée', () => {
    const { personne } = creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', naissance: '1990-05-17' });
    expect(personne.naissance).toBe('1990-05-17');
    expect(() => creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', naissance: '17/05/1990' })).toThrow();
  });

  it('ne modifie pas les données d’origine', () => {
    const avant = donneesVides();
    creerPersonne(avant, { prenom: 'A', nom: 'B' });
    expect(avant.personnes).toHaveLength(0);
  });

  it('modifie une personne et refuse un id inconnu', () => {
    const { d, ids } = avec('Anne');
    const apres = modifierPersonne(d, ids[0], { prenom: 'Anna', nom: 'Test', note: 'amie' });
    expect(apres.personnes[0]).toMatchObject({ id: ids[0], prenom: 'Anna', note: 'amie' });
    expect(() => modifierPersonne(d, 'inconnu', { prenom: 'X', nom: 'Y' })).toThrow();
  });
});

describe('unions', () => {
  it('crée une union, marié ou non', () => {
    const { d, ids } = avec('A', 'B');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1], true);
    expect(donnees.unions).toEqual([union]);
    expect(union.marie).toBe(true);
    expect(ajouterUnion(d, ids[0], ids[1]).union.marie).toBe(false);
  });

  it('refuse soi-même, personne inconnue et doublon (dans les deux sens)', () => {
    const { d, ids } = avec('A', 'B');
    expect(() => ajouterUnion(d, ids[0], ids[0])).toThrow();
    expect(() => ajouterUnion(d, ids[0], 'inconnu')).toThrow();
    const { donnees } = ajouterUnion(d, ids[0], ids[1]);
    expect(() => ajouterUnion(donnees, ids[1], ids[0])).toThrow();
  });

  it('autorise plusieurs unions pour une même personne', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const r1 = ajouterUnion(d, ids[0], ids[1]);
    const r2 = ajouterUnion(r1.donnees, ids[0], ids[2]);
    expect(r2.donnees.unions).toHaveLength(2);
  });

  it('modifie puis supprime une union', () => {
    const { d, ids } = avec('A', 'B');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    expect(modifierUnion(donnees, union.id, true).unions[0].marie).toBe(true);
    expect(supprimerUnion(donnees, union.id).unions).toHaveLength(0);
    expect(() => supprimerUnion(donnees, 'inconnu')).toThrow();
  });
});

describe('filiations', () => {
  it('crée une filiation biologique ou adoptive', () => {
    const { d, ids } = avec('Parent', 'Enfant');
    const bio = ajouterFiliation(d, ids[0], ids[1], 'biologique');
    expect(bio.filiation).toMatchObject({ parent: ids[0], enfant: ids[1], type: 'biologique' });
    expect(ajouterFiliation(d, ids[0], ids[1], 'adoptif').filiation.type).toBe('adoptif');
  });

  it('refuse soi-même, personne inconnue et doublon parent-enfant', () => {
    const { d, ids } = avec('Parent', 'Enfant');
    expect(() => ajouterFiliation(d, ids[0], ids[0], 'biologique')).toThrow();
    expect(() => ajouterFiliation(d, 'inconnu', ids[1], 'biologique')).toThrow();
    const { donnees } = ajouterFiliation(d, ids[0], ids[1], 'biologique');
    expect(() => ajouterFiliation(donnees, ids[0], ids[1], 'adoptif')).toThrow();
  });

  it('limite à deux parents par type, types comptés séparément', () => {
    const { d, ids } = avec('P1', 'P2', 'P3', 'P4', 'Enfant');
    const enfant = ids[4];
    let cur = ajouterFiliation(d, ids[0], enfant, 'biologique').donnees;
    cur = ajouterFiliation(cur, ids[1], enfant, 'biologique').donnees;
    expect(() => ajouterFiliation(cur, ids[2], enfant, 'biologique')).toThrow();
    cur = ajouterFiliation(cur, ids[2], enfant, 'adoptif').donnees;
    cur = ajouterFiliation(cur, ids[3], enfant, 'adoptif').donnees;
    expect(cur.filiations).toHaveLength(4);
  });

  it('supprime une filiation', () => {
    const { d, ids } = avec('Parent', 'Enfant');
    const { donnees, filiation } = ajouterFiliation(d, ids[0], ids[1], 'biologique');
    expect(supprimerFiliation(donnees, filiation.id).filiations).toHaveLength(0);
    expect(() => supprimerFiliation(donnees, 'inconnu')).toThrow();
  });
});

describe('suppression d’une personne', () => {
  it('retire aussi ses unions et filiations (comme parent et comme enfant)', () => {
    const { d, ids } = avec('Grand-parent', 'Parent', 'Conjoint', 'Enfant', 'Autre');
    const [gp, p, c, e, a] = ids;
    let cur = ajouterUnion(d, p, c).donnees;
    cur = ajouterUnion(cur, a, c).donnees;
    cur = ajouterFiliation(cur, gp, p, 'biologique').donnees;
    cur = ajouterFiliation(cur, p, e, 'biologique').donnees;
    cur = ajouterFiliation(cur, a, e, 'adoptif').donnees;

    const apres = supprimerPersonne(cur, p);
    expect(apres.personnes.map((x) => x.id)).not.toContain(p);
    expect(apres.unions).toHaveLength(1);
    expect(apres.unions[0]).toMatchObject({ personneA: a, personneB: c });
    expect(apres.filiations).toHaveLength(1);
    expect(apres.filiations[0]).toMatchObject({ parent: a, enfant: e });
  });

  it('refuse un id inconnu', () => {
    expect(() => supprimerPersonne(donneesVides(), 'inconnu')).toThrow();
  });
});
