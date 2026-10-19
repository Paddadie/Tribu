// État de l'appli face à un contenu stocké illisible : l'original reste
// récupérable quoi qu'on tente avant le choix explicite de repartir à vide.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerPersonne, donneesVides } from '../modele/modele';
import { CLE_SECOURS, CLE_STOCKAGE } from '../modele/stockage';

const ILLISIBLE = '{"version":1,"personnes":[{"id":"a","prenom":"Anne"'; // JSON tronqué

let magasin: Map<string, string>;

/** Recharge etat.ts avec un localStorage factice contenant `contenu`. */
async function lancer(contenu: string | null) {
  magasin = new Map();
  if (contenu !== null) magasin.set(CLE_STOCKAGE, contenu);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => magasin.get(k) ?? null,
    setItem: (k: string, v: string) => void magasin.set(k, v),
  });
  vi.resetModules();
  return import('./etat');
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('chargement illisible', () => {
  it('refuse toute modification et laisse l’original intact', async () => {
    const etat = await lancer(ILLISIBLE);
    expect(etat.lireBrutIllisible()).toBe(ILLISIBLE);
    expect(etat.lireDonnees()).toEqual(donneesVides());

    expect(() => etat.modifierDonnees((d) => creerPersonne(d, { prenom: 'Bob', nom: 'Martin' }).donnees)).toThrow(
      'Données illisibles',
    );
    expect(magasin.get(CLE_STOCKAGE)).toBe(ILLISIBLE);
    expect(magasin.get(CLE_SECOURS)).toBe(ILLISIBLE);
  });

  it('après « Repartir à vide », enregistre normalement et garde le secours', async () => {
    const etat = await lancer(ILLISIBLE);
    etat.repartirAVide();
    expect(etat.lireBrutIllisible()).toBeNull();

    etat.modifierDonnees((d) => creerPersonne(d, { prenom: 'Bob', nom: 'Martin' }).donnees);
    expect(etat.lireDonnees().personnes).toHaveLength(1);
    expect(JSON.parse(magasin.get(CLE_STOCKAGE)!).personnes).toHaveLength(1);
    expect(magasin.get(CLE_SECOURS)).toBe(ILLISIBLE);
  });

  it('un relancement avant tout choix retrouve le même contenu illisible', async () => {
    await lancer(ILLISIBLE);
    const contenu = magasin.get(CLE_STOCKAGE)!;
    const etat = await lancer(contenu);
    expect(etat.lireBrutIllisible()).toBe(ILLISIBLE);
  });
});

describe('chargement normal', () => {
  it('enregistre les modifications sans créer de secours', async () => {
    const etat = await lancer(null);
    expect(etat.lireBrutIllisible()).toBeNull();
    etat.modifierDonnees((d) => creerPersonne(d, { prenom: 'Anne', nom: 'Martin' }).donnees);
    expect(magasin.has(CLE_STOCKAGE)).toBe(true);
    expect(magasin.has(CLE_SECOURS)).toBe(false);
  });
});

describe('annulation d’un import ou d’un effacement', () => {
  it('revient exactement à l’état d’avant, en mémoire et dans le stockage', async () => {
    const etat = await lancer(null);
    etat.modifierDonnees((d) => creerPersonne(d, { prenom: 'Anne', nom: 'Martin' }).donnees);
    const avant = etat.lireDonnees();
    const stockeAvant = magasin.get(CLE_STOCKAGE);

    const annuler = etat.modifierDonneesAnnulable(() => donneesVides());
    expect(etat.lireDonnees().personnes).toHaveLength(0);

    annuler();
    expect(etat.lireDonnees()).toEqual(avant);
    expect(magasin.get(CLE_STOCKAGE)).toBe(stockeAvant);
  });
});

describe('stockage plein', () => {
  it('lève une erreur en français et garde les données d’avant', async () => {
    const etat = await lancer(null);
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    });
    expect(() => etat.modifierDonnees((d) => creerPersonne(d, { prenom: 'Bob', nom: 'Martin' }).donnees)).toThrow(
      'Stockage du téléphone plein',
    );
    expect(etat.lireDonnees().personnes).toHaveLength(0);
  });
});
