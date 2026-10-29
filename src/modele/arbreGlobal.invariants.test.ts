// Arbre principal sur les familles fictives et la fixture anonymisée (V4, lot 0) : invariants de disposition et
// métriques. Les valeurs notées ici sont celles d'après le lot 4 (points 13 à 15) : elles ne doivent qu'aller en
// baissant. Un défaut connu est compté, pas caché : le corriger fait baisser son seuil à 0.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_MOI } from './anonymiser';
import { disposerArbre } from './arbreGlobal';
import { fautesDisposition, metriques } from './test/disposition';
import { famillesDeReference } from './test/familles';
import type { Donnees } from './types';

const fixture: Donnees = JSON.parse(readFileSync(new URL('./fixtures/arbre-anonyme.json', import.meta.url), 'utf-8'));
const cas = [...famillesDeReference().map((f) => ({ nom: f.fichier, d: f.donnees, moi: f.moi })), { nom: 'fixture', d: fixture, moi: ID_MOI }];

/** Seuils : nombre de fautes de chaque sorte et métriques d'aujourd'hui (arrondies vers le haut au centième). */
const SEUILS: Record<
  string,
  { entrelacements: number; busCollés: number; fratriesCollees: number; largeur: number; ecartMoyen: number; coudes: number; petitsCoudes: number; croisements: number }
> = {
  dupontel: { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 14.5, ecartMoyen: 0.01, coudes: 11, petitsCoudes: 0, croisements: 0 },
  'martinez-vasseur': { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 14.57, ecartMoyen: 0.08, coudes: 18, petitsCoudes: 4, croisements: 0 },
  lambert: { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 7.63, ecartMoyen: 0.28, coudes: 5, petitsCoudes: 1, croisements: 1 },
  rochefort: { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 10.85, ecartMoyen: 0.53, coudes: 9, petitsCoudes: 1, croisements: 0 },
  extremes: { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 19, ecartMoyen: 0.74, coudes: 15, petitsCoudes: 1, croisements: 1 },
  fixture: { entrelacements: 0, busCollés: 0, fratriesCollees: 0, largeur: 46.16, ecartMoyen: 0.05, coudes: 46, petitsCoudes: 1, croisements: 0 },
};

describe.each(cas)('arbre principal : $nom', ({ nom, d, moi }) => {
  const disp = disposerArbre(d, moi);
  const fautes = fautesDisposition(d, moi, disp);
  const m = metriques(disp);
  const seuil = SEUILS[nom];

  it('aucun chevauchement, chaque enfant sous son trait commun, toutes les personnes reliées placées', () => {
    expect(fautes.chevauchements).toEqual([]);
    expect(fautes.horsDuBus).toEqual([]);
    expect(fautes.absentes).toEqual([]);
  });

  it('fratries entrelacées, traits communs collés, fratries voisines collées : pas plus qu’aujourd’hui', () => {
    expect(fautes.entrelacements.length).toBeLessThanOrEqual(seuil.entrelacements);
    expect(fautes.busCollés.length).toBeLessThanOrEqual(seuil.busCollés);
    expect(fautes.fratriesCollees.length).toBeLessThanOrEqual(seuil.fratriesCollees);
  });

  it('métriques : pas plus qu’aujourd’hui', () => {
    expect(m.largeur).toBeLessThanOrEqual(seuil.largeur);
    expect(m.ecartMoyen).toBeLessThanOrEqual(seuil.ecartMoyen);
    expect(m.coudes).toBeLessThanOrEqual(seuil.coudes);
    expect(m.petitsCoudes).toBeLessThanOrEqual(seuil.petitsCoudes);
    expect(m.croisements).toBeLessThanOrEqual(seuil.croisements);
  });
});
