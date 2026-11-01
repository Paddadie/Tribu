import { describe, expect, it } from 'vitest';
import { disposerArbre, type Branche, type Disposition, type PlaceArbre } from '../arbreGlobal';
import { ajouterFiliation, creerPersonne, donneesVides } from '../modele';
import { assouplir } from '../souple';
import { chercherDecalages } from '../soupleRecherche';
import type { Donnees } from '../types';
import { demo } from './demoSouple';
import { coudesEnTrop, croisementsDessin, enfantsUniquesDecentres, proximiteMoi, rangsDeParente } from './disposition';

/** Branche minimale : départs (x, inconnu ?) sur la ligne 0, enfants (id, x) sur la ligne 1. */
const branche = (origines: (number | [number, true])[], enfants: [string, number][]): Branche => ({
  origines: origines.map((o) => (typeof o === 'number' ? { x: o, y: 0 } : { x: o[0], y: 0, inconnu: true as const })),
  bus: 0.7,
  enfants: enfants.map(([id, x]) => ({ id, x, y: 1, adoptif: false })),
});
const disposition = (branches: Branche[], places: PlaceArbre[] = []): Disposition => ({
  places,
  couples: [],
  branches,
  amities: [],
  groupes: [],
  etiquettes: [],
  anneaux: [],
});

/** Famille fictive : arbre de Moi sur trois générations, avec un oncle, une cousine et un parent inconnu. */
function famille() {
  let d: Donnees = donneesVides();
  const id: Record<string, string> = {};
  const pers = (prenom: string, inconnu = false) => {
    const r = creerPersonne(d, { prenom, nom: 'Orsini' });
    d = r.donnees;
    id[prenom] = r.personne.id;
    if (inconnu) d = { ...d, personnes: d.personnes.map((p) => (p.id === r.personne.id ? { ...p, inconnu: true } : p)) };
  };
  const enfant = (e: string, ...parents: string[]) => parents.forEach((p) => (d = ajouterFiliation(d, id[p], id[e], 'biologique').donnees));
  ['Moi', 'Pere', 'Mere', 'Papi', 'Mamie', 'Soeur', 'Oncle', 'Cousine', 'Inconnu', 'DemiFrere', 'Fils'].forEach((p) => pers(p, p === 'Inconnu'));
  enfant('Pere', 'Papi', 'Mamie');
  enfant('Oncle', 'Papi', 'Mamie');
  enfant('Moi', 'Pere', 'Mere');
  enfant('Soeur', 'Pere', 'Mere');
  enfant('Cousine', 'Oncle');
  enfant('DemiFrere', 'Mere', 'Inconnu');
  enfant('Fils', 'Moi');
  return { d, id };
}

describe('mesures des quatre critères', () => {
  it('rangsDeParente : parents, grands-parents, fratrie (demi comprise), oncles, cousins ; ni Moi, ni inconnu, ni descendant', () => {
    const { d, id } = famille();
    const rangs = rangsDeParente(d, id.Moi);
    const nom = new Map(Object.entries(id).map(([k, v]) => [v, k]));
    expect(Object.fromEntries([...rangs].map(([k, r]) => [nom.get(k), r]))).toEqual({
      Pere: 'parents',
      Mere: 'parents',
      Papi: 'grandsParents',
      Mamie: 'grandsParents',
      Soeur: 'fratrie',
      DemiFrere: 'fratrie',
      Oncle: 'oncles',
      Cousine: 'cousins',
    });
  });

  it('proximiteMoi : distance horizontale moyenne à Moi par rang, 0 pour un rang absent', () => {
    const { d, id } = famille();
    const prox = proximiteMoi(d, id.Moi, disposerArbre(d, id.Moi));
    expect(prox.parents).toBeGreaterThan(0);
    expect(prox.cousins).toBeGreaterThan(prox.fratrie);
    const seul = proximiteMoi(d, id.Papi, disposerArbre(d, id.Papi));
    expect(seul).toEqual({ parents: 0, grandsParents: 0, fratrie: 0, oncles: 0, cousins: 0 });
  });

  it('coudesEnTrop : au-delà d’un enfant aligné par départ dessiné ; parents inconnus et fratrie sans parent exclus', () => {
    // 3 enfants, 1 départ, l'aîné aligné : 2 coudes, minimum 2.
    expect(coudesEnTrop(disposition([branche([0], [['a', 0], ['b', 1], ['c', 2]])]))).toBe(0);
    // Personne d'aligné : 3 coudes pour un minimum de 2.
    expect(coudesEnTrop(disposition([branche([0.5], [['a', 0], ['b', 1], ['c', 2]])]))).toBe(1);
    // Deux départs, un enfant sous l'un : rien de trop ; entre les deux : un coude de trop.
    expect(coudesEnTrop(disposition([branche([0, 3], [['a', 0]])]))).toBe(0);
    expect(coudesEnTrop(disposition([branche([0, 3], [['a', 1.5]])]))).toBe(1);
    // Le départ d'un parent inconnu n'est pas dessiné ; une fratrie sans aucun départ dessiné ne compte pas.
    expect(coudesEnTrop(disposition([branche([[0, true], 2], [['a', 0]])]))).toBe(1);
    expect(coudesEnTrop(disposition([branche([[0, true]], [['a', 1], ['b', 2]])]))).toBe(0);
  });

  it('enfantsUniquesDecentres : écart au départ unique, au-delà de 0,01 place ; deux départs séparés à part', () => {
    const disp = disposition([
      branche([0.5], [['centre', 0.5]]),
      branche([2], [['decale', 2.75]]),
      branche([5, 8], [['entre', 6.5]]),
      branche([10], [['a', 10], ['b', 11]]),
    ]);
    expect(enfantsUniquesDecentres(disp)).toEqual([{ id: 'decale', ecart: 0.75 }]);
  });

  it('croisementsDessin : celui de la démo, puis aucun une fois les générations souples appliquées', () => {
    const { donnees, moi } = demo();
    const disp = disposerArbre(donnees, moi);
    expect(croisementsDessin(disp, moi)).toBe(1);
    expect(croisementsDessin(assouplir(disp, moi, chercherDecalages(donnees, disp, moi)), moi)).toBe(0);
  });
});
