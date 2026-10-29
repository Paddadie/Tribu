import { describe, expect, it } from 'vitest';
import { ajouterUnion, creerPersonne, donneesVides, modifierPersonne, quiPeutReprendreSonNom, separerUnion } from './modele';
import { appliquerNomApres, nomApresActuel, nomApresParDefaut, type NomApres } from './nomApres';
import type { Donnees, Sexe } from './types';

function couple(sexeA: Sexe | undefined, nomA: string, sexeB: Sexe | undefined, nomB: string) {
  const d = donneesVides();
  const a = creerPersonne(d, { prenom: 'A', nom: nomA, sexe: sexeA });
  const b = creerPersonne(a.donnees, { prenom: 'B', nom: nomB, sexe: sexeB });
  const u = ajouterUnion(b.donnees, a.personne.id, b.personne.id, true, 'actuelle', undefined, false);
  return { d: u.donnees, a: a.personne.id, b: b.personne.id, union: u.union };
}
const p = (d: Donnees, id: string) => d.personnes.find((x) => x.id === id)!;
const actuel = (d: Donnees, c: ReturnType<typeof couple>) =>
  nomApresActuel(
    d,
    d.unions.find((u) => u.id === c.union.id)!,
  );

describe('nom après le mariage', () => {
  it('par défaut : le nom de l’homme, quel que soit le côté ; aucun sans exactement un homme', () => {
    expect(nomApresParDefaut({ id: 'f', sexe: 'F', nom: 'Durand' }, { id: 'h', sexe: 'M', nom: 'Martin' })).toEqual({ mode: 'de', id: 'h' });
    expect(nomApresParDefaut({ id: 'h', sexe: 'M', nom: 'Martin' }, { id: 'x', nom: 'Durand' })).toEqual({ mode: 'de', id: 'h' });
    expect(nomApresParDefaut({ id: 'f', sexe: 'F', nom: 'A' }, { id: 'g', sexe: 'F', nom: 'B' })).toEqual({ mode: 'chacun' });
    expect(nomApresParDefaut({ id: 'h', sexe: 'M', nom: 'A' }, { id: 'i', sexe: 'M', nom: 'B' })).toEqual({ mode: 'chacun' });
    expect(nomApresParDefaut({ id: 'h', sexe: 'M', nom: '' }, { id: 'f', sexe: 'F', nom: 'B' })).toEqual({ mode: 'chacun' });
  });

  it('chacun garde le sien : rien ne change', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    expect(actuel(c.d, c)).toEqual({ mode: 'chacun' });
    expect(appliquerNomApres(c.d, c.union.id, { mode: 'chacun' })).toBe(c.d);
  });

  it('la femme prend le nom du mari, puis l’inverse : on défait avant d’appliquer', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const d1 = appliquerNomApres(c.d, c.union.id, { mode: 'de', id: c.b });
    expect(p(d1, c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
    expect(actuel(d1, c)).toEqual({ mode: 'de', id: c.b });
    const d2 = appliquerNomApres(d1, c.union.id, { mode: 'de', id: c.a });
    expect(p(d2, c.a).nom).toBe('Durand');
    expect(p(d2, c.a).nomNaissance).toBeUndefined();
    expect(p(d2, c.b)).toMatchObject({ nom: 'Durand', nomNaissance: 'Martin' });
    const d3 = appliquerNomApres(d2, c.union.id, { mode: 'chacun' });
    expect([p(d3, c.a).nom, p(d3, c.b).nom]).toEqual(['Durand', 'Martin']);
    expect(p(d3, c.b).nomNaissance).toBeUndefined();
  });

  it('nom composé porté par l’un, puis par les deux', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const un: NomApres = { mode: 'compose', nom: ' Martin-Durand ', porteurs: [c.a] };
    const d1 = appliquerNomApres(c.d, c.union.id, un);
    expect(p(d1, c.a)).toMatchObject({ nom: 'Martin-Durand', nomNaissance: 'Durand' });
    expect(p(d1, c.b).nom).toBe('Martin');
    expect(actuel(d1, c)).toEqual({ mode: 'compose', nom: 'Martin-Durand', porteurs: [c.a] });
    const d2 = appliquerNomApres(d1, c.union.id, { mode: 'compose', nom: 'Martin-Durand', porteurs: [c.a, c.b] });
    expect(p(d2, c.b)).toMatchObject({ nom: 'Martin-Durand', nomNaissance: 'Martin' });
    expect(actuel(d2, c)).toEqual({ mode: 'compose', nom: 'Martin-Durand', porteurs: [c.a, c.b] });
    expect(
      quiPeutReprendreSonNom(separerUnion(d2, c.union.id), c.union.id)
        .map((x) => x.id)
        .sort(),
    ).toEqual([c.a, c.b].sort());
  });

  it('un nom de naissance d’avant (remariage) est gardé, et n’est pas pris pour un choix de cette union', () => {
    const c = couple('F', 'Leroy', 'M', 'Martin');
    const d0 = modifierPersonne(c.d, c.a, { prenom: 'A', nom: 'Leroy', sexe: 'F', nomNaissance: 'Durand' });
    expect(actuel(d0, c)).toEqual({ mode: 'chacun' });
    const d1 = appliquerNomApres(d0, c.union.id, { mode: 'de', id: c.b });
    expect(p(d1, c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
  });

  it('choix incohérents refusés', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    expect(() => appliquerNomApres(c.d, c.union.id, { mode: 'compose', nom: ' ', porteurs: [c.a] })).toThrow('vide');
    expect(() => appliquerNomApres(c.d, c.union.id, { mode: 'de', id: 'autre' })).toThrow('hors');
    expect(() => appliquerNomApres(c.d, 'rien', { mode: 'chacun' })).toThrow('introuvable');
  });

  it('couple sans sexe précisé : tous les choix restent possibles', () => {
    const c = couple(undefined, 'Durand', undefined, 'Martin');
    const d1 = appliquerNomApres(c.d, c.union.id, { mode: 'de', id: c.a });
    expect(p(d1, c.b)).toMatchObject({ nom: 'Durand', nomNaissance: 'Martin' });
  });
});
