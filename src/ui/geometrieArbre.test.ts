import { describe, expect, it } from 'vitest';
import { BANDE_BUS, disposerArbre } from '../modele/arbreGlobal';
import { lambert, martinezVasseur } from '../modele/test/familles';
import { LIGNE_NAISSANCE, PAS_Y, RAYON_PONT, SOUS_NOM, positions, traitsArbre, trajetAvecPonts } from './geometrieArbre';

describe('géométrie de l’arbre principal', () => {
  it('réserve le nom sur deux lignes, « née X » et l’année au-dessus du trait commun le plus haut (V4, point 17)', () => {
    expect(LIGNE_NAISSANCE).toBeGreaterThan(0);
    expect(SOUS_NOM).toBeLessThan(BANDE_BUS[0] * PAS_Y);
  });

  it('dessine l’adoption en tirets et les ex en points, styles distincts (V4, point 18)', () => {
    const { donnees, moi } = lambert();
    const disp = disposerArbre(donnees, moi);
    const traits = traitsArbre(disp, positions(disp), undefined, moi);
    // Fratrie mixte (Nina et Malo adoptés, Jade non) : seules les deux descentes des adoptés sont en tirets.
    const mixtes = disp.branches.filter((b) => b.enfants.some((e) => e.adoptif) && b.enfants.some((e) => !e.adoptif));
    const adoptesMixtes = mixtes.flatMap((b) => b.enfants.filter((e) => e.adoptif)).length;
    expect(adoptesMixtes).toBe(2);
    expect(traits.filter((t) => t.classe === 'trait adoption')).toHaveLength(adoptesMixtes);
    expect(traits.some((t) => t.classe.includes('couple') && t.classe.includes('ex'))).toBe(true);
    expect(traits.some((t) => t.classe.includes('adoption') && t.classe.includes('ex'))).toBe(false);
  });

  it('un trait commun saute par-dessus un trait vertical d’une autre branche, pas ailleurs', () => {
    // Un arc par croisement, au-dessus du trait ; deux croisements trop proches ou près d'une extrémité : trait droit.
    expect(trajetAvecPonts(0, 100, 50, [])).toBe('M 0 50 H 100');
    expect(trajetAvecPonts(0, 100, 50, [40])).toBe(`M 0 50 H ${40 - RAYON_PONT} a ${RAYON_PONT} ${RAYON_PONT} 0 0 1 ${2 * RAYON_PONT} 0 H 100`);
    expect(trajetAvecPonts(0, 100, 50, [60, 20])).toBe(trajetAvecPonts(0, 100, 50, [20, 60]));
    expect(trajetAvecPonts(0, 100, 50, [20, 22])).toBe(trajetAvecPonts(0, 100, 50, [20]));
    expect(trajetAvecPonts(0, 100, 50, [2, 98])).toBe('M 0 50 H 100');
  });

  it('Lambert (un croisement) a un trait commun à ponts ; Martinez-Vasseur (aucun) n’en a pas', () => {
    const l = lambert();
    const dispL = disposerArbre(l.donnees, l.moi);
    const avecPonts = traitsArbre(dispL, positions(dispL), undefined, l.moi).filter((t) => t.dessin !== undefined);
    expect(avecPonts.length).toBeGreaterThan(0);
    // Le tracé lu par les calculs reste un segment droit ; seul le dessin porte l'arc.
    for (const t of avecPonts) {
      expect(t.d).toMatch(/^M \S+ \S+ H \S+$/);
      expect(t.dessin).toContain(' a ');
    }
    const m = martinezVasseur();
    const dispM = disposerArbre(m.donnees, m.moi);
    expect(traitsArbre(dispM, positions(dispM), undefined, m.moi).some((t) => t.dessin !== undefined)).toBe(false);
  });
});
