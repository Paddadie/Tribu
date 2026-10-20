import { describe, expect, it } from 'vitest';
import { donneesVides, creerPersonne } from './modele';
import { CLE_REGLAGES, REGLAGES_PAR_DEFAUT, chargerReglages, ficheMoi, libelleDernierExport, sauvegarderReglages } from './reglages';

function magasin(contenu?: string) {
  const m = new Map<string, string>(contenu === undefined ? [] : [[CLE_REGLAGES, contenu]]);
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('réglages', () => {
  it('donne les valeurs par défaut quand rien n\'est stocké', () => {
    expect(chargerReglages(magasin())).toEqual({ tri: 'prenom', theme: 'auto', dernierExport: null, moi: null });
  });
  it('relit ce qui a été sauvegardé', () => {
    const m = magasin();
    const r = { tri: 'nom', theme: 'sombre', dernierExport: '2026-10-12T09:30:00.000Z', moi: 'id-moi' } as const;
    sauvegarderReglages(m, r);
    expect(chargerReglages(m)).toEqual(r);
  });
  it('remplace chaque valeur inconnue par son défaut, sans toucher à l\'autre', () => {
    expect(chargerReglages(magasin('{"tri":"age","theme":"clair"}'))).toEqual({ tri: 'prenom', theme: 'clair', dernierExport: null, moi: null });
    expect(chargerReglages(magasin('{"tri":"nom","theme":42}'))).toEqual({ tri: 'nom', theme: 'auto', dernierExport: null, moi: null });
  });
  it('ignore une date de dernier export invalide', () => {
    expect(chargerReglages(magasin('{"dernierExport":"hier"}')).dernierExport).toBeNull();
    expect(chargerReglages(magasin('{"dernierExport":42}')).dernierExport).toBeNull();
  });
  it('ignore une fiche « Moi » qui n’est pas un id', () => {
    expect(chargerReglages(magasin('{"moi":42}')).moi).toBeNull();
    expect(chargerReglages(magasin('{"moi":""}')).moi).toBeNull();
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

describe('ficheMoi', () => {
  const { donnees, personne } = creerPersonne(donneesVides(), { prenom: 'Jean', nom: 'Dupont' });
  it('donne ma fiche quand elle existe', () => {
    expect(ficheMoi({ ...REGLAGES_PAR_DEFAUT, moi: personne.id }, donnees)).toBe(personne);
  });
  it('vaut « non choisie » si rien n’est choisi ou si la fiche a disparu, sans oublier l’id', () => {
    expect(ficheMoi(REGLAGES_PAR_DEFAUT, donnees)).toBeUndefined();
    const reglages = { ...REGLAGES_PAR_DEFAUT, moi: personne.id };
    expect(ficheMoi(reglages, donneesVides())).toBeUndefined();
    expect(reglages.moi).toBe(personne.id);
  });
});

describe('libelleDernierExport', () => {
  const maintenant = new Date(2026, 9, 19, 8, 0);
  it('affiche « Jamais » sans export', () => {
    expect(libelleDernierExport(null, maintenant)).toBe('Jamais');
  });
  it('compte les jours en dates locales', () => {
    expect(libelleDernierExport(new Date(2026, 9, 19, 7, 0).toISOString(), maintenant)).toBe('19/10/2026 · aujourd’hui');
    expect(libelleDernierExport(new Date(2026, 9, 18, 23, 59).toISOString(), maintenant)).toBe('18/10/2026 · hier');
    expect(libelleDernierExport(new Date(2026, 9, 12, 21, 0).toISOString(), maintenant)).toBe('12/10/2026 · il y a 7 jours');
  });
});
