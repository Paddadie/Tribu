import { describe, expect, it } from 'vitest';
import { dureeUnion, libelleAnniversaireUnion, libelleNoces, nomNoces } from './noces';

describe('noces', () => {
  it('nomme chaque année de 1 à 50, puis de 5 en 5 jusqu’à 80', () => {
    for (let n = 1; n <= 50; n++) expect(nomNoces(n), `${n} ans`).toBeDefined();
    for (const n of [55, 60, 65, 70, 75, 80]) expect(nomNoces(n), `${n} ans`).toBeDefined();
    for (const n of [0, 51, 56, 79, 81, 100]) expect(nomNoces(n), `${n} ans`).toBeUndefined();
  });

  it('donne les noms connus', () => {
    expect(nomNoces(1)).toBe('coton');
    expect(nomNoces(10)).toBe('étain');
    expect(nomNoces(25)).toBe('argent');
    expect(nomNoces(50)).toBe('or');
    expect(nomNoces(60)).toBe('diamant');
    expect(nomNoces(80)).toBe('chêne');
  });

  it('élide devant une voyelle', () => {
    expect(libelleNoces(10)).toBe('noces d’étain');
    expect(libelleNoces(50)).toBe('noces d’or');
    expect(libelleNoces(48)).toBe('noces d’améthyste');
    expect(libelleNoces(1)).toBe('noces de coton');
    expect(libelleNoces(30)).toBe('noces de perle');
  });

  it('compte les années sans nom', () => {
    expect(libelleNoces(56)).toBe('56 ans de mariage');
    expect(libelleNoces(90)).toBe('90 ans de mariage');
  });

  it('distingue mariage et union libre', () => {
    expect(libelleAnniversaireUnion(10, true)).toBe('noces d’étain');
    expect(libelleAnniversaireUnion(10, false)).toBe('10 ans ensemble');
    expect(libelleAnniversaireUnion(1, false)).toBe('1 an ensemble');
  });
});

describe('dureeUnion', () => {
  const AUJOURDHUI = new Date(2026, 9, 21);

  it('donne les années et les noces d’une union en cours', () => {
    expect(dureeUnion('2016-10-21', true, AUJOURDHUI)).toBe('10 ans · noces d’étain');
    expect(dureeUnion('2016-10-22', true, AUJOURDHUI)).toBe('9 ans · noces de faïence');
    expect(dureeUnion('2016-10-21', false, AUJOURDHUI)).toBe('10 ans ensemble');
    expect(dureeUnion('1970-01-01', true, AUJOURDHUI)).toBe('56 ans de mariage');
  });

  it('reste vague si la date ne tranche pas, et se tait sans année ou avant un an', () => {
    expect(dureeUnion('2016', true, AUJOURDHUI)).toBe('environ 10 ans');
    expect(dureeUnion('--06-12', true, AUJOURDHUI)).toBe('');
    expect(dureeUnion(undefined, true, AUJOURDHUI)).toBe('');
    expect(dureeUnion('2026-01-10', true, AUJOURDHUI)).toBe('');
    expect(dureeUnion('2027-06-12', true, AUJOURDHUI)).toBe('');
  });
});
