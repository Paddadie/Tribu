import { describe, expect, it } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele';
import {
  CLE_SECOURS,
  CLE_STOCKAGE,
  charger,
  estDonneesValides,
  exporterJson,
  importerJson,
  nomFichierExport,
  nomFichierSecours,
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
    expect(charger(faux())).toEqual({ lisible: true, donnees: donneesVides() });
  });

  it('persiste puis recharge à l’identique', () => {
    const magasin = faux();
    const d = exemple();
    sauvegarder(magasin, d);
    expect(charger(magasin)).toEqual({ lisible: true, donnees: d });
  });

  it('écrit sous la clé prévue', () => {
    const magasin = faux();
    sauvegarder(magasin, donneesVides());
    expect(magasin.getItem(CLE_STOCKAGE)).not.toBeNull();
  });

  it('signale un contenu illisible sans l’écraser et le copie en secours', () => {
    for (const brut of ['{pas du json', JSON.stringify({ version: 1, personnes: 'non' })]) {
      const magasin = faux();
      magasin.setItem(CLE_STOCKAGE, brut);
      expect(charger(magasin)).toEqual({ lisible: false, brut });
      expect(magasin.getItem(CLE_STOCKAGE)).toBe(brut);
      expect(magasin.getItem(CLE_SECOURS)).toBe(brut);
    }
  });

  it('ne touche pas à la clé de secours quand le contenu est lisible', () => {
    const magasin = faux();
    magasin.setItem(CLE_SECOURS, 'ancien');
    sauvegarder(magasin, exemple());
    charger(magasin);
    expect(magasin.getItem(CLE_SECOURS)).toBe('ancien');
  });

  it('signale le contenu illisible même si la copie de secours échoue', () => {
    const magasin = faux();
    magasin.setItem(CLE_STOCKAGE, '{pas du json');
    const plein = { ...magasin, setItem: () => { throw new Error('quota'); } };
    expect(charger(plein)).toEqual({ lisible: false, brut: '{pas du json' });
    expect(magasin.getItem(CLE_STOCKAGE)).toBe('{pas du json');
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
    expect(estDonneesValides({ ...donneesVides(), version: 3 })).toBe(false);
    expect(estDonneesValides({ ...donneesVides(), version: 1 })).toBe(false);
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

describe('nomFichierExport', () => {
  it('contient la date locale, mois et jour sur deux chiffres', () => {
    expect(nomFichierExport(new Date(2026, 0, 5, 23, 59))).toBe('tribu-2026-01-05.json');
    expect(nomFichierExport(new Date(2026, 9, 19))).toBe('tribu-2026-10-19.json');
  });

  it('nomme le fichier de secours en texte', () => {
    expect(nomFichierSecours(new Date(2026, 9, 19))).toBe('tribu-secours-2026-10-19.txt');
  });
});

describe('aller-retour export / import', () => {
  it('restitue toute la famille sur une appli vide', () => {
    const d = exemple();
    const texte = exporterJson(d);
    const vide = faux();
    sauvegarder(vide, importerJson(texte));
    expect(charger(vide)).toEqual({ lisible: true, donnees: d });
  });
});
