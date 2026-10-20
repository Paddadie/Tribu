import { describe, expect, it } from 'vitest';
import { ajouterUnion, creerPersonne, donneesVides, modifierDateUnion } from './modele';
import { estDonneesValides } from './stockage';

function couple(date?: string) {
  const a = creerPersonne(donneesVides(), { prenom: 'A', nom: 'X' });
  const b = creerPersonne(a.donnees, { prenom: 'B', nom: 'Y' });
  return ajouterUnion(b.donnees, a.personne.id, b.personne.id, true, 'actuelle', date);
}

describe('date d’union', () => {
  it('est facultative : absente par défaut, vide ignorée', () => {
    expect(couple().union).not.toHaveProperty('date');
    expect(couple('  ').union).not.toHaveProperty('date');
  });

  it('accepte année, mois, jour complet ou jour et mois sans année', () => {
    for (const date of ['2010', '2010-06', '2010-06-12', '--06-12', '--02-29']) {
      expect(couple(date).union.date).toBe(date);
    }
  });

  it('refuse une date impossible', () => {
    for (const date of ['2010-13', '2010-02-30', '12/06/2010', '--02-30']) {
      expect(() => couple(date)).toThrow('Date d’union');
    }
  });

  it('se modifie et s’efface sans toucher au reste', () => {
    const { donnees, union } = couple('2010');
    const change = modifierDateUnion(donnees, union.id, '2010-06-12');
    expect(change.unions[0]).toEqual({ ...union, date: '2010-06-12' });
    const efface = modifierDateUnion(change, union.id, '');
    expect(efface.unions[0]).toEqual({ id: union.id, personneA: union.personneA, personneB: union.personneB, marie: true, statut: 'actuelle' });
    expect(() => modifierDateUnion(donnees, union.id, '2010-02-30')).toThrow();
    expect(() => modifierDateUnion(donnees, 'inconnue', '2010')).toThrow('Union introuvable');
  });

  it('est validée au chargement', () => {
    const { donnees, union } = couple('2010-06');
    expect(estDonneesValides(donnees)).toBe(true);
    expect(estDonneesValides({ ...donnees, unions: [{ ...union, date: '2010-13' }] })).toBe(false);
    expect(estDonneesValides({ ...donnees, unions: [{ ...union, date: 2010 }] })).toBe(false);
  });
});
