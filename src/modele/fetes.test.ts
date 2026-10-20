import { describe, expect, it } from 'vitest';
import { entreesCalendrier, feteDuPrenom } from './fetes';
import { joursDuMois } from './modele';
import { simplifier } from './liste';

describe('fête du prénom', () => {
  it('a un calendrier fourni, sans prénom en double ni date impossible', () => {
    const entrees = entreesCalendrier();
    expect(entrees.length).toBeGreaterThan(350);
    const vus = new Map<string, string>();
    for (const { prenom, fete } of entrees) {
      const cle = simplifier(prenom);
      expect(vus.get(cle), `${prenom} en double`).toBeUndefined();
      vus.set(cle, prenom);
      expect(fete.jour).toBeLessThanOrEqual(joursDuMois(2024, fete.mois));
    }
  });

  it('trouve le saint du jour, sans tenir compte des accents ni de la casse', () => {
    expect(feteDuPrenom('Céline')).toEqual({ mois: 10, jour: 21, saint: 'Sainte Céline' });
    expect(feteDuPrenom('celine')).toEqual({ mois: 10, jour: 21, saint: 'Sainte Céline' });
    expect(feteDuPrenom('MARTIN')).toEqual({ mois: 11, jour: 11, saint: 'Saint Martin' });
  });

  it('fête une variante avec son saint', () => {
    expect(feteDuPrenom('Ginette')).toEqual({ mois: 1, jour: 3, saint: 'Sainte Geneviève' });
    expect(feteDuPrenom('Manon')?.saint).toBe('Sainte Marie');
    expect(feteDuPrenom('Pierre')).toEqual({ mois: 6, jour: 29, saint: 'Saint Pierre' });
    expect(feteDuPrenom('Paul')).toEqual({ mois: 6, jour: 29, saint: 'Saint Paul' });
  });

  it('ne prend que le premier prénom', () => {
    expect(feteDuPrenom('Anne Sophie')?.saint).toBe('Sainte Anne');
    expect(feteDuPrenom('  Luc  ')?.saint).toBe('Saint Luc');
  });

  it('exige un prénom composé tel quel au calendrier', () => {
    expect(feteDuPrenom('Jean-Baptiste')).toEqual({ mois: 6, jour: 24, saint: 'Saint Jean-Baptiste' });
    expect(feteDuPrenom('Jean-Kévin')).toBeUndefined();
  });

  it('ne fête pas un prénom inconnu ou vide', () => {
    expect(feteDuPrenom('Zorglub')).toBeUndefined();
    expect(feteDuPrenom('')).toBeUndefined();
  });
});
