import { describe, expect, it } from 'vitest';
import { disposerArbre } from '../modele/arbreGlobal';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from '../modele/modele';
import {
  bandes,
  COTE_LIMITE,
  COTE_MAX,
  dimensionsArbre,
  dimensionsImage,
  ECHELLE_MIN,
  ECHELLE_VISEE,
  melanger,
  PIXELS_BANDE,
  PIXELS_CANVAS,
  PIXELS_LIMITE,
  PIXELS_MAX,
} from './arbreImage';

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

  it('plafonne le plus grand côté à COTE_MAX tant que l’échelle reste au-dessus d’ECHELLE_MIN', () => {
    const large = dimensionsImage(7000, 300);
    expect(large.pixelsL).toBeLessThanOrEqual(COTE_MAX);
    expect(large.echelle).toBeLessThan(ECHELLE_VISEE);
    expect(large.grande).toBe(false);
    const haut = dimensionsImage(300, 9000);
    expect(haut.pixelsH).toBeLessThanOrEqual(COTE_MAX);
    expect(haut.echelle).toBeGreaterThanOrEqual(ECHELLE_MIN);
  });

  it('ne descend jamais sous ECHELLE_MIN : dépasse COTE_MAX ou PIXELS_MAX et le signale', () => {
    const large = dimensionsImage(12000, 300);
    expect(large.echelle).toBe(ECHELLE_MIN);
    expect(large.pixelsL).toBeGreaterThan(COTE_MAX);
    expect(large).toMatchObject({ grande: true, possible: true });
    const vaste = dimensionsImage(6000, 5000);
    expect(vaste.echelle).toBe(ECHELLE_MIN);
    expect(vaste.pixelsL * vaste.pixelsH).toBeGreaterThan(PIXELS_MAX);
    expect(vaste).toMatchObject({ grande: true, possible: true });
  });

  it('n’est plus possible au-delà de COTE_LIMITE ou de PIXELS_LIMITE à ECHELLE_MIN', () => {
    expect(dimensionsImage(22000, 300).pixelsL).toBeGreaterThan(COTE_LIMITE);
    expect(dimensionsImage(22000, 300).possible).toBe(false);
    const carre = dimensionsImage(9000, 9000);
    expect(carre.pixelsL * carre.pixelsH).toBeGreaterThan(PIXELS_LIMITE);
    expect(carre.possible).toBe(false);
  });

  it('le secours sur un seul canvas reste dans la surface de Safari iOS', () => {
    const d = dimensionsImage(3908, 1696, PIXELS_CANVAS);
    expect(d.pixelsL * d.pixelsH).toBeLessThanOrEqual(PIXELS_CANVAS);
    expect(d.echelle).toBeGreaterThan(ECHELLE_MIN);
    expect(d.grande).toBe(false);
    // Plus grand, le secours ne tiendrait plus ECHELLE_MIN : arbrePng le refuse (ImageTropGrande).
    expect(dimensionsImage(4500, 2000, PIXELS_CANVAS).grande).toBe(true);
  });
});

describe('dimensionsArbre d’un très grand arbre', () => {
  it('garde le texte à ECHELLE_MIN au moins pour une fratrie de 150 enfants', () => {
    let d = donneesVides();
    const parents = ['Anselme', 'Berthe'].map((prenom) => {
      const r = creerPersonne(d, { prenom, nom: 'Dupontel' });
      d = r.donnees;
      return r.personne.id;
    });
    d = ajouterUnion(d, parents[0], parents[1], true).donnees;
    for (let i = 0; i < 150; i++) {
      const r = creerPersonne(d, { prenom: `Enfant ${i}`, nom: 'Dupontel' });
      d = r.donnees;
      for (const p of parents) d = ajouterFiliation(d, p, r.personne.id, 'biologique').donnees;
    }
    const dim = dimensionsArbre(disposerArbre(d, parents[0]));
    expect(dim.largeur).toBeGreaterThan(COTE_MAX / ECHELLE_MIN);
    expect(dim.echelle).toBe(ECHELLE_MIN);
    expect(dim).toMatchObject({ grande: true, possible: true });
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
