import { describe, expect, it } from 'vitest';
import { boiteLigne, coupe, dateEnClair, placerMentions, segmentsDe, textesUnion, type CoupleTrace, type Obstacles } from './mentionsUnion';

const textes = (c: { texte: string }[][]) => c.map((l) => l.map((x) => x.texte));
const auj = new Date(2026, 9, 30);

describe('dateEnClair', () => {
  it('formule chaque précision de date', () => {
    expect(dateEnClair('1990-06-14')).toBe('14 juin 1990');
    expect(dateEnClair('1990-06-01')).toBe('1er juin 1990');
    expect(dateEnClair('1990-09')).toBe('septembre 1990');
    expect(dateEnClair('1990-09', true)).toBe('sept. 1990');
    expect(dateEnClair('1990')).toBe('1990');
    expect(dateEnClair('--06-14')).toBe('14 juin');
    expect(dateEnClair(undefined)).toBe('');
  });
});

describe('textesUnion', () => {
  const u = (date?: string, lieu?: string, statut: 'actuelle' | 'separee' = 'actuelle') => ({ date, lieu, statut });

  it('au palier année : l’année seule, rien sans année', () => {
    expect(textes(textesUnion(u('1990-06-14', 'Morlaix'), 'annee', auj))).toEqual([['1990']]);
    expect(textesUnion(u('--06-14'), 'annee', auj)).toEqual([]);
    expect(textesUnion(u(undefined, 'Morlaix'), 'annee', auj)).toEqual([]);
  });

  it('au palier détail : la date au-dessus du lieu, puis de plus en plus court', () => {
    expect(textes(textesUnion(u('1944-09-30', 'Morlaix'), 'detail', auj))).toEqual([
      ['30 septembre 1944', 'Morlaix'],
      ['30 sept. 1944', 'Morlaix'],
      ['30 septembre 1944'],
      ['30 sept. 1944'],
      ['1944'],
    ]);
    expect(textes(textesUnion(u('--06-14'), 'detail', auj))).toEqual([['14 juin']]);
    expect(textes(textesUnion(u(undefined, 'Morlaix'), 'detail', auj))).toEqual([['Morlaix']]);
    expect(textes(textesUnion(u('1990'), 'detail', auj))).toEqual([['1990']]);
  });

  it('rien pour des fiancés (mariage à venir), mais une union passée d’ex se mentionne', () => {
    expect(textesUnion(u('2027-05-01', 'Morlaix'), 'detail', auj)).toEqual([]);
    expect(textes(textesUnion(u('1998', undefined, 'separee'), 'annee', auj))).toEqual([['1998']]);
  });
});

describe('segmentsDe', () => {
  it('lit les commandes collées ou espacées', () => {
    expect(segmentsDe('M1 2H5V7')).toEqual([
      { x1: 1, y1: 2, x2: 5, y2: 2 },
      { x1: 5, y1: 2, x2: 5, y2: 7 },
    ]);
    expect(segmentsDe('M 0 0 L 3 4 M 10 10 H 12')).toHaveLength(2);
  });

  it('échantillonne une courbe jusqu’à son point d’arrivée', () => {
    const s = segmentsDe('M 0 0 C 0 10, 10 10, 10 0');
    expect(s).toHaveLength(16);
    expect(s.at(-1)).toMatchObject({ x2: 10, y2: 0 });
    expect(Math.max(...s.map((x) => x.y2))).toBeCloseTo(7.5, 0);
  });
});

describe('coupe', () => {
  const b = { g: 0, h: 0, d: 10, b: 10 };
  it('repère un segment qui traverse, entre ou longe la boîte', () => {
    expect(coupe({ x1: -5, y1: 5, x2: 15, y2: 5 }, b)).toBe(true);
    expect(coupe({ x1: 5, y1: 5, x2: 5, y2: 50 }, b)).toBe(true);
    expect(coupe({ x1: -5, y1: 12, x2: 15, y2: 12 }, b)).toBe(false);
    expect(coupe({ x1: 20, y1: -5, x2: 20, y2: 15 }, b)).toBe(false);
  });
});

describe('placerMentions', () => {
  const couple = (dx = 80, date = '1990-06-14', lieu?: string): CoupleTrace => ({
    g: { x: 0, y: 0, r: 19 },
    d: { x: dx, y: 0, r: 19 },
    y: 0,
    union: { date, lieu, statut: 'actuelle' },
    ex: false,
  });
  const avatars = (c: CoupleTrace): Obstacles => ({
    cercles: [c.g, c.d],
    segments: segmentsDe(`M${c.g.x + 19} 0H${c.d.x - 19}`),
    boites: [],
  });

  it('écrit l’année au milieu de l’espace libre, juste au-dessus du trait, sans toucher les avatars', () => {
    const c = couple();
    const [m] = placerMentions([c], 'annee', avatars(c), auj);
    expect(m.lignes).toEqual([{ texte: '1990', x: 40, y: expect.closeTo(-5.85), taille: 9.5 }]);
    const b = boiteLigne(m.lignes[0]);
    expect(b.b).toBeLessThan(-2);
    expect(b.g).toBeGreaterThan(19);
  });

  it('ne passe jamais derrière un trait de parenté : il remonte, sinon il disparaît', () => {
    const c = couple();
    const bas = { ...avatars(c), segments: [...avatars(c).segments, ...segmentsDe('M40 -10V0')] };
    const [m] = placerMentions([c], 'annee', bas, auj);
    expect(m.lignes[0].y).toBeLessThan(-12);
    const traverse = { ...avatars(c), segments: [...avatars(c).segments, ...segmentsDe('M40 -60V0')] };
    expect(placerMentions([c], 'annee', traverse, auj)).toEqual([]);
  });

  it('ne recouvre ni une étiquette ni un autre avatar', () => {
    const c = couple();
    expect(placerMentions([c], 'annee', { ...avatars(c), boites: [{ g: 30, h: -40, d: 50, b: -4 }] }, auj)).toEqual([]);
    expect(placerMentions([c], 'annee', { ...avatars(c), cercles: [...avatars(c).cercles, { x: 40, y: 0, r: 19 }] }, auj)).toEqual([]);
  });

  it('rien quand les avatars sont trop proches', () => {
    const c = couple(48);
    expect(placerMentions([c], 'annee', avatars(c), auj)).toEqual([]);
  });

  it('au palier détail, le lieu trop long se tronque et chaque ligne reste entre les centres', () => {
    const c = couple(80, '2001-06-16', 'Saint-Valery-en-Caux');
    const [m] = placerMentions([c], 'detail', avatars(c), auj);
    expect(m.lignes.map((l) => l.texte)).toEqual(['16 juin 2001', expect.stringMatching(/^Saint-.+…$/)]);
    expect(m.lignes[0].y).toBeLessThan(m.lignes[1].y);
    for (const l of m.lignes) {
      const b = boiteLigne(l);
      expect(b.g).toBeGreaterThanOrEqual(0);
      expect(b.d).toBeLessThanOrEqual(80);
    }
  });

  it('deux mentions ne se chevauchent pas, et l’ex est signalé', () => {
    const a = couple();
    const b = { ...couple(), ex: true };
    const ms = placerMentions([a, b], 'annee', avatars(a), auj);
    expect(ms).toHaveLength(2);
    expect(ms[1].ex).toBe(true);
    expect(ms[1].lignes[0].y).toBeLessThan(ms[0].lignes[0].y - 9);
  });
});
