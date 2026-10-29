import { describe, expect, it } from 'vitest';
import { BANDE_BUS, disposerArbre } from '../modele/arbreGlobal';
import { lambert } from '../modele/test/familles';
import { LIGNE_NAISSANCE, PAS_Y, SOUS_NOM, positions, traitsArbre } from './geometrieArbre';

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
});
