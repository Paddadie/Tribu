import { describe, expect, it } from 'vitest';
import { annees } from './familleProche';
import type { Personne } from './types';

const p = (champs: Partial<Personne>): Personne => ({ id: 'x', prenom: 'Alix', ...champs }) as Personne;

describe('annees (années sous le nom)', () => {
  it("naissance seule : une année, date complète réduite à l'année", () => {
    expect(annees(p({ naissance: '1950' }))).toBe('1950');
    expect(annees(p({ naissance: '1950-03-12' }))).toBe('1950');
  });
  it('décédé : naissance–décès, « ? » si une borne manque', () => {
    expect(annees(p({ naissance: '1950', deces: '2020-05' }))).toBe('1950–2020');
    expect(annees(p({ deces: '2020' }))).toBe('?–2020');
    expect(annees(p({ naissance: '1950', decede: true }))).toBe('1950–?');
  });
  it('rien sans année connue, jour et mois seuls compris', () => {
    expect(annees(p({}))).toBe('');
    expect(annees(p({ naissance: '--03-12' }))).toBe('');
  });
});
