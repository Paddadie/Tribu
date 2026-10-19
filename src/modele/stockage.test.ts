import { describe, expect, it } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import {
  CLE_STOCKAGE,
  charger,
  estDonneesValides,
  exporterJson,
  importerJson,
  sauvegarder,
} from './stockage';
import type { Donnees } from './types';

function faux() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

function exemple(): Donnees {
  let d = donneesVides();
  const a = creerPersonne(d, { prenom: 'Anne', nom: 'Martin', naissance: '1970-02-03', note: 'tante' });
  d = a.donnees;
  const b = creerPersonne(d, { prenom: 'Bob', nom: 'Martin' });
  d = b.donnees;
  const c = creerPersonne(d, { prenom: 'Cléo', nom: 'Martin' });
  d = c.donnees;
  d = ajouterUnion(d, a.personne.id, b.personne.id, true).donnees;
  d = ajouterFiliation(d, a.personne.id, c.personne.id, 'adoptif').donnees;
  return d;
}

describe('localStorage', () => {
  it('renvoie des données vides quand rien n’est stocké', () => {
    expect(charger(faux())).toEqual(donneesVides());
  });

  it('persiste puis recharge à l’identique', () => {
    const magasin = faux();
    const d = exemple();
    sauvegarder(magasin, d);
    expect(charger(magasin)).toEqual(d);
  });

  it('écrit sous la clé prévue', () => {
    const magasin = faux();
    sauvegarder(magasin, donneesVides());
    expect(magasin.getItem(CLE_STOCKAGE)).not.toBeNull();
  });

  it('retombe sur des données vides si le contenu est corrompu', () => {
    const magasin = faux();
    magasin.setItem(CLE_STOCKAGE, '{pas du json');
    expect(charger(magasin)).toEqual(donneesVides());
    magasin.setItem(CLE_STOCKAGE, JSON.stringify({ version: 1, personnes: 'non' }));
    expect(charger(magasin)).toEqual(donneesVides());
  });
});

describe('export / import JSON', () => {
  it('fait un aller-retour sans perte', () => {
    const d = exemple();
    expect(importerJson(exporterJson(d))).toEqual(d);
  });

  it('refuse un texte qui n’est pas du JSON', () => {
    expect(() => importerJson('pas du json')).toThrow(/JSON/);
  });

  it('refuse un JSON qui n’est pas une sauvegarde Tribu', () => {
    expect(() => importerJson('{"a":1}')).toThrow();
    expect(() => importerJson('[]')).toThrow();
    expect(() => importerJson('null')).toThrow();
  });
});

describe('validation des données', () => {
  it('accepte des données cohérentes', () => {
    expect(estDonneesValides(exemple())).toBe(true);
    expect(estDonneesValides(donneesVides())).toBe(true);
  });

  it('refuse une mauvaise version', () => {
    expect(estDonneesValides({ ...donneesVides(), version: 2 })).toBe(false);
  });

  it('refuse un lien vers une personne inexistante', () => {
    const d = exemple();
    expect(estDonneesValides({ ...d, unions: [{ ...d.unions[0], personneB: 'fantôme' }] })).toBe(false);
    expect(estDonneesValides({ ...d, filiations: [{ ...d.filiations[0], parent: 'fantôme' }] })).toBe(false);
  });

  it('refuse des ids de personne en double', () => {
    const d = exemple();
    expect(estDonneesValides({ ...d, personnes: [d.personnes[0], d.personnes[0]] })).toBe(false);
  });

  it('refuse un champ mal typé ou un type de filiation inconnu', () => {
    const d = exemple();
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], prenom: 3 }] })).toBe(false);
    expect(estDonneesValides({ ...d, filiations: [{ ...d.filiations[0], type: 'légal' }] })).toBe(false);
    expect(estDonneesValides({ ...d, unions: [{ ...d.unions[0], marie: 'oui' }] })).toBe(false);
  });

  it('refuse plus de deux parents d’un même type pour un enfant', () => {
    const d = exemple();
    const enfant = d.personnes[2].id;
    const fil = (n: number, parent: string) => ({ id: `f${n}`, parent, enfant, type: 'biologique' as const });
    const trois = [fil(1, d.personnes[0].id), fil(2, d.personnes[1].id)];
    expect(estDonneesValides({ ...d, filiations: trois })).toBe(true);
    const extra = creerPersonne(d, { prenom: 'Dan', nom: 'Z' });
    expect(
      estDonneesValides({ ...extra.donnees, filiations: [...trois, fil(3, extra.personne.id)] }),
    ).toBe(false);
  });
});

describe('sexe et date partielle', () => {
  it('relit un sexe et une date partielle enregistrés', () => {
    const d = creerPersonne(donneesVides(), { prenom: 'A', nom: 'B', sexe: 'F', naissance: '1938' }).donnees;
    const relu = importerJson(exporterJson(d));
    expect(relu.personnes[0]).toMatchObject({ sexe: 'F', naissance: '1938' });
  });
  it('accepte les anciennes données sans sexe', () => {
    const d = creerPersonne(donneesVides(), { prenom: 'A', nom: 'B' }).donnees;
    expect(estDonneesValides(d)).toBe(true);
  });
  it('refuse un sexe inconnu', () => {
    const d = creerPersonne(donneesVides(), { prenom: 'A', nom: 'B' }).donnees;
    expect(estDonneesValides({ ...d, personnes: [{ ...d.personnes[0], sexe: 'X' }] })).toBe(false);
  });
});
