import { describe, expect, it } from 'vitest';
import { bandes, COTE_MAX, dimensionsImage, ECHELLE_VISEE, melanger, PIXELS_BANDE, PIXELS_CANVAS, PIXELS_MAX } from './arbreImage';

describe('dimensionsImage', () => {
  it('triple la netteté quand l’arbre est petit', () => {
    const d = dimensionsImage(600, 400);
    expect(d.echelle).toBe(3);
    expect(d.pixelsL).toBe(1800);
    expect(d.pixelsH).toBe(1368);
  });

  it('réduit l’échelle d’un grand arbre pour tenir dans PIXELS_MAX, sans descendre sous ×2,5 pour la taille de la fixture', () => {
    const d = dimensionsImage(3908, 1696);
    expect(d.pixelsL * d.pixelsH).toBeLessThanOrEqual(PIXELS_MAX);
    expect(d.echelle).toBeLessThan(ECHELLE_VISEE);
    expect(d.echelle).toBeGreaterThan(2.5);
  });

  it('plafonne le plus grand côté à COTE_MAX', () => {
    const large = dimensionsImage(12000, 300);
    expect(large.pixelsL).toBeLessThanOrEqual(COTE_MAX);
    expect(large.echelle).toBeLessThan(2);
    const haut = dimensionsImage(300, 9000);
    expect(haut.pixelsH).toBeLessThanOrEqual(COTE_MAX);
  });

  it('le secours sur un seul canvas reste dans la surface de Safari iOS', () => {
    const d = dimensionsImage(3908, 1696, PIXELS_CANVAS);
    expect(d.pixelsL * d.pixelsH).toBeLessThanOrEqual(PIXELS_CANVAS);
    expect(d.echelle).toBeGreaterThan(1.5);
  });
});

describe('bandes', () => {
  it('couvrent toute la hauteur, dans l’ordre et sans chevauchement, chacune sous PIXELS_BANDE', () => {
    const [l, h] = [10348, 4638];
    const liste = bandes(l, h);
    expect(liste[0].y).toBe(0);
    liste.forEach((b, i) => {
      expect(b.h).toBeGreaterThan(0);
      expect(b.h * l).toBeLessThanOrEqual(PIXELS_BANDE);
      if (i > 0) expect(b.y).toBe(liste[i - 1].y + liste[i - 1].h);
    });
    const derniere = liste[liste.length - 1];
    expect(derniere.y + derniere.h).toBe(h);
  });

  it('gardent au moins une ligne par bande sur une image très large', () => {
    expect(bandes(100, 3, 10)).toEqual([
      { y: 0, h: 1 },
      { y: 1, h: 1 },
      { y: 2, h: 1 },
    ]);
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
