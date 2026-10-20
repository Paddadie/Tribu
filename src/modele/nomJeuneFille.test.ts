import { describe, expect, it } from 'vitest';
import { ajouterUnion, creerPersonne, donneesVides, modifierPersonne, modifierUnion } from './modele';

function couple(sexeA: 'F' | 'M', nomA: string, sexeB: 'F' | 'M', nomB: string, marie = false) {
  let d = donneesVides();
  const a = creerPersonne(d, { prenom: 'A', nom: nomA, sexe: sexeA });
  const b = creerPersonne(a.donnees, { prenom: 'B', nom: nomB, sexe: sexeB });
  const u = ajouterUnion(b.donnees, a.personne.id, b.personne.id, marie);
  return { d: u.donnees, a: a.personne.id, b: b.personne.id, union: u.union.id };
}
const nom = (d: ReturnType<typeof donneesVides>, id: string) => d.personnes.find((p) => p.id === id)!;

describe('nom de jeune fille', () => {
  it('au mariage, la femme garde son nom en jeune fille et prend celui du conjoint', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const d = modifierUnion(c.d, c.union, true);
    expect(nom(d, c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
    expect(nom(d, c.b).nom).toBe('Martin');
  });

  it('marié dès la création du couple', () => {
    const c = couple('M', 'Martin', 'F', 'Durand', true);
    expect(nom(c.d, c.b)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
  });

  it('un nom de jeune fille déjà saisi est conservé', () => {
    const c = couple('F', 'Leroy', 'M', 'Martin');
    const d0 = modifierPersonne(c.d, c.a, { prenom: 'A', nom: 'Leroy', sexe: 'F', nomNaissance: 'Durand' });
    expect(nom(modifierUnion(d0, c.union, true), c.a)).toMatchObject({ nom: 'Martin', nomNaissance: 'Durand' });
  });

  it('case « Prend le nom » décochée : le mariage ne change aucun nom', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    const d = modifierUnion(c.d, c.union, true, false);
    expect(d.unions[0].marie).toBe(true);
    expect(nom(d, c.a)).toMatchObject({ nom: 'Durand' });
    expect(nom(d, c.a).nomNaissance).toBeUndefined();
    const neuf = donneesVides();
    const a = creerPersonne(neuf, { prenom: 'A', nom: 'Durand', sexe: 'F' });
    const b = creerPersonne(a.donnees, { prenom: 'B', nom: 'Martin', sexe: 'M' });
    const u = ajouterUnion(b.donnees, a.personne.id, b.personne.id, true, 'actuelle', undefined, false);
    expect(nom(u.donnees, a.personne.id).nom).toBe('Durand');
  });

  it('couple non marié, séparé ou couple de femmes : rien ne change', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    expect(nom(modifierUnion(c.d, c.union, false), c.a).nom).toBe('Durand');
    const f = couple('F', 'Durand', 'F', 'Martin');
    expect(nom(modifierUnion(f.d, f.union, true), f.a).nom).toBe('Durand');
  });

  it('ne se refait pas si l’union est déjà mariée, et se vide pour un homme', () => {
    const c = couple('F', 'Durand', 'M', 'Martin');
    let d = modifierUnion(c.d, c.union, true);
    d = modifierPersonne(d, c.a, { prenom: 'A', nom: 'Dupont', sexe: 'F', nomNaissance: 'Durand' });
    expect(nom(modifierUnion(d, c.union, true), c.a).nom).toBe('Dupont');
    expect(nom(modifierPersonne(d, c.b, { prenom: 'B', nom: 'Martin', sexe: 'M', nomNaissance: 'X' }), c.b).nomNaissance).toBeUndefined();
  });
});
