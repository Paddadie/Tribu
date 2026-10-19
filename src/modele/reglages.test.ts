import { describe, expect, it } from 'vitest';
import { CLE_REGLAGES, REGLAGES_PAR_DEFAUT, chargerReglages, sauvegarderReglages } from './reglages';

function magasin(contenu?: string) {
  const m = new Map<string, string>(contenu === undefined ? [] : [[CLE_REGLAGES, contenu]]);
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('réglages', () => {
  it('donne les valeurs par défaut quand rien n\'est stocké', () => {
    expect(chargerReglages(magasin())).toEqual({ tri: 'prenom', theme: 'auto' });
  });
  it('relit ce qui a été sauvegardé', () => {
    const m = magasin();
    sauvegarderReglages(m, { tri: 'nom', theme: 'sombre' });
    expect(chargerReglages(m)).toEqual({ tri: 'nom', theme: 'sombre' });
  });
  it('remplace chaque valeur inconnue par son défaut, sans toucher à l\'autre', () => {
    expect(chargerReglages(magasin('{"tri":"age","theme":"clair"}'))).toEqual({ tri: 'prenom', theme: 'clair' });
    expect(chargerReglages(magasin('{"tri":"nom","theme":42}'))).toEqual({ tri: 'nom', theme: 'auto' });
  });
  it('tolère un contenu illisible ou d\'un autre type', () => {
    expect(chargerReglages(magasin('{pas du json'))).toEqual(REGLAGES_PAR_DEFAUT);
    expect(chargerReglages(magasin('null'))).toEqual(REGLAGES_PAR_DEFAUT);
    expect(chargerReglages(magasin('[1,2]'))).toEqual(REGLAGES_PAR_DEFAUT);
  });
  it('tolère un localStorage inaccessible', () => {
    const casse = { getItem: () => { throw new Error('refusé'); }, setItem: () => {} };
    expect(chargerReglages(casse)).toEqual(REGLAGES_PAR_DEFAUT);
  });
});
