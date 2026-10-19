import { describe, expect, it } from 'vitest';
import {
  aDesLiens,
  ajouterFiliation,
  ajouterUnion,
  creerPersonne,
  donneesVides,
  enCouple,
  estDateValide,
  modifierFiliation,
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
    expect(() => ajouterUnion(donnees, ids[1], ids[0])).toThrow('déjà une union');
  });

  it('refuse un second conjoint, de l’un ou l’autre côté', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const { donnees } = ajouterUnion(d, ids[0], ids[1]);
    expect(() => ajouterUnion(donnees, ids[0], ids[2])).toThrow('seul conjoint');
    expect(() => ajouterUnion(donnees, ids[2], ids[1])).toThrow('seul conjoint');
  });

  it('permet un nouveau conjoint après la fin de l’union', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    const apres = ajouterUnion(supprimerUnion(donnees, union.id), ids[0], ids[2]).donnees;
    expect(apres.unions).toHaveLength(1);
    expect(apres.unions[0]).toMatchObject({ personneA: ids[0], personneB: ids[2] });
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

  it('refuse une boucle : un parent ne peut pas descendre de son enfant', () => {
    const { d, ids } = avec('Grand-parent', 'Parent', 'Enfant');
    let cur = ajouterFiliation(d, ids[0], ids[1], 'biologique').donnees;
    cur = ajouterFiliation(cur, ids[1], ids[2], 'biologique').donnees;
    expect(() => ajouterFiliation(cur, ids[1], ids[0], 'biologique')).toThrow(/boucle/);
    expect(() => ajouterFiliation(cur, ids[2], ids[0], 'adoptif')).toThrow(/boucle/);
    expect(ajouterFiliation(cur, ids[0], ids[2], 'adoptif').donnees.filiations).toHaveLength(3);
  });

  it('change le type d’un lien sous la limite de deux par type', () => {
    const { d, ids } = avec('P1', 'P2', 'P3', 'Enfant');
    const enfant = ids[3];
    let cur = ajouterFiliation(d, ids[0], enfant, 'biologique').donnees;
    cur = ajouterFiliation(cur, ids[1], enfant, 'biologique').donnees;
    const adoptif = ajouterFiliation(cur, ids[2], enfant, 'adoptif');
    expect(() => modifierFiliation(adoptif.donnees, adoptif.filiation.id, 'biologique')).toThrow();
    const bio = cur.filiations[0];
    const change = modifierFiliation(cur, bio.id, 'adoptif');
    expect(change.filiations.find((f) => f.id === bio.id)?.type).toBe('adoptif');
    expect(modifierFiliation(cur, bio.id, 'biologique')).toBe(cur);
    expect(() => modifierFiliation(cur, 'inconnu', 'adoptif')).toThrow();
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
    const { d, ids } = avec('Grand-parent', 'Parent', 'Conjoint', 'Enfant', 'Autre', 'Voisine');
    const [gp, p, c, e, a, v] = ids;
    let cur = ajouterUnion(d, p, c).donnees;
    cur = ajouterUnion(cur, a, v).donnees;
    cur = ajouterFiliation(cur, gp, p, 'biologique').donnees;
    cur = ajouterFiliation(cur, p, e, 'biologique').donnees;
    cur = ajouterFiliation(cur, a, e, 'adoptif').donnees;

    const apres = supprimerPersonne(cur, p);
    expect(apres.personnes.map((x) => x.id)).not.toContain(p);
    expect(apres.unions).toHaveLength(1);
    expect(apres.unions[0]).toMatchObject({ personneA: a, personneB: v });
    expect(apres.filiations).toHaveLength(1);
    expect(apres.filiations[0]).toMatchObject({ parent: a, enfant: e });
  });

  it('refuse un id inconnu', () => {
    expect(() => supprimerPersonne(donneesVides(), 'inconnu')).toThrow();
  });
});

describe('en couple, a des liens', () => {
  it('suit les unions des deux côtés, puis leur fin', () => {
    const { d, ids } = avec('A', 'B', 'C');
    const { donnees, union } = ajouterUnion(d, ids[0], ids[1]);
    expect([enCouple(donnees, ids[0]), enCouple(donnees, ids[1]), enCouple(donnees, ids[2])]).toEqual([true, true, false]);
    expect(enCouple(supprimerUnion(donnees, union.id), ids[0])).toBe(false);
  });

  it('compte une union ou une filiation, comme parent ou comme enfant', () => {
    const { d, ids } = avec('Parent', 'Enfant', 'Conjoint', 'Seul');
    const [p, e, c, s] = ids;
    const cur = ajouterUnion(ajouterFiliation(d, p, e, 'adoptif').donnees, c, s).donnees;
    expect(ids.map((id) => aDesLiens(cur, id))).toEqual([true, true, true, true]);
    expect(ids.map((id) => aDesLiens(d, id))).toEqual([false, false, false, false]);
  });
});

describe('dates de naissance partielles', () => {
  const creer = (naissance: string) => creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', naissance }).personne;

  it('accepte une année seule, un mois et une année, une date complète', () => {
    expect(creer('1938').naissance).toBe('1938');
    expect(creer('1961-05').naissance).toBe('1961-05');
    expect(creer('1961-05-14').naissance).toBe('1961-05-14');
  });
  it('refuse un mois ou un jour impossible', () => {
    expect(() => creer('1961-13')).toThrow();
    expect(() => creer('1961-00')).toThrow();
    expect(() => creer('1961-02-30')).toThrow();
    expect(() => creer('1961-04-31')).toThrow();
    expect(() => creer('1961-05-00')).toThrow();
  });
  it('gère les années bissextiles', () => {
    expect(estDateValide('2000-02-29')).toBe(true);
    expect(estDateValide('1900-02-29')).toBe(false);
    expect(estDateValide('2024-02-29')).toBe(true);
    expect(estDateValide('2023-02-29')).toBe(false);
  });
  it('refuse les formats incomplets ou non numériques', () => {
    for (const d of ['19', '1961-5', '1961-05-1', '1961--14', 'abcd', '0000']) expect(estDateValide(d)).toBe(false);
  });
});

describe('sexe', () => {
  it('est facultatif et conservé', () => {
    expect(creerPersonne(donneesVides(), { prenom: 'A', nom: 'B' }).personne.sexe).toBeUndefined();
    expect(creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', sexe: 'F' }).personne.sexe).toBe('F');
  });
  it('peut être retiré à la modification', () => {
    const { donnees, personne } = creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', sexe: 'M' });
    const d2 = modifierPersonne(donnees, personne.id, { prenom: 'A', nom: 'B' });
    expect(d2.personnes[0].sexe).toBeUndefined();
  });
  it('refuse une valeur inconnue', () => {
    expect(() => creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', sexe: 'X' as never })).toThrow();
  });
});
