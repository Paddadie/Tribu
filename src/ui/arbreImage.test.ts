import { describe, expect, it } from 'vitest';
import { COTE_MAX, dimensionsImage, melanger } from './arbreImage';

describe('dimensionsImage', () => {
  it('double la netteté quand l’arbre est petit', () => {
    const d = dimensionsImage(600, 400);
    expect(d.echelle).toBe(2);
    expect(d.pixelsL).toBe(1200);
    expect(d.pixelsH).toBe(912);
  });

  it('plafonne le plus grand côté à 4096 px', () => {
    const large = dimensionsImage(5000, 1000);
    expect(large.pixelsL).toBeLessThanOrEqual(COTE_MAX);
    expect(large.echelle).toBeLessThan(2);
    const haut = dimensionsImage(1000, 6000);
    expect(haut.pixelsH).toBeLessThanOrEqual(COTE_MAX);
  });
});

describe('melanger', () => {
  it('rend la couleur seule à 100 % et l’autre à 0 %', () => {
    expect(melanger('#102030', '#ffffff', 1)).toBe('#102030');
    expect(melanger('#102030', '#ffffff', 0)).toBe('#ffffff');
  });
  it('fait la moyenne à 50 %', () => {
    expect(melanger('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
